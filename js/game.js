const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

const gameState = {
    isRunning: false,
    score: 0,
    health: 3,
    enemiesKilled: 0,
    difficulty: 1,
    lastScoreTime: 0,
    powerup: null,
    powerupEndTime: 0
};

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    speed: 5,
    color: '#60a5fa',
    dx: 0,
    dy: 0
};

const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
    space: false
};

let projectiles = [];
let enemies = [];
let powerups = [];
let particles = [];

let lastShootTime = 0;
const shootCooldown = 250;
let enemySpawnRate = 2000;
let lastEnemySpawn = 0;

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile) {
    document.getElementById('mobileControls').classList.add('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() in keys) {
        keys[e.key.toLowerCase()] = true;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keys[e.key] = true;
        e.preventDefault();
    }
    if (e.key === ' ') {
        keys.space = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() in keys) {
        keys[e.key.toLowerCase()] = false;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keys[e.key] = false;
    }
    if (e.key === ' ') {
        keys.space = false;
    }
});

canvas.addEventListener('click', (e) => {
    if (!gameState.isRunning) return;
    const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
    shoot(angle);
});

let joystickActive = false;
let joystickAngle = 0;
let joystickDistance = 0;

const joystickBase = document.querySelector('.joystick-base');
const joystickStick = document.getElementById('joystickStick');

joystickBase.addEventListener('touchstart', handleJoystickStart);
joystickBase.addEventListener('touchmove', handleJoystickMove);
joystickBase.addEventListener('touchend', handleJoystickEnd);

function handleJoystickStart(e) {
    e.preventDefault();
    joystickActive = true;
}

function handleJoystickMove(e) {
    if (!joystickActive) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;

    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 35);
    joystickDistance = distance / 35;
    joystickAngle = Math.atan2(dy, dx);

    const stickX = Math.cos(joystickAngle) * distance;
    const stickY = Math.sin(joystickAngle) * distance;

    joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
}

function handleJoystickEnd(e) {
    e.preventDefault();
    joystickActive = false;
    joystickDistance = 0;
    joystickStick.style.transform = 'translate(-50%, -50%)';
}

const shootButton = document.getElementById('shootButton');
let shootButtonPressed = false;

shootButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    shootButtonPressed = true;
});

shootButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    shootButtonPressed = false;
});

function updatePlayer() {
    player.dx = 0;
    player.dy = 0;

    if (joystickActive) {
        player.dx = Math.cos(joystickAngle) * joystickDistance * player.speed;
        player.dy = Math.sin(joystickAngle) * joystickDistance * player.speed;
    } else {
        if (keys.w || keys.ArrowUp) player.dy = -player.speed;
        if (keys.s || keys.ArrowDown) player.dy = player.speed;
        if (keys.a || keys.ArrowLeft) player.dx = -player.speed;
        if (keys.d || keys.ArrowRight) player.dx = player.speed;
    }

    if (player.dx !== 0 && player.dy !== 0) {
        player.dx *= 0.707;
        player.dy *= 0.707;
    }

    player.x += player.dx;
    player.y += player.dy;

    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
}

function shoot(angle) {
    const now = Date.now();
    const cooldown = gameState.powerup === 'rapid' ? 100 : shootCooldown;

    if (now - lastShootTime < cooldown) return;

    lastShootTime = now;

    projectiles.push({
        x: player.x,
        y: player.y,
        radius: 5,
        speed: 10,
        angle: angle,
        color: '#60a5fa'
    });
}

function autoShoot() {
    if (keys.space || shootButtonPressed) {
        if (enemies.length > 0) {
            const nearestEnemy = enemies.reduce((nearest, enemy) => {
                const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                const nearestDist = Math.hypot(nearest.x - player.x, nearest.y - player.y);
                return dist < nearestDist ? enemy : nearest;
            });

            const angle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
            shoot(angle);
        } else {
            shoot(0);
        }
    }
}

function spawnEnemy() {
    const now = Date.now();

    const adjustedSpawnRate = enemySpawnRate / gameState.difficulty;

    if (now - lastEnemySpawn < adjustedSpawnRate) return;

    lastEnemySpawn = now;

    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch (side) {
        case 0:
            x = Math.random() * canvas.width;
            y = -20;
            break;
        case 1:
            x = canvas.width + 20;
            y = Math.random() * canvas.height;
            break;
        case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + 20;
            break;
        case 3:
            x = -20;
            y = Math.random() * canvas.height;
            break;
    }

    const baseSpeed = 1.5;
    const speed = baseSpeed + (gameState.difficulty - 1) * 0.3;

    enemies.push({
        x: x,
        y: y,
        radius: 12,
        speed: speed,
        color: '#ef4444',
        health: 1
    });
}

function spawnPowerup() {
    if (Math.random() < 0.005) {
        const types = ['shield', 'rapid', 'slow'];
        const type = types[Math.floor(Math.random() * types.length)];

        powerups.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: Math.random() * (canvas.height - 60) + 30,
            radius: 15,
            type: type,
            rotation: 0
        });
    }
}

function updateEnemies() {
    const speedMultiplier = gameState.powerup === 'slow' ? 0.3 : 1;

    enemies.forEach((enemy, index) => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * speedMultiplier;
        enemy.y += Math.sin(angle) * enemy.speed * speedMultiplier;

        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < player.radius + enemy.radius) {
            if (gameState.powerup === 'shield') {
                gameState.powerup = null;
                updatePowerupDisplay();
                enemies.splice(index, 1);
                createExplosion(enemy.x, enemy.y, '#60a5fa');
            } else {
                gameState.health--;
                updateHUD();
                enemies.splice(index, 1);
                createExplosion(player.x, player.y, '#ef4444');

                if (gameState.health <= 0) {
                    endGame();
                }
            }
        }
    });
}

