const BOARD_SIZE = 7;
const PLAYER = 'player';
const CPU = 'cpu';

let gameState = {
    board: [],
    selectedCell: null,
    currentTurn: PLAYER,
    isGameOver: false,
    playerPieces: 4,
    cpuPieces: 4,
    turnsWithoutCapture: 0,
    boardHistory: []
};

function initGame() {
    gameState = {
        board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
        selectedCell: null,
        currentTurn: PLAYER,
        isGameOver: false,
        playerPieces: 4,
        cpuPieces: 4,
        turnsWithoutCapture: 0,
        boardHistory: []
    };

    gameState.board[6][2] = PLAYER;
    gameState.board[6][3] = PLAYER;
    gameState.board[6][4] = PLAYER;
    gameState.board[6][5] = PLAYER;

    gameState.board[0][2] = CPU;
    gameState.board[0][3] = CPU;
    gameState.board[0][4] = CPU;
    gameState.board[0][5] = CPU;

    saveBoardState();
    renderBoard();
    updateUI();
}

function renderBoard() {
    const boardElement = document.getElementById('gameBoard');
    boardElement.innerHTML = '';

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const piece = gameState.board[row][col];
            if (piece === PLAYER) {
                cell.classList.add('player');
                cell.innerHTML = '<i class="fas fa-chess-pawn"></i>';
            } else if (piece === CPU) {
                cell.classList.add('cpu');
                cell.innerHTML = '<i class="fas fa-robot"></i>';
            }

            if (gameState.selectedCell &&
                gameState.selectedCell.row === row &&
                gameState.selectedCell.col === col) {
                cell.classList.add('selected');
            }

            cell.addEventListener('click', () => handleCellClick(row, col));
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(row, col) {
    if (gameState.isGameOver || gameState.currentTurn !== PLAYER) {
        return;
    }

    const clickedPiece = gameState.board[row][col];

    if (gameState.selectedCell) {
        if (gameState.selectedCell.row === row && gameState.selectedCell.col === col) {
            gameState.selectedCell = null;
            renderBoard();
            return;
        }

        if (isValidMove(gameState.selectedCell.row, gameState.selectedCell.col, row, col)) {
            makeMove(gameState.selectedCell.row, gameState.selectedCell.col, row, col, PLAYER);
            gameState.selectedCell = null;

            if (checkGameOver()) {
                return;
            }

            gameState.currentTurn = CPU;
            updateUI();

            setTimeout(() => {
                cpuTurn();
            }, 800);
        } else {
            gameState.selectedCell = null;
            renderBoard();
        }
    } else {
        if (clickedPiece === PLAYER) {
            gameState.selectedCell = { row, col };
            renderBoard();
            highlightValidMoves(row, col);
        }
    }
}

function highlightValidMoves(row, col) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];

    directions.forEach(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (newRow >= 0 && newRow < BOARD_SIZE &&
            newCol >= 0 && newCol < BOARD_SIZE) {
            const targetPiece = gameState.board[newRow][newCol];
            if (targetPiece !== PLAYER) {
                const cells = document.querySelectorAll('.cell');
                const cellIndex = newRow * BOARD_SIZE + newCol;
                cells[cellIndex].classList.add('valid-move');
            }
        }
    });
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    if (rowDiff > 1 || colDiff > 1) {
        return false;
    }

    const targetPiece = gameState.board[toRow][toCol];
    const movingPiece = gameState.board[fromRow][fromCol];

    if (targetPiece === movingPiece) {
        return false;
    }

    return true;
}

function makeMove(fromRow, fromCol, toRow, toCol, player) {
    const targetPiece = gameState.board[toRow][toCol];
    let captureOccurred = false;

    if (targetPiece === CPU && player === PLAYER) {
        gameState.cpuPieces--;
        captureOccurred = true;
    } else if (targetPiece === PLAYER && player === CPU) {
        gameState.playerPieces--;
        captureOccurred = true;
    }

    gameState.board[toRow][toCol] = player;
    gameState.board[fromRow][fromCol] = null;

    if (captureOccurred) {
        gameState.turnsWithoutCapture = 0;
    } else {
        gameState.turnsWithoutCapture++;
    }

    saveBoardState();
    renderBoard();
    updateUI();
}

