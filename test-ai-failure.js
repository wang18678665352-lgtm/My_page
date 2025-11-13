// 此脚本用于测试AI扫雷失败后重新开始游戏的功能
// 请在浏览器控制台中执行此脚本

// 等待DOM加载完成
function waitForDOM() {
    return new Promise(resolve => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
}

// 模拟AI扫雷失败
async function testAIFailure() {
    await waitForDOM();
    
    console.log('测试AI扫雷失败后重新开始功能...');
    
    // 获取游戏实例
    const game = window.game || (() => {
        // 在实际环境中，游戏实例可能在闭包中，这里尝试通过模拟来测试
        console.log('游戏实例在闭包中，无法直接访问。请在浏览器控制台中手动执行以下步骤测试：');
        console.log('1. 点击"AI扫雷"按钮启动AI');
        console.log('2. 当AI扫雷失败时，查看是否显示"按照当前雷区分布重新开始"按钮');
        console.log('3. 点击该按钮，检查游戏是否按照相同的雷区分布重新开始');
        return null;
    })();
    
    if (!game) return;
    
    try {
        // 模拟游戏结束并触发AI失败
        const originalGameOver = game.gameOver;
        
        // 重写gameOver方法来模拟AI失败
        game.gameOver = function(isWin) {
            if (!isWin) {
                // 设置为AI失败状态
                game.aifailedMinePositions = [{x: 4, y: 4}]; // 示例地雷位置
                const ai = window.ai || {isRunning: true, wasRunningWhenFailed: true};
                
                // 调用原始gameOver方法
                originalGameOver.call(this, isWin);
            }
        };
        
        console.log('已准备就绪，请点击"AI扫雷"按钮开始测试');
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

testAIFailure();