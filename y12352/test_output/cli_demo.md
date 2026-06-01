# 桥梁简支梁受力分析报告

> 生成时间: 2026-06-01 20:11:12

## 1. 原始输入材料

| 项目 | 内容 |
|------|------|
| 导入时间 | 2026-06-01 20:11:11 |
| 梁长度 | 10 m |
| 左支座 | pinned |
| 右支座 | roller |
| 载荷数量 | 3 |

**来源文件:**
- `beam_length`: examples/beam_example.json
- `supports`: command_line
- `load_0`: examples/beam_example.json
- `load_1`: examples/beam_example.json
- `load_2`: examples/beam_example.json
- `notes`: examples/beam_example.json
- `class_notes`: examples/beam_example.json
- `section`: examples/beam_example.json
- `material`: examples/beam_example.json
- `main`: examples/beam_example.json

## 2. 单位系统与校验

| 单位 | 类别 |
|------|------|
| kN/m | distributed_load |
| kN | force |
| m | length |

## 4. 边界条件与载荷清单

### 边界条件
- 左支座: **pinned**
- 右支座: **roller**

### 载荷清单

**#1: concentrated_force** (来源: `examples/beam_example.json`)
- 大小: `10 kN`
- 位置: `3 m`
- 等效力: `10 kN`
- 形心: `3 m`

**#2: concentrated_force** (来源: `examples/beam_example.json`)
- 大小: `20 kN`
- 位置: `7 m`
- 等效力: `20 kN`
- 形心: `7 m`

**#3: uniform_distributed** (来源: `examples/beam_example.json`)
- 大小: `5 kN/m`
- 范围: `0 m` ~ `10 m`
- 等效力: `5e+04 N`
- 形心: `5 m`

## 5. 计算理论与公式

```math
\text{支座反力:}
\sum M_A = 0 \quad \Rightarrow \quad R_{right} = \frac{\sum F_i \cdot a_i}{L}
\sum F_y = 0 \quad \Rightarrow \quad R_{left} = \sum F_i - R_{right}

\text{剪力方程:}
V(x) = R_{left} - \sum F_i \cdot H(x-a_i) - \int_0^x q(\xi) d\xi

\text{弯矩方程:}
M(x) = R_{left} \cdot x - \sum F_i \cdot (x-a_i) \cdot H(x-a_i)

\text{挠曲线方程:}
EI \cdot \frac{d^2 y}{dx^2} = M(x)
```

## 6. 计算结果汇总

| 指标 | 值 |
|------|----|
| 左支座反力 R_left | `38 kN` |
| 右支座反力 R_right | `42 kN` |
| 最大剪力 V_max | `38 kN` |
| 最小剪力 V_min | `-42 kN` |
| 最大弯矩 M_max | `108.4 kN·m` |
| 最小弯矩 M_min | `0 kN·m` |
| 最大挠度 δ_max | `0.5851 m` |
| 剪力零点 (弯矩极值点) | `5.6 m` |

## 7. 关键中间量

**平衡校验:**
- 力平衡误差: `0 kN`
- 矩平衡误差: `0 kN·m`
- 平衡满足: `True`

**反力计算:**
- `R_left = (ΣF * L - ΣM_A) / L`
  变量:
  - `ΣF = 80 kN`
  - `ΣM_A = 420 kN·m`
  - `L = 10 m`
  → `38 kN`
- `R_right = ΣM_A / L`
  变量:
  - `ΣF = 80 kN`
  - `ΣM_A = 420 kN·m`
  - `L = 10 m`
  → `42 kN`

## 8. 计算步骤详情

### 1. 梁基本参数验证
*类型: `validation`*

验证梁长度、边界条件等基本参数的有效性

**输入:**
- `梁长度` = `10 m`
- `左支座` = `pinned`
- `右支座` = `roller`

### 2. 载荷 #1 验证
*类型: `validation`*

