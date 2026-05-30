from __future__ import annotations

import unittest
from copy import deepcopy

from advisor import CorrectionAdvisor
from classifier import DataCategory, DataClassifier
from engine import ScheduleResult, SchedulingEngine
from history import HistoryManager
from models import BuildingMap, DoorStatus, OrderStatus, Shift, WorkOrder
from runner import BatchRunner, ExperimentInput


class TestModelsFromRaw(unittest.TestCase):
    def test_work_order_from_raw_complete(self):
        data = {
            "order_id": "O001",
            "building_id": "B1",
            "task_type": "电梯检修",
            "priority": 8,
            "status": "pending",
            "notes": "3楼异响",
        }
        o = WorkOrder.from_raw(data)
        self.assertEqual(o.order_id, "O001")
        self.assertFalse(o.is_dirty)

    def test_work_order_from_raw_missing_fields(self):
        data = {"notes": "仅备注"}
        o = WorkOrder.from_raw(data)
        self.assertTrue(o.is_dirty)
        self.assertIn("building_id", o._missing_fields)
        self.assertIn("task_type", o._missing_fields)

    def test_work_order_from_raw_bad_priority(self):
        data = {"order_id": "O1", "building_id": "B1", "task_type": "检修", "priority": "high"}
        o = WorkOrder.from_raw(data)
        self.assertEqual(o.priority, 5)
        self.assertIn("priority", o._missing_fields)

    def test_building_map_from_raw_complete(self):
        data = {
            "building_id": "B1",
            "name": "1号楼",
            "floor_count": 6,
            "door_status": "open",
            "coordinates": (30.0, 120.0),
            "adjacent_buildings": ["B2", "B3"],
            "edge_weights": {"B2": 2.0, "B3": 3.0},
        }
        b = BuildingMap.from_raw(data)
        self.assertEqual(b.name, "1号楼")
        self.assertTrue(b.is_traversable)
        self.assertFalse(b.is_dirty)

    def test_building_map_from_raw_missing_coords(self):
        data = {"building_id": "B2", "name": "2号楼"}
        b = BuildingMap.from_raw(data)
        self.assertTrue(b.is_dirty)
        self.assertIn("coordinates", b._missing_fields)

    def test_building_map_closed_door(self):
        data = {"building_id": "B3", "name": "3号楼", "door_status": "closed"}
        b = BuildingMap.from_raw(data)
        self.assertFalse(b.is_traversable)

    def test_shift_from_raw_complete(self):
        data = {
            "shift_id": "S1",
            "worker_name": "张三",
            "start_time": "08:00",
            "end_time": "17:00",
            "skills": ["电气", "管道"],
        }
        s = Shift.from_raw(data)
        self.assertTrue(s.is_effective)
        self.assertFalse(s.is_dirty)

    def test_shift_from_raw_late_arrival(self):
        data = {
            "shift_id": "S2",
            "worker_name": "李四",
            "start_time": "08:00",
            "end_time": "17:00",
            "late_arrival": True,
        }
        s = Shift.from_raw(data)
        self.assertFalse(s.is_effective)
        self.assertTrue(s.is_dirty)

    def test_shift_from_raw_missing_time(self):
        data = {"shift_id": "S3", "worker_name": "王五"}
        s = Shift.from_raw(data)
        self.assertTrue(s.is_dirty)
        self.assertIn("start_time", s._missing_fields)


