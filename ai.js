/**
 * 模拟人类思路的扫雷AI
 * 增强版：能够进行复杂逻辑推理，判断区块地雷分布
 */
class MinesweeperAI {
    constructor(game) {
        this.game = game;
        this.isRunning = false;
        this.stepByStepMode = false;
        this.scanInterval = null;
        this.delayBetweenSteps = 1000; // 默认每步之间的延迟时间（毫秒）
        this.lastMoveReason = ''; // 记录最后一步操作的原因
        this.wasRunningWhenFailed = false; // 记录游戏失败时AI是否正在运行
        this.failedPositions = []; // 记录失败的位置，用于相同雷区重新开始时避开
        this.lastFailedPosition = null; // 记录上一次失败的具体位置
    }

    // 启动AI自动扫雷
    startSolving() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.stepByStepMode = false;
        
        // 开始扫描过程
        this.scanInterval = setInterval(() => {
            this.makeNextMove();
        }, this.delayBetweenSteps);
    }

    // 单步执行AI操作
    stepSolve() {
        if (this.isRunning && !this.stepByStepMode) return;
        
        this.isRunning = true;
        this.stepByStepMode = true;
        this.makeNextMove();
    }

    // 停止AI
    stopSolving() {
        this.isRunning = false;
        this.stepByStepMode = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    // 检查是否需要继续运行
    shouldContinue() {
        return this.isRunning && !this.game.isGameOver && !this.game.isGameWon;
    }

    // 执行下一步操作
    makeNextMove() {
        if (!this.shouldContinue()) {
            this.stopSolving();
            return;
        }

        const gameState = this.game.getGameState();
        this.lastMoveReason = "";

        // 1. 首次点击，选择一个安全的位置（通常是中心区域）
        if (this.game.isFirstClick) {
            this.makeFirstMove(gameState);
            return;
        }

        // 2. 执行高级逻辑推理找出安全格子和地雷
        const {safeMoves, mineMoves} = this.advancedLogicalReasoning(gameState);
        
        // 先处理能确定的地雷
        if (mineMoves.length > 0) {
            const mineToFlag = mineMoves[0];
            this.lastMoveReason = `标记地雷：(${mineToFlag.x},${mineToFlag.y}) - 逻辑推理确定此处必是地雷`;
            console.log("AI: " + this.lastMoveReason);
            this.game.handleCellRightClick(mineToFlag.x, mineToFlag.y);
            return;
        }

        // 再处理能确定的安全格子
        if (safeMoves.length > 0) {
            // 检查是否违反规则：不在九宫格全未翻开的情况下翻开中心格
            const validSafeMoves = safeMoves.filter(cell => 
                !this.isCenterOfUnrevealedNineGrid(cell.x, cell.y, gameState)
            );
            
            if (validSafeMoves.length > 0) {
                const safeMove = validSafeMoves[0];
                this.lastMoveReason = `翻开安全格子：(${safeMove.x},${safeMove.y}) - 逻辑推理确定此处安全`;
                console.log("AI: " + this.lastMoveReason);
                this.game.handleCellClick(safeMove.x, safeMove.y);
                return;
            }
        }

        // 3. 寻找简单逻辑能确定的安全格子
        const safeMove = this.findSafeMove(gameState);
        if (safeMove) {
            this.lastMoveReason = `翻开安全格子：(${safeMove.x},${safeMove.y}) - 周围地雷已全部标记`;
            console.log("AI: " + this.lastMoveReason);
            this.game.handleCellClick(safeMove.x, safeMove.y);
            return;
        }

        // 4. 标记明显的地雷
        const mineToFlag = this.findMineToFlag(gameState);
        if (mineToFlag) {
            this.lastMoveReason = `标记地雷：(${mineToFlag.x},${mineToFlag.y}) - 周围未标记格子数等于剩余地雷数`;
            console.log("AI: " + this.lastMoveReason);
            this.game.handleCellRightClick(mineToFlag.x, mineToFlag.y);
            return;
        }

        // 5. 使用增强的概率分析选择最安全的格子
        const bestGuess = this.enhancedProbabilityAnalysis(gameState);
        if (bestGuess) {
            this.lastMoveReason = `概率选择：(${bestGuess.x},${bestGuess.y}) - 概率为${bestGuess.probability.toFixed(2)}，${bestGuess.reason}`;
            console.log("AI: " + this.lastMoveReason);
            this.game.handleCellClick(bestGuess.x, bestGuess.y);
        }

        // 在单步模式下，执行完一步后停止
        if (this.stepByStepMode) {
            this.isRunning = false;
        }
    }

    // 首次点击策略 - 增强版：在相同雷区重新开始时能够避开之前失败的位置
    makeFirstMove(gameState) {
        // 选择中心区域的一个格子，避开九宫格中心未翻开的情况和之前失败的位置
        const midX = Math.floor(this.game.width / 2);
        const midY = Math.floor(this.game.height / 2);
        
        // 检查中心九宫格是否有格子被翻开（虽然是首次点击，但为了遵循规则）
        let hasRevealedInCenter = false;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = midX + dx;
                const y = midY + dy;
                if (x >= 0 && x < this.game.width && y >= 0 && y < this.game.height) {
                    if (gameState[y][x].isRevealed) {
                        hasRevealedInCenter = true;
                        break;
                    }
                }
            }
            if (hasRevealedInCenter) break;
        }

        // 生成所有可能的起始位置，优先选择安全区域
        let possibleStarterPositions = [];
        
        // 如果有失败记录，首先尝试避开失败位置
        if (this.failedPositions.length > 0) {
            console.log(`AI: 有${this.failedPositions.length}个失败记录，尝试避开这些位置`);
            
            // 1. 生成所有角落位置
            const corners = [
                {x: 0, y: 0},
                {x: this.game.width - 1, y: 0},
                {x: 0, y: this.game.height - 1},
                {x: this.game.width - 1, y: this.game.height - 1}
            ];
            
            // 2. 生成中心区域的所有位置（扩展到5x5区域）
            const centerArea = [];
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const x = midX + dx;
                    const y = midY + dy;
                    if (x >= 0 && x < this.game.width && y >= 0 && y < this.game.height) {
                        centerArea.push({x, y});
                    }
                }
            }
            
            // 3. 生成边上的位置
            const edgePositions = [];
            // 上边和下边
            for (let x = 0; x < this.game.width; x++) {
                edgePositions.push({x, y: 0});
                edgePositions.push({x, y: this.game.height - 1});
            }
            // 左边和右边
            for (let y = 1; y < this.game.height - 1; y++) {
                edgePositions.push({x: 0, y});
                edgePositions.push({x: this.game.width - 1, y});
            }
            
            // 合并所有可能的位置，并移除失败位置和重复项
            const allPositions = [...corners, ...centerArea, ...edgePositions];
            
            // 过滤掉失败位置、超出边界的位置，以及九宫格中心未翻开的位置
            possibleStarterPositions = allPositions.filter(pos => {
                // 检查是否在失败位置列表中
                const isFailedPos = this.failedPositions.some(failedPos => 
                    failedPos.x === pos.x && failedPos.y === pos.y
                );
                
                // 检查是否是未翻开九宫格的中心
                const isCenterOfUnrevealed = this.isCenterOfUnrevealedNineGrid(pos.x, pos.y, gameState);
                
                // 确保位置在边界内
                const isValidPos = pos.x >= 0 && pos.x < this.game.width && pos.y >= 0 && pos.y < this.game.height;
                
                return isValidPos && !isFailedPos && !isCenterOfUnrevealed;
            });
        }
        
        // 如果没有特定的失败规避策略，使用默认的起始位置
        if (possibleStarterPositions.length === 0) {
            if (!hasRevealedInCenter) {
                // 选择中心附近但不是正中心的格子
                possibleStarterPositions = [
                    {x: midX - 1, y: midY - 1},
                    {x: midX + 1, y: midY - 1},
                    {x: midX - 1, y: midY + 1},
                    {x: midX + 1, y: midY + 1},
                    {x: midX, y: midY - 1},
                    {x: midX, y: midY + 1},
                    {x: midX - 1, y: midY},
                    {x: midX + 1, y: midY}
                ];
            } else {
                // 否则选择中心格子
                possibleStarterPositions = [{x: midX, y: midY}];
            }
        }
        
        // 随机打乱顺序，增加随机性
        for (let i = possibleStarterPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleStarterPositions[i], possibleStarterPositions[j]] = [possibleStarterPositions[j], possibleStarterPositions[i]];
        }
        
        // 选择第一个有效的位置
        for (const pos of possibleStarterPositions) {
            if (pos.x >= 0 && pos.x < this.game.width && pos.y >= 0 && pos.y < this.game.height) {
                this.lastMoveReason = `首次点击：选择起始位置(${pos.x},${pos.y})${this.failedPositions.length > 0 ? ' - 避开之前失败位置' : ''}`;
                console.log("AI: " + this.lastMoveReason);
                this.game.handleCellClick(pos.x, pos.y);
                return;
            }
        }
        
        // 兜底方案：选择中心格子
        this.lastMoveReason = `首次点击：选择中心位置(${midX},${midY})`;
        console.log("AI: " + this.lastMoveReason);
        this.game.handleCellClick(midX, midY);
    }

    // 高级逻辑推理 - 能够处理"两个格中有一个雷"的情况
    advancedLogicalReasoning(gameState) {
        const safeMoves = [];
        const mineMoves = [];
        const processedCells = new Set();

        // 1. 找出所有已翻开且有数字的格子及其影响区域
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                const cell = gameState[y][x];
                
                // 只考虑已翻开且有数字的格子
                if (!cell.isRevealed || cell.isMine || cell.adjacentMines === 0) {
                    continue;
                }

                // 获取这个格子的约束信息
                const constraint = this.getConstraintForCell(x, y, gameState);
                if (constraint.hiddenCells.length === 0) continue;

                // 尝试与其他约束进行比较，找出共同区域
                for (let y2 = 0; y2 < this.game.height; y2++) {
                    for (let x2 = 0; x2 < this.game.width; x2++) {
                        if (x === x2 && y === y2) continue;
                        
                        const cell2 = gameState[y2][x2];
                        if (!cell2.isRevealed || cell2.isMine || cell2.adjacentMines === 0) {
                            continue;
                        }

                        const constraint2 = this.getConstraintForCell(x2, y2, gameState);
                        if (constraint2.hiddenCells.length === 0) continue;

                        // 检查两个约束区域是否有重叠
                        const overlappingCells = this.findOverlappingCells(constraint.hiddenCells, constraint2.hiddenCells);
                        if (overlappingCells.length === 0) continue;

                        // 计算两个约束之间的关系
                        const diffMines = constraint.minesLeft - constraint2.minesLeft;
                        const uniqueToConstraint = constraint.hiddenCells.filter(c => !this.cellInList(c, constraint2.hiddenCells));
                        const uniqueToConstraint2 = constraint2.hiddenCells.filter(c => !this.cellInList(c, constraint.hiddenCells));

                        // 情况1：约束1的区域完全包含约束2的区域，且地雷数相同
                        if (uniqueToConstraint.length === 0 && diffMines === 0) {
                            // 约束2的额外区域必须没有地雷
                            for (const c of uniqueToConstraint2) {
                                const key = `${c.x},${c.y}`;
                                if (!processedCells.has(key) && !c.isFlagged && !c.isRevealed) {
                                    safeMoves.push({x: c.x, y: c.y});
                                    processedCells.add(key);
                                }
                            }
                        }
                        
                        // 情况2：约束1的区域完全包含约束2的区域，且地雷数不同
                        if (uniqueToConstraint.length === 0 && diffMines > 0) {
                            // 约束2的额外区域必须有diffMines个地雷
                            if (uniqueToConstraint2.length === diffMines) {
                                for (const c of uniqueToConstraint2) {
                                    const key = `${c.x},${c.y}`;
                                    if (!processedCells.has(key) && !c.isFlagged && !c.isRevealed) {
                                        mineMoves.push({x: c.x, y: c.y});
                                        processedCells.add(key);
                                    }
                                }
                            }
                        }
                        
                        // 情况3：两个约束区域有重叠，且可以推断出唯一区域的地雷数
                        if (uniqueToConstraint.length > 0 && uniqueToConstraint2.length > 0) {
                            // 处理"两个格中有一个雷"的情况
                            const combinedMines = constraint.minesLeft + constraint2.minesLeft;
                            const uniqueMines = combinedMines - overlappingCells.length;
                            
                            // 例如：如果两个约束有重叠，并且我们能推断出唯一区域的地雷数
                            if (uniqueToConstraint.length + uniqueToConstraint2.length + overlappingCells.length <= 3 && 
                                uniqueMines >= 0 && uniqueMines <= uniqueToConstraint.length + uniqueToConstraint2.length) {
                                // 这里可以进行更复杂的组合分析
                                // 简化版本：如果约束1说A+B有m个雷，约束2说B+C有n个雷
                                // 则A-C区域的地雷数差为m-n
                                if (uniqueToConstraint.length === 1 && uniqueToConstraint2.length === 1 && diffMines === 1) {
                                    // A区域必须有1个雷，C区域必须没有雷
                                    mineMoves.push(uniqueToConstraint[0]);
                                    safeMoves.push(uniqueToConstraint2[0]);
                                } else if (uniqueToConstraint.length === 1 && uniqueToConstraint2.length === 1 && diffMines === -1) {
                                    // A区域必须没有雷，C区域必须有1个雷
                                    safeMoves.push(uniqueToConstraint[0]);
                                    mineMoves.push(uniqueToConstraint2[0]);
                                }
                            }
                        }
                    }
                }
            }
        }

        return {safeMoves, mineMoves};
    }

    // 获取格子的约束信息
    getConstraintForCell(x, y, gameState) {
        const cell = gameState[y][x];
        const adjacentCells = this.getAdjacentCells(x, y, gameState);
        const hiddenCells = adjacentCells.filter(c => !c.isRevealed);
        const flaggedCells = hiddenCells.filter(c => c.isFlagged).length;
        const minesLeft = Math.max(0, cell.adjacentMines - flaggedCells);
        
        return {
            x, y,
            hiddenCells,
            flaggedCells,
            minesLeft
        };
    }

    // 找出两个格子列表的重叠部分
    findOverlappingCells(list1, list2) {
        return list1.filter(cell1 => 
            list2.some(cell2 => cell1.x === cell2.x && cell1.y === cell2.y)
        );
    }

    // 检查格子是否在列表中
    cellInList(cell, list) {
        return list.some(c => c.x === cell.x && c.y === cell.y);
    }

    // 寻找安全格子 - 基础逻辑
    findSafeMove(gameState) {
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                const cell = gameState[y][x];
                
                // 只考虑已翻开且有数字的格子
                if (!cell.isRevealed || cell.isMine || cell.adjacentMines === 0) {
                    continue;
                }
                
                // 获取周围未翻开且未标记的格子
                const adjacentCells = this.getAdjacentCells(x, y, gameState);
                const hiddenCells = adjacentCells.filter(c => !c.isRevealed);
                const flaggedCells = hiddenCells.filter(c => c.isFlagged).length;
                const unflaggedHiddenCells = hiddenCells.filter(c => !c.isFlagged);
                
                // 如果已标记的地雷数等于格子的数字，那么剩下的未标记隐藏格子都是安全的
                if (flaggedCells === cell.adjacentMines && unflaggedHiddenCells.length > 0) {
                    // 检查是否违反规则：不在九宫格全未翻开的情况下翻开中心格
                    for (const safeCell of unflaggedHiddenCells) {
                        if (!this.isCenterOfUnrevealedNineGrid(safeCell.x, safeCell.y, gameState)) {
                            return safeCell;
                        }
                    }
                }
            }
        }
        return null;
    }

    // 寻找应该标记为地雷的格子 - 基础逻辑
    findMineToFlag(gameState) {
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                const cell = gameState[y][x];
                
                // 只考虑已翻开且有数字的格子
                if (!cell.isRevealed || cell.isMine || cell.adjacentMines === 0) {
                    continue;
                }
                
                // 获取周围未翻开的格子
                const adjacentCells = this.getAdjacentCells(x, y, gameState);
                const hiddenCells = adjacentCells.filter(c => !c.isRevealed);
                const unflaggedHiddenCells = hiddenCells.filter(c => !c.isFlagged);
                const flaggedCells = hiddenCells.filter(c => c.isFlagged).length;
                
                // 如果未标记的隐藏格子数等于（数字减去已标记的地雷数），那么这些格子都是地雷
                if (unflaggedHiddenCells.length === (cell.adjacentMines - flaggedCells) && unflaggedHiddenCells.length > 0) {
                    return unflaggedHiddenCells[0];
                }
            }
        }
        return null;
    }

    // 增强的概率分析选择最安全的格子
    enhancedProbabilityAnalysis(gameState) {
        // 记录每个未翻开格子的地雷概率
        const probabilities = [];
        
        // 首先排除已经标记的格子和明显危险的格子
        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                const cell = gameState[y][x];
                
                // 跳过已翻开或已标记的格子
                if (cell.isRevealed || cell.isFlagged) {
                    continue;
                }
                
                // 计算这个格子是地雷的概率
                let mineProbability = 0.15; // 默认基础概率
                let hasInfo = false;
                let reason = "基础概率";
                
                // 检查周围的已翻开格子，获取更多信息
                const adjacentRevealedCells = this.getAdjacentCells(x, y, gameState)
                    .filter(c => c.isRevealed && !c.isMine && c.adjacentMines > 0);
                
                if (adjacentRevealedCells.length > 0) {
                    hasInfo = true;
                    let totalProbability = 0;
                    const reasons = [];
                    
                    for (const revealedCell of adjacentRevealedCells) {
                        const revealedCellAdjacent = this.getAdjacentCells(revealedCell.x, revealedCell.y, gameState);
                        const revealedCellHidden = revealedCellAdjacent.filter(c => !c.isRevealed);
                        const revealedCellFlagged = revealedCellHidden.filter(c => c.isFlagged).length;
                        const revealedCellUnflaggedHidden = revealedCellHidden.filter(c => !c.isFlagged).length;
                        
                        // 计算这个已翻开格子提供的概率信息
                        const minesLeft = Math.max(0, revealedCell.adjacentMines - revealedCellFlagged);
                        const probFromThisCell = revealedCellUnflaggedHidden.length > 0 ? minesLeft / revealedCellUnflaggedHidden.length : 0;
                        totalProbability += probFromThisCell;
                        
                        reasons.push(`(${revealedCell.x},${revealedCell.y})周围有${minesLeft}/${revealedCellUnflaggedHidden.length}个雷`);
                    }
                    
                    mineProbability = totalProbability / adjacentRevealedCells.length;
                    reason = reasons.join(", ");
                }
                
                // 避免在九宫格全未翻开的情况下翻开中心格
                const isCenterOfUnrevealed = this.isCenterOfUnrevealedNineGrid(x, y, gameState);
                
                probabilities.push({
                    x: x,
                    y: y,
                    probability: mineProbability,
                    hasInfo: hasInfo,
                    isCenterOfUnrevealed: isCenterOfUnrevealed,
                    reason: reason
                });
            }
        }
        
        // 先尝试选择概率最低的格子，且不是未翻开九宫格的中心
        probabilities.sort((a, b) => {
            // 首先，优先选择有信息的格子
            if (a.hasInfo !== b.hasInfo) return a.hasInfo ? -1 : 1;
            // 其次，避开未翻开九宫格的中心
            if (a.isCenterOfUnrevealed !== b.isCenterOfUnrevealed) return a.isCenterOfUnrevealed ? 1 : -1;
            // 最后，选择概率最低的格子
            return a.probability - b.probability;
        });
        
        return probabilities.length > 0 ? probabilities[0] : null;
    }

    // 检查一个格子是否是未翻开九宫格的中心
    isCenterOfUnrevealedNineGrid(x, y, gameState) {
        // 检查九宫格是否全部未翻开
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                // 如果九宫格超出边界，那么这个格子不是完整九宫格的中心
                if (nx < 0 || nx >= this.game.width || ny < 0 || ny >= this.game.height) {
                    return false;
                }
                
                // 如果九宫格内有任何一个格子已翻开，那么这个格子不是未翻开九宫格的中心
                if (gameState[ny][nx].isRevealed) {
                    return false;
                }
            }
        }
        
        // 所有九宫格内的格子都未翻开，且在边界内
        return true;
    }

    // 获取一个格子周围的所有格子
    getAdjacentCells(x, y, gameState) {
        const adjacent = [];
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // 跳过自己
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.game.width && ny >= 0 && ny < this.game.height) {
                    adjacent.push(gameState[ny][nx]);
                }
            }
        }
        
        return adjacent;
    }

    // 重置AI状态
    reset() {
        this.stopSolving();
        this.lastMoveReason = "";
        // 保留失败位置记录，仅在全新游戏时清除
        // this.failedPositions = [];
        // this.lastFailedPosition = null;
        this.wasRunningWhenFailed = false;
    }
    
    // 记录失败位置
    recordFailurePosition(x, y) {
        // 只记录实际点击地雷的位置
        this.lastFailedPosition = {x, y};
        
        // 检查这个位置是否已经在失败列表中
        const isAlreadyRecorded = this.failedPositions.some(pos => 
            pos.x === x && pos.y === y
        );
        
        // 如果不在列表中，添加它
        if (!isAlreadyRecorded) {
            this.failedPositions.push({x, y});
            console.log(`AI: 记录失败位置(${x},${y})，当前失败列表长度: ${this.failedPositions.length}`);
        }
    }
    
    // 清除失败记录（用于全新游戏开始时）
    clearFailureRecords() {
        this.failedPositions = [];
        this.lastFailedPosition = null;
        console.log('AI: 清除所有失败记录');
    }
}

// 导出AI类
if (typeof module !== 'undefined') {
    module.exports = MinesweeperAI;
} else {
    window.MinesweeperAI = MinesweeperAI;
}