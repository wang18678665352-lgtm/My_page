/**
 * 扫雷游戏核心逻辑
 */
class MinesweeperGame {
    constructor() {
        // 游戏状态
        this.isGameOver = false;
        this.isGameWon = false;
        this.isFirstClick = true;
        this.timer = null;
        this.timeElapsed = 0;
        
        // 游戏配置
        this.width = 9;
        this.height = 9;
        this.mineCount = 10;
        
        // 游戏数据
        this.board = [];
        this.flagsPlaced = 0;
        this.revealedCount = 0;
        this.aifailedMinePositions = null; // 保存AI失败时的地雷位置
        
        // 事件监听器
        this.onGameUpdate = null;
        this.onGameOver = null;
        this.onGameWon = null;
    }

    // 设置游戏难度
    setDifficulty(difficulty) {
        switch(difficulty) {
            case 'beginner':
                this.width = 9;
                this.height = 9;
                this.mineCount = 10;
                break;
            case 'intermediate':
                this.width = 16;
                this.height = 16;
                this.mineCount = 40;
                break;
            case 'expert':
                this.width = 30;
                this.height = 16;
                this.mineCount = 99;
                break;
        }
    }

    // 初始化游戏
    init() {
        // 重置游戏状态
        this.isGameOver = false;
        this.isGameWon = false;
        this.isFirstClick = true;
        this.timeElapsed = 0;
        this.flagsPlaced = 0;
        this.revealedCount = 0;
        
        // 清除定时器
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // 初始化游戏板
        this.board = [];
        for (let y = 0; y < this.height; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.board[y][x] = {
                    x: x,
                    y: y,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0
                };
            }
        }
        