function updateProjectiles() {
    projectiles.forEach((projectile, pIndex) => {
        projectile.x += Math.cos(projectile.angle) * projectile.speed;
        projectile.y += Math.sin(projectile.angle) * projectile.speed;

        if (projectile.x < 0 || projectile.x > canvas.width ||
            projectile.y < 0 || projectile.y > canvas.height) {
            projectiles.splice(pIndex, 1);
            return;
        }

        enemies.forEach((enemy, eIndex) => {
            const dist = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
            if (dist < enemy.radius + projectile.radius) {
                enemy.health--;
                if (enemy.health <= 0) {
                    gameState.score += 5;
                    gameState.enemiesKilled++;
                    updateHUD();
                    enemies.splice(eIndex, 1);
                    createExplosion(enemy.x, enemy.y, '#ef4444');
                }
                projectiles.splice(pIndex, 1);
            }
        });
    });
}

function updatePowerups() {
    powerups.forEach((powerup, index) => {
        powerup.rotation += 0.05;

        const dist = Math.hypot(player.x - powerup.x, player.y - powerup.y);
        if (dist < player.radius + powerup.radius) {
            activatePowerup(powerup.type);
            powerups.splice(index, 1);
            createExplosion(powerup.x, powerup.y, '#a78bfa');
        }
    });
}

function activatePowerup(type) {
    gameState.powerup = type;

    const duration = type === 'rapid' ? 10000 : type === 'slow' ? 6000 : 0;

    if (duration > 0) {
        gameState.powerupEndTime = Date.now() + duration;
    }

    updatePowerupDisplay();
}

function updatePowerupDisplay() {
    const display = document.getElementById('powerupDisplay');

    if (gameState.powerup) {
        const names = {
            shield: '🛡️ Shield',
            rapid: '⚡ Rapid Fire',
            slow: '🕐 Slow Time'
        };
        display.textContent = names[gameState.powerup];
        display.classList.add('active');

        if (gameState.powerup !== 'shield') {
            const remaining = Math.max(0, gameState.powerupEndTime - Date.now());
            if (remaining <= 0) {
                gameState.powerup = null;
                display.classList.remove('active');
            }
        }
    } else {
        display.classList.remove('active');
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        const speed = Math.random() * 3 + 1;
        particles.push({
            x: x,
            y: y,
            radius: Math.random() * 3 + 1,
            color: color,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1
        });
    }
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;

        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

function drawPlayer() {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    if (gameState.powerup === 'shield') {
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#a78bfa';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawProjectiles() {
    projectiles.forEach(projectile => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = projectile.color;
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = enemy.color;
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawPowerups() {
    powerups.forEach(powerup => {
        ctx.save();
        ctx.translate(powerup.x, powerup.y);
        ctx.rotate(powerup.rotation);

        const colors = {
            shield: '#a78bfa',
            rapid: '#fbbf24',
            slow: '#34d399'
        };

        ctx.shadowBlur = 20;
        ctx.shadowColor = colors[powerup.type];
        ctx.strokeStyle = colors[powerup.type];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = colors[powerup.type];
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { shield: '🛡️', rapid: '⚡', slow: '🕐' };
        ctx.fillText(icons[powerup.type], 0, 0);

        ctx.restore();
    });
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function updateHUD() {
    document.getElementById('health').textContent = gameState.health;
    document.getElementById('score').textContent = gameState.score;
}

function updateDifficulty() {
    const now = Date.now();

    if (now - gameState.lastScoreTime >= 1000) {
        gameState.score++;
        gameState.lastScoreTime = now;
        updateHUD();
    }

    gameState.difficulty = 1 + Math.floor(gameState.score / 50);
}

function gameLoop() {
    if (!gameState.isRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updatePlayer();
    autoShoot();
    spawnEnemy();
    spawnPowerup();
    updateEnemies();
    updateProjectiles();
    updatePowerups();
    updateParticles();
    updateDifficulty();
    updatePowerupDisplay();

    drawParticles();
    drawPowerups();
    drawEnemies();
    drawProjectiles();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameState.isRunning = true;
    gameState.score = 0;
    gameState.health = 3;
    gameState.enemiesKilled = 0;
    gameState.difficulty = 1;
    gameState.lastScoreTime = Date.now();
    gameState.powerup = null;

    player.x = canvas.width / 2;
    player.y = canvas.height / 2;

    projectiles = [];
    enemies = [];
    powerups = [];
    particles = [];

    lastShootTime = 0;
    lastEnemySpawn = 0;

    updateHUD();

    document.getElementById('startModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');

    gameLoop();
}

function endGame() {
    gameState.isRunning = false;

    const highScore = localStorage.getItem('neonShooterHighScore') || 0;
    if (gameState.score > highScore) {
        localStorage.setItem('neonShooterHighScore', gameState.score);
    }

    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('highScore').textContent = Math.max(gameState.score, highScore);
    document.getElementById('enemiesKilled').textContent = gameState.enemiesKilled;
    document.getElementById('gameOverModal').classList.add('active');
}

document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('restartButton').addEventListener('click', startGame);