验证 concentrated_force 的参数有效性

**输入:**
- `类型` = `concentrated_force`
- `大小` = `10 kN`

### 3. 载荷 #2 验证
*类型: `validation`*

验证 concentrated_force 的参数有效性

**输入:**
- `类型` = `concentrated_force`
- `大小` = `20 kN`

### 4. 载荷 #3 验证
*类型: `validation`*

验证 uniform_distributed 的参数有效性

**输入:**
- `类型` = `uniform_distributed`
- `大小` = `5 kN/m`

### 5. 验证结果
*类型: `validation`*

输入参数验证总结

**输出:**
- `是否有效` = `True`
- `错误数` = `0`
- `警告数` = `0`

### 6. 计算输入参数
*类型: `input`*

简支梁受力计算的原始输入参数

**输入:**
- `梁长度` = `10 m`
- `左支座` = `pinned`
- `右支座` = `roller`
- `载荷数量` = `3`

### 7. 载荷 #1 等效处理
*类型: `load_equivalent`*

将 concentrated_force 转换为等效力和作用点

**输入:**
- `原始载荷` = `10 kN`
- `载荷类型` = `concentrated_force`

**公式:** `F_eq = ∫q(x)dx`

**代入变量:**
- `载荷类型` = `concentrated_force`
- `原始大小` = `10 kN`

**结果:** `10 kN`

**输出:**
- `等效力` = `10 kN`
- `形心位置` = `3 m`

### 8. 载荷 #2 等效处理
*类型: `load_equivalent`*

将 concentrated_force 转换为等效力和作用点

**输入:**
- `原始载荷` = `20 kN`
- `载荷类型` = `concentrated_force`

**公式:** `F_eq = ∫q(x)dx`

**代入变量:**
- `载荷类型` = `concentrated_force`
- `原始大小` = `20 kN`

**结果:** `20 kN`

**输出:**
- `等效力` = `20 kN`
- `形心位置` = `7 m`

### 9. 载荷 #3 等效处理
*类型: `load_equivalent`*

将 uniform_distributed 转换为等效力和作用点

**输入:**
- `原始载荷` = `5 kN/m`
- `载荷类型` = `uniform_distributed`

**公式:** `F_eq = ∫q(x)dx`

**代入变量:**
- `载荷类型` = `uniform_distributed`
- `原始大小` = `5 kN/m`

**结果:** `5e+04 N`

**输出:**
- `等效力` = `5e+04 N`
- `形心位置` = `5 m`

### 10. 左支座反力计算
*类型: `reaction_calculation`*

对右支座取矩，由力矩平衡计算左支座反力

**输入:**
- `ΣF` = `80 kN`
- `ΣM_A` = `420 kN·m`
- `L` = `10 m`

**公式:** `R_left = (ΣF * L - ΣM_A) / L`

**代入变量:**
- `ΣF` = `80 kN`
- `ΣM_A` = `420 kN·m`
- `L` = `10 m`

**结果:** `38 kN`

**输出:**
- `R_left` = `38 kN`

### 11. 右支座反力计算
*类型: `reaction_calculation`*

对左支座取矩，由力矩平衡计算右支座反力

**输入:**
- `ΣF` = `80 kN`
- `ΣM_A` = `420 kN·m`
- `L` = `10 m`

**公式:** `R_right = ΣM_A / L`

**代入变量:**
- `ΣF` = `80 kN`
- `ΣM_A` = `420 kN·m`
- `L` = `10 m`

**结果:** `42 kN`

**输出:**
- `R_right` = `42 kN`

### 12. 平衡条件校验
*类型: `equilibrium`*

验证竖向力平衡和力矩平衡

**输入:**
- `总反力` = `80 kN`
- `总荷载` = `80 kN`

**公式:** `ΣFy = R_left + R_right - ΣF_loads = 0`

**代入变量:**
- `R_left` = `38 kN`
- `R_right` = `42 kN`
- `ΣF_loads` = `80 kN`

