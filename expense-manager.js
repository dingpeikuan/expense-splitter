// 费用管理模块
class ExpenseManager {
    constructor() {
        this.currentRound = 0;
    }

    // 添加费用
    addExpense(roundIndex) {
        const round = DataManager.getInstance().rounds[roundIndex];
        const expense = {
            description: '',
            amount: 0,
            payer: '',
            participants: [...round.participants]
        };
        round.expenses.push(expense);
        this.renderExpenses();
        DataManager.getInstance().saveData();
    }

    // 删除费用
    removeExpense(roundIndex, expenseIndex) {
        if (confirm('确定要删除这笔费用吗？')) {
            const round = DataManager.getInstance().rounds[roundIndex];
            round.expenses.splice(expenseIndex, 1);
            this.renderExpenses();
            DataManager.getInstance().saveData();
        }
    }

    // 更新费用信息
    updateExpense(roundIndex, expenseIndex, field, value) {
        const expense = DataManager.getInstance().rounds[roundIndex].expenses[expenseIndex];
        
        if (field === 'amount') {
            value = parseFloat(value) || 0;
        }
        
        expense[field] = value;
        this.renderExpenses();
        DataManager.getInstance().saveData();
    }

    // 切换参与者参与状态
    toggleParticipant(roundIndex, expenseIndex, participantName) {
        const expense = DataManager.getInstance().rounds[roundIndex].expenses[expenseIndex];
        const index = expense.participants.findIndex(p => p.name === participantName);
        
        if (index > -1) {
            expense.participants.splice(index, 1);
        } else {
            expense.participants.push({ name: participantName });
        }
        
        this.renderExpenses();
        DataManager.getInstance().saveData();
    }

