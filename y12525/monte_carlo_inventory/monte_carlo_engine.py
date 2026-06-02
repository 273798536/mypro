import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import warnings
warnings.filterwarnings('ignore')

from .types import (
    SalesHistory, SupplyCycle, InventoryStatus, SimulationConfig,
    DemandForecast, SimulationTrajectory, RiskMetrics, PipelineState,
    DataIssue, IssueSeverity, DataIssueType
)
from .data_import import _create_pipeline_state


def fit_demand_distribution(
    historical_demand: List[float],
    preferred_dist: str = "auto"
) -> Tuple[str, Dict[str, float], Dict[str, float]]:
    data = np.array(historical_demand)
    data = data[data >= 0]
    
    if len(data) < 10:
        mean = np.mean(data)
        std = np.std(data) if len(data) > 1 else mean * 0.2
        return "normal", {"loc": mean, "scale": max(std, 0.1)}, {"ks_stat": 0.5, "p_value": 0.01}
    
    distributions = []
    
    if preferred_dist in ["auto", "poisson"]:
        mean = np.mean(data)
        if mean > 0 and all(x == int(x) for x in data[:100]):
            try:
                lambda_poisson = mean
                samples = stats.poisson.rvs(lambda_poisson, size=len(data), random_state=42)
                ks_stat, p_value = stats.ks_2samp(data, samples)
                distributions.append(("poisson", {"mu": lambda_poisson}, ks_stat, p_value))
            except:
                pass
    
    if preferred_dist in ["auto", "negative_binomial", "nbinom"]:
        try:
            mean = np.mean(data)
            var = np.var(data)
            if var > mean > 0:
                r = mean ** 2 / (var - mean)
                p = mean / var
                samples = stats.nbinom.rvs(r, p, size=len(data), random_state=42)
                ks_stat, p_value = stats.ks_2samp(data, samples)
                distributions.append(("negative_binomial", {"n": r, "p": p}, ks_stat, p_value))
        except:
            pass
    
    if preferred_dist in ["auto", "gamma"]:
        try:
            positive_data = data[data > 0]
            if len(positive_data) >= 5:
                shape, loc, scale = stats.gamma.fit(positive_data, floc=0)
                samples = stats.gamma.rvs(shape, loc=loc, scale=scale, size=len(data), random_state=42)
                ks_stat, p_value = stats.ks_2samp(data, samples)
                distributions.append(("gamma", {"a": shape, "loc": loc, "scale": scale}, ks_stat, p_value))
        except:
            pass
    
    if preferred_dist in ["auto", "lognormal", "norm"]:
        try:
            positive_data = data[data > 0]
            if len(positive_data) >= 5:
                shape, loc, scale = stats.lognorm.fit(positive_data, floc=0)
                samples = stats.lognorm.rvs(shape, loc=loc, scale=scale, size=len(data), random_state=42)
                ks_stat, p_value = stats.ks_2samp(data, samples)
                distributions.append(("lognormal", {"s": shape, "loc": loc, "scale": scale}, ks_stat, p_value))
        except:
            pass
    
    try:
        mu, sigma = np.mean(data), np.std(data)
        if sigma <= 0:
            sigma = mu * 0.1
        samples = stats.norm.rvs(mu, sigma, size=len(data), random_state=42)
        ks_stat, p_value = stats.ks_2samp(data, samples)
        distributions.append(("normal", {"loc": mu, "scale": sigma}, ks_stat, p_value))
    except:
        mu = np.mean(data)
        distributions.append(("normal", {"loc": mu, "scale": mu * 0.1}, 0.5, 0.01))
    
    distributions.sort(key=lambda x: x[2])
    best_dist = distributions[0]
    
    params = best_dist[1]
    if best_dist[0] == "poisson":
        mean = params["mu"]
        std = np.sqrt(params["mu"])
    elif best_dist[0] == "negative_binomial":
        mean = params["n"] * (1 - params["p"]) / params["p"]
        std = np.sqrt(params["n"] * (1 - params["p"]) / params["p"] ** 2)
    elif best_dist[0] == "gamma":
        mean = params["a"] * params["scale"]
        std = np.sqrt(params["a"]) * params["scale"]
    elif best_dist[0] == "lognormal":
        mu = np.log(params["scale"])
        sigma = params["s"]
        mean = np.exp(mu + sigma ** 2 / 2)
        std = np.sqrt((np.exp(sigma ** 2) - 1) * np.exp(2 * mu + sigma ** 2))
    else:
        mean = params["loc"]
        std = params["scale"]
    
    goodness_of_fit = {
        "ks_statistic": best_dist[2],
        "p_value": best_dist[3],
        "daily_mean": mean,
        "daily_std": std
    }
    
    return best_dist[0], params, goodness_of_fit


