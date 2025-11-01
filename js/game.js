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
    'p': 100,
    'n': 320,
    'b': 330,
    'r': 500,
    'q': 900,
    'k': 20000
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
        const move = getBestMove(3);
        if (move) {
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

function getBestMove(depth) {
    const possibleMoves = game.moves({ verbose: true });
    if (possibleMoves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    possibleMoves.forEach(move => {
        game.move(move);
        const score = -minimax(depth - 1, -Infinity, Infinity, false);
        game.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });

    return bestMove;
}

function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
        return evaluatePosition();
    }

    const moves = game.moves({ verbose: true });

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            game.move(move);
            const evaluation = minimax(depth - 1, alpha, beta, false);
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
            const evaluation = minimax(depth - 1, alpha, beta, true);
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
        return game.turn() === 'b' ? 100000 : -100000;
    }

    if (game.in_stalemate() || game.in_draw() ||
        game.in_threefold_repetition() || game.insufficient_material()) {
        return 0;
    }

    let score = 0;
    const boardArray = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardArray[i][j];
            if (piece) {
                const pieceValue = pieceValues[piece.type];
                const positionValue = getPiecePositionValue(piece.type, i, j, piece.color);
                const totalValue = pieceValue + positionValue;

                if (piece.color === 'b') {
                    score += totalValue;
                } else {
                    score -= totalValue;
                }
            }
        }
    }

    if (game.in_check()) {
        score += game.turn() === 'b' ? -50 : 50;
    }

    const mobility = game.moves().length;
    score += game.turn() === 'b' ? mobility * 3 : -mobility * 3;

    score += evaluatePieceSafety();

    return score;
}

function getPiecePositionValue(pieceType, row, col, color) {
    const index = color === 'w' ? (7 - row) * 8 + col : row * 8 + col;

    switch (pieceType) {
        case 'p':
            return pawnTable[index];
        case 'n':
            return knightTable[index];
        case 'b':
            return bishopTable[index];
        case 'k':
            return kingMiddleTable[index];
        default:
            return 0;
    }
}

function evaluatePieceSafety() {
    let safetyScore = 0;
    const boardArray = game.board();
    const turn = game.turn();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardArray[i][j];
            if (piece) {
                const square = String.fromCharCode(97 + j) + (8 - i);
                const isAttacked = isSquareAttacked(square, piece.color === 'w' ? 'b' : 'w');
                const isDefended = isSquareAttacked(square, piece.color);

                if (isAttacked && !isDefended) {
                    const penalty = pieceValues[piece.type] * 0.5;
                    safetyScore += piece.color === 'b' ? -penalty : penalty;
                } else if (isAttacked && isDefended) {
                    const penalty = pieceValues[piece.type] * 0.1;
                    safetyScore += piece.color === 'b' ? -penalty : penalty;
                }
            }
        }
    }

    return turn === 'b' ? safetyScore : -safetyScore;
}

function isSquareAttacked(square, byColor) {
    const originalTurn = game.turn();

    const fen = game.fen();
    const parts = fen.split(' ');
    parts[1] = byColor === 'w' ? 'w' : 'b';
    const modifiedFen = parts.join(' ');

    try {
        game.load(modifiedFen);
        const moves = game.moves({ verbose: true });
        const isAttacked = moves.some(m => m.to === square);
        game.load(fen);
        return isAttacked;
    } catch (e) {
        game.load(fen);
        return false;
    }
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
        scoreEl.textContent = `Score: +${Math.round(diff / 100)}`;
        scoreEl.style.color = '#60a5fa';
    } else if (diff < 0) {
        scoreEl.textContent = `Score: ${Math.round(diff / 100)}`;
        scoreEl.style.color = '#ef4444';
    } else {
        scoreEl.textContent = 'Score: 0';
        scoreEl.style.color = '#a78bfa';
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
