"""

线性规划排产解释器

核心模块：数据模型、求解器、约束解释、方案对比、报告生成

"""

from .models import Order, Machine, Material, Inventory, ProductionPlan, ScheduledTask

from .solver import ProductionSolver

from .interpreter import ConstraintInterpreter

from .comparator import PlanComparator

from .tracer import ChangeTracer, ActionType

from .io_utils import DataImporter, ReportGenerator

__version__ = "1.0.0"

__all__ = [

    "Order",

    "Machine",

    "Material",

    "Inventory",

    "ProductionPlan",

    "ScheduledTask",

    "ProductionSolver",

    "ConstraintInterpreter",

    "PlanComparator",

    "ChangeTracer",

    "ActionType",

    "DataImporter",

    "ReportGenerator",

]

