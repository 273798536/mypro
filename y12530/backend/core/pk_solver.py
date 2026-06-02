import numpy as np
from scipy.integrate import odeint, solve_ivp
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum
import warnings
import hashlib
import json


class CompartmentModel(Enum):
    ONE_COMPARTMENT = "one_compartment"
    TWO_COMPARTMENT = "two_compartment"


@dataclass
class PKResult:
    time_points: np.ndarray
    concentrations: Dict[str, np.ndarray]
    parameters: Dict[str, Any]
    dosing_plan: Dict[str, Any]
    model_type: str
    solver_method: str
    success: bool
    error_message: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    computation_hash: str = ""
    sampling_points: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        conc_dict = {k: v.tolist() for k, v in self.concentrations.items()}
        return {
            "time_points": self.time_points.tolist(),
            "concentrations": conc_dict,
            "parameters": self.parameters,
            "dosing_plan": self.dosing_plan,
            "model_type": self.model_type,
            "solver_method": self.solver_method,
            "success": self.success,
            "error_message": self.error_message,
            "warnings": self.warnings,
            "computation_hash": self.computation_hash,
            "sampling_points": self.sampling_points
        }


class PKSolver:
    def __init__(self, seed: int = 42):
        self.seed = seed
        np.random.seed(seed)
        warnings.filterwarnings('error', category=RuntimeWarning)

    def _compute_hash(self, params: Dict[str, Any], dosing_plan: Dict[str, Any]) -> str:
        data = {
            "params": params,
            "dosing_plan": dosing_plan,
            "seed": self.seed
        }
        json_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(json_str.encode('utf-8')).hexdigest()

    def _get_elimination_rate(self, half_life: float) -> float:
        return np.log(2) / half_life

    def _one_compartment_iv_bolus(self, t: np.ndarray, dose: float, vd: float, ke: float) -> np.ndarray:
        return (dose / vd) * np.exp(-ke * t)

    def _one_compartment_iv_infusion(self, t: np.ndarray, dose: float, duration: float, vd: float, ke: float) -> np.ndarray:
        k0 = dose / duration
        c = np.zeros_like(t)
        mask_infusion = t <= duration
        mask_post = t > duration
        c[mask_infusion] = (k0 / (vd * ke)) * (1 - np.exp(-ke * t[mask_infusion]))
        c[mask_post] = (k0 / (vd * ke)) * (1 - np.exp(-ke * duration)) * np.exp(-ke * (t[mask_post] - duration))
        return c

    def _one_compartment_oral(self, t: np.ndarray, dose: float, vd: float, ke: float, ka: float, f: float = 1.0) -> np.ndarray:
        if ka == ke:
            return (f * dose * ka / vd) * t * np.exp(-ke * t)
        return (f * dose * ka / (vd * (ka - ke))) * (np.exp(-ke * t) - np.exp(-ka * t))

    def _two_compartment_iv_bolus(self, t: np.ndarray, dose: float, v1: float, k10: float, k12: float, k21: float) -> np.ndarray:
        alpha = k12 + k21 + k10
        a = (alpha + np.sqrt(alpha**2 - 4 * k10 * k21)) / 2
        b = (alpha - np.sqrt(alpha**2 - 4 * k10 * k21)) / 2
        A = (dose / v1) * (a - k21) / (a - b)
        B = (dose / v1) * (k21 - b) / (a - b)
        return A * np.exp(-a * t) + B * np.exp(-b * t)

    def _two_compartment_iv_infusion(self, t: np.ndarray, dose: float, duration: float, v1: float, k10: float, k12: float, k21: float) -> np.ndarray:
        k0 = dose / duration
        alpha = k12 + k21 + k10
        a = (alpha + np.sqrt(alpha**2 - 4 * k10 * k21)) / 2
        b = (alpha - np.sqrt(alpha**2 - 4 * k10 * k21)) / 2
        c = np.zeros_like(t)
        mask_infusion = t <= duration
        mask_post = t > duration
        term1 = k0 / (v1 * k10)
        term2 = 1 - ((a - k21) / (a * (a - b))) * np.exp(-a * t[mask_infusion])
        term3 = -((k21 - b) / (b * (a - b))) * np.exp(-b * t[mask_infusion])
        c[mask_infusion] = term1 * (1 + term2 + term3)
        t_post = t[mask_post] - duration
        c_inf_end = self._two_compartment_iv_bolus(np.array([duration]), dose, v1, k10, k12, k21)[0]
        c[mask_post] = c_inf_end * np.exp(-k10 * t_post)
        return c

    def _generate_time_points(self, total_duration: float, time_step: float, max_points: int = 10000) -> np.ndarray:
        n_points = min(int(total_duration / time_step) + 1, max_points)
        return np.linspace(0, total_duration, n_points)

    def _apply_dosing_events(self, t: np.ndarray, events: List[Dict[str, Any]], params: Dict[str, Any], model_type: CompartmentModel) -> np.ndarray:
        c = np.zeros_like(t)
        for event in events:
            t_event = event["time"]
            dose = event["dose"]
            route = event["route"]
            duration = event.get("duration")
            mask = t >= t_event
            t_rel = t[mask] - t_event
            if model_type == CompartmentModel.ONE_COMPARTMENT:
                vd = params["vd"]
                ke = params["ke"]
                if route == "iv_bolus":
                    c[mask] += self._one_compartment_iv_bolus(t_rel, dose, vd, ke)
                elif route == "iv_infusion":
                    c[mask] += self._one_compartment_iv_infusion(t_rel, dose, duration, vd, ke)
                elif route in ["oral", "sc", "im"]:
                    ka = params.get("ka", 1.0)
                    f = params.get("f", 1.0)
                    c[mask] += self._one_compartment_oral(t_rel, dose, vd, ke, ka, f)
            elif model_type == CompartmentModel.TWO_COMPARTMENT:
                v1 = params["v1"]
                k10 = params["k10"]
                k12 = params["k12"]
                k21 = params["k21"]
                if route == "iv_bolus":
                    c[mask] += self._two_compartment_iv_bolus(t_rel, dose, v1, k10, k12, k21)
                elif route == "iv_infusion":
                    c[mask] += self._two_compartment_iv_infusion(t_rel, dose, duration, v1, k10, k12, k21)
                elif route in ["oral", "sc", "im"]:
                    ka = params.get("ka", 1.0)
                    f = params.get("f", 1.0)
                    ke = k10
                    vd = v1
                    c[mask] += self._one_compartment_oral(t_rel, dose, vd, ke, ka, f)
        return c

    def _solve_ode_numerical(self, params: Dict[str, Any], dosing_plan: Dict[str, Any], time_points: np.ndarray, model_type: CompartmentModel) -> Dict[str, np.ndarray]:
        events = dosing_plan["events"]
        def ode_func(y, t):
            if model_type == CompartmentModel.ONE_COMPARTMENT:
                c = y[0]
                ke = params["ke"]
                rate = -ke * c
                for event in events:
                    if abs(t - event["time"]) < 1e-6:
                        if event["route"] == "iv_bolus":
                            rate += event["dose"] / params["vd"]
                return [rate]
            else:
                c1, c2 = y
                k10 = params["k10"]
                k12 = params["k12"]
                k21 = params["k21"]
                dc1 = -(k10 + k12) * c1 + k21 * c2
                dc2 = k12 * c1 - k21 * c2
                for event in events:
                    if abs(t - event["time"]) < 1e-6:
                        if event["route"] == "iv_bolus":
                            dc1 += event["dose"] / params["v1"]
                return [dc1, dc2]
        y0 = [0.0] if model_type == CompartmentModel.ONE_COMPARTMENT else [0.0, 0.0]
        try:
            solution = odeint(ode_func, y0, time_points, full_output=False)
            if np.any(np.isnan(solution)) or np.any(np.isinf(solution)):
                raise ValueError("ODE求解产生NaN或Inf值")
            result = {}
            if model_type == CompartmentModel.ONE_COMPARTMENT:
                result["central"] = solution[:, 0]
            else:
                result["central"] = solution[:, 0]
                result["peripheral"] = solution[:, 1]
            return result
        except Exception as e:
            raise RuntimeError(f"ODE数值求解失败: {str(e)}")

    def solve(self, params: Dict[str, Any], dosing_plan: Dict[str, Any], model_type: str = "one_compartment", time_step: float = 0.1, use_analytical: bool = True, sampling_points: Optional[List[Dict[str, Any]]] = None) -> PKResult:
        warnings_list = []
        try:
            model_enum = CompartmentModel(model_type)
        except ValueError:
            return PKResult(
                time_points=np.array([]),
                concentrations={},
                parameters=params,
                dosing_plan=dosing_plan,
                model_type=model_type,
                solver_method="analytical" if use_analytical else "numerical",
                success=False,
                error_message=f"不支持的模型类型: {model_type}",
                warnings=[],
                computation_hash=""
            )
        comp_hash = self._compute_hash(params, dosing_plan)
        try:
            if model_enum == CompartmentModel.ONE_COMPARTMENT:
                required = ["half_life", "vd", "weight"]
                for r in required:
                    if r not in params:
                        return PKResult(
                            time_points=np.array([]),
                            concentrations={},
                            parameters=params,
                            dosing_plan=dosing_plan,
                            model_type=model_type,
                            solver_method="analytical",
                            success=False,
                            error_message=f"缺少必需参数: {r}",
                            warnings=warnings_list,
                            computation_hash=comp_hash
                        )
                half_life = params["half_life"]
                vd_kg = params["vd"]
                weight = params["weight"]
                vd = vd_kg * weight
                ke = self._get_elimination_rate(half_life)
                calc_params = {
                    **params,
                    "vd": vd,
                    "ke": ke,
                    "vd_per_kg": vd_kg
                }
            else:
                required = ["half_life_alpha", "half_life_beta", "v1", "k12", "k21", "weight"]
                for r in required:
                    if r not in params:
                        return PKResult(
                            time_points=np.array([]),
                            concentrations={},
                            parameters=params,
                            dosing_plan=dosing_plan,
                            model_type=model_type,
                            solver_method="analytical",
                            success=False,
                            error_message=f"缺少必需参数: {r}",
                            warnings=warnings_list,
                            computation_hash=comp_hash
                        )
                v1_kg = params["v1"]
                weight = params["weight"]
                v1 = v1_kg * weight
                k10 = np.log(2) / params["half_life_alpha"]
                calc_params = {
                    **params,
                    "v1": v1,
                    "k10": k10,
                    "v1_per_kg": v1_kg
                }
            total_duration = dosing_plan.get("total_duration", 24.0)
            t = self._generate_time_points(total_duration, time_step)
            events = dosing_plan.get("events", [])
            if use_analytical:
                solver_method = "analytical"
                concentrations = {}
                if model_enum == CompartmentModel.ONE_COMPARTMENT:
                    c_central = self._apply_dosing_events(t, events, calc_params, model_enum)
                    concentrations["central"] = c_central
                else:
                    c_central = self._apply_dosing_events(t, events, calc_params, model_enum)
                    v1 = calc_params["v1"]
                    k12 = calc_params["k12"]
                    k21 = calc_params["k21"]
                    c_peripheral = (k12 / k21) * c_central
                    concentrations["central"] = c_central
                    concentrations["peripheral"] = c_peripheral
            else:
                solver_method = "numerical_odeint"
                concentrations = self._solve_ode_numerical(calc_params, dosing_plan, t, model_enum)
            if np.any(np.isnan(concentrations["central"])):
                warnings_list.append("警告: 部分浓度计算结果为NaN，可能由于数值稳定性问题")
            if np.any(concentrations["central"] < 0):
                warnings_list.append("警告: 部分浓度计算结果为负值，已截断为0")
                for k in concentrations:
                    concentrations[k] = np.maximum(concentrations[k], 0)
            result = PKResult(
                time_points=t,
                concentrations=concentrations,
                parameters=calc_params,
                dosing_plan=dosing_plan,
                model_type=model_type,
                solver_method=solver_method,
                success=True,
                error_message=None,
                warnings=warnings_list,
                computation_hash=comp_hash,
                sampling_points=sampling_points or []
            )
            return result
        except Exception as e:
            error_detail = self._analyze_error(e, params, dosing_plan)
            return PKResult(
                time_points=np.array([]),
                concentrations={},
                parameters=params,
                dosing_plan=dosing_plan,
                model_type=model_type,
                solver_method="analytical" if use_analytical else "numerical",
                success=False,
                error_message=error_detail,
                warnings=warnings_list,
                computation_hash=comp_hash
            )

    def _analyze_error(self, error: Exception, params: Dict[str, Any], dosing_plan: Dict[str, Any]) -> str:
        msg = str(error)
        if "NaN" in msg or "Inf" in msg or "divide by zero" in msg:
            return (f"数值稳定性错误: {msg}\n"
                    f"可能原因:\n"
                    f"  1. 消除速率常数过大 (半衰期过短)\n"
                    f"  2. 时间步长过大导致数值不稳定\n"
                    f"  3. 参数值超出合理范围\n"
                    f"建议:\n"
                    f"  - 检查半衰期: {params.get('half_life', '未提供')}\n"
                    f"  - 尝试减小时间步长\n"
                    f"  - 验证参数单位是否正确")
        elif "step size" in msg.lower() or "stepsize" in msg.lower():
            return (f"求解器步长错误: {msg}\n"
                    f"原因: ODE求解器无法在指定精度下找到合适的步长\n"
                    f"建议:\n"
                    f"  - 减小时间步长\n"
                    f"  - 检查给药时间点是否过于密集\n"
                    f"  - 尝试使用解析解法")
        elif "maximum number of steps" in msg.lower():
            return (f"求解迭代次数超限: {msg}\n"
                    f"原因: 模拟时间过长或系统刚性过大\n"
                    f"建议:\n"
                    f"  - 减小总模拟时间\n"
                    f"  - 增大时间步长\n"
                    f"  - 使用刚性求解器")
        else:
            return (f"求解错误: {msg}\n"
                    f"建议:\n"
                    f"  - 检查所有参数是否在合理范围内\n"
                    f"  - 验证给药计划格式是否正确\n"
                    f"  - 尝试不同的求解方法")

    def calculate_pk_parameters(self, result: PKResult) -> Dict[str, Any]:
        if not result.success:
            return {}
        t = result.time_points
        c = result.concentrations["central"]
        if len(c) == 0:
            return {}
        c_max = np.max(c)
        t_max_idx = np.argmax(c)
        t_max = t[t_max_idx]
        auc = np.trapz(c, t)
        terminal_mask = t > t[-1] * 0.7
        if np.sum(terminal_mask) > 2:
            t_term = t[terminal_mask]
            c_term = c[terminal_mask]
            c_term_log = np.log(c_term + 1e-10)
            slope, intercept = np.polyfit(t_term, c_term_log, 1)
            t_half_terminal = np.log(2) / (-slope)
        else:
            t_half_terminal = None
        cl = result.parameters.get("vd", 1) * result.parameters.get("ke", 0) if result.model_type == "one_compartment" else None
        vss = result.parameters.get("vd") if result.model_type == "one_compartment" else None
        return {
            "c_max": float(c_max),
            "t_max": float(t_max),
            "auc_0_t": float(auc),
            "terminal_half_life": float(t_half_terminal) if t_half_terminal else None,
            "clearance": float(cl) if cl else None,
            "volume_of_distribution_ss": float(vss) if vss else None,
            "concentration_unit": "mg/L"
        }