def generate_demand_forecast(
    sales: SalesHistory,
    config: SimulationConfig,
    pipeline_states: List[PipelineState]
) -> Tuple[DemandForecast, List[PipelineState]]:
    new_states = pipeline_states.copy()
    sku = sales.sku
    
    new_states.append(_create_pipeline_state(
        "demand_forecast_start",
        {'sku': sku, 'n_history_points': len(sales.quantities)},
        {'distribution_preference': config.demand_distribution}
    ))
    
    dist_type, params, gof = fit_demand_distribution(sales.quantities, config.demand_distribution)
    
    daily_mean = gof["daily_mean"]
    daily_std = gof["daily_std"]
    
    forecast_dates = pd.date_range(
        start=pd.Timestamp.now().normalize(),
        periods=config.horizon_days,
        freq='D'
    )
    
    quantiles = [0.05, 0.25, 0.5, 0.75, 0.95, 0.99]
    forecast_quantiles = {}
    
    np.random.seed(config.random_seed)
    for q in quantiles:
        qty_daily = []
        for _ in range(config.horizon_days):
            sample = _sample_from_distribution(dist_type, params, 1000)
            qty_daily.append(np.percentile(sample, q * 100))
        forecast_quantiles[q] = qty_daily
    
    forecast = DemandForecast(
        sku=sku,
        distribution_type=dist_type,
        parameters=params,
        daily_demand_mean=daily_mean,
        daily_demand_std=daily_std,
        goodness_of_fit=gof,
        historical_demand=sales.quantities,
        forecast_dates=list(forecast_dates),
        forecast_quantiles=forecast_quantiles
    )
    
    new_states.append(_create_pipeline_state(
        "demand_forecast_complete",
        {
            'distribution': dist_type,
            'parameters': params,
            'daily_mean': daily_mean,
            'daily_std': daily_std,
            'ks_statistic': gof["ks_statistic"],
            'p_value': gof["p_value"]
        },
        {'quantiles_available': list(forecast_quantiles.keys())}
    ))
    
    return forecast, new_states


def _sample_from_distribution(dist_type: str, params: Dict, size: int) -> np.ndarray:
    np.random.seed()
    
    if dist_type == "poisson":
        return stats.poisson.rvs(params["mu"], size=size)
    elif dist_type == "negative_binomial":
        return stats.nbinom.rvs(params["n"], params["p"], size=size)
    elif dist_type == "gamma":
        samples = stats.gamma.rvs(params["a"], loc=params["loc"], scale=params["scale"], size=size)
        return np.round(samples).astype(int)
    elif dist_type == "lognormal":
        samples = stats.lognorm.rvs(params["s"], loc=params["loc"], scale=params["scale"], size=size)
        return np.round(samples).astype(int)
    else:
        samples = stats.norm.rvs(params["loc"], params["scale"], size=size)
        return np.maximum(0, np.round(samples)).astype(int)


def _sample_lead_time(
    supply: SupplyCycle,
    dist_type: str = "gamma",
    size: int = 1
) -> np.ndarray:
    np.random.seed()
    
    mean = supply.lead_time_mean
    std = max(supply.lead_time_std, 0.1)
    
    if dist_type == "gamma":
        shape = (mean / std) ** 2
        scale = std ** 2 / mean
        samples = stats.gamma.rvs(shape, scale=scale, size=size)
    elif dist_type == "normal":
        samples = stats.norm.rvs(mean, std, size=size)
    elif dist_type == "uniform":
        samples = np.random.uniform(supply.lead_time_min, supply.lead_time_max, size=size)
    else:
        samples = np.random.triangular(supply.lead_time_min, mean, supply.lead_time_max, size=size)
    
    samples = np.maximum(1, np.round(samples)).astype(int)
    
    reliability_mask = np.random.random(size) < supply.supplier_reliability
    delayed_samples = samples.copy()
    delayed_samples[~reliability_mask] = np.round(samples[~reliability_mask] * np.random.uniform(1.5, 3.0, size=sum(~reliability_mask))).astype(int)
    
    return delayed_samples


