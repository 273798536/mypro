const Diagnosis = (function() {
    const { ASSET_TYPES } = GameModels;

    class DiagnosisEngine {
        constructor(game) {
            this.game = game;
        }

        diagnoseAllocation() {
            const issues = [];
            const warnings = [];
            const successes = [];

            const allocationCheck = this._checkAllocationSum();
            if (allocationCheck) {
                issues.push(allocationCheck);
            }

            const taxCheck = this._checkTaxAccountConsistency();
            if (taxCheck) {
                issues.push(taxCheck);
            }

            const ageReportCheck = this._checkAgeReportConsistency();
            if (ageReportCheck) {
                issues.push(ageReportCheck);
            }

            const riskCheck = this._checkRiskHandling();
            if (riskCheck.overstep) {
                warnings.push(riskCheck);
            } else {
                successes.push({
                    type: 'success',
                    title: '风险合规',
                    detail: `当前风险值${riskCheck.currentRisk.toFixed(2)}在限值${riskCheck.riskLimit}以内`
                });
            }

            const assetDistribution = this._checkAssetDistribution();
            if (assetDistribution.warnings.length > 0) {
                warnings.push(...assetDistribution.warnings);
            }
            if (assetDistribution.successes.length > 0) {
                successes.push(...assetDistribution.successes);
            }

            return { issues, warnings, successes };
        }

        _checkAllocationSum() {
            const totalAllocated = Object.values(this.game.assetCards)
                .reduce((sum, card) => sum + card.allocationAmount, 0);
            const availableCash = this.game.initialCash;

            if (totalAllocated > availableCash) {
                return {
                    type: 'error',
                    source: 'asset_card',
                    title: '配置金额超限',
                    detail: `已配置${totalAllocated.toLocaleString()}元，可用资金${availableCash.toLocaleString()}元，超出${(totalAllocated - availableCash).toLocaleString()}元`
                };
            }

            if (totalAllocated === 0) {
                return {
                    type: 'warning',
                    source: 'asset_card',
                    title: '未进行配置',
                    detail: '当前尚未分配任何资产'
                };
            }

            return null;
        }

        _checkTaxAccountConsistency() {
            const taxAccount = this.game.taxAccount;
            const currentCell = this.game.getCurrentAgeCell();

            if (!currentCell) return null;

            const expectedBalance = taxAccount.totalDeposits - taxAccount.totalWithdrawals;
            const actualBalance = taxAccount.balance;
            const difference = Math.abs(actualBalance - expectedBalance);

            if (difference > 100) {
                return {
                    type: 'error',
                    source: 'tax_account',
                    title: '税延账户计算不一致',
                    detail: `按存入支取记录应为${expectedBalance.toLocaleString()}元，实际余额${actualBalance.toLocaleString()}元，差异${difference.toLocaleString()}元。可能原因：复利计算或罚息口径不一致`
                };
            }

            if (this.game.currentAge < 60 && taxAccount.totalWithdrawals > 0) {
                return {
                    type: 'warning',
                    source: 'tax_account',
                    title: '提前支取税延账户',
                    detail: `已提前支取${taxAccount.totalWithdrawals.toLocaleString()}元，产生罚息${(taxAccount.totalWithdrawals * 0.03).toLocaleString()}元`
                };
            }

            return null;
        }

        _checkAgeReportConsistency() {
            const currentCell = this.game.getCurrentAgeCell();
            if (!currentCell || !currentCell.completed) return null;

            const report = this.game.calculateAllocationReport();
            const ageExpected = currentCell.expectedValue;
            const reportTotal = report.totalExpected;
            const difference = Math.abs(ageExpected - reportTotal);

            if (difference > 1000) {
                const assetMismatch = this._findAssetMismatchSource(report, currentCell);
                return {
                    type: 'error',
                    source: assetMismatch.source,
                    title: '年龄格与报告数据不一致',
                    detail: `年龄格记录${ageExpected.toLocaleString()}元，报告计算${reportTotal.toLocaleString()}元，差异${difference.toLocaleString()}元。${assetMismatch.detail}`
                };
            }

            return null;
        }

        _findAssetMismatchSource(report, ageCell) {
            const allocationFromCell = ageCell.allocation || {};
            const taxFromCell = ageCell.taxDeposit || 0;

            let assetTotalFromAllocation = 0;
            Object.entries(allocationFromCell).forEach(([id, amount]) => {
                const assetType = ASSET_TYPES[id.toUpperCase()] || Object.values(ASSET_TYPES).find(t => t.id === id);
                if (assetType) {
                    assetTotalFromAllocation += amount * (1 + assetType.expectedReturn);
                }
            });

            const reportAssetTotal = Object.values(report.assetReturns)
                .reduce((sum, r) => sum + r.expected, 0);

            const assetDifference = Math.abs(assetTotalFromAllocation - reportAssetTotal);
            const taxDifference = Math.abs(taxFromCell - report.taxInfo.balance);

            if (assetDifference > taxDifference) {
                return {
                    source: 'asset_card',
                    detail: '主要差异来源于资产卡收益率计算或配置记录'
                };
            } else {
                return {
                    source: 'tax_account',
                    detail: '主要差异来源于税延账户余额或收益计算'
                };
            }
        }

        _checkRiskHandling() {
            const riskCheck = this.game.checkRiskOverstep();

            if (riskCheck.overstep) {
                return {
                    type: 'warning',
                    overstep: true,
                    title: '风险超限',
                    detail: `当前风险值${riskCheck.currentRisk.toFixed(2)}，限值${riskCheck.riskLimit}，超出${riskCheck.difference.toFixed(2)}。建议降低高风险资产配置比例`
                };
            }

            return { ...riskCheck, overstep: false };
        }

        _checkAssetDistribution() {
            const warnings = [];
            const successes = [];
            const age = this.game.currentAge;

            const totalAllocation = Object.values(this.game.assetCards)
                .reduce((sum, card) => sum + card.allocationAmount, 0);

            if (totalAllocation === 0) {
                return { warnings: [], successes: [] };
            }

            const stockRatio = (this.game.assetCards.stock?.allocationAmount || 0) / totalAllocation;
            const bondRatio = (this.game.assetCards.bond?.allocationAmount || 0) / totalAllocation;

            const maxStockRatio = Math.max(0.3, 1 - (age - 25) * 0.02);
            const minBondRatio = Math.min(0.5, (age - 25) * 0.01);

            if (stockRatio > maxStockRatio) {
                warnings.push({
                    type: 'warning',
                    source: 'asset_card',
                    title: '权益资产比例偏高',
                    detail: `股票基金占比${(stockRatio * 100).toFixed(1)}%，建议${age}岁时不超过${(maxStockRatio * 100).toFixed(0)}%`
                });
            } else {
                successes.push({
                    type: 'success',
                    title: '权益资产配置合理',
                    detail: `股票基金占比${(stockRatio * 100).toFixed(1)}%，符合年龄适配原则`
                });
            }

            if (age >= 40 && bondRatio < minBondRatio) {
                warnings.push({
                    type: 'warning',
                    source: 'asset_card',
                    title: '固收资产比例偏低',
                    detail: `债券基金占比${(bondRatio * 100).toFixed(1)}%，建议${age}岁后不低于${(minBondRatio * 100).toFixed(0)}%`
                });
            }

            return { warnings, successes };
        }

        diagnoseRiskOverstepHandling(historyStep) {
            if (!historyStep.data?.riskCheck?.overstep) {
                return null;
            }

            const handling = {
                handled: false,
                method: null,
                correct: false
            };

            const nextStep = this.game.history.find(h => h.turn === historyStep.turn + 1);

            if (nextStep) {
                const prevAllocation = historyStep.snapshot.allocation;
                const newAllocation = nextStep.snapshot.allocation;

                const prevStock = prevAllocation.stock || 0;
                const newStock = newAllocation.stock || 0;

                if (newStock < prevStock) {
                    handling.handled = true;
                    handling.method = '减少权益资产';
                    handling.correct = true;
                }

                const prevTax = historyStep.snapshot.taxBalance || 0;
                const newTax = nextStep.snapshot.taxBalance || 0;
                if (newTax > prevTax && newStock < prevStock) {
                    handling.method += '，增加税延配置';
                }
            }

            return handling;
        }
    }

    return { DiagnosisEngine };
})();