        // 触发更新事件
        if (this.onGameUpdate) {
            this.onGameUpdate();
        }
    }

    // 放置地雷（避免在首次点击位置及其周围放置地雷）
    placeMines(firstClickX, firstClickY) {
        let minesPlaced = 0;
        
        while (minesPlaced < this.mineCount) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            // 确保不在首次点击位置及其周围放置地雷
            const isNearFirstClick = Math.abs(x - firstClickX) <= 1 && Math.abs(y - firstClickY) <= 1;
            
            if (!this.board[y][x].isMine && !isNearFirstClick) {
                this.board[y][x].isMine = true;
                minesPlaced++;
            }
        }
        
        // 计算每个格子周围的地雷数量
        this.calculateAdjacentMines();
    }

    // 计算每个格子周围的地雷数量
    calculateAdjacentMines() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.board[y][x].isMine) {
                    let count = 0;
                    
                    // 检查周围8个格子
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                                if (this.board[ny][nx].isMine) {
                                    count++;
                                }
                            }
                        }
                    }
                    
                    this.board[y][x].adjacentMines = count;
                }
            }
        }
    }

    // 开始计时
    startTimer() {
        if (!this.timer) {
            this.timer = setInterval(() => {
                this.timeElapsed++;
                if (this.onGameUpdate) {
                    this.onGameUpdate();
                }
                // 最多999秒
                if (this.timeElapsed >= 999) {
                    clearInterval(this.timer);
                }
            }, 1000);
        }
    }

    // 处理格子点击
    handleCellClick(x, y) {
        if (this.isGameOver || this.isGameWon) return;
        
        const cell = this.board[y][x];
        
        // 不能点击已经翻开或标记的格子
        if (cell.isRevealed || cell.isFlagged) return;
        
        // 首次点击
        if (this.isFirstClick) {
            this.isFirstClick = false;
            this.placeMines(x, y);
            this.startTimer();
        }
        
        // 点击到地雷，游戏结束
        if (cell.isMine) {
            // 检查是否是AI点击的地雷
            // 在main.js中，当AI运行时会阻止用户点击，所以这里可以判断
            if (window.ai && (window.ai.isRunning || window.ai.wasRunningWhenFailed)) {
                console.log(`记录AI失败位置: (${x},${y})`);
                // 记录失败位置到AI实例
                if (window.ai.recordFailurePosition) {
                    window.ai.recordFailurePosition(x, y);
                }
            }
            this.gameOver(false);
            return;
        }
        
        // 翻开格子
        this.revealCell(x, y);
        
        // 检查是否获胜
        this.checkWinCondition();
    }

    // 处理右键标记
    handleCellRightClick(x, y, event) {
        if (event) event.preventDefault();
        
        if (this.isGameOver || this.isGameWon) return;
        
        const cell = this.board[y][x];
        
        // 不能标记已经翻开的格子
        if (cell.isRevealed) return;
        
        // 切换标记状态
        cell.isFlagged = !cell.isFlagged;
        this.flagsPlaced += cell.isFlagged ? 1 : -1;
        
        // 触发更新事件
        if (this.onGameUpdate) {
            this.onGameUpdate();
        }
        
        // 检查是否获胜
        this.checkWinCondition();
    }

    // 翻开格子
    revealCell(x, y) {
        const cell = this.board[y][x];
        
        // 如果格子已经翻开或标记，直接返回
        if (cell.isRevealed || cell.isFlagged) return;
        
        // 翻开格子
        cell.isRevealed = true;
        this.revealedCount++;
        
        // 如果是空格子（周围没有地雷），递归翻开周围的格子
        if (cell.adjacentMines === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        this.revealCell(nx, ny);
                    }
                }
            }
        }
    }

    // 检查获胜条件
    checkWinCondition() {
        // 检查所有非地雷格子是否都已翻开
        const totalSafeCells = (this.width * this.height) - this.mineCount;
        if (this.revealedCount === totalSafeCells) {
            this.gameOver(true);
        }
        
        // 或者检查所有地雷是否都已标记
        if (this.flagsPlaced === this.mineCount) {
            let allMinesFlagged = true;
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const cell = this.board[y][x];
                    if (cell.isMine && !cell.isFlagged) {
                        allMinesFlagged = false;
                        break;
                    }
                }
                if (!allMinesFlagged) break;
            }
            
            if (allMinesFlagged) {
                this.gameOver(true);
            }
        }
    }

    // 游戏结束
    gameOver(isWin) {
        this.isGameOver = true;
        this.isGameWon = isWin;
        
        // 停止计时器
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // 翻开所有地雷（如果游戏失败）
        if (!isWin) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const cell = this.board[y][x];
                    if (cell.isMine && !cell.isFlagged) {
                        cell.isRevealed = true;
                    }
                    // 标记错误的旗子
                    if (!cell.isMine && cell.isFlagged) {
                        cell.isWrongFlag = true;
                    }
                }
            }
        } else {
            // 游戏胜利，标记所有地雷
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const cell = this.board[y][x];
                    if (cell.isMine && !cell.isFlagged) {
                        cell.isFlagged = true;
                    }
                }
            }
            this.flagsPlaced = this.mineCount;
        }
        
        // 触发更新事件
        if (this.onGameUpdate) {
            this.onGameUpdate();
        }
        
        // 触发游戏结束事件
        if (isWin && this.onGameWon) {
            this.onGameWon();
        } else if (!isWin && this.onGameOver) {
            this.onGameOver();
        }
    }

    // 获取游戏状态（用于AI）
    getGameState() {
        const state = [];
        for (let y = 0; y < this.height; y++) {
            state[y] = [];
            for (let x = 0; x < this.width; x++) {
                const cell = this.board[y][x];
                state[y][x] = {
                    x: x,
                    y: y,
                    isMine: cell.isMine,
                    isRevealed: cell.isRevealed,
                    isFlagged: cell.isFlagged,
                    adjacentMines: cell.adjacentMines
                };
            }
        }
        return state;
    }

    // 获取剩余地雷数量
    getRemainingMines() {
        return this.mineCount - this.flagsPlaced;
    }

    // 获取格式化的时间
    getFormattedTime() {
        return Math.min(this.timeElapsed, 999).toString().padStart(3, '0');
    }

    // 获取格式化的剩余地雷数量
    getFormattedMineCount() {
        return Math.max(0, this.getRemainingMines()).toString().padStart(3, '0');
    }
}

// 导出游戏类
if (typeof module !== 'undefined') {
    module.exports = MinesweeperGame;
} else {
    window.MinesweeperGame = MinesweeperGame;
}