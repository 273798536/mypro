"""

线性规划排产求解器

使用PuLP构建生产排产优化模型，目标是最小化延期和最大化产能利用率

"""

import pulp

from datetime import date, timedelta

from typing import List, Dict, Tuple, Optional

from .models import Order, Machine, Material, Inventory, ProductionPlan, ScheduledTask

class ProductionSolver:

    def __init__(

        self,

        orders: List[Order],

        machines: List[Machine],

        materials: List[Material],

        inventory: List[Inventory],

        horizon_days: int = 30,

    ):

        self.orders = orders

        self.machines = machines

        self.materials = {m.material_id: m for m in materials}

        self.inventory = {inv.material_id: inv.quantity for inv in inventory}

        self.horizon_days = horizon_days

        self.start_date = date.today()

        self.dates = [self.start_date + timedelta(days=i) for i in range(horizon_days)]

        self.problem = None

        self.variables = {}

        self.constraints = []

        self.solution = None

    def solve(self, plan_name: str = "生产计划") -> ProductionPlan:

        self._build_model()

        status = self.problem.solve(pulp.PULP_CBC_CMD(msg=False))

        is_feasible = pulp.LpStatus[status] == "Optimal"

        self._extract_solution()

        plan = self._generate_plan(plan_name, is_feasible)

        return plan

    def _build_model(self):

        self.problem = pulp.LpProblem("ProductionScheduling", pulp.LpMinimize)

        self._create_variables()

        self._add_objective()

        self._add_machine_capacity_constraints()

        self._add_order_completion_constraints()

        self._add_inventory_constraints()

        self._add_machine_assignment_constraints()

    def _create_variables(self):

        for order in self.orders:

            for machine in self._get_eligible_machines(order):

                for d_idx, _ in enumerate(self.dates):

                    var_name = f"x_{order.order_id}_{machine.machine_id}_{d_idx}"

                    self.variables[var_name] = pulp.LpVariable(

                        var_name, lowBound=0, cat=pulp.LpContinuous

                    )

        for order in self.orders:

            delay_var_name = f"delay_{order.order_id}"

            self.variables[delay_var_name] = pulp.LpVariable(

                delay_var_name, lowBound=0, cat=pulp.LpContinuous

            )

    def _get_eligible_machines(self, order: Order) -> List[Machine]:

        if order.required_machine:

            return [m for m in self.machines if m.machine_id == order.required_machine]

        return self.machines

    def _add_objective(self):

        obj = 0

        for order in self.orders:

            delay_var = self.variables[f"delay_{order.order_id}"]

            obj += order.priority * 1000 * delay_var

        for order in self.orders:

            for machine in self._get_eligible_machines(order):

                for d_idx, _ in enumerate(self.dates):

                    var = self.variables[f"x_{order.order_id}_{machine.machine_id}_{d_idx}"]

                    obj += 1 * d_idx * var

        self.problem += obj

    def _add_machine_capacity_constraints(self):

        for machine in self.machines:

            for d_idx, current_date in enumerate(self.dates):

                if current_date in machine.maintenance_dates:

                    available_hours = 0

                else:

                    available_hours = machine.available_hours_per_day

                total_hours = 0

                for order in self.orders:

                    if machine in self._get_eligible_machines(order):

                        var = self.variables[f"x_{order.order_id}_{machine.machine_id}_{d_idx}"]

                        total_hours += var * order.process_hours_per_unit

                constraint_name = f"capacity_{machine.machine_id}_{d_idx}"

                self.problem += total_hours <= available_hours, constraint_name

                self.constraints.append(

                    {

                        "name": constraint_name,

                        "type": "machine_capacity",

                        "machine_id": machine.machine_id,

                        "date": current_date,

                        "limit": available_hours,

                    }

                )

    def _add_order_completion_constraints(self):

        for order in self.orders:

            total_production = 0

            for machine in self._get_eligible_machines(order):

                for d_idx, _ in enumerate(self.dates):

                    var = self.variables[f"x_{order.order_id}_{machine.machine_id}_{d_idx}"]

                    total_production += var

            constraint_name = f"completion_{order.order_id}"

            self.problem += total_production >= order.quantity, constraint_name

            self.constraints.append(

                {

                    "name": constraint_name,

                    "type": "order_completion",

                    "order_id": order.order_id,

                    "required": order.quantity,

                }

            )

            due_date_idx = self._get_date_index(order.due_date)

            if due_date_idx is not None and due_date_idx >= 0:

                production_before_due = 0

                for machine in self._get_eligible_machines(order):

                    for d_idx in range(due_date_idx + 1):

                        var = self.variables[f"x_{order.order_id}_{machine.machine_id}_{d_idx}"]

                        production_before_due += var

                delay_var = self.variables[f"delay_{order.order_id}"]

                constraint_name = f"duedate_{order.order_id}"

                self.problem += production_before_due + delay_var >= order.quantity, constraint_name

                self.constraints.append(

                    {

                        "name": constraint_name,

                        "type": "due_date",

                        "order_id": order.order_id,

                        "due_date": order.due_date,

                        "due_date_idx": due_date_idx,

                    }

                )

    def _add_inventory_constraints(self):

        for material_id, material in self.materials.items():

            for d_idx, current_date in enumerate(self.dates):

                consumption = 0

                for order in self.orders:

                    if material_id in order.material_requirements:

                        req_per_unit = order.material_requirements[material_id]

                        for machine in self._get_eligible_machines(order):

                            for past_idx in range(d_idx + 1):

                                var = self.variables[f"x_{order.order_id}_{machine.machine_id}_{past_idx}"]

                                consumption += var * req_per_unit

                available = self.inventory.get(material_id, 0)

                constraint_name = f"inventory_{material_id}_{d_idx}"

                self.problem += consumption <= available, constraint_name

                self.constraints.append(

                    {

                        "name": constraint_name,

                        "type": "inventory",

                        "material_id": material_id,

                        "date": current_date,

                        "available": available,

                    }

                )

    def _add_machine_assignment_constraints(self):

        pass

    def _get_date_index(self, target_date: date) -> Optional[int]:

        for idx, d in enumerate(self.dates):

            if d >= target_date:

                return idx

        return None

    def _extract_solution(self):

        self.solution = {}

        for var_name, var in self.variables.items():

            value = pulp.value(var)

            if value is not None and abs(value) > 1e-6:

                self.solution[var_name] = value

    def _generate_plan(self, plan_name: str, is_feasible: bool) -> ProductionPlan:

        plan = ProductionPlan(

            plan_id=f"plan_{int(date.today().strftime('%Y%m%d'))}",

            name=plan_name,

            start_date=self.start_date,

            is_feasible=is_feasible,

            objective_value=pulp.value(self.problem.objective) if self.problem.objective else 0,

        )

        scheduled_orders = set()

        task_dict: Dict[Tuple[str, str], Dict] = {}

        for var_name, value in self.solution.items():

            if var_name.startswith("x_"):

                parts = var_name.split("_")

                order_id = parts[1]

                machine_id = parts[2]

                d_idx = int(parts[3])

                key = (order_id, machine_id)

                if key not in task_dict:

                    task_dict[key] = {

                        "start_idx": d_idx,

                        "end_idx": d_idx,

                        "quantity": 0,

                        "hours": 0,

                    }

                task_dict[key]["quantity"] += value

                order = next(o for o in self.orders if o.order_id == order_id)

                task_dict[key]["hours"] += value * order.process_hours_per_unit

                if d_idx < task_dict[key]["start_idx"]:

                    task_dict[key]["start_idx"] = d_idx

                if d_idx > task_dict[key]["end_idx"]:

                    task_dict[key]["end_idx"] = d_idx

                scheduled_orders.add(order_id)

        for (order_id, machine_id), data in task_dict.items():

            order = next(o for o in self.orders if o.order_id == order_id)

            start_date = self.dates[data["start_idx"]]

            end_date = self.dates[data["end_idx"]]

            due_date_idx = self._get_date_index(order.due_date)

            is_delayed = due_date_idx is not None and data["end_idx"] > due_date_idx

            task = ScheduledTask(

                order_id=order_id,

                machine_id=machine_id,

                start_date=start_date,

                end_date=end_date,

                quantity=data["quantity"],

                hours_needed=data["hours"],

                is_delayed=is_delayed,

                delay_reason="交期冲突" if is_delayed else "",

            )

            plan.scheduled_tasks.append(task)

        for order in self.orders:

            if order.order_id not in scheduled_orders:

                plan.unscheduled_orders.append(order.order_id)

        plan.end_date = max(

            (task.end_date for task in plan.scheduled_tasks), default=self.start_date

        )

        return plan

