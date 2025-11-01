let game = new Chess();
let board = null;
let pendingPromotion = null;

let whiteTime = 300;
let blackTime = 300;
let timerInterval = null;
let currentTimer = 'white';

const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

const pieceValues = {
    'p': 1,
    'n': 3,
    'b': 3,
    'r': 5,
    'q': 9,
    'k': 0
};

const pawnTable = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
];

const knightTable = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
];

const bishopTable = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
];

const kingMiddleTable = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
];

function initGame() {
    game = new Chess();
    board = Chessboard('gameBoard', config);
    whiteTime = 300;
    blackTime = 300;
    currentTimer = 'white';

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    startTimer();
    updateStatus();
    updateMaterialScore();
    updateTimerDisplay();
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (game.game_over()) {
            clearInterval(timerInterval);
            return;
        }

        if (currentTimer === 'white') {
            whiteTime--;
            if (whiteTime <= 0) {
                whiteTime = 0;
                clearInterval(timerInterval);
                handleTimeout('white');
                return;
            }
        } else {
            blackTime--;
            if (blackTime <= 0) {
                blackTime = 0;
                clearInterval(timerInterval);
                handleTimeout('black');
                return;
            }
        }

        updateTimerDisplay();
    }, 1000);
}

function handleTimeout(color) {
    const winner = color === 'white' ? 'Black (CPU)' : 'White (You)';
    showGameOverModal('Time Out!', `${winner} wins by timeout!`);
}

function updateTimerDisplay() {
    const whiteTimerEl = document.getElementById('whiteTimer');
    const blackTimerEl = document.getElementById('blackTimer');

    whiteTimerEl.textContent = formatTime(whiteTime);
    blackTimerEl.textContent = formatTime(blackTime);

    whiteTimerEl.classList.remove('warning', 'critical');
    blackTimerEl.classList.remove('warning', 'critical');

    if (whiteTime <= 30) {
        whiteTimerEl.classList.add('critical');
    } else if (whiteTime <= 60) {
        whiteTimerEl.classList.add('warning');
    }

    if (blackTime <= 30) {
        blackTimerEl.classList.add('critical');
    } else if (blackTime <= 60) {
        blackTimerEl.classList.add('warning');
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;
    if (game.turn() === 'b') return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    pendingPromotion = null;

    const moves = game.moves({ verbose: true });
    const move = moves.find(m => m.from === source && m.to === target);

    if (move && move.flags.includes('p')) {
        pendingPromotion = { from: source, to: target };
        showPromotionModal();
        return 'snapback';
    }

    const moveAttempt = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (moveAttempt === null) return 'snapback';

    currentTimer = 'black';
    updateStatus();
    updateMaterialScore();

    if (game.game_over()) {
        clearInterval(timerInterval);
        setTimeout(handleGameOver, 500);
        return;
    }

    setTimeout(makeComputerMove, 500);
}

function onSnapEnd() {
    board.position(game.fen());
}

function makeComputerMove() {
    if (game.game_over()) return;

    updateTurnIndicator('CPU Thinking...');

    setTimeout(() => {
        console.log('AI evaluating moves...');
        const move = getBestMove();
        if (move) {
            console.log('AI selected move:', move.san);
            game.move(move);
            board.position(game.fen());
            currentTimer = 'white';
            updateStatus();
            updateMaterialScore();

            if (game.game_over()) {
                clearInterval(timerInterval);
                setTimeout(handleGameOver, 500);
            }
        }
    }, 300);
}

function getBestMove() {
    const possibleMoves = game.moves({ verbose: true });
    if (possibleMoves.length === 0) return null;

    console.log('AI evaluating moves...', possibleMoves.map(m => m.san));

    let bestMove = null;
    let bestScore = -Infinity;
    const depth = 3;

    for (const move of possibleMoves) {
        game.move(move);
        const score = -alphaBeta(depth - 1, -Infinity, Infinity, false);
        game.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    console.log('Best move selected:', bestMove.san, 'Score:', bestScore);
    return bestMove;
}

function alphaBeta(depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
        return evaluatePosition();
    }

    const moves = game.moves({ verbose: true });

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            game.move(move);
            const evaluation = alphaBeta(depth - 1, alpha, beta, false);
            game.undo();

            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            game.move(move);
            const evaluation = alphaBeta(depth - 1, alpha, beta, true);
            game.undo();

            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluatePosition() {
    if (game.in_checkmate()) {
        return game.turn() === 'b' ? -10000 : 10000;
    }

    if (game.in_stalemate() || game.in_draw()) {
        return 0;
    }

    let score = 0;

    score += getMaterialBalance() * 100;

    const boardArray = game.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardArray[i][j];
            if (piece) {
                const positionValue = getPiecePositionValue(piece.type, i, j, piece.color);
                if (piece.color === 'b') {
                    score += positionValue;
                } else {
                    score -= positionValue;
                }
            }
        }
    }

    if (game.in_check()) {
        score += game.turn() === 'b' ? -30 : 30;
    }

    const mobility = game.moves().length;
    score += game.turn() === 'b' ? mobility * 0.5 : -mobility * 0.5;

    score += evaluatePawnStructure();
    score += evaluateKingSafety();
    score += evaluatePieceSafety();

    return score;
}