def simulate_single_trajectory(
    simulation_id: int,
    forecast: DemandForecast,
    supply: SupplyCycle,
    inventory: InventoryStatus,
    config: SimulationConfig,
    track_delayed: bool = True
) -> SimulationTrajectory:
    horizon = config.horizon_days
    dates = pd.date_range(start=pd.Timestamp.now().normalize(), periods=horizon, freq='D')
    
    current_stock = inventory.current_stock
    pipeline_orders = []
    
    for po in inventory.pending_orders:
        days_until_arrival = max(0, (po['eta'].normalize() - dates[0]).days)
        if po['is_delayed']:
            extra_delay = np.random.randint(1, 15)
            days_until_arrival += extra_delay
        pipeline_orders.append({
            'quantity': po['quantity'],
            'arrival_day': days_until_arrival,
            'original_eta': po['eta'],
            'is_delayed': po['is_delayed'],
            'actual_lead_time': None
        })
    
    inventory_level = []
    stockout_days = []
    negative_inventory_days = []
    demand_realized = []
    lead_time_realized = []
    replenishment_arrivals = []
    delayed_orders = []
    
    daily_demands = _sample_from_distribution(forecast.distribution_type, forecast.parameters, horizon)
    
    lead_times_used = []
    
    for day in range(horizon):
        arrivals_today = [o for o in pipeline_orders if o['arrival_day'] == day]
        for arr in arrivals_today:
            current_stock += arr['quantity']
            replenishment_arrivals.append({
                'day': day,
                'date': dates[day],
                'quantity': arr['quantity'],
                'is_delayed': arr['is_delayed'],
                'delay_days': max(0, day - (supply.lead_time_mean if arr['actual_lead_time'] is None else arr['actual_lead_time']))
            })
            if arr['is_delayed']:
                delayed_orders.append({
                    'day': day,
                    'date': dates[day],
                    'quantity': arr['quantity'],
                    'original_eta': arr['original_eta'],
                    'delay_days': max(0, day - (arr['original_eta'] - dates[0]).days)
                })
        
        pipeline_orders = [o for o in pipeline_orders if o['arrival_day'] > day]
        
        demand = daily_demands[day]
        demand_realized.append(demand)
        
        current_stock -= demand
        
        if current_stock < -demand * 0.5 and track_delayed:
            negative_inventory_days.append(True)
            stockout_days.append(True)
        elif current_stock < 0:
            negative_inventory_days.append(True)
            stockout_days.append(True)
        elif current_stock == 0:
            negative_inventory_days.append(False)
            stockout_days.append(True)
        else:
            negative_inventory_days.append(False)
            stockout_days.append(False)
        
        inventory_level.append(current_stock)
        
        if current_stock <= inventory.reorder_point:
            if not any(o['arrival_day'] > day for o in pipeline_orders):
                lead_time = int(_sample_lead_time(supply, config.lead_time_distribution, 1)[0])
                lead_times_used.append(lead_time)
                arrival_day = day + lead_time
                
                if arrival_day < horizon:
                    is_delayed = lead_time > supply.lead_time_mean + supply.lead_time_std
                    pipeline_orders.append({
                        'quantity': inventory.reorder_quantity,
                        'arrival_day': arrival_day,
                        'original_eta': dates[arrival_day],
                        'is_delayed': is_delayed,
                        'actual_lead_time': lead_time
                    })
        
        lead_time_realized.append(np.mean(lead_times_used) if lead_times_used else np.nan)
    
    while len(lead_time_realized) < horizon:
        lead_time_realized.append(np.nan)
    
    return SimulationTrajectory(
        simulation_id=simulation_id,
        dates=list(dates),
        inventory_level=inventory_level,
        stockout_days=stockout_days,
        replenishment_arrivals=replenishment_arrivals,
        demand_realized=demand_realized,
        lead_time_realized=lead_time_realized,
        negative_inventory_days=negative_inventory_days,
        delayed_orders=delayed_orders
    )


def run_monte_carlo_simulations(
    forecast: DemandForecast,
    supply: SupplyCycle,
    inventory: InventoryStatus,
    config: SimulationConfig,
    pipeline_states: List[PipelineState]
) -> Tuple[List[SimulationTrajectory], List[PipelineState]]:
    new_states = pipeline_states.copy()
    sku = forecast.sku
    
    new_states.append(_create_pipeline_state(
        "simulation_start",
        {
            'sku': sku,
            'n_simulations': config.n_simulations,
            'horizon_days': config.horizon_days,
            'lead_time_distribution': config.lead_time_distribution
        },
        {'random_seed': config.random_seed}
    ))
    
    np.random.seed(config.random_seed)
    
    trajectories = []
    for i in range(config.n_simulations):
        traj = simulate_single_trajectory(i, forecast, supply, inventory, config)
        trajectories.append(traj)
        
        if (i + 1) % 1000 == 0:
            new_states.append(_create_pipeline_state(
                f"simulation_progress_{i+1}",
                {'completed': i + 1, 'total': config.n_simulations},
                {'timestamp': pd.Timestamp.now().isoformat()}
            ))
    
    new_states.append(_create_pipeline_state(
        "simulation_complete",
        {
            'n_trajectories': len(trajectories),
            'avg_stockout_rate': np.mean([sum(t.stockout_days) / len(t.stockout_days) for t in trajectories]),
            'avg_negative_rate': np.mean([sum(t.negative_inventory_days) / len(t.negative_inventory_days) for t in trajectories])
        },
        {
            'extreme_trajectories': {
                'min_inventory': float(np.min([np.min(t.inventory_level) for t in trajectories])),
                'max_inventory': float(np.max([np.max(t.inventory_level) for t in trajectories])),
                'max_delayed_orders': int(np.max([len(t.delayed_orders) for t in trajectories]))
            }
        }
    ))
    
    return trajectories, new_states


