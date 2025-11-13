/**
 * 扫雷游戏主脚本
 * 整合游戏逻辑和AI功能，处理用户界面交互
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const gameContainer = document.getElementById('game-container');
    const difficultySelect = document.getElementById('difficulty');
    const restartButton = document.getElementById('restart-button');
    const aiSolveButton = document.getElementById('ai-solve-button');
    const aiStepButton = document.getElementById('ai-step-button');
    const aiSpeedSlider = document.getElementById('ai-speed');
    const speedValueDisplay = document.getElementById('speed-value');
    const mineCounter = document.getElementById('mine-counter');
    const timer = document.getElementById('timer');
    const gameOverModal = document.getElementById('game-over-modal');
    const gameOverTitle = document.getElementById('game-over-title');
    const gameOverMessage = document.getElementById('game-over-message');
    const playAgainButton = document.getElementById('play-again-button');

    // 创建游戏实例
    const game = new MinesweeperGame();
    
    // 创建AI实例
    const ai = new MinesweeperAI(game);

    // 初始化游戏
    function initGame() {
        // 设置难度
        game.setDifficulty(difficultySelect.value);
        
        // 初始化游戏
        game.init();
        
        // 重置AI并清除失败记录（全新游戏）
        ai.reset();
        if (ai.clearFailureRecords) {
            ai.clearFailureRecords();
        }
        
        // 渲染游戏板
        renderGameBoard();
        
        // 更新计数器
        updateCounters();
        
        // 隐藏游戏结束弹窗
        gameOverModal.classList.add('hidden');
    }

    // 渲染游戏板
    function renderGameBoard() {
        gameContainer.innerHTML = '';
        
        const board = game.getGameState();
        const cellSize = Math.min(
            Math.floor((gameContainer.clientWidth || 800) / game.width),
            Math.floor((gameContainer.clientHeight || 600) / game.height),
            30 // 最大单元格大小
        );
        
        // 创建游戏网格
        const grid = document.createElement('div');
        grid.className = 'grid-container';
        grid.style.gridTemplateColumns = `repeat(${game.width}, ${cellSize}px)`;
        grid.style.gridTemplateRows = `repeat(${game.height}, ${cellSize}px)`;
        
        // 创建每个单元格
        for (let y = 0; y < game.height; y++) {
            for (let x = 0; x < game.width; x++) {
                const cell = board[y][x];
                const cellElement = document.createElement('div');
                
                // 设置基本样式
                cellElement.className = 'flex items-center justify-center text-sm font-bold cursor-pointer select-none';
                cellElement.style.width = `${cellSize}px`;
                cellElement.style.height = `${cellSize}px`;
                
                // 设置单元格状态样式
                if (cell.isRevealed) {
                    // 已翻开的格子
                    cellElement.classList.add('bg-gray-200', 'cell-pressed');
                    
                    if (cell.isMine) {
                        // 地雷
                        cellElement.classList.add('text-mine');
                        cellElement.innerHTML = '<i class="fa fa-bomb"></i>';
                    } else if (cell.adjacentMines > 0) {
                        // 有数字的格子
                        const colors = ['', 'blue', 'green', 'red', 'purple', 'maroon', 'turquoise', 'black', 'gray'];
                        cellElement.textContent = cell.adjacentMines;
                        cellElement.classList.add(`text-${colors[cell.adjacentMines]}`);
                    }
                } else {
                    // 未翻开的格子
                    cellElement.classList.add('bg-gray-300', 'cell-shadow');
                    
                    if (cell.isFlagged) {
                        // 已标记的格子
                        cellElement.classList.add('text-mine');
                        cellElement.innerHTML = '<i class="fa fa-flag"></i>';
                    } else if (cell.isWrongFlag) {
                        // 错误标记的格子
                        cellElement.classList.add('bg-red-200');
                        cellElement.innerHTML = '<i class="fa fa-times text-red-500"></i>';
                    }
                }
                
                // 添加点击事件
                cellElement.addEventListener('click', function() {
                    if (!ai.isRunning) {
                        game.handleCellClick(x, y);
                    }
                });
                
                // 添加右键事件
                cellElement.addEventListener('contextmenu', function(event) {
                    if (!ai.isRunning) {
                        game.handleCellRightClick(x, y, event);
                    }
                });
                
                grid.appendChild(cellElement);
            }
        }
        
        gameContainer.appendChild(grid);
    }

    // 更新计数器
    function updateCounters() {
        mineCounter.textContent = game.getFormattedMineCount();
        timer.textContent = game.getFormattedTime();
    }

    // 显示游戏结束弹窗
    function showGameOverModal(isWin, isAIFailure = false) {
        if (isWin) {
            gameOverTitle.textContent = '恭喜你！';
            gameOverTitle.classList.add('text-green-500');
            gameOverTitle.classList.remove('text-red-500');
            gameOverMessage.textContent = `你成功扫完了所有地雷！用时：${game.timeElapsed}秒`;
        } else {
            gameOverTitle.textContent = '游戏结束';
            gameOverTitle.classList.add('text-red-500');
            gameOverTitle.classList.remove('text-green-500');
            
            if (isAIFailure) {
                gameOverMessage.textContent = 'AI踩到了地雷！';
            } else {
                gameOverMessage.textContent = '很遗憾，你踩到了地雷！';
            }
        }
        
        gameOverModal.classList.remove('hidden');
        
        // 如果是AI失败，显示特殊的重玩选项
        if (isAIFailure) {
            document.getElementById('retry-with-same-mines').classList.remove('hidden');
        } else {
            document.getElementById('retry-with-same-mines').classList.add('hidden');
        }
    }
    
    // 重置游戏但保留当前地雷分布
    function resetGameWithSameMines() {
        try {
            console.log('开始重置游戏，保留相同雷区分布');
            
            // 确保我们有保存的地雷位置
            if (!game.aifailedMinePositions || game.aifailedMinePositions.length === 0) {
                console.error('没有保存的地雷位置');
                initGame();
                return;
            }
            
            // 深拷贝地雷位置，避免引用问题
            const minePositions = JSON.parse(JSON.stringify(game.aifailedMinePositions));
            console.log(`已加载地雷位置数量: ${minePositions.length}`);
            
            // 完全重置游戏状态
            game.isGameOver = false;
            game.isGameWon = false;
            game.isFirstClick = false; // 不再需要首次点击保护，因为我们已经知道地雷位置
            game.timeElapsed = 0;
            game.flagsPlaced = 0;
            game.revealedCount = 0;
            game.wasRunningWhenFailed = false;
            
            // 清除定时器
            if (game.timer) {
                clearInterval(game.timer);
                game.timer = null;
            }
            
            // 完全重建游戏板
            game.board = [];
            for (let y = 0; y < game.height; y++) {
                game.board[y] = [];
                for (let x = 0; x < game.width; x++) {
                    const isMine = minePositions.some(pos => pos.x === x && pos.y === y);
                    game.board[y][x] = {
                        x: x,
                        y: y,
                        isMine: isMine,
                        isRevealed: false,
                        isFlagged: false,
                        isWrongFlag: false,
                        adjacentMines: 0
                    };
                }
            }
            
            // 重新计算所有格子的相邻地雷数
            for (let y = 0; y < game.height; y++) {
                for (let x = 0; x < game.width; x++) {
                    if (!game.board[y][x].isMine) {
                        let count = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                
                                const nx = x + dx;
                                const ny = y + dy;
                                
                                if (nx >= 0 && nx < game.width && ny >= 0 && ny < game.height) {
                                    if (game.board[ny][nx].isMine) {
                                        count++;
                                    }
                                }
                            }
                        }
                        game.board[y][x].adjacentMines = count;
                    }
                }
            }
            
            // 彻底重置AI，避免任何状态残留
            ai.reset();
            ai.isRunning = false;
            ai.stepByStepMode = false;
            ai.lastMoveReason = "";
            ai.wasRunningWhenFailed = false;
            
            // 确保清除任何可能存在的interval
            if (ai.scanInterval) {
                clearInterval(ai.scanInterval);
                ai.scanInterval = null;
            }
            
            // 触发更新事件
            if (game.onGameUpdate) {
                game.onGameUpdate();
            }
            
            // 重新渲染游戏板
            renderGameBoard();
            updateCounters();
            
            // 隐藏游戏结束弹窗
            gameOverModal.classList.add('hidden');
            
            // 自动开始AI扫雷
            setTimeout(() => {
                console.log('重新开始AI扫雷');
                ai.startSolving();
                ai.wasRunningWhenFailed = true;
                // 同步更新UI按钮状态
                aiSolveButton.innerHTML = '<i class="fa fa-stop mr-2"></i>停止AI';
                aiSolveButton.classList.remove('bg-secondary');
                aiSolveButton.classList.add('bg-red-500');
            }, 500);
            
            console.log('相同雷区重置完成');
        } catch (error) {
            console.error('重置游戏时出错:', error);
            // 出错时回退到普通重置
            initGame();
        }
    }

    // 设置游戏事件监听器
    game.onGameUpdate = function() {
        renderGameBoard();
        updateCounters();
    };
    
    game.onGameOver = function() {
        // 记录AI是否在运行时失败
        const wasAIRunning = ai.isRunning;
        if (wasAIRunning) {
            ai.wasRunningWhenFailed = true;
        }
        
        // 判断是否是AI扫雷失败
        const isAIFailure = wasAIRunning || ai.wasRunningWhenFailed;
        
        // 如果是AI失败，保存当前地雷位置
        if (isAIFailure) {
            console.log('AI失败，保存地雷位置');
            const boardState = game.getGameState();
            const minePositions = [];
            for (let y = 0; y < game.height; y++) {
                for (let x = 0; x < game.width; x++) {
                    if (boardState[y][x].isMine) {
                        minePositions.push({x, y});
                    }
                }
            }
            // 使用深拷贝确保没有引用问题
            game.aifailedMinePositions = JSON.parse(JSON.stringify(minePositions));
            console.log(`已保存地雷位置数量: ${game.aifailedMinePositions.length}`);
        } else {
            // 不是AI失败，清除之前保存的地雷位置
            game.aifailedMinePositions = null;
        }
        
        showGameOverModal(false, isAIFailure);
        ai.stopSolving();
        
        // 重置wasRunningWhenFailed标志
        setTimeout(() => {
            ai.wasRunningWhenFailed = false;
        }, 100);
    };
    
    game.onGameWon = function() {
        showGameOverModal(true);
        ai.stopSolving();
    };

    // 设置UI事件监听器
    difficultySelect.addEventListener('change', function() {
        initGame();
    });
    
    // AI速度滑块事件监听
    aiSpeedSlider.addEventListener('input', function() {
        const delay = parseInt(this.value);
        ai.delayBetweenSteps = delay;
        speedValueDisplay.textContent = (delay / 1000).toFixed(1) + 's';
        
        // 如果AI正在运行，需要重新启动interval来应用新的延迟
        if (ai.isRunning && !ai.stepByStepMode && ai.scanInterval) {
            clearInterval(ai.scanInterval);
            ai.scanInterval = setInterval(() => {
                ai.makeNextMove();
            }, ai.delayBetweenSteps);
        }
    });
    
    restartButton.addEventListener('click', function() {
        initGame();
    });
    
    aiSolveButton.addEventListener('click', function() {
        if (ai.isRunning) {
            ai.stopSolving();
            ai.wasRunningWhenFailed = false;
            aiSolveButton.innerHTML = '<i class="fa fa-robot mr-2"></i>AI扫雷';
            aiSolveButton.classList.remove('bg-red-500');
            aiSolveButton.classList.add('bg-secondary');
        } else {
            ai.startSolving();
            ai.wasRunningWhenFailed = true;
            aiSolveButton.innerHTML = '<i class="fa fa-stop mr-2"></i>停止AI';
            aiSolveButton.classList.remove('bg-secondary');
            aiSolveButton.classList.add('bg-red-500');
        }
    });
    
    aiStepButton.addEventListener('click', function() {
        ai.stepSolve();
    });
    
    playAgainButton.addEventListener('click', function() {
        initGame();
    });
    
    // 为"按照当前雷区分布重新开始"按钮添加事件监听
    const retryWithSameMinesButton = document.getElementById('retry-with-same-mines');
    if (retryWithSameMinesButton) {
        retryWithSameMinesButton.addEventListener('click', function() {
            resetGameWithSameMines();
        });
    }

    // 窗口大小改变时重新渲染游戏板
    window.addEventListener('resize', function() {
        if (!game.isGameOver && !game.isGameWon) {
            renderGameBoard();
        }
    });

    // 初始化游戏
    initGame();
});

// 添加键盘快捷键支持
document.addEventListener('keydown', function(event) {
    // 按R键重新开始游戏
    if (event.key === 'r' || event.key === 'R') {
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.click();
        }
    }
    
    // 按A键启动/停止AI
    if (event.key === 'a' || event.key === 'A') {
        const aiSolveButton = document.getElementById('ai-solve-button');
        if (aiSolveButton) {
            aiSolveButton.click();
        }
    }
    
    // 按S键执行单步AI
    if (event.key === 's' || event.key === 'S') {
        const aiStepButton = document.getElementById('ai-step-button');
        if (aiStepButton) {
            aiStepButton.click();
        }
    }
});