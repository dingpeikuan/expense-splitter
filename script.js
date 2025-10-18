// 应用数据
let allParticipants = [];
let rounds = [
  {
    participants: [],
    expenses: []
  }
];
let currentRound = 0;

// 初始化管理器实例
const participantManager = new ParticipantManager();
const expenseManager = new ExpenseManager();

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updatePayerSelect();
    renderParticipants();
    renderExpenses();
    
    // 为重置所有轮次数据按钮添加事件监听器
    const resetRoundsBtn = document.getElementById('reset-rounds-btn');
    if (resetRoundsBtn) {
        resetRoundsBtn.addEventListener('click', resetRoundData);
    }
});

// 添加参与者
function addParticipant() {
    participantManager.addParticipant();
}

// 从表格中添加新参与者
function addNewParticipant() {
    participantManager.addNewParticipant();
}

// 更新金额
function updateAmount(index, newAmount) {
    expenseManager.updateAmount(index, newAmount);
}

// 删除参与者
function removeParticipant(index) {
    participantManager.removeParticipant(index);
}

// 更新支付人选择框
function updatePayerSelect() {
    // 这个函数现在不需要做任何事情，因为费用表格中的下拉框是动态生成的
    // 保留函数定义以避免调用错误
}

// 渲染参与者列表
function renderParticipants() {
    participantManager.renderParticipants();
}

// 渲染费用列表
function renderExpenses() {
    expenseManager.renderExpenses();
}

// 计算分摊
function calculate() {
    // 获取所有参与者和轮次数据
    const dataManager = DataManager.getInstance();
    const allParticipants = dataManager.getAllParticipants();
    const rounds = dataManager.getRounds();
    
    // 确保有参与者
    if (allParticipants.length === 0) {
        alert('请先添加参与者');
        return;
    }
    
    // 确保有费用记录
    let hasExpenses = false;
    for (const round of rounds) {
        if (round.expenses && round.expenses.length > 0) {
            const validExpenses = round.expenses.filter(expense => 
                expense && typeof expense.amount === 'number' && expense.amount > 0 && expense.payer
            );
            if (validExpenses.length > 0) {
                hasExpenses = true;
                break;
            }
        }
    }
    
    if (!hasExpenses) {
        alert('请先添加有效的费用记录');
        return;
    }
    
    try {
        // 执行计算
        const calculationManager = CalculationManager.instance || new CalculationManager();
        const result = calculationManager.calculate(allParticipants, rounds);
        
        // 计算合并的支付关系（使用所有轮次的转账关系）
        const globalRelations = calculationManager.calculatePaymentRelations(result.participants);
        
        // 渲染结果
        calculationManager.renderResults(
            result.participants, 
            result.totalExpenses, 
            result.averageAmount, 
            globalRelations,  // 使用计算的全局支付关系
            result.roundResults
        );
        
    } catch (error) {
        console.error('计算过程中出现错误:', error);
        alert('计算过程中出现错误，请检查数据并重试！');
    }
}

// 渲染计算结果
function renderResults(participants, totalExpenses, averageAmount, relations) {
    calculationManager.renderResults(participants, totalExpenses, averageAmount, relations);
}

// 计算支付关系
function calculatePaymentRelations(settlements) {
    return calculationManager.calculatePaymentRelations(settlements);
}

// 渲染支付关系图表
function renderPaymentChart(paymentRelations) {
    calculationManager.renderPaymentChart(paymentRelations);
}

// 生成随机颜色
function getRandomColor() {
    return calculationManager.getRandomColor();
}

// 重置所有数据
function resetAll() {
    if (confirm('确定要重置所有数据吗？这将清除所有参与者记录。')) {
        allParticipants = [];
        rounds = [{
            participants: [],
            expenses: []
        }];
        currentRound = 0;
        updatePayerSelect();
        renderParticipants();
        renderExpenses();
        document.getElementById('results').innerHTML = '';
        localStorage.removeItem('expenseSplitterData');
    }
}

// 重置所有轮次数据
function resetRoundData() {
    const dataManager = DataManager.getInstance();
    
    // 先在DataManager中重置数据
    dataManager.resetRoundData();
    
    // 然后在RoundManager中同步数据
    const roundManager = RoundManager.getInstance();
    roundManager.resetRoundData();
    
    // 更新UI
    renderExpenses();
    document.getElementById('results').innerHTML = '';
}

