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

let game;

importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.12.1/chess.min.js');

self.onmessage = function(e) {
    const { fen, depth } = e.data;

    game = new Chess(fen);

    const startTime = Date.now();
    const bestMove = getBestMove(depth);
    const elapsedTime = Date.now() - startTime;

    self.postMessage({
        move: bestMove,
        elapsedTime: elapsedTime
    });
};

function getBestMove(depth) {
    const possibleMoves = game.moves({ verbose: true });
    if (possibleMoves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of possibleMoves) {
        game.move(move);
        const score = -alphaBeta(depth - 1, -Infinity, Infinity, false);
        game.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

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
    const allMoves = game.moves({ verbose: true });
    return allMoves.some(m => {
        const piece = game.get(m.from);
        return piece && piece.color === byColor &&
               (m.to === square || m.from === square);
    });
}

function isSquareAttacked(square, byColor) {
    const allMoves = game.moves({ verbose: true });
    return allMoves.some(m => {
        const piece = game.get(m.from);
        return piece && piece.color === byColor && m.to === square;
    });
}