    // 渲染费用列表
    renderExpenses() {
        const expensesContainer = document.getElementById('expenses-container');
        expensesContainer.innerHTML = '';
        
        const dataManager = DataManager.getInstance();
        const currentRound = dataManager.currentRound;
        const round = dataManager.rounds[currentRound];
        
        const roundSection = document.createElement('div');
        roundSection.className = 'round-section';
        
        // 轮次标题
        // const roundTitle = document.createElement('h3');
        // roundTitle.textContent = `第${currentRound + 1}轮费用`;
        // roundSection.appendChild(roundTitle);
            
            // 费用表格
            const table = document.createElement('table');
            table.className = 'expense-table';
            
            // 创建表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>描述</th>
                <th>支付人</th>
                <th>金额</th>
                <th>操作</th>
            </tr>
        `;
        table.appendChild(thead);
            
            // 表格内容
            const tbody = document.createElement('tbody');
            
            round.expenses.forEach((expense, expenseIndex) => {
                const row = document.createElement('tr');
                
                // 描述
                const descCell = document.createElement('td');
                const descInput = document.createElement('input');
                descInput.type = 'text';
                descInput.value = expense.description;
                descInput.placeholder = '费用描述';
                descInput.oninput = (e) => this.updateExpense(currentRound, expenseIndex, 'description', e.target.value);
                descCell.appendChild(descInput);
                
                // 金额
                const amountCell = document.createElement('td');
                const amountInput = document.createElement('input');
                amountInput.type = 'number';
                amountInput.value = expense.amount;
                amountInput.min = '0';
                amountInput.step = '0.01';
                amountInput.oninput = (e) => this.updateExpense(currentRound, expenseIndex, 'amount', e.target.value);
                amountCell.appendChild(amountInput);
                
                // 支付人
                const payerCell = document.createElement('td');
                const payerSelect = document.createElement('select');
                payerSelect.className = 'payer-select';
                payerSelect.innerHTML = '<option value="">请选择支付人(请不要重复选择)</option>';
                
                ParticipantManager.getInstance().allParticipants.forEach(participant => {
                    const option = document.createElement('option');
                    option.value = participant.name;
                    option.textContent = participant.name;
                    if (participant.name === expense.payer) {
                        option.selected = true;
                    }
                    payerSelect.appendChild(option);
                });
                
                payerSelect.onchange = (e) => this.updateExpense(currentRound, expenseIndex, 'payer', e.target.value);
                payerCell.appendChild(payerSelect);
                
                // 操作
                const actionCell = document.createElement('td');
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '删除';
                deleteBtn.onclick = (e) => {
                    e.preventDefault();
                    this.removeExpense(currentRound, expenseIndex);
                };
                
                actionCell.appendChild(deleteBtn);
                
                row.appendChild(descCell);
                row.appendChild(payerCell);
                row.appendChild(amountCell);
                row.appendChild(actionCell);
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            roundSection.appendChild(table);
            
            // 添加空行
            const emptyRow = document.createElement('tr');
            const participantOptions = ParticipantManager.getInstance().allParticipants.map(p => 
                `<option value="${p.name}" ${this.emptyRowPayer === p.name ? 'selected' : ''}>${p.name}</option>`
            ).join('');
            emptyRow.innerHTML = `
                <td><input type="text" placeholder="费用描述" oninput="expenseManager.updateEmptyRowDescription(${currentRound}, this.value)" value="${this.emptyRowDescription || ''}"></td>
                <td>
                    <select onchange="expenseManager.updateEmptyRowPayer(${currentRound}, this.value)">
                        <option value="" ${!this.emptyRowPayer ? 'selected' : ''}>选择支付人(请不要重复选择)</option>
                        ${participantOptions}
                    </select>
                </td>
                <td><input type="number" placeholder="金额" oninput="expenseManager.updateEmptyRowAmount(${currentRound}, this.value)" value="${this.emptyRowAmount || ''}"></td>
                <td>
                    <button class="add-btn" onclick="expenseManager.addEmptyExpense(${currentRound})">新增</button>
                </td>
            `;
            tbody.appendChild(emptyRow);
            
            expensesContainer.appendChild(roundSection);
    }

    // 更新空行描述
    updateEmptyRowDescription(roundIndex, description) {
        this.emptyRowDescription = description;
    }
    
    // 更新空行金额
    updateEmptyRowAmount(roundIndex, amount) {
        this.emptyRowAmount = amount;
    }
    
    // 更新空行支付人
    updateEmptyRowPayer(roundIndex, payer) {
        this.emptyRowPayer = payer;
    }
    
    // 删除轮次
    deleteRound(roundIndex) {
        if (confirm('确定要删除当前轮次的所有费用明细吗？')) {
            const dataManager = DataManager.getInstance();
            const roundManager = RoundManager.getInstance();
            
            // 删除指定轮次
            dataManager.rounds.splice(roundIndex, 1);
            
            // 更新轮次顺序
            dataManager.rounds.forEach((round, index) => {
                round.name = `第${index + 1}轮`;
            });
            
            // 保存数据
            dataManager.saveData();
            
            // 重新渲染轮次
            roundManager.renderRounds();
            
            // 切换到前一轮次，如果没有轮次则创建新轮次
            if (dataManager.rounds.length > 0) {
                const newIndex = Math.min(roundIndex, dataManager.rounds.length - 1);
                roundManager.switchRound(newIndex);
            } else {
                roundManager.addRound();
            }
        }
    }

    // 添加空行费用
    addEmptyExpense(roundIndex) {
        const description = this.emptyRowDescription || '';
        const amount = this.emptyRowAmount || 0;
        const payer = this.emptyRowPayer || '';
        
        if (amount >= 0 && payer) {
            const round = DataManager.getInstance().rounds[roundIndex];
            
            // 检查支付人是否已经在当前轮次中存在
            const existingExpense = round.expenses.find(expense => expense.payer === payer);
            if (existingExpense) {
                alert('该支付人已经在当前费用轮次中，请修改对应的支付金额。');
                // 当发现重复支付人时，清空支付人选择、描述和金额
                this.emptyRowPayer = '';
                this.emptyRowDescription = '';
                this.emptyRowAmount = '';
                this.renderExpenses(); // 重新渲染以更新UI
                return;
            }
            
            round.expenses.push({
                description: description,
                amount: parseFloat(amount),
                payer: payer,
                participants: ParticipantManager.getInstance().allParticipants
            });
            
            // 清空空行数据 - 仅在成功添加时清空
            this.emptyRowDescription = '';
            this.emptyRowAmount = 0;
            this.emptyRowPayer = '';
            
            // 保存数据
            DataManager.getInstance().saveData();
            
            // 重新渲染
            this.renderExpenses();
        } else {
            alert('请填写完整的费用信息（金额、支付人）');
        }
    }

    // 单例模式
    static getInstance() {
        if (!ExpenseManager._instance) {
            ExpenseManager._instance = new ExpenseManager();
        }
        return ExpenseManager._instance;
    }
}

// 初始化单例
ExpenseManager._instance = null;