**结果:** `0 kN`

**输出:**
- `力平衡误差` = `0 kN`
- `矩平衡误差` = `0 kN·m`
- `平衡满足` = `True`

### 13. 剪力图计算
*类型: `shear_calculation`*

沿梁长各截面的剪力值计算

**公式:** `V(x) = R_left - ΣF_loads(left of x)`

**代入变量:**
- `R_left` = `38 kN`

**结果:** `101 个计算点`

**输出:**
- `最大剪力` = `38 kN`

### 14. 弯矩图计算
*类型: `moment_calculation`*

沿梁长各截面的弯矩值计算

**公式:** `M(x) = R_left * x - ΣM_loads(left of x)`

**代入变量:**
- `R_left` = `38 kN`

**结果:** `101 个计算点`

**输出:**
- `最大弯矩` = `108.4 kN·m`

### 15. 弯矩图计算
*类型: `moment_calculation`*

沿梁长各截面的弯矩值计算

**公式:** `M(x) = R_left * x - ΣM_loads(left of x)`

**代入变量:**
- `R_left` = `38 kN`

**结果:** `101 个计算点`

**输出:**
- `最大弯矩` = `108.4 kN·m`

### 16. 挠度计算
*类型: `deflection_calculation`*

基于挠曲线微分方程的数值积分计算

**公式:** `EI * d²y/dx² = M(x)`

**代入变量:**
- `E` = `2.06e+05 MPa`
- `I` = `2.37e-05 m^4`
- `EI` = `4.882e+06 N·m`

**结果:** `101 个计算点`

**输出:**
- `最大挠度` = `0.5851 m`

### 17. 计算结果汇总
*类型: `summary`*

简支梁受力计算的主要结果汇总

**输出:**
- `左支座反力` = `38 kN`
- `右支座反力` = `42 kN`
- `最大剪力` = `38 kN`
- `最小剪力` = `-42 kN`
- `最大弯矩` = `108.4 kN·m`
- `最小弯矩` = `0 kN·m`
- `最大挠度` = `0.5851 m`
- `平衡校验` = `True`

### 18. 梁基本参数验证
*类型: `validation`*

验证梁长度、边界条件等基本参数的有效性

**输入:**
- `梁长度` = `10 m`
- `左支座` = `pinned`
- `右支座` = `roller`

### 19. 载荷 #1 验证
*类型: `validation`*

验证 concentrated_force 的参数有效性

**输入:**
- `类型` = `concentrated_force`
- `大小` = `10 kN`

### 20. 载荷 #2 验证
*类型: `validation`*

验证 concentrated_force 的参数有效性

**输入:**
- `类型` = `concentrated_force`
- `大小` = `20 kN`

### 21. 载荷 #3 验证
*类型: `validation`*

验证 uniform_distributed 的参数有效性

**输入:**
- `类型` = `uniform_distributed`
- `大小` = `5 kN/m`

### 22. 验证结果
*类型: `validation`*

输入参数验证总结

**输出:**
- `是否有效` = `True`
- `错误数` = `0`
- `警告数` = `0`

## 10. 图表文件
![shear](/Users/mac/pro/solo/workspaces/y12352/output/beam_shear.png)
![moment](/Users/mac/pro/solo/workspaces/y12352/output/beam_moment.png)
![deflection](/Users/mac/pro/solo/workspaces/y12352/output/beam_deflection.png)
![combined](/Users/mac/pro/solo/workspaces/y12352/output/beam_combined.png)
- **data**: `/Users/mac/pro/solo/workspaces/y12352/output/beam_diagrams_data.csv`
![load_diagram](/Users/mac/pro/solo/workspaces/y12352/output/beam_loads.png)

## 11. 平衡条件校验

**状态:** ✅ 通过
- 总竖向反力: `80 kN`

---
*报告由桥梁简支梁受力器自动生成*