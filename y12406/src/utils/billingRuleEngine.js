const { Op } = require('sequelize');
const db = require('../models');
const dayjs = require('dayjs');
const _ = require('lodash');

class BillingRuleMissingError extends Error {
  constructor(message, actionableHints) {
    super(message);
    this.name = 'BillingRuleMissingError';
    this.actionableHints = actionableHints;
  }
}

const BillingRuleEngine = {
  async getApplicableRule(productCode, effectiveDate, contractId = null) {
    const date = dayjs(effectiveDate).toDate();

    const rule = await db.BillingRule.findOne({
      where: {
        product_code: productCode,
        status: 'active',
        effective_date: { [Op.lte]: date },
        [Op.or]: [
          { expiry_date: null },
          { expiry_date: { [Op.gte]: date } },
        ],
      },
      order: [['effective_date', 'DESC']],
    });

    if (!rule) {
      const hints = await this.getActionableHints(productCode, effectiveDate, contractId);
      throw new BillingRuleMissingError(
        `未找到产品[${productCode}]在[${dayjs(effectiveDate).format('YYYY-MM-DD')}]有效的计费规则`,
        hints
      );
    }

    return rule;
  },

  async getActionableHints(productCode, effectiveDate, contractId = null) {
    const hints = [];
    const date = dayjs(effectiveDate).toDate();

    const allRules = await db.BillingRule.findAll({
      where: { product_code: productCode },
      order: [['effective_date', 'DESC']],
    });

    if (allRules.length === 0) {
      hints.push({
        type: 'no_rule_for_product',
        severity: 'error',
        message: `产品[${productCode}]没有任何计费规则配置`,
        action: `请在系统中为产品[${productCode}]创建至少一条计费规则，生效日期不晚于[${dayjs(effectiveDate).format('YYYY-MM-DD')}]`,
      });
    } else {
      const expiredRules = allRules.filter(r => r.expiry_date && dayjs(r.expiry_date).isBefore(date));
      const futureRules = allRules.filter(r => dayjs(r.effective_date).isAfter(date));
      const inactiveRules = allRules.filter(r => r.status !== 'active');

      if (expiredRules.length > 0) {
        hints.push({
          type: 'rule_expired',
          severity: 'warning',
          message: `存在${expiredRules.length}条已过期的计费规则，最近的过期日期为[${dayjs(expiredRules[0].expiry_date).format('YYYY-MM-DD')}]`,
          action: `建议将规则[${expiredRules[0].rule_code}]的失效日期延长，或创建新的计费规则版本`,
          ruleCode: expiredRules[0].rule_code,
        });
      }

      if (futureRules.length > 0) {
        hints.push({
          type: 'rule_not_effective',
          severity: 'warning',
          message: `存在${futureRules.length}条未生效的计费规则，最早的生效日期为[${dayjs(futureRules[futureRules.length - 1].effective_date).format('YYYY-MM-DD')}]`,
          action: `如需提前启用，请调整规则[${futureRules[futureRules.length - 1].rule_code}]的生效日期`,
          ruleCode: futureRules[futureRules.length - 1].rule_code,
        });
      }

      if (inactiveRules.length > 0) {
        hints.push({
          type: 'rule_inactive',
          severity: 'warning',
          message: `存在${inactiveRules.length}条未启用的计费规则`,
          action: `请检查规则[${inactiveRules[0].rule_code}]状态是否应为active`,
          ruleCode: inactiveRules[0].rule_code,
        });
      }
    }

    if (contractId) {
      const contract = await db.Contract.findByPk(contractId);
      if (contract && contract.product_code !== productCode) {
        hints.push({
          type: 'product_mismatch',
          severity: 'warning',
          message: `合同关联产品为[${contract.product_code}]，与当前产品[${productCode}]不一致`,
          action: '请确认产品编码是否正确，或使用合同关联的产品编码查找规则',
        });
      }
    }

    hints.push({
      type: 'quick_fix',
      severity: 'info',
      message: '临时处理方案',
      action: '可先使用人工修正功能指定计费规则和金额，待规则配置完成后重新计算',
    });

    return hints;
  },

  calculateExcessSeats(activeSeats, contractedSeats) {
    return Math.max(0, activeSeats - contractedSeats);
  },

  getPriceMultiplier(rule, excessSeats) {
    if (!rule.excess_tier_pricing || !Array.isArray(rule.excess_tier_pricing)) {
      return 1;
    }

    for (const tier of rule.excess_tier_pricing) {
      if (excessSeats >= tier.min_seats && (!tier.max_seats || excessSeats <= tier.max_seats)) {
        return tier.price_multiplier || 1;
      }
    }

    return 1;
  },

  calculateBillingAmount(rule, unitPrice, excessSeats, usageDays = 30, daysInMonth = 30) {
    const multiplier = this.getPriceMultiplier(rule, excessSeats);
    const effectiveUnitPrice = unitPrice * multiplier;

    let dailyAmount = 0;
    switch (rule.over_billing_strategy) {
      case 'monthly':
        dailyAmount = excessSeats * effectiveUnitPrice;
        break;
      case 'daily':
        dailyAmount = excessSeats * (effectiveUnitPrice / daysInMonth) * Math.max(usageDays, rule.minimum_billing_days || 0);
        break;
      case 'prorated':
        const effectiveDays = Math.max(usageDays - (rule.grace_period_days || 0), rule.minimum_billing_days || 0);
        dailyAmount = excessSeats * (effectiveUnitPrice / daysInMonth) * effectiveDays;
        break;
      default:
        dailyAmount = excessSeats * effectiveUnitPrice;
    }

    return Math.round(dailyAmount * 100) / 100;
  },

  calculateCrossMonthDowngrade(rule, downgradeRequest, billingCycle) {
    const downgradeDate = dayjs(downgradeRequest.effective_date);
    const cycleStart = dayjs(billingCycle + '-01');
    const cycleEnd = cycleStart.endOf('month');
    const daysInMonth = cycleEnd.date();

    let beforeDays = 0;
    let afterDays = 0;
    let oldSeatCount = downgradeRequest.original_seat_count;
    let newSeatCount = downgradeRequest.new_seat_count;

    switch (rule.downgrade_cross_month_rule) {
      case 'current_month':
        beforeDays = 0;
        afterDays = daysInMonth;
        break;
      case 'next_month':
        beforeDays = daysInMonth;
        afterDays = 0;
        break;
      case 'by_effective_date':
        beforeDays = Math.min(downgradeDate.diff(cycleStart, 'day'), daysInMonth);
        afterDays = Math.max(0, daysInMonth - beforeDays);
        break;
      default:
        beforeDays = downgradeDate.diff(cycleStart, 'day');
        afterDays = daysInMonth - beforeDays;
    }

    return {
      beforeDays,
      afterDays,
      oldSeatCount,
      newSeatCount,
      daysInMonth,
      ruleApplied: rule.downgrade_cross_month_rule,
    };
  },

  checkRuleVersionChange(oldRuleId, newRuleId) {
    return oldRuleId !== newRuleId;
  },

  async getRuleVersionHistory(ruleCode) {
    return await db.BillingRule.findAll({
      where: { rule_code: ruleCode },
      order: [['effective_date', 'ASC']],
    });
  },

  async getUsageAffectedByRuleChange(ruleId, billingCycle = null) {
    const where = { billing_rule_id: ruleId };
    if (billingCycle) {
      where.billing_cycle = billingCycle;
    }
    return await db.SeatUsage.findAll({ where });
  },

  BillingRuleMissingError,
};

module.exports = BillingRuleEngine;
