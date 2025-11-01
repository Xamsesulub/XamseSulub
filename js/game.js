let game = new Chess();
let board = null;
let pendingPromotion = null;

let whiteTime = 300;
let blackTime = 300;
let timerInterval = null;
let currentTimer = 'white';

let aiWorker = null;
let currentDepth = 3;
let isAiThinking = false;

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

function initGame() {
    game = new Chess();
    board = Chessboard('gameBoard', config);
    whiteTime = 300;
    blackTime = 300;
    currentTimer = 'white';
    currentDepth = 3;
    isAiThinking = false;

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    if (aiWorker) {
        aiWorker.terminate();
    }

    aiWorker = new Worker('/js/ai-worker.js');

    aiWorker.onmessage = function(e) {
        const { move, elapsedTime } = e.data;
        handleAiMove(move, elapsedTime);
    };

    aiWorker.onerror = function(error) {
        console.error('AI Worker error:', error);
        isAiThinking = false;
        updateTurnIndicator('Your Turn');
    };

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
    if (game.game_over() || isAiThinking) return;

    isAiThinking = true;
    updateTurnIndicator('CPU Thinking...');

    console.log('AI evaluating moves at depth', currentDepth);

    aiWorker.postMessage({
        fen: game.fen(),
        depth: currentDepth
    });
}

function handleAiMove(move, elapsedTime) {
    isAiThinking = false;

    console.log('AI move received:', move ? move.san : 'none', 'Time:', elapsedTime + 'ms');

    if (elapsedTime > 300 && currentDepth > 2) {
        currentDepth--;
        console.log('Decreasing depth to', currentDepth);
    } else if (elapsedTime < 100 && currentDepth < 4) {
        currentDepth++;
        console.log('Increasing depth to', currentDepth);
    }

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
    } else {
        console.error('No valid AI move returned');
        updateTurnIndicator('Your Turn');
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