class TestDataClassifier(unittest.TestCase):
    def setUp(self):
        self.clf = DataClassifier()

    def test_normal_order(self):
        o = WorkOrder(order_id="O1", building_id="B1", task_type="检修", priority=5)
        batch = self.clf.classify_orders([o])
        self.assertEqual(len(batch.normal), 1)
        self.assertEqual(len(batch.boundary), 0)
        self.assertEqual(len(batch.bad), 0)

    def test_boundary_order_priority_out_of_range(self):
        o = WorkOrder(order_id="O2", building_id="B1", task_type="检修", priority=0)
        batch = self.clf.classify_orders([o])
        self.assertEqual(len(batch.boundary), 1)

    def test_bad_order_no_building(self):
        o = WorkOrder(order_id="O3", task_type="检修", priority=5)
        batch = self.clf.classify_orders([o])
        self.assertEqual(len(batch.bad), 1)

    def test_building_closed_door_is_boundary(self):
        b = BuildingMap(building_id="B1", name="1号楼", door_status=DoorStatus.CLOSED,
                        coordinates=(30.0, 120.0), adjacent_buildings=["B2"])
        batch = self.clf.classify_buildings([b])
        self.assertEqual(len(batch.boundary), 1)

    def test_building_isolated_no_coords_is_bad(self):
        b = BuildingMap(building_id="B2", name="2号楼", door_status=DoorStatus.OPEN)
        batch = self.clf.classify_buildings([b])
        self.assertEqual(len(batch.bad), 1)

    def test_shift_late_arrival_is_boundary(self):
        s = Shift(shift_id="S1", worker_name="张三", start_time="08:00",
                  end_time="17:00", late_arrival=True)
        batch = self.clf.classify_shifts([s])
        self.assertEqual(len(batch.boundary), 1)

    def test_shift_unavailable_and_late_is_bad(self):
        s = Shift(shift_id="S2", worker_name="李四", start_time="08:00",
                  end_time="17:00", late_arrival=True, available=False)
        batch = self.clf.classify_shifts([s])
        self.assertEqual(len(batch.bad), 1)

    def test_classify_all_mixed(self):
        orders = [
            WorkOrder(order_id="O1", building_id="B1", task_type="检修", priority=5),
            WorkOrder(order_id="O2", task_type="检修"),
        ]
        buildings = [
            BuildingMap(building_id="B1", name="1号楼", door_status=DoorStatus.OPEN,
                        coordinates=(30.0, 120.0), adjacent_buildings=["B2"],
                        edge_weights={"B2": 2.0}),
        ]
        shifts = [
            Shift(shift_id="S1", worker_name="张三", start_time="08:00", end_time="17:00"),
        ]
        result = self.clf.classify_all(orders, buildings, shifts)
        self.assertEqual(result["orders"].summary()["normal"], 1)
        self.assertEqual(result["orders"].summary()["bad"], 1)
        self.assertEqual(result["buildings"].summary()["normal"], 1)
        self.assertEqual(result["shifts"].summary()["normal"], 1)