def calculate_risk_metrics(
    trajectories: List[SimulationTrajectory],
    inventory: InventoryStatus,
    config: SimulationConfig
) -> RiskMetrics:
    sku = inventory.sku
    horizon = config.horizon_days
    
    stockout_sims = []
    negative_inv_sims = []
    delayed_order_sims = []
    stockout_days_list = []
    shortage_units_list = []
    inventory_levels = []
    fill_rate_list = []
    
    for traj in trajectories:
        has_stockout = any(traj.stockout_days)
        stockout_sims.append(has_stockout)
        
        has_negative = any(traj.negative_inventory_days)
        negative_inv_sims.append(has_negative)
        
        has_delayed = len(traj.delayed_orders) > 0
        delayed_order_sims.append(has_delayed)
        
        n_stockout_days = sum(traj.stockout_days)
        stockout_days_list.append(n_stockout_days)
        
        shortage = sum(max(0, -inv) for inv in traj.inventory_level if inv < 0)
        shortage_units_list.append(shortage)
        
        inventory_levels.extend(traj.inventory_level)
        
        total_demand = sum(traj.demand_realized)
        if total_demand > 0:
            fulfilled = sum(min(d, max(0, inv + d)) for d, inv in zip(traj.demand_realized, traj.inventory_level))
            fill_rate_list.append(fulfilled / total_demand)
        else:
            fill_rate_list.append(1.0)
    
    stockout_prob = sum(stockout_sims) / len(trajectories)
    negative_inv_prob = sum(negative_inv_sims) / len(trajectories)
    delayed_order_prob = sum(delayed_order_sims) / len(trajectories)
    
    service_level = 1 - stockout_prob
    fill_rate = np.mean(fill_rate_list) if fill_rate_list else 1.0
    
    avg_inventory = np.mean([np.mean(t.inventory_level) for t in trajectories])
    max_inventory = np.max([np.max(t.inventory_level) for t in trajectories])
    min_inventory = np.min([np.min(t.inventory_level) for t in trajectories])
    
    expected_stockout_days = np.mean(stockout_days_list)
    expected_shortage = np.mean(shortage_units_list)
    
    unit_cost = inventory.unit_cost
    holding_cost = avg_inventory * unit_cost * inventory.holding_cost_rate * (horizon / 365)
    stockout_cost = expected_shortage * unit_cost * inventory.stockout_cost_rate
    total_cost = holding_cost + stockout_cost
    
    per_tile_metrics = {}
    for tile in [0.05, 0.25, 0.5, 0.75, 0.95, 0.99]:
        traj_inv_tile = np.percentile([np.mean(t.inventory_level) for t in trajectories], tile * 100)
        traj_stockout_tile = np.percentile(stockout_days_list, tile * 100)
        traj_shortage_tile = np.percentile(shortage_units_list, tile * 100)
        per_tile_metrics[tile] = {
            'avg_inventory': float(traj_inv_tile),
            'stockout_days': float(traj_stockout_tile),
            'shortage_units': float(traj_shortage_tile)
        }
    
    return RiskMetrics(
        sku=sku,
        stockout_probability=float(stockout_prob),
        expected_stockout_days=float(expected_stockout_days),
        expected_shortage_units=float(expected_shortage),
        fill_rate=float(fill_rate),
        service_level=float(service_level),
        avg_inventory=float(avg_inventory),
        max_inventory=float(max_inventory),
        min_inventory=float(min_inventory),
        negative_inventory_probability=float(negative_inv_prob),
        delayed_order_probability=float(delayed_order_prob),
        holding_cost=float(holding_cost),
        stockout_cost=float(stockout_cost),
        total_cost=float(total_cost),
        per_tile_metrics=per_tile_metrics
    )
