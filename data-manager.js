// 数据管理模块
class DataManager {
    constructor() {
        if (DataManager.instance) {
            return DataManager.instance;
        }
        DataManager.instance = this;
        
        // 初始化数据
        this.allParticipants = [];
        this.rounds = [];
        this.currentRound = 0;
        
        // 加载保存的数据
        this.loadData();
    }

    static getInstance() {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager();
        }
        return DataManager.instance;
    }

    // 获取所有参与者
    getAllParticipants() {
        return this.allParticipants;
    }

    // 设置所有参与者
    setAllParticipants(participants) {
        this.allParticipants = participants;
        this.saveData();
    }

    // 获取轮次数据
    getRounds() {
        return this.rounds;
    }

    // 设置轮次数据
    setRounds(rounds) {
        this.rounds = rounds;
        this.saveData();
    }

    // 获取当前轮次
    getCurrentRound() {
        return this.currentRound;
    }

    // 设置当前轮次
    setCurrentRound(roundIndex) {
        this.currentRound = roundIndex;
        this.saveData();
    }

    // 获取当前轮次数据
    getCurrentRoundData() {
        return this.rounds[this.currentRound] || null;
    }

    // 保存数据到本地存储
    saveData() {
        const data = {
            allParticipants: this.allParticipants,
            rounds: this.rounds,
            currentRound: this.currentRound
        };
        localStorage.setItem('expenseSplitterData', JSON.stringify(data));
    }

    // 从本地存储加载数据
    loadData() {
        try {
            const savedData = localStorage.getItem('expenseSplitterData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.allParticipants = data.allParticipants || [];
                this.rounds = data.rounds || [];
                this.currentRound = data.currentRound || 0;
                
                // 确保至少有一个轮次
                if (this.rounds.length === 0) {
                    this.addRound();
                }
            } else {
                // 初始化第一个轮次
                this.addRound();
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            // 初始化第一个轮次
            this.addRound();
        }
    }

    // 添加新轮次
    addRound() {
        const newRound = {
            participants: [...this.allParticipants],
            expenses: []
        };
        this.rounds.push(newRound);
        this.saveData();
    }

    // 重置轮次数据
    resetRoundData() {
        this.rounds = [{
            participants: [...this.allParticipants],
            expenses: []
        }];
        this.currentRound = 0;
        this.saveData();
    }

    // 导出数据
    exportData() {
        const data = {
            allParticipants: this.allParticipants,
            rounds: this.rounds,
            currentRound: this.currentRound
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-splitter-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 创建单例实例
const dataManager = new DataManager();