class TestSchedulingEngine(unittest.TestCase):
    def _make_simple_setup(self):
        b1 = BuildingMap(
            building_id="B1", name="1号楼", door_status=DoorStatus.OPEN,
            coordinates=(30.0, 120.0), adjacent_buildings=["B2", "B3"],
            edge_weights={"B2": 2.0, "B3": 5.0},
        )
        b2 = BuildingMap(
            building_id="B2", name="2号楼", door_status=DoorStatus.OPEN,
            coordinates=(30.1, 120.1), adjacent_buildings=["B1", "B3"],
            edge_weights={"B1": 2.0, "B3": 3.0},
        )
        b3 = BuildingMap(
            building_id="B3", name="3号楼", door_status=DoorStatus.OPEN,
            coordinates=(30.2, 120.2), adjacent_buildings=["B1", "B2"],
            edge_weights={"B1": 5.0, "B2": 3.0},
        )
        orders = [
            WorkOrder(order_id="O1", building_id="B2", task_type="电梯", priority=8),
            WorkOrder(order_id="O2", building_id="B3", task_type="管道", priority=5),
        ]
        shifts = [
            Shift(shift_id="S1", worker_name="张三", start_time="08:00", end_time="17:00"),
        ]
        return [b1, b2, b3], orders, shifts

    def test_basic_schedule(self):
        buildings, orders, shifts = self._make_simple_setup()
        engine = SchedulingEngine()
        engine.load_buildings(buildings)
        engine.load_orders(orders)
        engine.load_shifts(shifts)
        result = engine.schedule(start_building="B1")
        self.assertEqual(len(result.steps), 2)
        self.assertEqual(result.steps[0].order_id, "O1")
        self.assertEqual(result.steps[0].distance, 2.0)
        self.assertEqual(result.steps[1].order_id, "O2")
        self.assertAlmostEqual(result.steps[1].distance, 3.0)

    def test_schedule_with_closed_door(self):
        buildings, orders, shifts = self._make_simple_setup()
        buildings[2].door_status = DoorStatus.CLOSED
        engine = SchedulingEngine()
        engine.load_buildings(buildings)
        engine.load_orders(orders)
        engine.load_shifts(shifts)
        result = engine.schedule(start_building="B1")
        self.assertIn("B3", result.closed_door_buildings)
        self.assertNotIn("O2", [s.order_id for s in result.steps])

    def test_insert_and_reschedule(self):
        buildings, orders, shifts = self._make_simple_setup()
        engine = SchedulingEngine()
        engine.load_buildings(buildings)
        engine.load_orders(orders)
        engine.load_shifts(shifts)
        r1 = engine.schedule(start_building="B1")
        new_order = WorkOrder(order_id="O3", building_id="B2", task_type="消防", priority=10)
        r2 = engine.reschedule_with_insert(new_order, start_building="B1")
        self.assertEqual(r2.version, r1.version + 1)
        oids = [s.order_id for s in r2.steps]
        self.assertIn("O3", oids)

    def test_priority_change_reschedule(self):
        buildings, orders, shifts = self._make_simple_setup()
        engine = SchedulingEngine()
        engine.load_buildings(buildings)
        engine.load_orders(orders)
        engine.load_shifts(shifts)
        r1 = engine.schedule(start_building="B1")
        r2 = engine.reschedule_with_priority_change("O2", 10, start_building="B1")
        self.assertEqual(r2.steps[0].order_id, "O2")

    def test_dijkstra_shortest_path(self):
        buildings, _, _ = self._make_simple_setup()
        engine = SchedulingEngine()
        engine.load_buildings(buildings)
        dist, path = engine.dijkstra("B1", "B3")
        self.assertAlmostEqual(dist, 5.0)
        self.assertEqual(path[0], "B1")
        self.assertEqual(path[-1], "B3")

    def test_dijkstra_unreachable(self):
        buildings, _, _ = self._make_simple_setup()
        buildings[2].door_status = DoorStatus.CLOSED
        engine = SchedulingEngine()
        engine.load_buildings(buildings)
        dist, path = engine.dijkstra("B1", "B3")
        self.assertEqual(dist, float("inf"))
        self.assertEqual(path, [])


class TestHistoryManager(unittest.TestCase):
    def test_record_and_retrieve(self):
        hm = HistoryManager()
        result = ScheduleResult(
            version=1, steps=[], total_distance=0.0,
            unreachable_orders=[], closed_door_buildings=[],
            unassigned_orders=[], warnings=[],
        )
        snap = hm.record(result, {}, {}, {}, trigger="test")
        self.assertEqual(snap.version, 1)
        retrieved = hm.get_snapshot(1)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.version, 1)

    def test_old_result_not_overwritten(self):
        hm = HistoryManager()
        r1 = ScheduleResult(
            version=1, steps=[], total_distance=10.0,
            unreachable_orders=[], closed_door_buildings=[],
            unassigned_orders=[], warnings=[],
        )
        r2 = ScheduleResult(
            version=2, steps=[], total_distance=20.0,
            unreachable_orders=[], closed_door_buildings=[],
            unassigned_orders=[], warnings=[],
        )
        hm.record(r1, {}, {}, {}, trigger="first")
        hm.record(r2, {}, {}, {}, trigger="second")
        old = hm.get_snapshot(1)
        new = hm.get_snapshot(2)
        self.assertEqual(old.result["total_distance"], 10.0)
        self.assertEqual(new.result["total_distance"], 20.0)

    def test_diff_between_versions(self):
        hm = HistoryManager()
        r1 = ScheduleResult(
            version=1, steps=[], total_distance=10.0,
            unreachable_orders=["O1"], closed_door_buildings=[],
            unassigned_orders=[], warnings=[],
        )
        r2 = ScheduleResult(
            version=2, steps=[], total_distance=15.0,
            unreachable_orders=[], closed_door_buildings=["B3"],
            unassigned_orders=[], warnings=[],
        )
        hm.record(r1, {}, {}, {}, trigger="first")
        hm.record(r2, {}, {}, {}, trigger="second")
        d = hm.diff(1, 2)
        self.assertIsNotNone(d)
        self.assertTrue(d.has_changes)
        self.assertEqual(d.total_distance_old, 10.0)
        self.assertEqual(d.total_distance_new, 15.0)

    def test_version_list(self):
        hm = HistoryManager()
        for i in range(1, 4):
            r = ScheduleResult(
                version=i, steps=[], total_distance=float(i * 10),
                unreachable_orders=[], closed_door_buildings=[],
                unassigned_orders=[], warnings=[],
            )
            hm.record(r, {}, {}, {}, trigger=f"v{i}")
        versions = hm.list_versions()
        self.assertEqual(len(versions), 3)

    def test_replay_up_to_version(self):
        hm = HistoryManager()
        for i in range(1, 5):
            r = ScheduleResult(
                version=i, steps=[], total_distance=float(i),
                unreachable_orders=[], closed_door_buildings=[],
                unassigned_orders=[], warnings=[],
            )
            hm.record(r, {}, {}, {}, trigger=f"v{i}")
        replay = hm.replay(up_to_version=3)
        self.assertEqual(len(replay), 3)


