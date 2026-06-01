const GameEngine = (function() {
    const { ASSET_TYPES, MARKET_EVENTS, AgeCell, AssetCard, TaxAccount, PlayerRecord } = GameModels;

    class Game {
        constructor() {
            this.startAge = 25;
            this.retirementAge = 60;
            this.currentAge = 25;
            this.ageCells = [];
            this.assetCards = {};
            this.taxAccount = new TaxAccount();
            this.turn = 1;
            this.history = [];
            this.currentEvent = null;
            this.totalAssets = 100000;
            this.yearlyIncome = 50000;
            this.playerRecord = null;
            this.gameOver = false;
            this.goalRevoked = false;
            this.initialCash = 50000;
            this.riskLimitByAge = this._calculateRiskLimits();
            this._initAgeCells();
            this._initAssetCards();
        }

        _calculateRiskLimits() {
            const limits = {};
            for (let age = 25; age <= 60; age++) {
                limits[age] = Math.max(1, Math.ceil(3 - (age - 25) / 15));
            }
            return limits;
        }

        _initAgeCells() {
            this.ageCells = [];
            for (let age = 25; age <= 60; age += 5) {
                this.ageCells.push(new AgeCell(age));
            }
        }

        _initAssetCards() {
            this.assetCards = {};
            Object.values(ASSET_TYPES).forEach(type => {
                this.assetCards[type.id] = new AssetCard(type);
            });
        }

        startGame(playerName) {
            this.playerRecord = new PlayerRecord(playerName);
            this.turn = 1;
            this.currentAge = 25;
            this.totalAssets = 100000;
            this.history = [];
            this.gameOver = false;
            this._initAgeCells();
            this._initAssetCards();
            this.taxAccount = new TaxAccount();
            this._generateMarketEvent();
            this._saveHistory('start', '游戏开始');
        }

        _generateMarketEvent() {
            const randomIndex = Math.floor(Math.random() * MARKET_EVENTS.length);
            this.currentEvent = MARKET_EVENTS[randomIndex];
            const currentCell = this.getCurrentAgeCell();
            if (currentCell) {
                currentCell.marketEvent = this.currentEvent;
            }
        }

        getCurrentAgeCell() {
            return this.ageCells.find(cell => cell.age === this.currentAge);
        }

        getAgeCell(age) {
            return this.ageCells.find(cell => cell.age === age);
        }

        setAssetAllocation(assetId, amount) {
            if (this.assetCards[assetId]) {
                this.assetCards[assetId].setAllocation(amount);
            }
        }

        depositToTaxAccount(amount) {
            const result = this.taxAccount.deposit(amount, this.currentAge);
            if (result.success) {
                this.initialCash -= result.amount;
                this._saveHistory('tax_deposit', result.message, { amount: result.amount });
            }
            return result;
        }

        withdrawFromTaxAccount(amount) {
            const result = this.taxAccount.withdraw(amount, this.currentAge);
            if (result.success) {
                this.initialCash += result.amount;
                if (result.penalty > 0) {
                    this.playerRecord.addTaxError(this.turn, this.currentAge, `提前支取罚息${result.penalty}元`);
                }
                this._saveHistory('tax_withdraw', result.message, {
                    amount: result.amount, penalty: result.penalty });
            }
            return result;
        }

        calculateCurrentRisk() {
            let totalRisk = 0;
            let totalAllocation = 0;
            Object.values(this.assetCards).forEach(card => {
                totalRisk += card.riskLevel * card.allocationAmount;
                totalAllocation += card.allocationAmount;
            });
            if (totalAllocation === 0) return 0;
            return totalRisk / totalAllocation;
        }

        checkRiskOverstep() {
            const currentRisk = this.calculateCurrentRisk();
            const riskLimit = this.riskLimitByAge[this.currentAge];
            if (currentRisk > riskLimit) {
                return {
                    overstep: true,
                    currentRisk,
                    riskLimit,
                    difference: currentRisk - riskLimit
                };
            }
            return { overstep: false, currentRisk, riskLimit };
        }

        calculateAllocationReport() {
            const report = {
                assetReturns: {},
                taxInfo: {},
                totalExpected: 0,
                totalActual: 0,
                mismatches: []
            };

            Object.entries(this.assetCards).forEach(([id, card]) => {
                let marketBonus = 0;
                if (this.currentEvent && this.currentEvent.effect.asset === id) {
                    marketBonus = this.currentEvent.effect.returnBonus || 0;
                }
                const expectedReturn = card.calculateReturn(marketBonus);
                const volatilityEffect = (Math.random() - 0.5) * card.volatility;
                const actualReturn = card.allocationAmount * (1 + card.expectedReturn + marketBonus + volatilityEffect);
                report.assetReturns[id] = {
                    name: card.name,
                    allocated: card.allocationAmount,
                    expected: expectedReturn,
                    actual: actualReturn,
                    difference: actualReturn - expectedReturn
                };
                report.totalExpected += expectedReturn;
                report.totalActual += actualReturn;
            });

            const taxReturn = this.taxAccount.calculateYearlyReturn();
            report.taxInfo = {
                balance: this.taxAccount.balance,
                yearlyReturn: taxReturn
            };
            report.totalExpected += taxReturn;
            report.totalActual += taxReturn;

            const ageCell = this.getCurrentAgeCell();
            if (ageCell && ageCell.expectedValue > 0 && Math.abs(report.totalActual - ageCell.expectedValue) > 1000) {
                report.mismatches.push({
                    type: 'age_mismatch',
                    message: '年龄格预期值与实际计算不符'
                });
            }

            return report;
        }

        confirmAllocation() {
            const report = this.calculateAllocationReport();
            const riskCheck = this.checkRiskOverstep();
            const ageCell = this.getCurrentAgeCell();
            
            const allocation = {};
            Object.entries(this.assetCards).forEach(([id, card]) => {
                allocation[id] = card.allocationAmount;
            });

            if (riskCheck.overstep) {
                ageCell.riskOverstep = {
                    ...riskCheck,
                    handled: false,
                    turn: this.turn
                };
                this.playerRecord.addRiskError(this.turn, this.currentAge,
                    `风险值${riskCheck.currentRisk.toFixed(2)}超过限值${riskCheck.riskLimit}`);
            }

            ageCell.expectedValue = report.totalExpected;
            ageCell.actualValue = report.totalActual;
            ageCell.complete(
                allocation,
                this.taxAccount.totalDeposits,
                this.taxAccount.totalWithdrawals,
                this.calculateCurrentRisk()
            );

            this.totalAssets = report.totalActual + this.initialCash + this.yearlyIncome;
            this._saveHistory('allocation', `第${this.turn}回合配置完成`, {
                allocation,
                report,
                riskCheck
            });

            return { report, riskCheck };
        }

        nextTurn() {
            const nextAge = this.currentAge + 5;
            if (nextAge > this.retirementAge) {
                this.gameOver = true;
                this.playerRecord.totalValue = this.totalAssets + this.taxAccount.balance;
                this.playerRecord.finalAge = this.currentAge;
                this.playerRecord.completedTurns = this.turn;
                this.playerRecord.calculateScore();
                this._saveHistory('game_over', '游戏结束');
                return { gameOver: true };
            }

            this.currentAge = nextAge;
            this.turn++;
            this._generateMarketEvent();

            Object.values(this.assetCards).forEach(card => {
                card.setAllocation(0);
            });

            this.initialCash = 50000;

            this._saveHistory('next_turn', `进入第${this.turn}回合，年龄${this.currentAge}岁`);

            return { gameOver: false, newAge: this.currentAge };
        }

        revokeRetirementGoal() {
            this.goalRevoked = true;
            this.playerRecord.goalRevoked = true;
            this.ageCells.forEach(cell => {
                if (cell.completed && cell.age > this.currentAge) {
                    cell.affectedByRevocation = true;
                }
            });
            this._saveHistory('revoke_goal', '撤回退休目标', { affectedAges: this.ageCells.filter(c => c.affectedByRevocation).map(c => c.age) });
            return this.ageCells.filter(c => c.affectedByRevocation);
        }

        _saveHistory(action, message, data = {}) {
            this.history.push({
                turn: this.turn,
                age: this.currentAge,
                action,
                message,
                timestamp: Date.now(),
                data: JSON.parse(JSON.stringify(data)),
                snapshot: {
                    totalAssets: this.totalAssets,
                    taxBalance: this.taxAccount.balance,
                    allocation: Object.fromEntries(
                        Object.entries(this.assetCards).map(([id, card]) => [id, card.allocationAmount])
                    )
                }
            });
        }

        getLeaderboardData() {
            return this.playerRecord;
        }

        getReplayData() {
            return [...this.history];
        }
    }

    return { Game };
})();