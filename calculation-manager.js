class CalculationManager {
    constructor() {
        if (CalculationManager.instance) {
            return CalculationManager.instance;
        }
        CalculationManager.instance = this;
    }

    // 计算分摊结果
    calculate(allParticipants, rounds) {
        // 初始化所有参与者的数据
        const participants = allParticipants.map(p => ({ 
            ...p, 
            amount: 0, // 总支出
            difference: 0 // 最终差额
        }));
        let totalExpenses = 0;
        let roundResults = []; // 存储每轮的计算结果
        let allRoundRelations = []; // 存储所有轮次的转账关系

        // 按轮次计算
        rounds.forEach((round, roundIndex) => {
            // 确保round.expenses是数组
            if (!Array.isArray(round.expenses)) return;
            
            // 过滤出有效的费用记录
            const validExpenses = round.expenses.filter(expense => 
                expense && typeof expense.amount === 'number' && expense.amount > 0 && expense.payer
            );
            
            // 如果本轮次没有费用记录，不参与计算
            if (validExpenses.length === 0) return;
            
            // 获取当前轮次的参与者列表 - 这里需要从费用记录中提取实际参与者，而不是使用预定义的参与者列表
            const roundParticipantNames = new Set();
            validExpenses.forEach(expense => {
                if (expense.payer) {
                    roundParticipantNames.add(expense.payer);
                }
            });
            
            // 如果本轮次没有参与者，则跳过
            if (roundParticipantNames.size === 0) return;
            
            // 计算当前轮次的总费用
            const roundTotalExpense = validExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            totalExpenses += roundTotalExpense;
            
            // 如果某轮次只有一个参与者，该参与者的应收/应付金额为0
            let roundAverageExpense = 0;
            if (roundParticipantNames.size > 1) {
                // 计算当前轮次的平均费用（仅由当前轮次的参与者分摊）
                roundAverageExpense = roundTotalExpense / roundParticipantNames.size;
            }
            
            // 为当前轮次创建参与者数据
            const roundParticipants = [];
            roundParticipantNames.forEach(name => {
                // 查找该参与者是否在全局参与者列表中
                const globalParticipant = allParticipants.find(p => p.name === name);
                if (globalParticipant) {
                    roundParticipants.push({
                        name: name,
                        amount: 0, // 本轮支出
                        difference: 0 // 本轮差额
                    });
                }
            });
            
            // 记录当前轮次每个付款人的支出
            validExpenses.forEach(expense => {
                if (expense.payer) {
                    // 更新全局参与者的支出
                    const participant = participants.find(p => p.name === expense.payer);
                    if (participant) {
                        participant.amount += expense.amount;
                    }
                    
                    // 更新本轮参与者的支出
                    const roundParticipant = roundParticipants.find(p => p.name === expense.payer);
                    if (roundParticipant) {
                        roundParticipant.amount += expense.amount;
                    }
                }
            });
            
            // 计算当前轮次中每个参与者的差额
            roundParticipants.forEach(roundParticipant => {
                // 计算本轮次的差额：实际支出 - 应该支出的平均费用
                roundParticipant.difference = roundParticipant.amount - roundAverageExpense;
            });
            
            // 计算本轮次的支付关系
            const roundRelations = this.calculateRoundPaymentRelations(roundParticipants, roundIndex + 1);
            
            // 保存本轮次的结果
            roundResults.push({
                roundIndex: roundIndex + 1,
                totalExpense: roundTotalExpense,
                averageExpense: roundAverageExpense,
                participants: roundParticipants,
                relations: roundRelations
            });
            
            // 将本轮次的转账关系添加到总列表中
            allRoundRelations = allRoundRelations.concat(roundRelations);
        });
        
        // 计算全局参与者的最终差额
        participants.forEach(participant => {
            // 计算每个参与者在所有有费用轮次中的总平均应付金额
            let totalAverageOwed = 0;
            let totalParticipatedRounds = 0;
            
            // 计算该参与者参与了哪些轮次并计算总应付金额
            roundResults.forEach(round => {
                if (round.participants.some(p => p.name === participant.name) && round.participants.length > 1) {
                    totalAverageOwed += round.averageExpense;
                    totalParticipatedRounds++;
                }
            });
            
            // 计算最终差额：实际支付总额 - 总应付金额
            participant.difference = participant.amount - totalAverageOwed;
        });

        // 计算全局平均费用用于展示
        const averageAmount = participants.length > 0 ? totalExpenses / participants.length : 0;

        return {
            participants: participants,
            totalExpenses: totalExpenses,
            averageAmount: averageAmount,
            roundResults: roundResults,
            allRoundRelations: allRoundRelations
        };
    }

    // 计算单轮支付关系
    calculateRoundPaymentRelations(participants, roundNumber) {
        // 复制参与者数据，避免修改原始数据
        const participantsCopy = participants.map(p => ({ ...p }));
        
        const payers = [];
        const receivers = [];

        participantsCopy.forEach(p => {
            if (p.difference > 0) {
                // 差额为正，表示该参与者多付了钱，应该收钱
                receivers.push({ ...p, remaining: p.difference });
            } else if (p.difference < 0) {
                // 差额为负，表示该参与者少付了钱，应该付钱
                payers.push({ ...p, remaining: -p.difference });
            }
        });

        const relations = [];

        // 计算支付关系：让每个应该付钱的人向应该收钱的人支付
        payers.forEach(payer => {
            receivers.forEach(receiver => {
                if (payer.remaining > 0 && receiver.remaining > 0) {
                    const amount = Math.min(payer.remaining, receiver.remaining);
                    if (amount > 0) {
                        relations.push({
                            from: payer.name,
                            to: receiver.name,
                            amount: amount,
                            roundNumber: roundNumber
                        });
                        payer.remaining -= amount;
                        receiver.remaining -= amount;
                    }
                }
            });
        });

        return relations;
    }

    // 计算支付关系（合并所有轮次）
    calculatePaymentRelations(participants) {
        const payers = [];
        const receivers = [];

        participants.forEach(p => {
            if (p.difference > 0) {
                // 差额为正，表示该参与者多付了钱，应该收钱
                receivers.push({ ...p, remaining: p.difference });
            } else if (p.difference < 0) {
                // 差额为负，表示该参与者少付了钱，应该付钱
                payers.push({ ...p, remaining: -p.difference });
            }
        });

        const relations = [];

        // 计算支付关系：让每个应该付钱的人向应该收钱的人支付
        payers.forEach(payer => {
            receivers.forEach(receiver => {
                if (payer.remaining > 0 && receiver.remaining > 0) {
                    const amount = Math.min(payer.remaining, receiver.remaining);
                    if (amount > 0) {
                        relations.push({
                            from: payer.name,
                            to: receiver.name,
                            amount: amount
                        });
                        payer.remaining -= amount;
                        receiver.remaining -= amount;
                    }
                }
            });
        });

        return relations;
    }

    // 渲染结果表格
    renderResults(participants, totalExpenses, averageAmount, relations, roundResults) {
        const resultsDiv = document.getElementById('results');
        let html = `
            <div class="summary">
                <h3>费用汇总</h3>
                <p>总费用: ¥${totalExpenses.toFixed(2)}</p>
                <p>人均费用: ¥${averageAmount.toFixed(2)}</p>
            </div>
        `;

        // 渲染每轮的计算结果
        if (roundResults && roundResults.length > 0) {
            html += `
                <div class="round-results">
                    <h3>各轮次计算结果</h3>
            `;
            
            roundResults.forEach(round => {
                html += `
                    <div class="round-result">
                        <h4>第${round.roundIndex}轮</h4>
                        <div class="round-summary">
                            <p>本轮总费用: ¥${round.totalExpense.toFixed(2)}</p>
                            <p>本轮人均费用: ¥${round.averageExpense.toFixed(2)}</p>
                        </div>
                        
                        <div class="round-participants">
                            <h5>参与者明细</h5>
                            <table>
                                <thead>
                                    <tr>
                                        <th>参与者</th>
                                        <th>实际支出</th>
                                        <th>差额</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                round.participants.forEach(p => {
                    const status = p.difference > 0 ? '应收' : p.difference < 0 ? '应付' : '平衡';
                    const amountClass = p.difference > 0 ? 'positive' : p.difference < 0 ? 'negative' : '';
                    html += `
                        <tr>
                            <td>${p.name}</td>
                            <td>¥${p.amount.toFixed(2)}</td>
                            <td class="${amountClass}">${status} ¥${Math.abs(p.difference).toFixed(2)}</td>
                        </tr>
                    `;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                    `;
                
                if (round.relations.length > 0) {
                    html += `
                            <div class="round-relations">
                                <h5>本轮转账清单</h5>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>付款人</th>
                                            <th>收款人</th>
                                            <th>金额</th>
                                        </tr>
                                    </thead>
                                    <tbody>`;
                    
                    round.relations.forEach(relation => {
                        html += `
                            <tr>
                                <td>${relation.from}</td>
                                <td>${relation.to}</td>
                                <td>¥${relation.amount.toFixed(2)}</td>
                            </tr>`;
                    });
                
                    html += `
                                    </tbody>
                                </table>
                            </div>`;
                }
                
                html += `
                    </div>
                `;
            });
            
            html += `
                </div>
            `;
        }

        // 渲染全局参与者明细
        html += `
            <div class="participant-results">
                <h3>参与者汇总明细</h3>
                <table>
                    <thead>
                        <tr>
                            <th>参与者</th>
                            <th>总支出</th>
                            <th>最终差额</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        participants.forEach(p => {
            const status = p.difference > 0 ? '应收' : p.difference < 0 ? '应付' : '平衡';
            const amountClass = p.difference > 0 ? 'positive' : p.difference < 0 ? 'negative' : '';
            html += `
                <tr>
                    <td>${p.name}</td>
                    <td>¥${p.amount.toFixed(2)}</td>
                    <td class="${amountClass}">${status} ¥${Math.abs(p.difference).toFixed(2)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // 渲染最终转账清单
        if (relations.length > 0) {
            html += `
                <div class="payment-relations">
                    <h3>最终转账清单</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>付款人</th>
                                <th>收款人</th>
                                <th>金额</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            relations.forEach(relation => {
                html += `
                    <tr>
                        <td>${relation.from}</td>
                        <td>${relation.to}</td>
                        <td>¥${relation.amount.toFixed(2)}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        resultsDiv.innerHTML = html;
    }

    // 渲染支付关系图表
    renderPaymentChart(relations) {
        const chartDiv = document.getElementById('payment-chart');
        if (!chartDiv) return;

        const width = 600;
        const height = 400;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.35;

        let svg = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
                    </filter>
                </defs>
        `;

        // 收集所有参与者
        const allParticipants = new Set();
        relations.forEach(relation => {
            allParticipants.add(relation.from);
            allParticipants.add(relation.to);
        });

        const participants = Array.from(allParticipants);
        const angleStep = (2 * Math.PI) / participants.length;

        // 绘制关系线
        relations.forEach(relation => {
            const fromIndex = participants.indexOf(relation.from);
            const toIndex = participants.indexOf(relation.to);
            
            const fromAngle = fromIndex * angleStep;
            const toAngle = toIndex * angleStep;
            
            const fromX = centerX + radius * Math.cos(fromAngle);
            const fromY = centerY + radius * Math.sin(fromAngle);
            const toX = centerX + radius * Math.cos(toAngle);
            const toY = centerY + radius * Math.sin(toAngle);
            
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            
            svg += `
                <line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" 
                      stroke="#666" stroke-width="2" stroke-dasharray="5,5" />
                <text x="${midX}" y="${midY}" text-anchor="middle" 
                      font-size="12" fill="#333">¥${relation.amount.toFixed(2)}</text>
            `;
        });

        // 绘制参与者节点
        participants.forEach((participant, index) => {
            const angle = index * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            svg += `
                <circle cx="${x}" cy="${y}" r="20" fill="${this.getRandomColor()}" 
                        filter="url(#shadow)" />
                <text x="${x}" y="${y}" text-anchor="middle" dy="5" 
                      font-size="12" fill="white" font-weight="bold">${participant}</text>
            `;
        });

        svg += '</svg>';
        chartDiv.innerHTML = svg;
    }

    // 生成随机颜色
    getRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// 创建单例实例
const calculationManager = new CalculationManager();