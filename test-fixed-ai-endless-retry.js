/**
 * 测试修复后的AI在相同雷区无限次重新开始的功能
 * 新增：跟踪AI起始位置和失败位置
 */

// 确保在游戏和AI完全加载后再执行测试
(function() {
    // 等待游戏和AI加载完成
    function waitForGameAndAI() {
        if (window.game && window.ai) {
            console.log('游戏和AI已加载完成，开始测试');
            
            // 全局变量用于跟踪测试状态
            let retryCount = 0;
            const maxRetries = 10; // 最大重试次数
            let testCompleted = false;
            let lastMinefieldHash = null;
            let minefieldMatches = 0;
            let startPositions = []; // 记录每次尝试的起始位置
            let failedPositions = []; // 记录每次失败的位置
            
            // 获取相同雷区重新开始按钮（注意：HTML中的实际ID是retry-with-same-mines）
            const retryWithSameMinesButton = document.getElementById('retry-with-same-mines');
            if (!retryWithSameMinesButton) {
                console.error('未找到相同雷区重新开始按钮！');
                return;
            }
            
            // 禁用用户交互，避免干扰测试
            document.body.style.pointerEvents = 'none';
            
            // 保存原始的游戏结束处理函数
            const originalGameOver = window.game.onGameOver;
            
            // 重写游戏结束处理函数
            window.game.onGameOver = function(isWin) {
                // 调用原始的游戏结束处理
                originalGameOver.call(window.game, isWin);
                
                if (testCompleted) return;
                
                // 延迟一小段时间后再进行下一步操作
                setTimeout(() => {
                    if (isWin) {
                        console.log(`测试成功！AI在第${retryCount + 1}次尝试中成功扫雷！`);
                        testCompleted = true;
                        showTestResults(true);
                        return;
                    }
                    
                    // 检查是否达到最大重试次数
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        console.log(`测试结束：已达到最大重试次数${maxRetries}，AI仍未成功扫雷。`);
                        testCompleted = true;
                        showTestResults(false);
                        return;
                    }
                    
                    // 重新开始相同雷区
                    console.log(`AI失败，第${retryCount}次重试，使用相同雷区...`);
                    
                    // 验证雷区是否相同
                    const currentHash = calculateMinefieldHash();
                    if (currentHash === lastMinefieldHash) {
                        minefieldMatches++;
                        console.log(`✓ 雷区匹配，当前连续匹配次数：${minefieldMatches}`);
                    } else {
                        console.error(`✗ 雷区不匹配！`);
                    }
                    
                    // 记录失败位置
                    if (window.ai.lastFailedPosition) {
                        failedPositions.push(window.ai.lastFailedPosition);
                        console.log(`记录失败位置：(${window.ai.lastFailedPosition.x},${window.ai.lastFailedPosition.y})`);
                    }
                    
                    // 点击相同雷区重新开始按钮
                    setTimeout(() => {
                        if (retryWithSameMinesButton && !retryWithSameMinesButton.classList.contains('hidden')) {
                            retryWithSameMinesButton.click();
                        } else {
                            console.warn('相同雷区重新开始按钮不可见或不存在，使用普通重新开始代替');
                            const restartButton = document.getElementById('restart-button');
                            if (restartButton) {
                                restartButton.click();
                                // 重新开始后再启动AI
                                setTimeout(() => {
                                    window.ai.startSolving();
                                }, 1000);
                            }
                        }
                    }, 500);
                }, 1000);
            };
            
            // 保存原始的格子点击处理函数
            const originalHandleCellClick = window.game.handleCellClick;
            
            // 重写格子点击处理函数，记录首次点击位置
            window.game.handleCellClick = function(x, y) {
                // 如果是首次点击，记录位置
                if (this.isFirstClick && window.ai.isRunning) {
                    console.log(`AI首次点击位置：(${x},${y})`);
                    startPositions.push({x, y});
                }
                // 调用原始的格子点击处理
                originalHandleCellClick.call(this, x, y);
            };
            
            // 开始测试
            function startTest() {
                console.log('测试开始：AI相同雷区无限次重新开始功能测试（增强版）');
                console.log('新增功能：记录起始位置和失败位置，验证AI是否避开之前的失败位置');
                
                // 初始化游戏
                if (window.initGame) {
                    window.initGame();
                } else {
                    console.error('未找到initGame函数！');
                    return;
                }
                
                // 开始AI扫雷
                setTimeout(() => {
                    if (window.ai && window.ai.startSolving) {
                        window.ai.startSolving();
                        
                        // 计算初始雷区哈希
                        setTimeout(() => {
                            lastMinefieldHash = calculateMinefieldHash();
                            console.log(`初始雷区哈希已计算：${lastMinefieldHash}`);
                        }, 500);
                    } else {
                        console.error('未找到AI或AI.startSolving方法！');
                    }
                }, 1000);
            }
            
            // 计算雷区哈希值（用于验证雷区是否相同）
            function calculateMinefieldHash() {
                try {
                    if (!window.game) return null;
                    
                    if (!window.game.aifailedMinePositions || window.game.aifailedMinePositions.length === 0) {
                        // 尝试获取游戏状态
                        const boardState = window.game.getGameState ? window.game.getGameState() : window.game.board;
                        if (!boardState) return null;
                        
                        // 从游戏板中提取地雷位置
                        const mines = [];
                        for (let y = 0; y < window.game.height; y++) {
                            for (let x = 0; x < window.game.width; x++) {
                                if (boardState[y][x] && boardState[y][x].isMine) {
                                    mines.push({x, y});
                                }
                            }
                        }
                        // 排序并序列化
                        mines.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);
                        return JSON.stringify(mines);
                    }
                    return JSON.stringify(window.game.aifailedMinePositions);
                } catch (error) {
                    console.error('计算雷区哈希时出错：', error);
                    return null;
                }
            }
            
            // 显示测试结果
            function showTestResults(isSuccess) {
                // 恢复用户交互
                document.body.style.pointerEvents = '';
                
                // 创建结果弹窗
                const resultModal = document.createElement('div');
                resultModal.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 30px;
                    border: 2px solid #333;
                    border-radius: 10px;
                    z-index: 1000;
                    text-align: center;
                    font-family: Arial, sans-serif;
                    min-width: 300px;
                `;
                
                // 添加结果标题
                const title = document.createElement('h2');
                title.textContent = isSuccess ? '测试成功！' : '测试结束';
                title.style.color = isSuccess ? 'green' : 'orange';
                resultModal.appendChild(title);
                
                // 添加结果信息
                const info = document.createElement('p');
                if (isSuccess) {
                    info.textContent = `AI在第${retryCount + 1}次尝试中成功扫雷！`;
                } else {
                    info.textContent = `已达到最大重试次数${maxRetries}，AI仍未成功扫雷。`;
                }
                resultModal.appendChild(info);
                
                // 添加雷区匹配信息
                const minefieldInfo = document.createElement('p');
                minefieldInfo.textContent = `相同雷区匹配次数：${minefieldMatches}/${retryCount}`;
                minefieldInfo.style.fontSize = '14px';
                minefieldInfo.style.color = '#666';
                resultModal.appendChild(minefieldInfo);
                
                // 添加起始位置信息
                const startPosInfo = document.createElement('p');
                const uniqueStartPositions = new Set(startPositions.map(pos => `${pos.x},${pos.y}`)).size;
                startPosInfo.textContent = `起始位置总数：${startPositions.length}，不同起始位置数：${uniqueStartPositions}`;
                startPosInfo.style.fontSize = '14px';
                startPosInfo.style.color = '#666';
                resultModal.appendChild(startPosInfo);
                
                // 添加失败位置信息
                const failedPosInfo = document.createElement('p');
                failedPosInfo.textContent = `记录的失败位置数：${failedPositions.length}`;
                failedPosInfo.style.fontSize = '14px';
                failedPosInfo.style.color = '#666';
                resultModal.appendChild(failedPosInfo);
                
                // 添加关闭按钮
                const closeButton = document.createElement('button');
                closeButton.textContent = '关闭';
                closeButton.style.cssText = `
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #333;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                `;
                closeButton.addEventListener('click', () => {
                    document.body.removeChild(resultModal);
                });
                resultModal.appendChild(closeButton);
                
                // 添加到页面
                document.body.appendChild(resultModal);
            }
            
            // 开始测试
            startTest();
        } else {
            // 游戏和AI尚未加载完成，稍后再检查
            console.log('等待游戏和AI加载完成...');
            setTimeout(waitForGameAndAI, 100);
        }
    }
    
    // 页面加载完成后开始等待游戏和AI加载
    window.addEventListener('DOMContentLoaded', waitForGameAndAI);
})();

