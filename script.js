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
    const amountInput = document.getElementById('participant-amount');
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    
    if (!name) {
        alert('请输入参与者姓名');
        return;
    }
    
    if (participants.some(p => p.name === name)) {
        alert('该参与者已存在');
        return;
    }
    
    if (isNaN(amount) || amount < 0) {
        alert('请输入有效的金额（可以为0）');
        return;
    }
    
    participants.push({
        name: name,
        amount: amount
    });
    
    nameInput.value = '';
    amountInput.value = '';
    
    updatePayerSelect();
    renderParticipants();
    renderExpenses();
    saveData();
}

// 更新支付人选择框
function updatePayerSelect() {
    const select = document.getElementById('expense-payer');
    select.innerHTML = '<option value="">选择支付人</option>';
    
    participants.forEach(participant => {
        const option = document.createElement('option');
        option.value = participant.name;
        option.textContent = participant.name;
        select.appendChild(option);
    });
}

// 渲染参与者列表
function renderParticipants() {
    const list = document.getElementById('participants-list');
    list.innerHTML = '';
}

// 更新金额
function updateAmount(index, newAmount) {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) {
        alert('请输入有效的金额（可以为0）');
        renderExpenses();
        return;
    }
    
    participants[index].amount = amount;
    saveData();
}

// 删除参与者
function removeParticipant(index) {
    participants.splice(index, 1);
    
    // 删除该参与者相关的费用
    expenses = expenses.filter(expense => expense.payer !== participants[index]?.name);
    
    updatePayerSelect();
    renderParticipants();
    renderExpenses();
    saveData();
}

