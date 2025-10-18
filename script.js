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
    // 更新轮次选择器，确保刷新页面后保持在之前的轮次
    updateRoundSelector();
    
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

// 截图功能 - 将计算结果保存为图片
function takeScreenshot() {
    const resultsElement = document.getElementById('results');
    
    if (!resultsElement || resultsElement.innerHTML.trim() === '') {
        alert('请先计算分摊结果后再保存截图');
        return;
    }
    
    // 显示加载提示
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 
        'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
        'background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); ' +
        'z-index: 1000; text-align: center;';
    loadingDiv.innerHTML = `
        <div style="margin-bottom: 20px; font-size: 18px; color: #666;">正在生成截图，请稍候...</div>
        <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    `;
    document.body.appendChild(loadingDiv);
    
    // 创建一个全新的容器而不是克隆，以避免任何潜在的克隆问题
    const tempContainer = document.createElement('div');
    tempContainer.style.width = resultsElement.offsetWidth + 'px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '20px';
    
    // 复制resultsElement的样式
    const resultsStyle = window.getComputedStyle(resultsElement);
    tempContainer.style.fontFamily = resultsStyle.fontFamily;
    tempContainer.style.fontSize = resultsStyle.fontSize;
    tempContainer.style.color = resultsStyle.color;
    tempContainer.style.lineHeight = resultsStyle.lineHeight;
    
    // 手动重新构建表格内容，特别关注每轮支出清单表格
    const originalTables = resultsElement.querySelectorAll('table');
    
    // 遍历所有表格
    originalTables.forEach(originalTable => {
        // 创建新表格
        const newTable = document.createElement('table');
        newTable.style.borderCollapse = 'collapse';
        newTable.style.width = originalTable.offsetWidth + 'px';
        newTable.style.tableLayout = 'fixed';
        newTable.style.borderSpacing = '0';
        newTable.style.margin = '0';
        
        // 复制表格标题（如果有）
        if (originalTable.caption) {
            const newCaption = document.createElement('caption');
            newCaption.textContent = originalTable.caption.textContent;
            newTable.appendChild(newCaption);
        }
        
        // 处理每一行
        const originalRows = originalTable.querySelectorAll('tr');
        originalRows.forEach(originalRow => {
            const newRow = document.createElement('tr');
            newRow.style.height = originalRow.offsetHeight + 'px';
            
            // 获取原始行中的所有单元格
            const originalCells = originalRow.querySelectorAll('td, th');
            
            // 手动逐个复制单元格，确保合并单元格的属性和内容都被正确处理
            originalCells.forEach(originalCell => {
                // 创建新单元格
                const newCell = document.createElement(originalCell.tagName);
                
                // 复制计算样式
                const computedStyle = window.getComputedStyle(originalCell);
                newCell.style.backgroundColor = computedStyle.backgroundColor;
                newCell.style.color = computedStyle.color;
                newCell.style.fontWeight = computedStyle.fontWeight;
                newCell.style.textAlign = computedStyle.textAlign;
                newCell.style.padding = computedStyle.padding;
                newCell.style.border = computedStyle.border;
                newCell.style.fontFamily = computedStyle.fontFamily;
                newCell.style.fontSize = computedStyle.fontSize;
                newCell.style.lineHeight = computedStyle.lineHeight;
                newCell.style.verticalAlign = computedStyle.verticalAlign;
                newCell.style.width = originalCell.offsetWidth + 'px';
                newCell.style.height = originalCell.offsetHeight + 'px';
                newCell.style.overflow = 'visible';
                newCell.style.whiteSpace = 'nowrap';
                newCell.style.textOverflow = 'clip';
                
                // 非常重要：直接复制原始单元格的所有属性，包括rowspan和colspan
                const attributes = originalCell.attributes;
                for (let i = 0; i < attributes.length; i++) {
                    const attr = attributes[i];
                    newCell.setAttribute(attr.name, attr.value);
                }
                
                // 直接使用textContent而不是innerHTML，确保文本内容被正确复制
                // 对于合并单元格中的数据，这尤为重要
                newCell.textContent = originalCell.textContent;
                
                // 将新单元格添加到行中
                newRow.appendChild(newCell);
            });
            
            // 将行添加到表格
            newTable.appendChild(newRow);
        });
        
        // 将表格添加到临时容器
        tempContainer.appendChild(newTable);
        // 添加一个换行符
        tempContainer.appendChild(document.createElement('br'));
    });
    
    // 添加临时容器到文档
    document.body.appendChild(tempContainer);
    
    // 样式已经在前面设置过，这里不再重复设置
    
    // 配置优化的截图选项，特别针对表格和合并单元格优化
    const options = {
        scale: 2, // 提高截图质量
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: false,
        allowTaint: true,
        useCORS: true,
        letterRendering: true,
        useTransform: true,
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight,
        // 启用SVG渲染，更好地支持复杂布局
        useForeignObjectForSVG: true,
        // 减少渲染时的裁剪问题
        imageTimeout: 30000,
        // 禁用缓存以确保获取最新样式
        cacheBust: true,
        // 优化表格渲染
        proxy: null, // 无代理需求
        ignoreElements: (element) => {
            // 确保不包含任何不应出现在截图中的元素
            return element === loadingDiv;
        },
        // 自定义canvas绘制前的处理
        onclone: (clonedDoc) => {
            // 为克隆文档中的表格再次应用样式，确保渲染一致性
            const clonedTables = clonedDoc.querySelectorAll('table');
            clonedTables.forEach(table => {
                table.style.borderCollapse = 'collapse';
                table.style.tableLayout = 'fixed';
            });
        }
    };
    
    try {
        html2canvas(tempContainer, options).then(canvas => {
            // 创建下载链接
            const link = document.createElement('a');
            link.download = `费用计算结果_${new Date().toLocaleDateString('zh-CN')}.png`;
            
            // 使用toDataURL生成图片数据
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            
            // 清理临时元素
            setTimeout(() => {
                document.body.removeChild(loadingDiv);
                document.body.removeChild(tempContainer);
            }, 100);
        }).catch(error => {
            console.error('截图生成失败:', error);
            alert('截图生成失败，请重试');
            
            // 清理临时元素
            document.body.removeChild(loadingDiv);
            document.body.removeChild(tempContainer);
        });
    } catch (error) {
        console.error('截图功能出错:', error);
        alert('截图功能暂不可用，请稍后再试');
        
        // 清理临时元素
        document.body.removeChild(loadingDiv);
        document.body.removeChild(tempContainer);
    }
}

// 添加旋转动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

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