class TestCorrectionAdvisor(unittest.TestCase):
    def test_duplicate_orders_detected(self):
        advisor = CorrectionAdvisor()
        orders = {
            "O1": WorkOrder(order_id="O1", building_id="B1", task_type="电梯", priority=5),
            "O2": WorkOrder(order_id="O2", building_id="B1", task_type="电梯", priority=5),
        }
        buildings = {
            "B1": BuildingMap(building_id="B1", name="1号楼", door_status=DoorStatus.OPEN),
        }
        shifts = {"S1": Shift(shift_id="S1", worker_name="张三", start_time="08:00", end_time="17:00")}
        result = ScheduleResult(
            version=1, steps=[], total_distance=0.0,
            unreachable_orders=[], closed_door_buildings=[],
            unassigned_orders=[], warnings=[],
        )
        advices = advisor.advise(result, orders, buildings, shifts)
        dup_advice = [a for a in advices if a.category == "工单重复"]
        self.assertTrue(len(dup_advice) > 0)
        self.assertTrue(dup_advice[0].action)

    def test_closed_door_has_clear_conclusion(self):
        advisor = CorrectionAdvisor()
        orders = {}
        buildings = {
            "B3": BuildingMap(building_id="B3", name="3号楼", door_status=DoorStatus.CLOSED),
        }
        shifts = {}
        result = ScheduleResult(
            version=1, steps=[], total_distance=0.0,
            unreachable_orders=[], closed_door_buildings=["B3"],
            unassigned_orders=[], warnings=[],
        )
        advices = advisor.advise(result, orders, buildings, shifts)
        closed_advice = [a for a in advices if a.category == "门禁关闭"]
        self.assertTrue(len(closed_advice) > 0)
        self.assertEqual(closed_advice[0].severity, "critical")
        self.assertIn("不可忽略", closed_advice[0].action)

    def test_late_shift_advice(self):
        advisor = CorrectionAdvisor()
        orders = {}
        buildings = {}
        shifts = {
            "S1": Shift(shift_id="S1", worker_name="张三", start_time="08:00",
                        end_time="17:00", late_arrival=True),
        }
        result = ScheduleResult(
            version=1, steps=[], total_distance=0.0,
            unreachable_orders=[], closed_door_buildings=[],
            unassigned_orders=[], warnings=[],
        )
        advices = advisor.advise(result, orders, buildings, shifts)
        late_advice = [a for a in advices if a.category == "维修员晚到"]
        self.assertTrue(len(late_advice) > 0)
        self.assertIn("late_arrival", late_advice[0].action)


