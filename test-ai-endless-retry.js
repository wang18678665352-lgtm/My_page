// 用于测试AI在相同雷区无限次重新开始的功能

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    console.log('==== 开始测试AI无限次重新开始功能 ====');
    
    // 确保游戏和AI实例已加载
    setTimeout(() => {
        if (window.game && window.ai) {
            const game = window.game;
            const ai = window.ai;
            let retryCount = 0;
            const maxRetries = 10; // 测试最大次数
            
            console.log(`游戏配置: 宽=${game.width}, 高=${game.height}, 地雷数=${game.mineCount}`);
            
            // 重写游戏结束方法来自动重试
            const originalGameOver = game.gameOver;
            game.gameOver = function(isWin, isAIFailure = false) {
                // 记录结果
                if (isWin) {
                    console.log(`✅ 第${retryCount+1}次尝试: AI成功完成!`);
                    // 成功后仍然继续测试
                    setTimeout(() => {
                        document.getElementById('new-game').click();
                    }, 1000);
                } else if (isAIFailure || ai.wasRunningWhenFailed) {
                    retryCount++;
                    console.log(`❌ 第${retryCount}次尝试: AI踩雷, 即将按照相同雷区重新开始... (共测试${maxRetries}次)`);
                    
                    // 保存地雷位置
                    const boardState = game.getGameState();
                    const minePositions = [];
                    for (let y = 0; y < game.height; y++) {
                        for (let x = 0; x < game.width; x++) {
                            if (boardState[y][x].isMine) {
                                minePositions.push({x, y});
                            }
                        }
                    }
                    game.aifailedMinePositions = minePositions;
                    
                    // 如果测试次数未达到最大值，自动点击重新开始按钮
                    if (retryCount < maxRetries) {
                        setTimeout(() => {
                            const retryBtn = document.getElementById('retry-with-same-mines');
                            if (retryBtn) {
                                retryBtn.click();
                            }
                        }, 500);
                    } else {
                        console.log(`✅ 测试完成! AI在相同雷区成功重新开始${retryCount}次，无卡死现象。`);
                        console.log('==== 测试结束 ====');
                    }
                } else {
                    // 用户操作导致游戏结束，不进行测试
                    originalGameOver.call(game, isWin, isAIFailure);
                }
            };
            
            // 启动测试
            console.log('开始第一轮AI扫雷...');
            
            // 设置为简单难度以加快测试
            const difficultySelect = document.getElementById('difficulty');
            if (difficultySelect) {
                difficultySelect.value = 'easy';
                difficultySelect.dispatchEvent(new Event('change'));
            }
            
            // 开始AI扫雷
            setTimeout(() => {
                const aiStartBtn = document.querySelector('button[onclick="ai.startSolving()"]') || 
                                  document.querySelector('button:contains("开始AI扫雷")');
                if (aiStartBtn) {
                    aiStartBtn.click();
                } else {
                    console.log('未找到AI开始按钮，尝试直接调用ai.startSolving()');
                    ai.startSolving();
                }
            }, 1000);
            
        } else {
            console.error('未找到游戏或AI实例，测试失败');
        }
    }, 2000);
});

console.log('AI无限次重新开始测试脚本已加载');