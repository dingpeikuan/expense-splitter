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
            
            // 过滤出有效的费用记录（允许amount为0，只要有有效的payer）
            const validExpenses = round.expenses.filter(expense => 
                expense && typeof expense.amount === 'number' && expense.payer
            );
            
            // 如果本轮次没有费用记录，不参与计算
            if (validExpenses.length === 0) return;
            
            // 获取当前轮次的所有参与者 - 包括支付金额为0的参与者
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
            
            // 初始化所有轮次参与者的支出为0
            roundParticipants.forEach(roundParticipant => {
                roundParticipant.amount = 0;
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
            
            // 计算该参与者参与了哪些轮次并计算总应付金额
            roundResults.forEach(round => {
                if (round.participants.some(p => p.name === participant.name) && round.participants.length > 1) {
                    totalAverageOwed += round.averageExpense;
                }
            });
            
            // 计算最终差额：实际支付总额 - 总应付金额
            participant.difference = participant.amount - totalAverageOwed;
            
            // 确保浮点数精度问题不会导致显示错误
            participant.difference = Math.round(participant.difference * 100) / 100;
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
            // 应用四舍五入到两位小数
            const roundedDifference = Math.round(p.difference * 100) / 100;
            
            if (roundedDifference > 0.01) { // 考虑浮点数精度，使用0.01作为阈值
                // 差额为正，表示该参与者多付了钱，应该收钱
                receivers.push({ ...p, remaining: roundedDifference });
            } else if (roundedDifference < -0.01) { // 考虑浮点数精度
                // 差额为负，表示该参与者少付了钱，应该付钱
                payers.push({ ...p, remaining: -roundedDifference });
            }
        });

        const relations = [];

        // 使用贪心算法优化支付关系计算，减少转账次数
        let i = 0;
        let j = 0;
        
        while (i < payers.length && j < receivers.length) {
            const payer = payers[i];
            const receiver = receivers[j];
            
            if (payer.remaining <= 0.01 || receiver.remaining <= 0.01) {
                // 跳过已经完成支付的用户
                if (payer.remaining <= 0.01) i++;
                if (receiver.remaining <= 0.01) j++;
                continue;
            }
            
            const paymentAmount = Math.min(payer.remaining, receiver.remaining);
            
            // 确保金额为正数且有意义
            if (paymentAmount > 0.01) {
                // 四舍五入到两位小数
                const roundedAmount = Math.round(paymentAmount * 100) / 100;
                
                relations.push({
                    from: payer.name,
                    to: receiver.name,
                    amount: roundedAmount,
                    roundNumber: roundNumber
                });
                
                payer.remaining = Math.round((payer.remaining - roundedAmount) * 100) / 100;
                receiver.remaining = Math.round((receiver.remaining - roundedAmount) * 100) / 100;
            }
        }

        return relations;
    }

    // 计算支付关系（合并所有轮次）
    calculatePaymentRelations(participants) {
        const payers = [];
        const receivers = [];

        participants.forEach(p => {
            if (p.difference > 0.01) { // 考虑浮点数精度，使用0.01作为阈值
                // 差额为正，表示该参与者多付了钱，应该收钱
                receivers.push({ ...p, remaining: p.difference });
            } else if (p.difference < -0.01) { // 考虑浮点数精度
                // 差额为负，表示该参与者少付了钱，应该付钱
                payers.push({ ...p, remaining: -p.difference });
            }
        });

        const relations = [];

        // 优化的支付关系计算算法
        // 使用贪心算法减少转账次数：让每个付款人尽可能地偿还给收款人
        let i = 0;
        let j = 0;
        
        while (i < payers.length && j < receivers.length) {
            const payer = payers[i];
            const receiver = receivers[j];
            
            if (payer.remaining <= 0.01 || receiver.remaining <= 0.01) {
                // 跳过已经完成支付的用户
                if (payer.remaining <= 0.01) i++;
                if (receiver.remaining <= 0.01) j++;
                continue;
            }
            
            const paymentAmount = Math.min(payer.remaining, receiver.remaining);
            
            // 确保金额为正数且有意义
            if (paymentAmount > 0.01) {
                // 四舍五入到两位小数
                const roundedAmount = Math.round(paymentAmount * 100) / 100;
                
                relations.push({
                    from: payer.name,
                    to: receiver.name,
                    amount: roundedAmount
                });
                
                payer.remaining = Math.round((payer.remaining - roundedAmount) * 100) / 100;
                receiver.remaining = Math.round((receiver.remaining - roundedAmount) * 100) / 100;
            }
        }

        return relations;
    }

    // 渲染结果表格
    renderResults(participants, totalExpenses, averageAmount, relations, roundResults) {
        const resultsDiv = document.getElementById('results');
        
        // 清除旧的表格结构，因为现在使用div容器展示结果
        resultsDiv.innerHTML = '';
        
        let html = `
            <div class="summary">
                <h3>费用汇总</h3>
                <p>总费用: ¥${totalExpenses.toFixed(2)}</p>
                <p>人均费用: ¥${averageAmount.toFixed(2)}</p>
            </div>
        `;

        // 渲染每轮的计算结果 - 按需求优化为整体div
        if (roundResults && roundResults.length > 0) {
            html += `
                <div class="round-results-container">
                    <h3>各轮次计算结果</h3>
            `;
            
            roundResults.forEach(round => {
                html += `
                    <div class="round-result-wrapper">
                        <h4>第${round.roundIndex}轮</h4>
                        <div class="round-summary">
                            <p>本轮总费用: ¥${round.totalExpense.toFixed(2)}</p>
                            <p>本轮人均费用: ¥${round.averageExpense.toFixed(2)}</p>
                        </div>
                        
                        <!-- 本轮实际支出清单 -->
                        <div class="round-expenses-table">
                            <h5>本轮实际支出清单</h5>
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
                        
                        <!-- 本轮转账关系清单 -->
                        <div class="round-relations-table">
                            <h5>本轮转账关系清单</h5>
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
                
                if (round.relations.length > 0) {
                    round.relations.forEach(relation => {
                        html += `
                            <tr>
                                <td>${relation.from}</td>
                                <td>${relation.to}</td>
                                <td>¥${relation.amount.toFixed(2)}</td>
                            </tr>`;
                    });
                } else {
                    html += `
                        <tr>
                            <td colspan="3" style="text-align: center; color: #999;">本轮无需转账</td>
                        </tr>`;
                }
                
                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            
            html += `
                </div>
            `;
        }

        // 渲染所有轮次统计结果 - 按需求优化为整体div
        html += `
            <div class="all-rounds-stats-container">
                <h3>所有轮次统计结果</h3>
                
                <!-- 每轮支持清单 -->
                <div class="all-rounds-expenses">
                    <h4>每轮支出清单</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>轮次</th>
                                <th>付款人</th>
                                <th>支付金额</th>
                                <th>总费用</th>
                                <th>参与人数</th>
                                <th>人均费用</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (roundResults && roundResults.length > 0) {
            roundResults.forEach(round => {
                // 获取该轮次的费用记录以提取付款人信息
                const rounds = dataManager.getRounds();
                // 根据轮次索引直接获取对应轮次数据，而不是使用find方法
                const currentRound = rounds[round.roundIndex - 1];
                
                let payerData = [{name: '-', amount: '-'}];
                if (currentRound && currentRound.expenses) {
                    // 直接获取付款人数据数组而不是格式化的字符串
                    payerData = this.getRoundPayerData(currentRound.expenses);
                }
                
                // 为每个付款人生成一行，只有第一行显示轮次等信息并合并单元格
                payerData.forEach((payer, index) => {
                    if (index === 0) {
                        // 第一行，添加rowspan属性
                        html += `
                            <tr>
                                <td rowspan="${payerData.length}">第${round.roundIndex}轮</td>
                                <td>${payer.name}</td>
                                <td>${typeof payer.amount === 'number' ? `¥${payer.amount.toFixed(2)}` : payer.amount}</td>
                                <td rowspan="${payerData.length}">¥${round.totalExpense.toFixed(2)}</td>
                                <td rowspan="${payerData.length}">${round.participants.length}</td>
                                <td rowspan="${payerData.length}">¥${round.averageExpense.toFixed(2)}</td>
                            </tr>
                        `;
                    } else {
                        // 后续行，只显示付款人和支付金额
                        html += `
                            <tr>
                                <td>${payer.name}</td>
                                <td>${typeof payer.amount === 'number' ? `¥${payer.amount.toFixed(2)}` : payer.amount}</td>
                            </tr>
                        `;
                    }
                });
            });
        } else {
            html += `
                <tr>
                    <td colspan="4" style="text-align: center; color: #999;">暂无轮次数据</td>
                </tr>
            `;
        }

        html += `
                        </tbody>

                    </table>
                </div>
                
                <!-- 最终转账清单 -->
                <div class="final-transfers">
                    <h4>最终转账清单</h4>
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

        if (relations.length > 0) {
            relations.forEach(relation => {
                html += `
                    <tr>
                        <td>${relation.from}</td>
                        <td>${relation.to}</td>
                        <td>¥${relation.amount.toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            html += `
                <tr>
                    <td colspan="3" style="text-align: center; color: #999;">无需转账，收支平衡</td>
                </tr>
            `;
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

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

    // 获取轮次付款人信息
    getRoundPayerInfo(expenses) {
        // 统计每个付款人的支付金额
        const payerMap = {};
        
        expenses.forEach(expense => {
            if (expense && expense.payer && typeof expense.amount === 'number') {
                if (!payerMap[expense.payer]) {
                    payerMap[expense.payer] = 0;
                }
                payerMap[expense.payer] += expense.amount;
            }
        });
        
        // 转换为字符串格式，多个付款人用换行显示
        const payerNames = Object.keys(payerMap).join('<br>');
        const payerAmounts = Object.values(payerMap).map(amount => `¥${amount.toFixed(2)}`).join('<br>');
        
        return { payerNames, payerAmounts };
    }
    
    // 获取轮次付款人数据数组
    getRoundPayerData(expenses) {
        // 统计每个付款人的支付金额
        const payerMap = {};
        
        expenses.forEach(expense => {
            if (expense && expense.payer && typeof expense.amount === 'number') {
                if (!payerMap[expense.payer]) {
                    payerMap[expense.payer] = 0;
                }
                payerMap[expense.payer] += expense.amount;
            }
        });
        
        // 转换为对象数组格式
        const payerData = Object.keys(payerMap).map(payerName => ({
            name: payerName,
            amount: payerMap[payerName]
        }));
        
        // 如果没有付款人，返回默认数据
        return payerData.length > 0 ? payerData : [{name: '-', amount: '-'}];
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