import os
import sys
import json
import shutil
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from carbon_budget import (
    init_db, start_run, finish_run, append_history, load_history,
    import_departments_from_csv, import_budgets_from_csv, import_scenarios_from_json,
    validate_all, optimize, reoptimize_after_constraint_change, export_report,
)
from carbon_budget.models import DepartmentEmission, BudgetCap, ScenarioReport, ScenarioAllocation
from carbon_budget.history import DB_PATH


class TestImporter(unittest.TestCase):
    def test_import_departments(self):
        path = os.path.join(os.path.dirname(__file__), "sample_data", "departments.csv")
        depts = import_departments_from_csv(path)
        self.assertEqual(len(depts), 5)
        self.assertEqual(depts[0].department_id, "D001")
        self.assertEqual(depts[0].emission_baseline, 12000.0)
        self.assertIsNone(depts[2].emission_baseline)
        self.assertTrue(depts[1].late_supplement)

    def test_import_budgets(self):
        path = os.path.join(os.path.dirname(__file__), "sample_data", "budgets.csv")
        budgets = import_budgets_from_csv(path)
        self.assertEqual(len(budgets), 5)
        self.assertIsNone(budgets[3].budget_cap)
        self.assertTrue(budgets[1].adjusted)

    def test_import_scenarios(self):
        path = os.path.join(os.path.dirname(__file__), "sample_data", "scenarios.json")
        scenarios = import_scenarios_from_json(path)
        self.assertEqual(len(scenarios), 3)
        self.assertTrue(scenarios[1].note_modified)
        self.assertEqual(len(scenarios[1].constraints), 2)


class TestValidator(unittest.TestCase):
    def setUp(self):
        self.departments = [
            DepartmentEmission("D001", "生产部", 12000, 0.15, 5000, late_supplement=False),
            DepartmentEmission("D002", "物流部", 8500, 0.10, 3200, late_supplement=True),
            DepartmentEmission("D003", "研发部", None, 0.20, 1800),
            DepartmentEmission("D004", "行政部", 3000, None, 1200, late_supplement=True),
            DepartmentEmission("D005", "销售部", 6000, 0.08, None),
        ]
        self.budgets = [
            BudgetCap("D001", 2026, 10500, adjusted=False),
            BudgetCap("D002", 2026, 8000, adjusted=True),
            BudgetCap("D003", 2026, 2000, adjusted=False),
            BudgetCap("D004", 2026, None, adjusted=True),
            BudgetCap("D005", 2026, 5800, adjusted=False),
        ]
        self.scenarios = [
            ScenarioReport(
                "S001", "均衡方案",
                allocations=[
                    ScenarioAllocation("D001", 10500, 10600),
                    ScenarioAllocation("D002", 8000, 7800),
                ],
                objective_scores={"cost": 120, "emission_reduction": 85, "fairness": 78},
                constraints=[{"type": "conflict", "description": "生产部冲突"}],
            ),
            ScenarioReport(
                "S002", "高减排方案",
                allocations=[
                    ScenarioAllocation("D001", 9500, 11000),
                    ScenarioAllocation("D002", 7500, 8100),
                ],
                objective_scores={"cost": 200, "emission_reduction": 92, "fairness": 60},
                constraints=[
                    {"type": "conflict", "description": "生产部冲突"},
                    {"type": "exclusive", "description": "项目互斥"},
                ],
                note_modified=True,
            ),
        ]

    def test_missing_fields_detected(self):
        issues = validate_all(self.departments, self.budgets, self.scenarios)
        missing = [i for i in issues if i.severity == "missing_field"]
        self.assertGreaterEqual(len(missing), 3)

    def test_late_supplement_detected(self):
        issues = validate_all(self.departments, self.budgets, self.scenarios)
        late = [i for i in issues if i.severity == "late_supplement"]
        self.assertGreaterEqual(len(late), 2)

    def test_note_modified_detected(self):
        issues = validate_all(self.departments, self.budgets, self.scenarios)
        modified = [i for i in issues if i.severity == "note_modified"]
        self.assertGreaterEqual(len(modified), 1)

    def test_budget_overrun_detected(self):
        issues = validate_all(self.departments, self.budgets, self.scenarios)
        overrun = [i for i in issues if i.severity == "budget_overrun"]
        self.assertGreaterEqual(len(overrun), 1)

    def test_overrun_overrides_conflict_and_exclusive(self):
        issues = validate_all(self.departments, self.budgets, self.scenarios)
        overrun_depts = {i.department_id for i in issues if i.severity == "budget_overrun"}
        for i in issues:
            if i.severity in ("conflict", "exclusive") and i.department_id in overrun_depts:
                self.assertEqual(i.overridden_by, "budget_overrun")

    def test_overrun_not_overridden_by_conflict(self):
        issues = validate_all(self.departments, self.budgets, self.scenarios)
        overrun = [i for i in issues if i.severity == "budget_overrun"]
        for i in overrun:
            self.assertIsNone(i.overridden_by)


