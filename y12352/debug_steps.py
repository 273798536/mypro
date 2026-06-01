#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from beam_calculator.units import Unit, Quantity
from beam_calculator.models import Beam, Load, LoadType, BoundaryCondition
from beam_calculator.calculator import BeamCalculator
from beam_calculator.warnings import WarningCollector
from beam_calculator.steps import StepTracker

output = []

steps = StepTracker()
warnings = WarningCollector()
output.append(f'Initial steps length: {len(steps)}')

beam = Beam(length=Quantity(10, Unit.M), left_support=BoundaryCondition.PINNED, right_support=BoundaryCondition.ROLLER)
beam.add_load(Load(load_type=LoadType.CONCENTRATED_FORCE, magnitude=Quantity(10, Unit.KN), position=Quantity(5, Unit.M)))

calc = BeamCalculator(warning_collector=warnings, step_tracker=steps, num_points=100)
output.append(f'After creating calculator, steps length: {len(steps)}')
output.append(f'calc.steps is steps: {calc.steps is steps}')
output.append(f'calc.validator.steps is steps: {calc.validator.steps is steps}')

result = calc.calculate(beam)
output.append(f'After calculation, steps length: {len(steps)}')
for i, step in enumerate(steps):
    output.append(f'  Step {i+1}: {step.title}')

output.append(f'Left reaction: {result.left_reaction}')
output.append(f'Right reaction: {result.right_reaction}')

with open('/tmp/debug_output.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print('\n'.join(output))
