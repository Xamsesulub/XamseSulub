let game = new Chess();
let board = null;
let pendingPromotion = null;

const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

function initGame() {
    game = new Chess();
    board = Chessboard('gameBoard', config);
    updateStatus();
    updatePieceCounts();
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

    updateStatus();
    updatePieceCounts();

    if (game.game_over()) {
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
        const move = getBestMove();
        if (move) {
            game.move(move);
            board.position(game.fen());
            updateStatus();
            updatePieceCounts();

            if (game.game_over()) {
                setTimeout(handleGameOver, 500);
            }
        }
    }, 300);
}

function getBestMove() {
    const possibleMoves = game.moves({ verbose: true });

    if (possibleMoves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    possibleMoves.forEach(move => {
        game.move(move);
        const score = evaluatePosition();
        game.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });

    return bestMove;
}

function evaluatePosition() {
    let score = 0;

    const pieceValues = {
        'p': 100,
        'n': 320,
        'b': 330,
        'r': 500,
        'q': 900,
        'k': 20000
    };

    const board = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const value = pieceValues[piece.type];
                const positionBonus = getPositionBonus(piece.type, i, j, piece.color);

                if (piece.color === 'b') {
                    score += value + positionBonus;
                } else {
                    score -= value + positionBonus;
                }
            }
        }
    }

    if (game.in_checkmate()) {
        return game.turn() === 'b' ? -100000 : 100000;
    }

    if (game.in_check()) {
        score += game.turn() === 'w' ? 50 : -50;
    }

    const mobility = game.moves().length;
    score += game.turn() === 'b' ? mobility * 10 : -mobility * 10;

    return score;
}

function getPositionBonus(pieceType, row, col, color) {
    const center = [3, 4];
    const centerDistance = Math.abs(row - center[0]) + Math.abs(col - center[1]);

    if (pieceType === 'p') {
        const advancement = color === 'b' ? row : 7 - row;
        return advancement * 10;
    }

    if (pieceType === 'n' || pieceType === 'b') {
        return (6 - centerDistance) * 5;
    }

    if (pieceType === 'k') {
        const isEndgame = game.history().length > 40;
        if (isEndgame) {
            return (6 - centerDistance) * 10;
        } else {
            return centerDistance * 5;
        }
    }

    return 0;
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

function updatePieceCounts() {
    const fen = game.fen();
    let whitePieces = 0;
    let blackPieces = 0;

    for (let char of fen.split(' ')[0]) {
        if (char >= 'A' && char <= 'Z') whitePieces++;
        if (char >= 'a' && char <= 'z') blackPieces++;
    }

    document.getElementById('playerCount').textContent = whitePieces;
    document.getElementById('cpuCount').textContent = blackPieces;
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
                updateStatus();
                updatePieceCounts();

                if (game.game_over()) {
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
