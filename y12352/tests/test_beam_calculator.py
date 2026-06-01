import unittest
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from beam_calculator.units import Unit, Quantity, UnitSystem, UnitCategory
from beam_calculator.models import Beam, Load, LoadType, BoundaryCondition
from beam_calculator.validator import InputValidator
from beam_calculator.calculator import BeamCalculator
from beam_calculator.warnings import WarningCollector, WarningType, WarningLevel
from beam_calculator.steps import StepTracker, StepType


class TestUnitSystem(unittest.TestCase):
    def test_unit_conversion_length(self):
        q1 = Quantity(100, Unit.CM)
        q2 = q1.convert_to(Unit.M)
        self.assertAlmostEqual(q2.value, 1.0, places=6)

    def test_unit_conversion_force(self):
        q1 = Quantity(1, Unit.KN)
        q2 = q1.convert_to(Unit.N)
        self.assertAlmostEqual(q2.value, 1000.0, places=6)

    def test_quantity_arithmetic(self):
        q1 = Quantity(10, Unit.KN)
        q2 = Quantity(5000, Unit.N)
        result = q1 + q2
        self.assertAlmostEqual(result.value, 15.0, places=6)
        self.assertEqual(result.unit, Unit.KN)

    def test_unit_consistency_check(self):
        us = UnitSystem.metric_engineering()
        quantities = {
            "beam_length": Quantity(10, Unit.CM),
            "load1": Quantity(10, Unit.KN),
        }
        is_consistent, mismatches = us.check_consistency(quantities)
        self.assertFalse(is_consistent)
        self.assertIn("beam_length", mismatches)


class TestBeamModel(unittest.TestCase):
    def test_create_simple_beam(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        self.assertEqual(beam.length.value, 10)
        self.assertEqual(beam.left_support, BoundaryCondition.PINNED)

    def test_concentrated_load_validation(self):
        beam = Beam(length=Quantity(10, Unit.M))
        load = Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10, Unit.KN),
            position=Quantity(5, Unit.M),
        )
        errors = load.validate(beam.length)
        self.assertEqual(len(errors), 0)

    def test_out_of_bounds_load(self):
        beam = Beam(length=Quantity(10, Unit.M))
        load = Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10, Unit.KN),
            position=Quantity(15, Unit.M),
        )
        errors = load.validate(beam.length)
        self.assertTrue(any("超出梁范围" in e for e in errors))


class TestBeamCalculation(unittest.TestCase):
    def test_simple_supported_with_central_load(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10, Unit.KN),
            position=Quantity(5, Unit.M),
        ))

        calc = BeamCalculator(num_points=100)
        result = calc.calculate(beam)

        self.assertAlmostEqual(result.left_reaction.value, 5, places=3)
        self.assertAlmostEqual(result.right_reaction.value, 5, places=3)
        self.assertAlmostEqual(result.max_bending_moment.value, 25, places=2)

    def test_uniform_load_entire_span(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.UNIFORM_DISTRIBUTED,
            magnitude=Quantity(10, Unit.KN_M),
            start_position=Quantity(0, Unit.M),
            end_position=Quantity(10, Unit.M),
        ))

        calc = BeamCalculator(num_points=100)
        result = calc.calculate(beam)

        self.assertAlmostEqual(result.left_reaction.value, 50, places=2)
        self.assertAlmostEqual(result.right_reaction.value, 50, places=2)
        self.assertAlmostEqual(result.max_bending_moment.value, 125, places=1)

    def test_equilibrium_check(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10, Unit.KN),
            position=Quantity(3, Unit.M),
        ))
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(20, Unit.KN),
            position=Quantity(7, Unit.M),
        ))

        calc = BeamCalculator(num_points=100)
        result = calc.calculate(beam)

        self.assertTrue(result.equilibrium_check)
        self.assertAlmostEqual(
            result.left_reaction.value + result.right_reaction.value,
            30, places=3
        )

    def test_multiple_load_types(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10, Unit.KN),
            position=Quantity(2, Unit.M),
        ))
        beam.add_load(Load(
            load_type=LoadType.UNIFORM_DISTRIBUTED,
            magnitude=Quantity(5, Unit.KN_M),
            start_position=Quantity(4, Unit.M),
            end_position=Quantity(8, Unit.M),
        ))

        calc = BeamCalculator(num_points=100)
        result = calc.calculate(beam)

        self.assertTrue(result.equilibrium_check)

        R_left_expected = (10 * (10 - 2) + 5 * 4 * (10 - 6)) / 10
        R_right_expected = 30 - R_left_expected

        self.assertAlmostEqual(result.left_reaction.value, R_left_expected, places=2)
        self.assertAlmostEqual(result.right_reaction.value, R_right_expected, places=2)

    def test_shear_zero_crossing(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10, Unit.KN),
            position=Quantity(5, Unit.M),
        ))

        calc = BeamCalculator(num_points=200)
        result = calc.calculate(beam)

        self.assertTrue(any(abs(pos.value - 5.0) < 0.1 for pos in result.shear_force_zero_positions))

    def test_triangular_load(self):
        beam = Beam(
            length=Quantity(6, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.TRIANGULAR_DISTRIBUTED,
            magnitude=Quantity(6, Unit.KN_M),
            start_position=Quantity(0, Unit.M),
            end_position=Quantity(6, Unit.M),
        ))

        calc = BeamCalculator(num_points=100)
        result = calc.calculate(beam)

        total_load = 0.5 * 6 * 6
        self.assertTrue(result.equilibrium_check)
        self.assertAlmostEqual(
            result.left_reaction.value + result.right_reaction.value,
            total_load, places=2
        )


