// 参与者管理模块
class ParticipantManager {
    constructor() {
        // 从DataManager加载参与者数据
        this.allParticipants = DataManager.getInstance().getAllParticipants();
    }

    // 添加参与者
    addParticipant(name) {
        if (!name || name.trim() === '') {
            alert('请输入参与者名称');
            return false;
        }
        
        if (this.allParticipants.some(p => p.name === name)) {
            alert('该参与者已存在');
            return false;
        }
        
        this.allParticipants.push({ name: name });
        // 同步到DataManager
        DataManager.getInstance().setAllParticipants(this.allParticipants);
        return true;
    }

    // 添加新参与者
    addNewParticipant() {
        const input = document.getElementById('new-participant');
        const name = input.value.trim();
        
        if (this.addParticipant(name)) {
            input.value = '';
            this.updatePayerSelect();
            this.renderParticipants();
            ExpenseManager.getInstance().renderExpenses();
            DataManager.getInstance().saveData();
        }
    }

    // 删除参与者
    removeParticipant(name) {
        if (confirm(`确定要删除参与者 "${name}" 吗？`)) {
            // 从全局参与者列表中删除
            this.allParticipants = this.allParticipants.filter(p => p.name !== name);
            // 同步到DataManager
            DataManager.getInstance().setAllParticipants(this.allParticipants);
            
            // 从所有轮次中删除该参与者
            const rounds = DataManager.getInstance().rounds;
            rounds.forEach(round => {
                round.participants = round.participants.filter(p => p.name !== name);
                round.expenses = round.expenses.filter(expense => expense.payer !== name);
            });
            
            this.updatePayerSelect();
            this.renderParticipants();
            ExpenseManager.getInstance().renderExpenses();
            DataManager.getInstance().saveData();
            return true;
        } else {
            return false;
        }
    }

    // 更新支付人选择框
    updatePayerSelect() {
        const selects = document.querySelectorAll('select.payer-select');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">请选择支付人(请不要重复选择)</option>';
            
            this.allParticipants.forEach(participant => {
                const option = document.createElement('option');
                option.value = participant.name;
                option.textContent = participant.name;
                if (participant.name === currentValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    }

    // 渲染参与者列表
    renderParticipants() {
        const participantsList = document.getElementById('participants-list');
        participantsList.innerHTML = '';
        
        // 添加现有参与者
        this.allParticipants.forEach(participant => {
            const participantItem = document.createElement('div');
            participantItem.className = 'participant-item';
            participantItem.innerHTML = `
                <input type="text" class="participant-name" value="${participant.name}" readonly>
                <button class="delete-btn" onclick="ParticipantManager.getInstance().removeParticipant('${participant.name}')">x</button>
            `;
            participantsList.appendChild(participantItem);
        });
        
        // 添加新增参与者输入框
        const addParticipantDiv = document.createElement('div');
        addParticipantDiv.className = 'add-participant';
        addParticipantDiv.innerHTML = `
            <input type="text" id="new-participant" placeholder="输入参与者名称" onkeypress="if(event.keyCode===13) ParticipantManager.getInstance().addNewParticipant()">
            <button class="add-btn" onclick="ParticipantManager.getInstance().addNewParticipant()">+</button>
        `;
        participantsList.appendChild(addParticipantDiv);
    }

    // 单例模式
    static getInstance() {
        if (!ParticipantManager._instance) {
            ParticipantManager._instance = new ParticipantManager();
        }
        return ParticipantManager._instance;
    }
}

// 初始化单例
ParticipantManager._instance = null;