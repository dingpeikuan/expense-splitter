// 应用数据
let participants = [];
let expenses = [];

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updatePayerSelect();
    renderParticipants();
    renderExpenses();
});

// 添加参与者
function addParticipant() {
    const nameInput = document.getElementById('participant-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('请输入参与者姓名');
        return;
    }
    
    if (participants.includes(name)) {
        alert('该参与者已存在');
        return;
    }
    
    participants.push(name);
    nameInput.value = '';
    
    updatePayerSelect();
    renderParticipants();
    saveData();
}

// 更新支付人选择框
function updatePayerSelect() {
    const select = document.getElementById('expense-payer');
    select.innerHTML = '<option value="">选择支付人</option>';
    
    participants.forEach(participant => {
        const option = document.createElement('option');
        option.value = participant;
        option.textContent = participant;
        select.appendChild(option);
    });
}

// 渲染参与者列表
function renderParticipants() {
    const list = document.getElementById('participants-list');
    list.innerHTML = '';
    
    participants.forEach((participant, index) => {
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.innerHTML = `
            <span>${participant}</span>
            <button class="delete-btn" onclick="removeParticipant(${index})">删除</button>
        `;
        list.appendChild(item);
    });
}

// 删除参与者
function removeParticipant(index) {
    participants.splice(index, 1);
    updatePayerSelect();
    renderParticipants();
    saveData();
}

// 添加费用
function addExpense() {
    const descInput = document.getElementById('expense-desc');
    const amountInput = document.getElementById('expense-amount');
    const payerSelect = document.getElementById('expense-payer');
    
    const description = descInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const payer = payerSelect.value;
    
    if (!description) {
        alert('请输入费用描述');
        return;
    }
    
    if (!amount || amount <= 0) {
        alert('请输入有效的金额');
        return;
    }
    
    if (!payer) {
        alert('请选择支付人');
        return;
    }
    
    const expense = {
        id: Date.now(),
        description: description,
        amount: amount,
        payer: payer,
        timestamp: new Date().toLocaleString()
    };
    
    expenses.push(expense);
    
    // 清空输入框
    descInput.value = '';
    amountInput.value = '';
    payerSelect.value = '';
    
    renderExpenses();
    saveData();
}

// 渲染费用列表
function renderExpenses() {
    const list = document.getElementById('expenses-list');
    list.innerHTML = '';
    
    if (expenses.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #718096; padding: 20px;">暂无费用记录</div>';
        return;
    }
    
    expenses.forEach((expense, index) => {
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
            <div>
                <strong>${expense.description}</strong>
                <div style="font-size: 0.9em; color: #718096;">
                    支付人：${expense.payer} | 时间：${expense.timestamp}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; color: #2d3748; font-size: 1.1em;">¥${expense.amount.toFixed(2)}</div>
                <button class="delete-btn" onclick="removeExpense(${index})">删除</button>
            </div>
        `;
        list.appendChild(item);
    });
}

// 删除费用
function removeExpense(index) {
    expenses.splice(index, 1);
    renderExpenses();
    saveData();
}

// 计算分摊
function calculate() {
    if (participants.length < 2) {
        alert('请至少添加2个参与者');
        return;
    }
    
    if (expenses.length === 0) {
        alert('请至少添加一个费用项目');
        return;
    }
    
    // 计算总费用
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // 计算每人应付的平均金额
    const averageAmount = totalAmount / participants.length;
    
    // 计算每个人的实际支付总额
    const paidAmounts = {};
    participants.forEach(participant => {
        paidAmounts[participant] = 0;
    });
    
    expenses.forEach(expense => {
        paidAmounts[expense.payer] += expense.amount;
    });
    
    // 计算每个人的应收/应付金额
    const settlements = participants.map(participant => {
        const paid = paidAmounts[participant];
        const balance = paid - averageAmount;
        
        return {
            name: participant,
            paid: paid,
            average: averageAmount,
            balance: balance
        };
    });
    
    // 渲染结果
    renderResults(settlements, totalAmount);
}

// 渲染计算结果
function renderResults(settlements, totalAmount) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    
    // 显示总费用信息
    const summary = document.createElement('div');
    summary.className = 'result-item even';
    summary.innerHTML = `
        <div>
            <strong>费用汇总</strong>
            <div style="font-size: 0.9em; color: #718096;">
                总费用：¥${totalAmount.toFixed(2)} | 人均：¥${(totalAmount / participants.length).toFixed(2)}
            </div>
        </div>
        <div class="amount">${participants.length}人</div>
    `;
    resultsDiv.appendChild(summary);
    
    // 显示每个人的结算信息
    settlements.forEach(settlement => {
        const item = document.createElement('div');
        
        if (settlement.balance > 0) {
            item.className = 'result-item receive';
            item.innerHTML = `
                <div>
                    <strong>${settlement.name}</strong>
                    <div style="font-size: 0.9em; color: #718096;">
                        实际支付：¥${settlement.paid.toFixed(2)} | 应收：¥${settlement.balance.toFixed(2)}
                    </div>
                </div>
                <div class="amount">+¥${settlement.balance.toFixed(2)}</div>
            `;
        } else if (settlement.balance < 0) {
            item.className = 'result-item pay';
            item.innerHTML = `
                <div>
                    <strong>${settlement.name}</strong>
                    <div style="font-size: 0.9em; color: #718096;">
                        实际支付：¥${settlement.paid.toFixed(2)} | 应付：¥${Math.abs(settlement.balance).toFixed(2)}
                    </div>
                </div>
                <div class="amount">-¥${Math.abs(settlement.balance).toFixed(2)}</div>
            `;
        } else {
            item.className = 'result-item even';
            item.innerHTML = `
                <div>
                    <strong>${settlement.name}</strong>
                    <div style="font-size: 0.9em; color: #718096;">
                        实际支付：¥${settlement.paid.toFixed(2)} | 无需结算
                    </div>
                </div>
                <div class="amount">¥0.00</div>
            `;
        }
        
        resultsDiv.appendChild(item);
    });
}

// 重置所有数据
function resetAll() {
    if (confirm('确定要重置所有数据吗？这将清除所有参与者和费用记录。')) {
        participants = [];
        expenses = [];
        updatePayerSelect();
        renderParticipants();
        renderExpenses();
        document.getElementById('results').innerHTML = '';
        localStorage.removeItem('expenseSplitterData');
    }
}

// 保存数据到本地存储
function saveData() {
    const data = {
        participants: participants,
        expenses: expenses
    };
    localStorage.setItem('expenseSplitterData', JSON.stringify(data));
}

// 从本地存储加载数据
function loadData() {
    const savedData = localStorage.getItem('expenseSplitterData');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            participants = data.participants || [];
            expenses = data.expenses || [];
        } catch (e) {
            console.error('加载数据失败:', e);
        }
    }
}

// 导出数据功能（可选扩展）
function exportData() {
    const data = {
        participants: participants,
        expenses: expenses,
        exportTime: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `费用分摊数据_${new Date().toLocaleDateString()}.json`;
    link.click();
}