// 计算雷区哈希值（用于验证雷区是否相同）
function calculateMinefieldHash() {
    try {
        if (!game.aifailedMinePositions || game.aifailedMinePositions.length === 0) {
            // 从游戏板中提取地雷位置
            const mines = [];
            for (let y = 0; y < game.height; y++) {
                for (let x = 0; x < game.width; x++) {
                    if (game.board[y][x] && game.board[y][x].isMine) {
                        mines.push({x, y});
                    }
                }
            }
            // 排序并序列化
            mines.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);
            return JSON.stringify(mines);
        }
        return JSON.stringify(game.aifailedMinePositions);
    } catch (error) {
        console.error('计算雷区哈希时出错：', error);
        return null;
    }
}

// 显示测试结果
function showTestResults(isSuccess) {
    // 恢复用户交互
    document.body.style.pointerEvents = '';
    
    // 创建结果弹窗
    const resultModal = document.createElement('div');
    resultModal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border: 2px solid #333;
        border-radius: 10px;
        z-index: 1000;
        text-align: center;
        font-family: Arial, sans-serif;
        min-width: 300px;
    `;
    
    // 添加结果标题
    const title = document.createElement('h2');
    title.textContent = isSuccess ? '测试成功！' : '测试结束';
    title.style.color = isSuccess ? 'green' : 'orange';
    resultModal.appendChild(title);
    
    // 添加结果信息
    const info = document.createElement('p');
    if (isSuccess) {
        info.textContent = `AI在第${retryCount + 1}次尝试中成功扫雷！`;
    } else {
        info.textContent = `已达到最大重试次数${maxRetries}，AI仍未成功扫雷。`;
    }
    resultModal.appendChild(info);
    
    // 添加雷区匹配信息
    const minefieldInfo = document.createElement('p');
    minefieldInfo.textContent = `相同雷区匹配次数：${minefieldMatches}/${retryCount}`;
    minefieldInfo.style.fontSize = '14px';
    minefieldInfo.style.color = '#666';
    resultModal.appendChild(minefieldInfo);
    
    // 添加起始位置信息
    const startPosInfo = document.createElement('p');
    const uniqueStartPositions = new Set(startPositions.map(pos => `${pos.x},${pos.y}`)).size;
    startPosInfo.textContent = `起始位置总数：${startPositions.length}，不同起始位置数：${uniqueStartPositions}`;
    startPosInfo.style.fontSize = '14px';
    startPosInfo.style.color = '#666';
    resultModal.appendChild(startPosInfo);
    
    // 添加失败位置信息
    const failedPosInfo = document.createElement('p');
    failedPosInfo.textContent = `记录的失败位置数：${failedPositions.length}`;
    failedPosInfo.style.fontSize = '14px';
    failedPosInfo.style.color = '#666';
    resultModal.appendChild(failedPosInfo);
    
    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.cssText = `
        margin-top: 20px;
        padding: 10px 20px;
        background: #333;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
    closeButton.addEventListener('click', () => {
        document.body.removeChild(resultModal);
    });
    resultModal.appendChild(closeButton);
    
    // 添加到页面
    document.body.appendChild(resultModal);
}