// 删除当前轮次
function deleteCurrentRound() {
    const dataManager = DataManager.getInstance();
    const roundManager = RoundManager.getInstance();
    
    if (dataManager.rounds.length <= 1) {
        alert('至少需要保留一个轮次！');
        return;
    }
    
    if (confirm('确定要删除当前轮次的所有费用明细吗？')) {
        const currentIndex = dataManager.currentRound;
        
        // 删除当前轮次
        dataManager.rounds.splice(currentIndex, 1);
        
        // 更新当前轮次索引
        const newIndex = Math.min(currentIndex, dataManager.rounds.length - 1);
        dataManager.setCurrentRound(newIndex);
        
        // 同步到RoundManager
        roundManager.setRounds([...dataManager.rounds]);
        roundManager.setCurrentRound(newIndex);
        roundManager.updateRoundSelector();
        
        // 更新ExpenseManager
        const expenseManager = ExpenseManager.getInstance();
        expenseManager.currentRound = newIndex;
        expenseManager.renderExpenses();
        
        // 清空结果区域
        document.getElementById('results').innerHTML = '';
    }
}

// 保存数据到本地存储
function saveData() {
    const data = {
        allParticipants: allParticipants,
        rounds: rounds,
        currentRound: currentRound
    };
    localStorage.setItem('expenseSplitterData', JSON.stringify(data));
}

// 从本地存储加载数据
function loadData() {
    const savedData = localStorage.getItem('expenseSplitterData');
    if (savedData) {
        const data = JSON.parse(savedData);
        allParticipants = data.allParticipants || [];
        rounds = data.rounds || [];
        currentRound = data.currentRound || 0;
        
        // 确保每个轮次都有参与者数据
        rounds.forEach(round => {
            if (!round.participants) {
                round.participants = [...allParticipants];
            }
        });
        
        // 如果没有轮次，创建一个默认轮次
        if (rounds.length === 0) {
            rounds.push({
                name: '轮次 1',
                participants: [...allParticipants],
                expenses: []
            });
        }
        
        // 同步到DataManager
        DataManager.getInstance().setCurrentRound(currentRound);
    } else {
        // 初始化默认数据
        allParticipants = [];
        rounds = [{
            name: '轮次 1',
            participants: [],
            expenses: []
        }];
        currentRound = 0;
        
        // 同步到DataManager
        DataManager.getInstance().setCurrentRound(currentRound);
    }
}

// 导出数据
function exportData() {
    const data = {
        allParticipants: allParticipants,
        rounds: rounds,
        currentRound: currentRound
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'expense-splitter-data.json';
    link.click();
    
    URL.revokeObjectURL(link.href);
}

// 添加新轮次
function addRound() {
    const roundManager = RoundManager.getInstance();
    const dataManager = DataManager.getInstance();
    const allParticipants = dataManager.getAllParticipants();
    
    roundManager.addRound(allParticipants);
    
    // 更新全局变量以保持一致性
    currentRound = dataManager.getCurrentRound();
    rounds = dataManager.getRounds();
    
    // 更新UI
    updateRoundUI();
    
    // 清空结果区域
    document.getElementById('results').innerHTML = '';
}

// 切换轮次
function switchRound(roundIndex) {
    const roundManager = RoundManager.getInstance();
    roundManager.switchRound(roundIndex);
    updateRoundUI();
}

// 更新轮次选择器
function updateRoundSelector() {
    const roundManager = RoundManager.getInstance();
    roundManager.updateRoundSelector();
}

// 更新轮次UI
function updateRoundUI() {
    const round = rounds[currentRound];
    if (!round) return;
    
    // 更新轮次标题
    const roundTitle = document.getElementById('roundTitle');
    if (roundTitle) {
        roundTitle.textContent = round.name || `轮次 ${currentRound + 1}`;
    }
    
    // 更新参与者列表
    renderParticipants();
    
    // 更新费用列表
    renderExpenses();
    
    // 更新结算结果
    document.getElementById('results').innerHTML = '';
}

// 添加费用
function addExpense() {
    expenseManager.addExpense();
}

// 更新费用金额
function updateExpenseAmount(index, newAmount) {
    expenseManager.updateExpenseAmount(index, newAmount);
}

// 更新费用支付人
function updateExpensePayer(index, payer) {
    expenseManager.updateExpensePayer(index, payer);
}

// 更新空行支付人
function updateEmptyRowPayer(payer) {
    expenseManager.updateEmptyRowPayer(payer);
}

// 更新空行金额
function updateEmptyRowAmount(amount) {
    expenseManager.updateEmptyRowAmount(amount);
}

// 新增空行
function addNewRow() {
    expenseManager.addNewRow();
}

// 删除空行
function removeEmptyRow() {
    expenseManager.removeEmptyRow();
}

// 删除费用
function removeExpense(index) {
    expenseManager.removeExpense(index);
}