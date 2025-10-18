class RoundManager {
    constructor() {
        if (RoundManager.instance) {
            return RoundManager.instance;
        }
        RoundManager.instance = this;
        
        // 从DataManager加载数据
        const dataManager = DataManager.getInstance();
        this.rounds = dataManager.rounds.length > 0 ? dataManager.rounds : [{
            participants: [],
            expenses: []
        }];
        this.currentRound = dataManager.currentRound || 0;
    }

    static getInstance() {
        if (!RoundManager.instance) {
            RoundManager.instance = new RoundManager();
        }
        return RoundManager.instance;
    }

    // 设置轮次数据
    setRounds(rounds) {
        this.rounds = rounds;
    }

    // 设置当前轮次
    setCurrentRound(roundIndex) {
        this.currentRound = roundIndex;
    }

    // 获取轮次数据
    getRounds() {
        return this.rounds;
    }

    // 获取当前轮次
    getCurrentRound() {
        return this.currentRound;
    }

    // 获取当前轮次数据
    getCurrentRoundData() {
        return this.rounds[this.currentRound];
    }

    // 添加新轮次
    addRound(allParticipants) {
        // 从DataManager获取参与者列表，如果参数未提供
        const participants = allParticipants || DataManager.getInstance().getAllParticipants();
        
        // 创建新轮次
        const newRound = {
            name: `轮次 ${this.rounds.length + 1}`,
            participants: [...participants],
            expenses: []
        };
        
        // 添加到轮次列表
        this.rounds.push(newRound);
        
        // 设置为当前轮次
        this.currentRound = this.rounds.length - 1;
        
        // 同步到DataManager
        const dataManager = DataManager.getInstance();
        dataManager.setRounds([...this.rounds]);
        dataManager.setCurrentRound(this.currentRound);
        
        // 更新轮次选择器
        this.updateRoundSelector();
        
        // 更新费用列表
        const expenseManager = ExpenseManager.getInstance();
        expenseManager.currentRound = this.currentRound;
        expenseManager.renderExpenses();
    }

    // 切换轮次
    switchRound(roundIndex) {
        this.currentRound = parseInt(roundIndex);
        DataManager.getInstance().setCurrentRound(this.currentRound);
        
        // 从DataManager重新加载当前轮次数据
        const dataManager = DataManager.getInstance();
        this.rounds = dataManager.rounds;
        
        // 更新ExpenseManager的当前轮次
        const expenseManager = ExpenseManager.getInstance();
        expenseManager.currentRound = this.currentRound;
        
        // 仅渲染费用列表，不刷新参与者设置
        expenseManager.renderExpenses();
    }

    // 重置轮次数据
    resetRoundData() {
        // 从DataManager获取最新参与者列表
        const dataManager = DataManager.getInstance();
        const allParticipants = dataManager.getAllParticipants();
        
        // 重置轮次数据
        this.rounds = [{ 
            participants: allParticipants.map(participant => ({ 
                name: participant.name, 
                amount: 0 
            })), 
            expenses: [] 
        }];
        this.currentRound = 0;
        
        // 同步到DataManager
        dataManager.rounds = [...this.rounds];
        dataManager.setCurrentRound(this.currentRound);
        
        // 更新UI
        this.updateRoundSelector();
    }

    // 更新轮次选择器
    updateRoundSelector() {
        // 先从DataManager同步最新数据
        const dataManager = DataManager.getInstance();
        this.rounds = dataManager.rounds;
        this.currentRound = dataManager.currentRound;
        
        const selector = document.getElementById('round-selector');
        if (!selector) return;
        
        selector.innerHTML = '';
        
        this.rounds.forEach((round, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `第${index + 1}轮`;
            if (index === this.currentRound) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    }

    // 渲染轮次列表
    renderRounds() {
        const roundsList = document.getElementById('rounds-list');
        if (!roundsList) return;
        
        roundsList.innerHTML = '';
        
        this.rounds.forEach((round, index) => {
            const roundItem = document.createElement('div');
            roundItem.className = 'round-item';
            if (index === this.currentRound) {
                roundItem.classList.add('active');
            }
            
            roundItem.innerHTML = `
                <span>第${index + 1}轮</span>
                <button onclick="switchRound(${index})">切换</button>
            `;
            
            roundsList.appendChild(roundItem);
        });
    }

    // 添加费用
    addExpense(amount, payer) {
        this.rounds[this.currentRound].expenses.push({
            amount: amount,
            payer: payer
        });
        // 同步到DataManager
        DataManager.getInstance().rounds[this.currentRound].expenses.push({
            amount: amount,
            payer: payer
        });
        DataManager.getInstance().saveData();
    }

    // 更新费用金额
    updateExpenseAmount(index, newAmount) {
        this.rounds[this.currentRound].expenses[index].amount = newAmount;
        // 同步到DataManager
        DataManager.getInstance().rounds[this.currentRound].expenses[index].amount = newAmount;
        DataManager.getInstance().saveData();
    }

    // 更新费用支付人
    updateExpensePayer(index, payer) {
        if (payer === '') return;
        this.rounds[this.currentRound].expenses[index].payer = payer;
        // 同步到DataManager
        DataManager.getInstance().rounds[this.currentRound].expenses[index].payer = payer;
        DataManager.getInstance().saveData();
    }

    // 更新空行支付人
    updateEmptyRowPayer(payer, amount) {
        if (payer && payer.trim() !== '' && amount >= 0) {
            this.rounds[this.currentRound].expenses.push({
                payer: payer,
                amount: amount
            });
            // 同步到DataManager
            DataManager.getInstance().rounds[this.currentRound].expenses.push({
                payer: payer,
                amount: amount
            });
            DataManager.getInstance().saveData();
        }
    }

    // 更新空行金额
    updateEmptyRowAmount(amount, payer) {
        const amountValue = parseFloat(amount) || 0;
        if (amountValue > 0 && payer && payer.trim() !== '') {
            this.rounds[this.currentRound].expenses.push({
                payer: payer,
                amount: amountValue
            });
            // 同步到DataManager
            DataManager.getInstance().rounds[this.currentRound].expenses.push({
                payer: payer,
                amount: amountValue
            });
            DataManager.getInstance().saveData();
        }
    }

    // 新增空行
    addNewRow(amount, payer) {
        if (amount >= 0 && payer && payer.trim() !== '') {
            const existingExpense = this.rounds[this.currentRound].expenses.find(
                expense => expense.payer === payer
            );
            if (existingExpense) {
                existingExpense.amount += amount;
            } else {
                this.rounds[this.currentRound].expenses.push({
                    payer: payer,
                    amount: amount
                });
            }
        }
    }

    // 删除空行
    removeEmptyRow() {
        if (this.rounds[this.currentRound].expenses.length === 0 && this.rounds.length > 1) {
            this.rounds.splice(this.currentRound, 1);
            this.currentRound = Math.max(0, this.currentRound - 1);
        }
    }

    // 删除费用
    removeExpense(index) {
        this.rounds[this.currentRound].expenses.splice(index, 1);
        
        // 如果删除的是最后一个费用，并且该轮次没有其他费用，则删除该轮次
        if (this.rounds[this.currentRound].expenses.length === 0) {
            this.rounds.splice(this.currentRound, 1);
            
            // 如果删除了当前轮次，则切换到前一个轮次
            if (this.currentRound >= this.rounds.length) {
                this.currentRound = Math.max(0, this.rounds.length - 1);
            }
            
            // 同步到DataManager
            DataManager.getInstance().rounds = this.rounds;
            DataManager.getInstance().setCurrentRound(this.currentRound);
            DataManager.getInstance().saveData();
        } else {
            // 同步到DataManager
            DataManager.getInstance().rounds[this.currentRound].expenses.splice(index, 1);
            DataManager.getInstance().saveData();
        }
    }
}