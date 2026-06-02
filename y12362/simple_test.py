
import sys
import os
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12362/robot_joint_checker')

from src.torque_calculator import TorqueCalculator

calc = TorqueCalculator()

# 简单测试
angles = [0, 15, 30]
times = [0.0, 0.1, 0.2]
vels = calc._calculate_velocities(angles, times)
print("Test 1 - Simple:")
print(f"  Expected: 150.0, Got: {vels[1]}")
print(f"  PASS: {abs(vels[1] - 150.0) < 0.01}")

# 检查是否有math.degrees放大
print("\nTest 2 - No degrees amplification:")
print(f"  If bug existed, 150 would become 8594 (150*57.3)")
print(f"  Our result: {vels[1]}")
print(f"  PASS: {vels[1] < 1000}")

print("\nAll tests passed!" if abs(vels[1] - 150.0) < 0.01 else "FAILED")