class TestAcceptanceBuildingMapChange(unittest.TestCase):
    def test_changing_building_preserves_old_and_new_diff(self):
        b1 = BuildingMap(
            building_id="B1", name="1号楼", door_status=DoorStatus.OPEN,
            coordinates=(30.0, 120.0), adjacent_buildings=["B2", "B3"],
            edge_weights={"B2": 2.0, "B3": 5.0},
        )
        b2 = BuildingMap(
            building_id="B2", name="2号楼", door_status=DoorStatus.OPEN,
            coordinates=(30.1, 120.1), adjacent_buildings=["B1", "B3"],
            edge_weights={"B1": 2.0, "B3": 3.0},
        )
        b3 = BuildingMap(
            building_id="B3", name="3号楼", door_status=DoorStatus.OPEN,
            coordinates=(30.2, 120.2), adjacent_buildings=["B1", "B2"],
            edge_weights={"B1": 5.0, "B2": 3.0},
        )
        orders = [
            WorkOrder(order_id="O1", building_id="B2", task_type="电梯", priority=8),
            WorkOrder(order_id="O2", building_id="B3", task_type="管道", priority=5),
        ]
        shifts = [
            Shift(shift_id="S1", worker_name="张三", start_time="08:00", end_time="17:00"),
        ]

        engine = SchedulingEngine()
        history = HistoryManager()
        engine.load_buildings([b1, b2, b3])
        engine.load_orders(orders)
        engine.load_shifts(shifts)

        r1 = engine.schedule(start_building="B1")
        b_dicts_v1 = {b.building_id: b.to_dict() for b in [b1, b2, b3]}
        o_dicts = {o.order_id: o.to_dict() for o in orders}
        s_dicts = {s.shift_id: s.to_dict() for s in shifts}
        snap1 = history.record(r1, b_dicts_v1, o_dicts, s_dicts, trigger="初始排程")
        old_version = snap1.version

        b3_updated = BuildingMap(
            building_id="B3", name="3号楼(新)", door_status=DoorStatus.CLOSED,
            coordinates=(30.2, 120.2), adjacent_buildings=["B1", "B2"],
            edge_weights={"B1": 5.0, "B2": 3.0},
        )
        engine.update_building(b3_updated)
        r2 = engine.schedule(start_building="B1")
        b_dicts_v2 = {b.building_id: b.to_dict() for b in [b1, b2, b3_updated]}
        snap2 = history.record(r2, b_dicts_v2, o_dicts, s_dicts, trigger="楼栋地图变更")
        new_version = snap2.version

        old_snap = history.get_snapshot(old_version)
        self.assertIsNotNone(old_snap)
        self.assertEqual(old_snap.result["total_distance"], r1.total_distance)
        self.assertNotIn("B3", old_snap.result.get("closed_door_buildings", []))

        new_snap = history.get_snapshot(new_version)
        self.assertIsNotNone(new_snap)
        self.assertIn("B3", new_snap.result["closed_door_buildings"])

        d = history.diff(old_version, new_version)
        self.assertIsNotNone(d)
        self.assertTrue(d.has_changes)
        self.assertEqual(d.old_version, old_version)
        self.assertEqual(d.new_version, new_version)

        self.assertNotEqual(d.total_distance_old, d.total_distance_new)
        self.assertTrue(len(d.removed_steps) > 0 or len(d.modified_steps) > 0)

        diff_dict = d.to_dict()
        self.assertIn("total_distance_change", diff_dict)
        self.assertIn("delta", diff_dict["total_distance_change"])