function evaluatePawnStructure() {
    let score = 0;
    const boardArray = game.board();

    for (let col = 0; col < 8; col++) {
        let whitePawns = 0;
        let blackPawns = 0;

        for (let row = 0; row < 8; row++) {
            const piece = boardArray[row][col];
            if (piece && piece.type === 'p') {
                if (piece.color === 'w') whitePawns++;
                if (piece.color === 'b') blackPawns++;
            }
        }

        if (whitePawns > 1) score -= 5;
        if (blackPawns > 1) score += 5;

        if (whitePawns === 1) {
            let hasSupport = false;
            if (col > 0 || col < 7) hasSupport = true;
            if (!hasSupport) score -= 8;
        }

        if (blackPawns === 1) {
            let hasSupport = false;
            if (col > 0 || col < 7) hasSupport = true;
            if (!hasSupport) score += 8;
        }
    }

    return score;
}

function evaluateKingSafety() {
    let score = 0;
    const boardArray = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardArray[i][j];
            if (piece && piece.type === 'k') {
                const square = String.fromCharCode(97 + j) + (8 - i);

                const pawnShield = countPawnShield(i, j, piece.color);

                if (piece.color === 'w') {
                    score -= pawnShield * 5;
                    if (i > 5) score -= 10;
                } else {
                    score += pawnShield * 5;
                    if (i < 2) score += 10;
                }
            }
        }
    }

    return score;
}

function countPawnShield(kingRow, kingCol, color) {
    const boardArray = game.board();
    let shield = 0;

    const direction = color === 'w' ? -1 : 1;
    const shieldRow = kingRow + direction;

    if (shieldRow >= 0 && shieldRow < 8) {
        for (let col = kingCol - 1; col <= kingCol + 1; col++) {
            if (col >= 0 && col < 8) {
                const piece = boardArray[shieldRow][col];
                if (piece && piece.type === 'p' && piece.color === color) {
                    shield++;
                }
            }
        }
    }

    return shield;
}

function evaluatePieceSafety() {
    let score = 0;
    const boardArray = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardArray[i][j];
            if (piece && piece.type !== 'k') {
                const square = String.fromCharCode(97 + j) + (8 - i);
                const attackedByOpponent = isSquareAttacked(square, piece.color === 'w' ? 'b' : 'w');
                const defendedByAlly = isSquareDefended(square, piece.color);

                if (attackedByOpponent && !defendedByAlly) {
                    const penalty = pieceValues[piece.type] * 40;
                    score += piece.color === 'b' ? -penalty : penalty;
                } else if (attackedByOpponent && defendedByAlly) {
                    const penalty = pieceValues[piece.type] * 5;
                    score += piece.color === 'b' ? -penalty : penalty;
                }
            }
        }
    }

    return score;
}

function getMaterialBalance() {
    let whiteScore = 0;
    let blackScore = 0;
    const boardArray = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardArray[i][j];
            if (piece && piece.type !== 'k') {
                const value = pieceValues[piece.type];
                if (piece.color === 'w') {
                    whiteScore += value;
                } else {
                    blackScore += value;
                }
            }
        }
    }

    return blackScore - whiteScore;
}

function getPiecePositionValue(pieceType, row, col, color) {
    const index = color === 'w' ? (7 - row) * 8 + col : row * 8 + col;

    switch (pieceType) {
        case 'p':
            return pawnTable[index] * 0.3;
        case 'n':
            return knightTable[index] * 0.5;
        case 'b':
            return bishopTable[index] * 0.5;
        case 'k':
            return kingMiddleTable[index] * 0.3;
        default:
            return 0;
    }
}

function isSquareDefended(square, byColor) {
    const moves = game.moves({ verbose: true, square: square });
    return moves.some(m => {
        const piece = game.get(m.from);
        return piece && piece.color === byColor;
    });
}