class TestOptimizer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_ranking_order(self):
        scenarios = [
            ScenarioReport("S1", "A", objective_scores={"cost": 50, "emission_reduction": 90, "fairness": 80}),
            ScenarioReport("S2", "B", objective_scores={"cost": 100, "emission_reduction": 70, "fairness": 60}),
        ]
        result = optimize([], [], scenarios, [])
        self.assertEqual(result.scenario_rankings[0]["scenario_id"], "S1")

    def test_overrun_penalty(self):
        scenarios = [
            ScenarioReport("S1", "A", objective_scores={"cost": 50, "emission_reduction": 90, "fairness": 80},
                           allocations=[ScenarioAllocation("D001", 10000, 11000)]),
        ]
        issues = validate_all([], [BudgetCap("D001", 2026, 10500)], scenarios)
        overrun_depts = {i.department_id for i in issues if i.severity == "budget_overrun"}
        self.assertIn("D001", overrun_depts)

    def test_sensitivity_analysis_structure(self):
        scenarios = [
            ScenarioReport("S1", "A", objective_scores={"cost": 50, "emission_reduction": 90, "fairness": 80}),
        ]
        result = optimize([], [], scenarios, [])
        self.assertIn("equal_weights", result.sensitivity_analysis)
        self.assertIn("ranking_stability", result.sensitivity_analysis)

    def test_reoptimize_after_constraint_change(self):
        scenarios = [
            ScenarioReport("S1", "A", objective_scores={"cost": 50, "emission_reduction": 90, "fairness": 80}),
            ScenarioReport("S2", "B", objective_scores={"cost": 100, "emission_reduction": 70, "fairness": 60}),
        ]
        r1 = optimize([], [], scenarios, [], {"c1": "解释v1"})
        r2 = reoptimize_after_constraint_change([], [], scenarios, [], {"c1": "解释v2"})
        self.assertNotEqual(r1.constraint_version_snapshot, r2.constraint_version_snapshot)


class TestHistoryPersistence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)

    def test_no_duplicate_on_same_data(self):
        init_db()
        run_id = start_run()
        data = {"key": "value", "num": 42}
        ok1 = append_history(run_id, "test_type", data)
        ok2 = append_history(run_id, "test_type", data)
        self.assertTrue(ok1)
        self.assertFalse(ok2)

    def test_different_data_accepted(self):
        init_db()
        run_id = start_run()
        ok1 = append_history(run_id, "test_type", {"key": "a"})
        ok2 = append_history(run_id, "test_type", {"key": "b"})
        self.assertTrue(ok1)
        self.assertTrue(ok2)

    def test_records_survive_reinit(self):
        init_db()
        run_id = start_run()
        append_history(run_id, "persist_test", {"val": 999})
        init_db()
        records = load_history("persist_test")
        self.assertGreaterEqual(len(records), 1)
        found = json.loads(records[-1]["data"])
        self.assertEqual(found["val"], 999)

    def test_run_lifecycle(self):
        init_db()
        run_id = start_run()
        finish_run(run_id)
        records = load_history()


class TestFullPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)

    def test_full_run_twice_no_duplicates(self):
        from main import run_pipeline
        run_pipeline({"budget_cap": "预算超限为最高优先"})
        count_after_first = len(load_history())
        run_pipeline({"budget_cap": "预算超限为最高优先"})
        count_after_second = len(load_history())
        self.assertEqual(count_after_first, count_after_second)


if __name__ == "__main__":
    unittest.main()