function cpuTurn() {
    if (gameState.isGameOver) {
        return;
    }

    const cpuPieces = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.board[row][col] === CPU) {
                cpuPieces.push({ row, col });
            }
        }
    }

    let bestMove = null;
    let bestScore = -Infinity;

    cpuPieces.forEach(piece => {
        const validMoves = getValidMoves(piece.row, piece.col);

        validMoves.forEach(move => {
            let score = 0;

            if (gameState.board[move.row][move.col] === PLAYER) {
                score = 1000;
            } else {
                const distanceToPlayer = getMinDistanceToPlayer(move.row, move.col);
                score = 100 - distanceToPlayer * 10;

                const capturePathLength = getShortestCapturePathLength(move.row, move.col);
                score += (10 - capturePathLength);

                if (isInDanger(move.row, move.col)) {
                    score -= 50;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = {
                    from: piece,
                    to: move
                };
            }
        });
    });

    if (bestMove) {
        makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col, CPU);

        if (checkGameOver()) {
            return;
        }

        gameState.currentTurn = PLAYER;
        updateUI();
    }
}

function getShortestCapturePathLength(cpuRow, cpuCol) {
    let minPath = Infinity;

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.board[row][col] === PLAYER) {
                const pathLength = Math.max(Math.abs(row - cpuRow), Math.abs(col - cpuCol));
                minPath = Math.min(minPath, pathLength);
            }
        }
    }

    return minPath;
}

function isInDanger(row, col) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (newRow >= 0 && newRow < BOARD_SIZE &&
            newCol >= 0 && newCol < BOARD_SIZE) {
            if (gameState.board[newRow][newCol] === PLAYER) {
                return true;
            }
        }
    }

    return false;
}

function getValidMoves(row, col) {
    const moves = [];
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];

    directions.forEach(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (newRow >= 0 && newRow < BOARD_SIZE &&
            newCol >= 0 && newCol < BOARD_SIZE) {
            const targetPiece = gameState.board[newRow][newCol];
            if (targetPiece !== CPU) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    });

    return moves;
}

function getMinDistanceToPlayer(cpuRow, cpuCol) {
    let minDistance = Infinity;

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.board[row][col] === PLAYER) {
                const distance = Math.abs(row - cpuRow) + Math.abs(col - cpuCol);
                minDistance = Math.min(minDistance, distance);
            }
        }
    }

    return minDistance;
}

function checkGameOver() {
    if (gameState.playerPieces === 0) {
        showGameOver('CPU Won');
        gameState.isGameOver = true;
        return true;
    }

    if (gameState.cpuPieces === 0) {
        showGameOver('You Win!');
        gameState.isGameOver = true;
        return true;
    }

    if (gameState.turnsWithoutCapture >= 20) {
        showGameOver('Draw! No clear winner.');
        gameState.isGameOver = true;
        return true;
    }

    if (checkBoardRepetition()) {
        showGameOver('Draw! No clear winner.');
        gameState.isGameOver = true;
        return true;
    }

    return false;
}

function showGameOver(message) {
    const modal = document.getElementById('gameModal');
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.textContent = message;
    modal.classList.add('active');
}

function updateUI() {
    document.getElementById('playerCount').textContent = gameState.playerPieces;
    document.getElementById('cpuCount').textContent = gameState.cpuPieces;

    const turnIndicator = document.getElementById('turnIndicator');
    if (gameState.currentTurn === PLAYER) {
        turnIndicator.textContent = 'Your Turn';
    } else {
        turnIndicator.textContent = 'CPU Thinking...';
    }
}

function saveBoardState() {
    const boardString = JSON.stringify(gameState.board);
    gameState.boardHistory.push(boardString);
}

function checkBoardRepetition() {
    const currentBoard = JSON.stringify(gameState.board);
    let count = 0;

    for (const board of gameState.boardHistory) {
        if (board === currentBoard) {
            count++;
        }
    }

    return count >= 3;
}

document.getElementById('restartBtn').addEventListener('click', () => {
    const modal = document.getElementById('gameModal');
    modal.classList.remove('active');
    initGame();
});

initGame();