function isSquareAttacked(square, byColor) {
    const allMoves = game.moves({ verbose: true });
    return allMoves.some(m => {
        const piece = game.get(m.from);
        return piece && piece.color === byColor && m.to === square;
    });
}

function updateStatus() {
    let status = '';
    let turnText = 'Your Turn';

    if (game.in_checkmate()) {
        status = 'Checkmate!';
        turnText = game.turn() === 'w' ? 'Black Wins!' : 'White Wins!';
    } else if (game.in_draw()) {
        status = 'Draw';
        turnText = getDrawReason();
    } else if (game.in_stalemate()) {
        status = 'Stalemate';
        turnText = 'Draw!';
    } else if (game.in_threefold_repetition()) {
        status = 'Draw by repetition';
    } else if (game.insufficient_material()) {
        status = 'Draw by insufficient material';
    } else {
        if (game.in_check()) {
            status = 'Check!';
        }
        turnText = game.turn() === 'w' ? 'Your Turn' : 'CPU Thinking...';
    }

    updateTurnIndicator(turnText);

    const statusEl = document.getElementById('gameStatus');
    statusEl.textContent = status;
}

function getDrawReason() {
    if (game.in_stalemate()) return 'Stalemate';
    if (game.in_threefold_repetition()) return 'Draw by repetition';
    if (game.insufficient_material()) return 'Insufficient material';
    return 'Draw';
}

function updateTurnIndicator(text) {
    const indicator = document.getElementById('turnIndicator');
    indicator.textContent = text;
}

function updateMaterialScore() {
    const fen = game.fen();
    let whiteScore = 0;
    let blackScore = 0;

    for (let char of fen.split(' ')[0]) {
        if (char >= 'A' && char <= 'Z') {
            const piece = char.toLowerCase();
            if (pieceValues[piece]) {
                whiteScore += pieceValues[piece];
            }
        }
        if (char >= 'a' && char <= 'z') {
            if (pieceValues[char]) {
                blackScore += pieceValues[char];
            }
        }
    }

    const diff = whiteScore - blackScore;
    const scoreEl = document.getElementById('materialScore');

    if (diff > 0) {
        scoreEl.textContent = `Score: +${diff}`;
        scoreEl.style.color = '#4ade80';
    } else if (diff < 0) {
        scoreEl.textContent = `Score: ${diff}`;
        scoreEl.style.color = '#f87171';
    } else {
        scoreEl.textContent = 'Score: 0';
        scoreEl.style.color = '#ccc';
    }
}

function handleGameOver() {
    let title = '';
    let message = '';

    if (game.in_checkmate()) {
        if (game.turn() === 'w') {
            title = 'Checkmate!';
            message = 'Black (CPU) wins the game!';
        } else {
            title = 'Victory!';
            message = 'You defeated the CPU!';
        }
    } else if (game.in_stalemate()) {
        title = 'Stalemate';
        message = 'The game is a draw.';
    } else if (game.in_threefold_repetition()) {
        title = 'Draw';
        message = 'Game drawn by threefold repetition.';
    } else if (game.insufficient_material()) {
        title = 'Draw';
        message = 'Game drawn by insufficient material.';
    } else if (game.in_draw()) {
        title = 'Draw';
        message = 'The game is a draw.';
    }

    showGameOverModal(title, message);
}

function showGameOverModal(title, message) {
    const modal = document.getElementById('gameModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.add('active');
}

function showPromotionModal() {
    const modal = document.getElementById('promotionModal');
    modal.classList.add('active');
}

function hidePromotionModal() {
    const modal = document.getElementById('promotionModal');
    modal.classList.remove('active');
}

document.querySelectorAll('.promotion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const piece = e.currentTarget.dataset.piece;

        if (pendingPromotion) {
            const move = game.move({
                from: pendingPromotion.from,
                to: pendingPromotion.to,
                promotion: piece
            });

            if (move) {
                board.position(game.fen());
                currentTimer = 'black';
                updateStatus();
                updateMaterialScore();

                if (game.game_over()) {
                    clearInterval(timerInterval);
                    setTimeout(handleGameOver, 500);
                } else {
                    setTimeout(makeComputerMove, 500);
                }
            }
        }

        pendingPromotion = null;
        hidePromotionModal();
    });
});

document.getElementById('restartBtn').addEventListener('click', () => {
    const modal = document.getElementById('gameModal');
    modal.classList.remove('active');
    initGame();
});

initGame();
