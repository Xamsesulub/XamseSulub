let board = null;
let game = new Chess();

const pieceValues = {
    'p': 100,
    'n': 320,
    'b': 330,
    'r': 500,
    'q': 900,
    'k': 20000
};

const positionBonuses = {
    'p': [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
    ],
    'n': [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    'b': [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    'r': [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [0,  0,  0,  5,  5,  0,  0,  0]
    ],
    'q': [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [-5,  0,  5,  5,  5,  5,  0, -5],
        [0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    'k': [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [20, 20,  0,  0,  0,  0, 20, 20],
        [20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

function evaluateBoard() {
    let score = 0;

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = String.fromCharCode(97 + j) + (8 - i);
            const piece = game.get(square);

            if (piece) {
                const pieceValue = pieceValues[piece.type];
                const positionValue = positionBonuses[piece.type][i][j];

                if (piece.color === 'b') {
                    score += pieceValue + positionValue;
                } else {
                    score -= pieceValue + positionValue;
                }
            }
        }
    }

    return score;
}

function getBestMove(depth = 3) {
    const moves = game.moves();
    let bestMove = null;
    let bestValue = -Infinity;

    moves.forEach(move => {
        game.move(move);
        const value = minimax(depth - 1, -Infinity, Infinity, false);
        game.undo();

        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
    });

    return bestMove;
}

function minimax(depth, alpha, beta, maximizingPlayer) {
    if (depth === 0 || game.game_over()) {
        return evaluateBoard();
    }

    const moves = game.moves();

    if (maximizingPlayer) {
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

function makeAIMove() {
    if (game.game_over()) {
        updateStatus();
        return;
    }

    setTimeout(() => {
        const bestMove = getBestMove();
        if (bestMove) {
            game.move(bestMove);
            board.position(game.fen());
            updateStatus();
        }
    }, 250);
}

function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if (game.turn() !== 'w') return false;
    if (piece.search(/^b/) !== -1) return false;
    return true;
}

function onDrop(source, target) {
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';

    updateStatus();

    if (!game.game_over()) {
        makeAIMove();
    }
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    const statusEl = document.getElementById('game-status');
    let status = '';

    if (game.in_checkmate()) {
        status = game.turn() === 'w' ? 'Checkmate! Black wins.' : 'Checkmate! You win!';
    } else if (game.in_draw()) {
        status = 'Draw!';
    } else if (game.in_stalemate()) {
        status = 'Stalemate!';
    } else if (game.in_threefold_repetition()) {
        status = 'Draw by repetition.';
    } else if (game.insufficient_material()) {
        status = 'Draw by insufficient material.';
    } else if (game.in_check()) {
        status = game.turn() === 'w' ? 'Check! Your move.' : 'Check! AI is thinking...';
    } else {
        status = game.turn() === 'w' ? 'Your move' : 'AI is thinking...';
    }

    statusEl.textContent = status;
}

function initGame() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };

    board = Chessboard('chessboard', config);
    game = new Chess();
    updateStatus();
}

document.getElementById('restart-btn').addEventListener('click', () => {
    game.reset();
    board.position('start');
    updateStatus();
});

$(document).ready(() => {
    initGame();
});
