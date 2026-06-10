import numpy as np
from scipy.optimize import curve_fit
from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class FitResult:
    model_name: str
    params: dict
    r_squared: float
    q_calc: np.ndarray
    q_exp: np.ndarray
    ce: np.ndarray
    success: bool
    message: str = ""


def langmuir(Ce, Qmax, KL):
    return (Qmax * KL * Ce) / (1.0 + KL * Ce)


def freundlich(Ce, KF, n):
    return KF * (Ce ** (1.0 / n))


def calculate_r_squared(y_exp, y_calc):
    ss_res = np.sum((y_exp - y_calc) ** 2)
    ss_tot = np.sum((y_exp - np.mean(y_exp)) ** 2)
    if ss_tot < 1e-12:
        return 1.0 if ss_res < 1e-12 else 0.0
    return 1.0 - (ss_res / ss_tot)


def fit_langmuir(Ce: np.ndarray, qe: np.ndarray) -> FitResult:
    Ce = np.asarray(Ce, dtype=float)
    qe = np.asarray(qe, dtype=float)

    if len(Ce) < 3:
        return FitResult(
            model_name="Langmuir",
            params={},
            r_squared=0.0,
            q_calc=np.array([]),
            q_exp=qe,
            ce=Ce,
            success=False,
            message="数据点不足3个，无法拟合",
        )

    if np.any(Ce <= 0) or np.any(qe < 0):
        return FitResult(
            model_name="Langmuir",
            params={},
            r_squared=0.0,
            q_calc=np.array([]),
            q_exp=qe,
            ce=Ce,
            success=False,
            message="存在非正浓度或负吸附量",
        )

    try:
        Qmax_guess = np.max(qe) * 1.2
        KL_guess = 1.0 / (np.mean(Ce) + 1e-9)

        popt, pcov = curve_fit(
            langmuir,
            Ce,
            qe,
            p0=[Qmax_guess, KL_guess],
            bounds=([1e-6, 1e-9], [1e6, 1e6]),
            maxfev=20000,
        )
        Qmax, KL = popt
        q_calc = langmuir(Ce, Qmax, KL)
        r2 = calculate_r_squared(qe, q_calc)

        return FitResult(
            model_name="Langmuir",
            params={"Qmax (mg/g)": float(Qmax), "KL (L/mg)": float(KL)},
            r_squared=float(r2),
            q_calc=q_calc,
            q_exp=qe,
            ce=Ce,
            success=True,
            message="拟合成功",
        )
    except Exception as e:
        return FitResult(
            model_name="Langmuir",
            params={},
            r_squared=0.0,
            q_calc=np.array([]),
            q_exp=qe,
            ce=Ce,
            success=False,
            message=f"拟合失败: {str(e)}",
        )


def fit_freundlich(Ce: np.ndarray, qe: np.ndarray) -> FitResult:
    Ce = np.asarray(Ce, dtype=float)
    qe = np.asarray(qe, dtype=float)

    if len(Ce) < 3:
        return FitResult(
            model_name="Freundlich",
            params={},
            r_squared=0.0,
            q_calc=np.array([]),
            q_exp=qe,
            ce=Ce,
            success=False,
            message="数据点不足3个，无法拟合",
        )

    mask = (Ce > 0) & (qe > 0)
    if mask.sum() < 3:
        return FitResult(
            model_name="Freundlich",
            params={},
            r_squared=0.0,
            q_calc=np.array([]),
            q_exp=qe,
            ce=Ce,
            success=False,
            message="有效正浓度点不足3个",
        )

    try:
        logCe = np.log10(Ce[mask])
        logqe = np.log10(qe[mask])
        slope, intercept = np.polyfit(logCe, logqe, 1)
        n_fit = 1.0 / max(slope, 1e-9)
        KF_fit = 10.0 ** intercept

        q_calc = freundlich(Ce, KF_fit, n_fit)
        r2 = calculate_r_squared(qe, q_calc)

        return FitResult(
            model_name="Freundlich",
            params={"KF ((mg/g)(L/mg)^(1/n))": float(KF_fit), "1/n": float(1.0 / n_fit), "n": float(n_fit)},
            r_squared=float(r2),
            q_calc=q_calc,
            q_exp=qe,
            ce=Ce,
            success=True,
            message="拟合成功",
        )
    except Exception as e:
        return FitResult(
            model_name="Freundlich",
            params={},
            r_squared=0.0,
            q_calc=np.array([]),
            q_exp=qe,
            ce=Ce,
            success=False,
            message=f"拟合失败: {str(e)}",
        )


def fit_both(Ce: np.ndarray, qe: np.ndarray) -> Tuple[FitResult, FitResult, str]:
    lang = fit_langmuir(Ce, qe)
    fre = fit_freundlich(Ce, qe)

    if not lang.success and not fre.success:
        return lang, fre, "无可用模型"
    if not lang.success:
        return lang, fre, "Freundlich"
    if not fre.success:
        return lang, fre, "Langmuir"

    if lang.r_squared >= fre.r_squared:
        better = "Langmuir"
    else:
        better = "Freundlich"

    return lang, fre, better
