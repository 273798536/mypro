const GameModels = (function() {
    const ASSET_TYPES = {
        STOCK: { id: 'stock', name: '股票基金', risk: 'high', expectedReturn: 0.12, volatility: 0.25, riskLevel: 3 },
        BOND: { id: 'bond', name: '债券基金', risk: 'medium', expectedReturn: 0.05, volatility: 0.08, riskLevel: 2 },
        MONEY_MARKET: { id: 'money_market', name: '货币基金', risk: 'low', expectedReturn: 0.025, volatility: 0.01, riskLevel: 1 },
        ANNUITY: { id: 'annuity', name: '商业年金', risk: 'low', expectedReturn: 0.035, volatility: 0.02, riskLevel: 1 }
    };

    const MARKET_EVENTS = [
        { id: 'bull_market', title: '牛市行情', desc: '股市大涨，股票基金收益+15%', type: 'positive', effect: { asset: 'stock', returnBonus: 0.15 } },
        { id: 'bear_market', title: '熊市来袭', desc: '股市大跌，股票基金收益-20%', type: 'negative', effect: { asset: 'stock', returnBonus: -0.20 } },
        { id: 'rate_hike', title: '加息周期', desc: '央行加息，债券收益-5%', type: 'negative', effect: { asset: 'bond', returnBonus: -0.05 } },
        { id: 'rate_cut', title: '降息周期', desc: '央行降息，债券收益+8%', type: 'positive', effect: { asset: 'bond', returnBonus: 0.08 } },
        { id: 'inflation', title: '通胀上升', desc: '通胀高企，货币基金收益+1%', type: 'neutral', effect: { asset: 'money_market', returnBonus: 0.01 } },
        { id: 'policy_support', title: '政策支持', desc: '养老政策利好，年金收益+3%', type: 'positive', effect: { asset: 'annuity', returnBonus: 0.03 } },
        { id: 'market_volatility', title: '市场震荡', desc: '市场波动加剧，风险评估上调', type: 'negative', effect: { riskIncrease: 1 } },
        { id: 'stable_growth', title: '平稳增长', desc: '经济平稳运行，无特殊影响', type: 'neutral', effect: {} }
    ];

    const AGE_REMARKS = {
        25: '初入职场',
        30: '成家立业',
        35: '事业上升',
        40: '中年危机',
        45: '子女教育',
        50: '临近退休',
        55: '退休规划',
        60: '退休年龄'
    };

    class AgeCell {
        constructor(age) {
            this.age = age;
            this.remark = AGE_REMARKS[age] || '';
            this.completed = false;
            this.riskLevel = 0;
            this.allocation = {};
            this.marketEvent = null;
            this.affectedByRevocation = false;
            this.taxDeposit = 0;
            this.taxWithdraw = 0;
            this.riskOverstep = null;
            this.expectedValue = 0;
            this.actualValue = 0;
        }

        setRemark(remark) {
            this.remark = remark;
        }

        complete(allocation, taxDeposit, taxWithdraw, riskLevel) {
            this.completed = true;
            this.allocation = { ...allocation };
            this.taxDeposit = taxDeposit;
            this.taxWithdraw = taxWithdraw;
            this.riskLevel = riskLevel;
        }
    }

    class AssetCard {
        constructor(type) {
            this.type = type;
            this.name = type.name;
            this.risk = type.risk;
            this.expectedReturn = type.expectedReturn;
            this.volatility = type.volatility;
            this.riskLevel = type.riskLevel;
            this.allocationAmount = 0;
            this.selected = false;
        }

        setAllocation(amount) {
            this.allocationAmount = Math.max(0, amount);
            this.selected = amount > 0;
        }

        calculateReturn(marketBonus = 0) {
            const actualReturn = this.expectedReturn + marketBonus;
            return this.allocationAmount * (1 + actualReturn);
        }
    }

    class TaxAccount {
        constructor() {
            this.balance = 0;
            this.totalDeposits = 0;
            this.totalWithdrawals = 0;
            this.annualLimit = 12000;
            this.taxDeductionRate = 0.2;
            this.earlyWithdrawPenalty = 0.03;
        }

        deposit(amount, age) {
            if (age >= 60) {
                return { success: false, message: '已退休，无法存入' };
            }
            const actualDeposit = Math.min(amount, this.annualLimit);
            if (actualDeposit <= 0) {
                return { success: false, message: '存入金额无效' };
            }
            this.balance += actualDeposit;
            this.totalDeposits += actualDeposit;
            const taxBenefit = actualDeposit * this.taxDeductionRate;
            return { success: true, amount: actualDeposit, taxBenefit, message: `成功存入${actualDeposit}元，税优${taxBenefit}元` };
        }

        withdraw(amount, age) {
            if (amount <= 0 || amount > this.balance) {
                return { success: false, message: '支取金额无效' };
            }
            let penalty = 0;
            if (age < 60) {
                penalty = amount * this.earlyWithdrawPenalty;
            }
            const actualWithdraw = amount - penalty;
            this.balance -= amount;
            this.totalWithdrawals += amount;
            return { 
                success: true, 
                amount: actualWithdraw, 
                penalty, 
                message: age < 60 
                    ? `提前支取${amount}元，罚息${penalty}元，实际到账${actualWithdraw}元`
                    : `正常支取${amount}元`
            };
        }

        calculateYearlyReturn() {
            const returnRate = 0.03;
            this.balance *= (1 + returnRate);
            return this.balance * returnRate;
        }
    }

    class PlayerRecord {
        constructor(name) {
            this.id = Date.now() + Math.random();
            this.name = name;
            this.score = 0;
            this.totalValue = 0;
            this.riskErrors = [];
            this.taxErrors = [];
            this.allocationErrors = [];
            this.completedTurns = 0;
            this.finalAge = 0;
            this.goalRevoked = false;
        }

        addRiskError(turn, age, detail) {
            this.riskErrors.push({ turn, age, detail });
        }

        addTaxError(turn, age, detail) {
            this.taxErrors.push({ turn, age, detail });
        }

        addAllocationError(turn, age, detail) {
            this.allocationErrors.push({ turn, age, detail });
        }

        calculateScore() {
            let score = this.totalValue;
            score -= this.riskErrors.length * 50000;
            score -= this.taxErrors.length * 30000;
            score -= this.allocationErrors.length * 20000;
            this.score = Math.max(0, score);
            return this.score;
        }
    }

    return {
        ASSET_TYPES,
        MARKET_EVENTS,
        AGE_REMARKS,
        AgeCell,
        AssetCard,
        TaxAccount,
        PlayerRecord
    };
})();