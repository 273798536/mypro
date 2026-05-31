const _ = require('lodash');

const ChangeTracker = {
  calculateChanges(oldData, newData, trackedFields) {
    const changes = {};
    const summary = {};

    for (const field of trackedFields) {
      const oldValue = _.get(oldData, field);
      const newValue = _.get(newData, field);

      if (!_.isEqual(oldValue, newValue)) {
        changes[field] = {
          before: oldValue,
          after: newValue,
        };

        let diff = '';
        if (typeof oldValue === 'number' && typeof newValue === 'number') {
          const diffVal = newValue - oldValue;
          diff = `${diffVal >= 0 ? '+' : ''}${diffVal}`;
        } else if (oldValue === null || oldValue === undefined) {
          diff = `设置为 ${newValue}`;
        } else if (newValue === null || newValue === undefined) {
          diff = `已清除（原值: ${oldValue}）`;
        } else {
          diff = `${oldValue} → ${newValue}`;
        }

        summary[field] = {
          before: oldValue,
          after: newValue,
          diff,
        };
      }
    }

    return {
      hasChanges: Object.keys(changes).length > 0,
      changes,
      summary,
    };
  },

  calculateBillingChanges(oldUsage, newUsage) {
    const fields = [
      'current_active_seats',
      'current_contracted_seats',
      'current_excess_seats',
      'current_unit_price',
      'current_billing_amount',
      'billing_rule_id',
      'billing_rule_version',
    ];

    const result = this.calculateChanges(oldUsage, newUsage, fields);

    if (result.hasChanges) {
      const oldAmount = Number(oldUsage.current_billing_amount || 0);
      const newAmount = Number(newUsage.current_billing_amount || 0);
      result.summary._amount_diff = {
        before: oldAmount,
        after: newAmount,
        diff: newAmount - oldAmount,
      };
    }

    return result;
  },

  calculateBillChanges(oldBill, newBill) {
    const fields = [
      'current_contracted_seats',
      'current_peak_active_seats',
      'current_excess_seats',
      'current_base_amount',
      'current_excess_amount',
      'current_total_amount',
      'billing_rule_id',
      'billing_rule_version',
    ];

    const result = this.calculateChanges(oldBill, newBill, fields);

    if (result.hasChanges) {
      const oldAmount = Number(oldBill.current_total_amount || 0);
      const newAmount = Number(newBill.current_total_amount || 0);
      result.summary._amount_diff = {
        before: oldAmount,
        after: newAmount,
        diff: newAmount - oldAmount,
      };
    }

    return result;
  },

  calculateCaliberChanges(oldCaliber, newCaliber) {
    const changes = {};

    const allKeys = new Set([
      ...Object.keys(oldCaliber || {}),
      ...Object.keys(newCaliber || {}),
    ]);

    for (const key of allKeys) {
      const oldValue = _.get(oldCaliber, key);
      const newValue = _.get(newCaliber, key);

      if (!_.isEqual(oldValue, newValue)) {
        changes[key] = {
          before: oldValue,
          after: newValue,
        };
      }
    }

    return {
      hasChanges: Object.keys(changes).length > 0,
      changes,
    };
  },

  buildExportDiffRecord(record, includeOriginal = true) {
    const exportFields = [
      { key: 'contracted_seats', label: '合同座席数' },
      { key: 'active_seats', label: '在用座席数' },
      { key: 'excess_seats', label: '超额座席数' },
      { key: 'unit_price', label: '单价' },
      { key: 'billing_amount', label: '计费金额' },
    ];

    const result = {};

    for (const field of exportFields) {
      const originalKey = `original_${field.key}`;
      const currentKey = `current_${field.key}`;

      if (includeOriginal && record[originalKey] !== undefined) {
        result[`原始${field.label}`] = record[originalKey];
      }
      result[`当前${field.label}`] = record[currentKey];

      if (record[originalKey] !== undefined && record[currentKey] !== undefined) {
        const original = Number(record[originalKey] || 0);
        const current = Number(record[currentKey] || 0);
        if (original !== current) {
          result[`${field.label}差异`] = current - original;
        }
      }
    }

    return result;
  },
};

module.exports = ChangeTracker;