class TestValidation(unittest.TestCase):
    def test_unit_mismatch_warning(self):
        beam = Beam(
            length=Quantity(1000, Unit.CM),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10000, Unit.N),
            position=Quantity(500, Unit.CM),
        ))

        warnings = WarningCollector()
        validator = InputValidator(warning_collector=warnings)
        result = validator.validate_beam(beam)

        self.assertTrue(result)
        unit_warnings = warnings.get_by_type(WarningType.UNIT_MISMATCH)
        self.assertTrue(len(unit_warnings) > 0)

    def test_overlapping_loads_warning(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.UNIFORM_DISTRIBUTED,
            magnitude=Quantity(10, Unit.KN_M),
            start_position=Quantity(2, Unit.M),
            end_position=Quantity(6, Unit.M),
        ))
        beam.add_load(Load(
            load_type=LoadType.UNIFORM_DISTRIBUTED,
            magnitude=Quantity(5, Unit.KN_M),
            start_position=Quantity(4, Unit.M),
            end_position=Quantity(8, Unit.M),
        ))

        warnings = WarningCollector()
        validator = InputValidator(warning_collector=warnings)
        result = validator.validate_beam(beam)

        self.assertTrue(result)
        overlap_warnings = warnings.get_by_type(WarningType.OVERLAPPING_LOADS)
        self.assertTrue(len(overlap_warnings) > 0)


class TestStepTracking(unittest.TestCase):
    def test_steps_are_recorded(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10, Unit.KN),
            position=Quantity(5, Unit.M),
        ))

        steps = StepTracker()
        calc = BeamCalculator(step_tracker=steps)
        result = calc.calculate(beam)

        self.assertTrue(len(steps) > 0)
        reaction_steps = steps.get_steps_by_type(StepType.REACTION_CALCULATION)
        self.assertTrue(len(reaction_steps) > 0)

        formula_found = any(
            step.formula is not None
            for step in reaction_steps
        )
        self.assertTrue(formula_found)


class TestUnitMixedInput(unittest.TestCase):
    def test_mixed_units_calculation(self):
        beam = Beam(
            length=Quantity(500, Unit.CM),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(10000, Unit.N),
            position=Quantity(250, Unit.CM),
        ))

        us = UnitSystem.metric_engineering()
        calc = BeamCalculator(unit_system=us, num_points=100)
        result = calc.calculate(beam)

        self.assertAlmostEqual(result.left_reaction.value, 5, places=3)
        self.assertAlmostEqual(result.right_reaction.value, 5, places=3)


class TestWarningCollector(unittest.TestCase):
    def test_negative_reaction_warning(self):
        beam = Beam(
            length=Quantity(10, Unit.M),
            left_support=BoundaryCondition.PINNED,
            right_support=BoundaryCondition.ROLLER,
        )
        beam.add_load(Load(
            load_type=LoadType.CONCENTRATED_FORCE,
            magnitude=Quantity(-10, Unit.KN),
            position=Quantity(1, Unit.M),
        ))

        warnings = WarningCollector()
        calc = BeamCalculator(warning_collector=warnings)
        result = calc.calculate(beam)

        negative_warnings = warnings.get_by_type(WarningType.NEGATIVE_REACTION)
        self.assertTrue(len(negative_warnings) > 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
