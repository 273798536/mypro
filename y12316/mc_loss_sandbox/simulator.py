import numpy as np
from typing import List, Dict, Tuple
from collections import defaultdict

from .models import (
    PolicyRecord,
    LossDistribution,
    ExpenseRate,
    DeductibleRule,
    SimulationConfig,
    SimulationResult,
)


class MonteCarloSimulator:
    def __init__(self, config: SimulationConfig):
        self.config = config
        np.random.seed(config.random_seed)

    def _sample_loss(
        self,
        dist_type: str,
        params: Dict[str, float],
        n_samples: int,
    ) -> np.ndarray:
        if dist_type == "lognormal":
            return np.random.lognormal(
                mean=params.get("mean", 0),
                sigma=params.get("sigma", 1),
                size=n_samples,
            )
        elif dist_type == "gamma":
            return np.random.gamma(
                shape=params.get("shape", 1),
                scale=params.get("scale", 1),
                size=n_samples,
            )
        elif dist_type == "exponential":
            return np.random.exponential(
                scale=params.get("scale", 1),
                size=n_samples,
            )
        elif dist_type == "normal":
            return np.random.normal(
                loc=params.get("loc", 0),
                scale=params.get("scale", 1),
                size=n_samples,
            )
        else:
            return np.random.lognormal(mean=0, sigma=1, size=n_samples)

    def _sample_frequency(
        self,
        lambda_rate: float,
        n_samples: int,
    ) -> np.ndarray:
        return np.random.poisson(lam=lambda_rate, size=n_samples)

    def run_simulation(
        self,
        policies: List[PolicyRecord],
        loss_distributions: List[LossDistribution],
        expense_rates: List[ExpenseRate],
        deductible_rules: List[DeductibleRule],
    ) -> SimulationResult:
        n_sim = self.config.num_simulations
        total_losses = np.zeros(n_sim)
        dist_map = {d.policy_type: d for d in loss_distributions}
        expense_map = {e.policy_type: e for e in expense_rates}
        deductible_map = {r.policy_type: r for r in deductible_rules}
        policies_by_type = defaultdict(list)
        for p in policies:
            policies_by_type[p.policy_type].append(p)

        for policy_type, type_policies in policies_by_type.items():
            if policy_type not in dist_map:
                continue

            dist = dist_map[policy_type]
            n_policies = len(type_policies)
            total_insured = sum(p.insured_amount for p in type_policies)

            deductible = 0.0
            if policy_type in deductible_map:
                deductible = deductible_map[policy_type].deductible_amount
            elif type_policies[0].deductible is not None:
                deductible = type_policies[0].deductible

            lambda_rate = n_policies * 0.1
            frequencies = self._sample_frequency(lambda_rate, n_sim)
            max_claims = frequencies.max()

            if max_claims > 0:
                claim_amounts = self._sample_loss(
                    dist.distribution_type,
                    dist.params,
                    n_sim * max_claims,
                )
                claim_amounts = claim_amounts.reshape(n_sim, max_claims)

                mask = np.arange(max_claims) < frequencies[:, np.newaxis]
                claim_amounts = claim_amounts * mask
                claim_amounts = np.maximum(claim_amounts - deductible, 0)

                scale_factor = total_insured / n_policies / 1000
                type_losses = claim_amounts.sum(axis=1) * scale_factor
                total_losses += type_losses

        expense_rate = 0.0
        if expense_rates:
            expense_rate = sum(e.expense_rate for e in expense_rates) / len(expense_rates)
        total_expenses = total_losses * expense_rate

        net_losses = total_losses + total_expenses
        total_losses_list = net_losses.tolist()
        percentiles = {}
        for cl in self.config.confidence_levels:
            pct = np.percentile(net_losses, cl * 100)
            percentiles[cl] = float(pct)

        mean_loss = float(np.mean(net_losses))
        std_loss = float(np.std(net_losses))

        var_95 = float(np.percentile(net_losses, 95))
        var_99 = float(np.percentile(net_losses, 99))

        cvar_95 = float(np.mean(net_losses[net_losses >= var_95]))
        cvar_99 = float(np.mean(net_losses[net_losses >= var_99]))

        total_expenses_mean = float(np.mean(total_expenses))
        net_loss_mean = float(np.mean(net_losses))

        return SimulationResult(
            total_losses=total_losses_list,
            percentiles=percentiles,
            mean_loss=mean_loss,
            std_loss=std_loss,
            var_95=var_95,
            var_99=var_99,
            cvar_95=cvar_95,
            cvar_99=cvar_99,
            expenses=total_expenses_mean,
            net_loss=net_loss_mean,
        )

    def run_sensitivity_analysis(
        self,
        policies: List[PolicyRecord],
        loss_distributions: List[LossDistribution],
        expense_rates: List[ExpenseRate],
        deductible_rules: List[DeductibleRule],
    ) -> Dict:
        base_result = self.run_simulation(
            policies, loss_distributions, expense_rates, deductible_rules
        )

        sensitivity = {}
        original_sims = self.config.num_simulations
        self.config.num_simulations = min(original_sims, 2000)

        for factor in [0.8, 0.9, 1.0, 1.1, 1.2]:
            adjusted_distributions = []
            for d in loss_distributions:
                new_params = d.params.copy()
                if "mean" in new_params:
                    new_params["mean"] = new_params["mean"] * factor
                adjusted_distributions.append(
                    LossDistribution(
                        policy_type=d.policy_type,
                        distribution_type=d.distribution_type,
                        params=new_params,
                        sample_size=d.sample_size,
                        source_file=d.source_file,
                    )
                )

            result = self.run_simulation(
                policies, adjusted_distributions, expense_rates, deductible_rules
            )
            sensitivity[f"loss_scale_{factor}"] = {
                "var_95": result.var_95,
                "var_99": result.var_99,
                "cvar_95": result.cvar_95,
                "cvar_99": result.cvar_99,
            }

        self.config.num_simulations = original_sims

        return {
            "base": {
                "var_95": base_result.var_95,
                "var_99": base_result.var_99,
                "cvar_95": base_result.cvar_95,
                "cvar_99": base_result.cvar_99,
            },
            "sensitivity": sensitivity,
        }