// 渲染费用列表
function renderExpenses() {
    const list = document.getElementById('expenses-list');
    list.innerHTML = '';
    
    participants.forEach((participant, index) => {
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${participant.name}</span>
                <span>金额：</span>
                <input type="number" value="${participant.amount}" min="0" step="0.01" 
                    onchange="updateAmount(${index}, this.value)" style="width: 80px;">
            </div>
            <button class="delete-btn" onclick="removeParticipant(${index})">删除</button>
        `;
        list.appendChild(item);
    });
}

// 计算分摊
function calculate() {
    if (participants.length < 2) {
        alert('请至少添加2个参与者');
        return;
    }
    
    // 计算总费用
    const totalAmount = participants.reduce((sum, participant) => sum + participant.amount, 0);
    
    // 计算每人应付的平均金额
    const averageAmount = totalAmount / participants.length;
    
    // 计算每个人的应收/应付金额
    const settlements = participants.map(participant => {
        const balance = participant.amount - averageAmount;
        
        return {
            name: participant.name,
            paid: participant.amount,
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

    // 创建图表容器
    const chartContainer = document.createElement('div');
    chartContainer.id = 'payment-chart';
    chartContainer.style.margin = '20px 0';
    chartContainer.style.height = '500px';
    resultsDiv.appendChild(chartContainer);

    // 计算支付关系
    const paymentRelations = calculatePaymentRelations(settlements);
    
    // 渲染支付关系图表
    renderPaymentChart(paymentRelations);
}

// 计算支付关系
function calculatePaymentRelations(settlements) {
    const receivers = settlements.filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance);
    const payers = settlements.filter(s => s.balance < 0).sort((a, b) => a.balance - b.balance);
    
    const relations = [];
    
    let i = 0, j = 0;
    while (i < receivers.length && j < payers.length) {
        const receiver = receivers[i];
        const payer = payers[j];
        
        const amount = Math.min(receiver.balance, Math.abs(payer.balance));
        
        relations.push({
            from: payer.name,
            to: receiver.name,
            amount: amount
        });
        
        receiver.balance -= amount;
        payer.balance += amount;
        
        if (receiver.balance <= 0.01) i++;
        if (payer.balance >= -0.01) j++;
    }
    
    return relations;
}

// 渲染支付关系图表
function renderPaymentChart(relations) {
    const chartDiv = document.getElementById('payment-chart');
    chartDiv.innerHTML = '';
    
    // 创建SVG容器
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '600');
    svg.setAttribute('viewBox', '0 0 800 600');
    chartDiv.appendChild(svg);
    
    // 收集所有参与者
    const allParticipants = new Set();
    relations.forEach(relation => {
        allParticipants.add(relation.from);
        allParticipants.add(relation.to);
    });
    
    // 计算节点位置
    const participants = Array.from(allParticipants);
    const nodePositions = {};
    const radius = 50;
    const centerX = 400;
    const centerY = 300;
    const circleRadius = Math.min(250, 180 * participants.length / 3);
    
    // 添加箭头标记定义
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points', '0 0, 10 3.5, 0 7');
    arrow.setAttribute('fill', '#4a5568');
    
    marker.appendChild(arrow);
    defs.appendChild(marker);
    svg.appendChild(defs);
    
    // 布置节点在圆形上
    participants.forEach((participant, index) => {
        const angle = (index * 2 * Math.PI) / participants.length;
        const x = centerX + circleRadius * Math.cos(angle);
        const y = centerY + circleRadius * Math.sin(angle);
        nodePositions[participant] = { x, y };
        
        // 绘制节点背景
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', '#f0f9ff');
        circle.setAttribute('stroke', '#93c5fd');
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('filter', 'url(#drop-shadow)');
        svg.appendChild(circle);
        
        // 添加小人图像
        const person = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        person.setAttribute('d', 'M -20 -20 L 0 -40 L 20 -20 L 10 20 L -10 20 Z');
        person.setAttribute('transform', `translate(${x},${y}) scale(1.2)`);
        person.setAttribute('fill', '#3b82f6');
        svg.appendChild(person);
        
        // 添加节点文本
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + radius + 25);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#1e40af');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-size', '14');
        text.textContent = participant;
        svg.appendChild(text);
    });
    
    // 添加阴影滤镜
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'drop-shadow');
    filter.setAttribute('height', '130%');
    filter.setAttribute('width', '130%');
    
    const feOffset = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
    feOffset.setAttribute('result', 'offOut');
    feOffset.setAttribute('in', 'SourceGraphic');
    feOffset.setAttribute('dx', '2');
    feOffset.setAttribute('dy', '2');
    
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('result', 'blurOut');
    feGaussianBlur.setAttribute('in', 'offOut');
    feGaussianBlur.setAttribute('stdDeviation', '3');
    
    const feBlend = document.createElementNS('http://www.w3.org/2000/svg', 'feBlend');
    feBlend.setAttribute('in', 'SourceGraphic');
    feBlend.setAttribute('in2', 'blurOut');
    feBlend.setAttribute('mode', 'normal');
    
    filter.appendChild(feOffset);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feBlend);
    defs.appendChild(filter);
    
    // 绘制边
    relations.forEach(relation => {
        const fromPos = nodePositions[relation.from];
        const toPos = nodePositions[relation.to];
        const color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        
        // 计算边的起点和终点（考虑节点半径）
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const startX = fromPos.x + (dx / dist) * radius;
        const startY = fromPos.y + (dy / dist) * radius;
        const endX = toPos.x - (dx / dist) * radius;
        const endY = toPos.y - (dy / dist) * radius;
        
        // 绘制边
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        svg.appendChild(line);
        
        // 添加金额标签
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        textBg.setAttribute('x', midX - 30);
        textBg.setAttribute('y', midY - 20);
        textBg.setAttribute('width', '60');
        textBg.setAttribute('height', '20');
        textBg.setAttribute('rx', '10');
        textBg.setAttribute('ry', '10');
        textBg.setAttribute('fill', 'white');
        textBg.setAttribute('stroke', color);
        textBg.setAttribute('stroke-width', '1');
        svg.appendChild(textBg);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY - 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', color);
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-size', '12');
        text.textContent = `¥${relation.amount.toFixed(2)}`;
        svg.appendChild(text);
    });
}

// 生成随机颜色
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// 重置所有数据
function resetAll() {
    if (confirm('确定要重置所有数据吗？这将清除所有参与者记录。')) {
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
            
            // 兼容旧数据格式
            if (data.participants && data.participants.length > 0 && typeof data.participants[0] === 'string') {
                participants = data.participants.map(name => ({
                    name: name,
                    amount: 0
                }));
            } else {
                participants = data.participants || [];
            }
            
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