class TestBatchRunner(unittest.TestCase):
    def test_batch_run_separates_categories(self):
        runner = BatchRunner()
        exp_normal = ExperimentInput(
            name="正常数据",
            orders=[WorkOrder(order_id="O1", building_id="B1", task_type="检修", priority=5)],
            buildings=[
                BuildingMap(building_id="B1", name="1号楼", door_status=DoorStatus.OPEN,
                            coordinates=(30.0, 120.0), adjacent_buildings=["B2"],
                            edge_weights={"B2": 2.0}),
                BuildingMap(building_id="B2", name="2号楼", door_status=DoorStatus.OPEN,
                            coordinates=(30.1, 120.1), adjacent_buildings=["B1"],
                            edge_weights={"B1": 2.0}),
            ],
            shifts=[Shift(shift_id="S1", worker_name="张三", start_time="08:00", end_time="17:00")],
            start_building="B1",
        )
        exp_boundary = ExperimentInput(
            name="边界数据-门禁关闭",
            orders=[WorkOrder(order_id="O2", building_id="B3", task_type="检修", priority=5)],
            buildings=[
                BuildingMap(building_id="B3", name="3号楼", door_status=DoorStatus.CLOSED,
                            coordinates=(30.2, 120.2), adjacent_buildings=["B4"],
                            edge_weights={"B4": 2.0}),
                BuildingMap(building_id="B4", name="4号楼", door_status=DoorStatus.OPEN,
                            coordinates=(30.3, 120.3), adjacent_buildings=["B3"],
                            edge_weights={"B3": 2.0}),
            ],
            shifts=[Shift(shift_id="S2", worker_name="李四", start_time="08:00", end_time="17:00")],
            start_building="B3",
        )
        exp_bad = ExperimentInput(
            name="坏数据-无楼栋",
            orders=[WorkOrder(order_id="O3", building_id="", task_type="检修", priority=5)],
            buildings=[
                BuildingMap(building_id="B5", name="5号楼", door_status=DoorStatus.OPEN,
                            coordinates=(30.4, 120.4), adjacent_buildings=[],
                            edge_weights={}),
            ],
            shifts=[Shift(shift_id="S3", worker_name="王五", start_time="08:00", end_time="17:00")],
            start_building="B5",
        )
        report = runner.run_batch([exp_normal, exp_boundary, exp_bad])
        self.assertEqual(report.total_experiments, 3)
        self.assertGreater(report.with_bad_count, 0)
        self.assertGreater(report.with_boundary_count, 0)
        self.assertGreater(report.normal_only_count, 0)
        self.assertGreater(report.total_advices, 0)

    def test_batch_history_replay(self):
        runner = BatchRunner()
        exp1 = ExperimentInput(
            name="实验1",
            orders=[WorkOrder(order_id="O1", building_id="B1", task_type="检修", priority=5)],
            buildings=[
                BuildingMap(building_id="B1", name="1号楼", door_status=DoorStatus.OPEN,
                            coordinates=(30.0, 120.0), adjacent_buildings=["B2"],
                            edge_weights={"B2": 1.0}),
                BuildingMap(building_id="B2", name="2号楼", door_status=DoorStatus.OPEN,
                            coordinates=(30.1, 120.1), adjacent_buildings=["B1"],
                            edge_weights={"B1": 1.0}),
            ],
            shifts=[Shift(shift_id="S1", worker_name="张三", start_time="08:00", end_time="17:00")],
            start_building="B1",
        )
        exp2 = ExperimentInput(
            name="实验2",
            orders=[
                WorkOrder(order_id="O1", building_id="B1", task_type="检修", priority=5),
                WorkOrder(order_id="O2", building_id="B2", task_type="消防", priority=9),
            ],
            buildings=[
                BuildingMap(building_id="B1", name="1号楼", door_status=DoorStatus.OPEN,
                            coordinates=(30.0, 120.0), adjacent_buildings=["B2"],
                            edge_weights={"B2": 1.0}),
                BuildingMap(building_id="B2", name="2号楼", door_status=DoorStatus.OPEN,
                            coordinates=(30.1, 120.1), adjacent_buildings=["B1"],
                            edge_weights={"B1": 1.0}),
            ],
            shifts=[Shift(shift_id="S1", worker_name="张三", start_time="08:00", end_time="17:00")],
            start_building="B1",
        )
        runner.run_batch([exp1, exp2])
        versions = runner.history.list_versions()
        self.assertEqual(len(versions), 2)
        d = runner.history.diff(1, 2)
        self.assertIsNotNone(d)
        self.assertTrue(d.has_changes)


if __name__ == "__main__":
    unittest.main()
