/*
    Neon Survival Shooter - Game Logic
    Pure JavaScript, no dependencies
    Features: player movement, shooting, enemy AI with shooting, power-ups, mobile controls
*/

(function() {
    'use strict';

    const canvas = document.getElementById('ns-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const game = {
        running: false,
        score: 0,
        health: 3,
        kills: 0,
        difficulty: 1,
        lastScoreTime: 0,
        activePowerup: null,
        powerupEndTime: 0
    };

    const player = {
        x: 0,
        y: 0,
        radius: 12,
        speed: 4,
        vx: 0,
        vy: 0
    };

    const input = {
        up: false,
        down: false,
        left: false,
        right: false,
        shoot: false,
        mouseX: 0,
        mouseY: 0
    };

    let projectiles = [];
    let enemies = [];
    let enemyProjectiles = [];
    let powerups = [];
    let particles = [];

    let lastShot = 0;
    const shotCooldown = 250;
    let lastEnemySpawn = 0;
    let enemySpawnRate = 2000;

    function init() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        player.x = canvas.width / 2;
        player.y = canvas.height / 2;

        setupEventListeners();
        setupMobileControls();
    }

    function setupEventListeners() {
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
                input.up = true;
                e.preventDefault();
            }
            if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                input.down = true;
                e.preventDefault();
            }
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                input.left = true;
                e.preventDefault();
            }
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                input.right = true;
                e.preventDefault();
            }
            if (e.key === ' ') {
                input.shoot = true;
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') input.up = false;
            if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') input.down = false;
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') input.left = false;
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') input.right = false;
            if (e.key === ' ') input.shoot = false;
        });

        canvas.addEventListener('click', (e) => {
            if (!game.running) return;
            const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
            shootProjectile(angle);
        });

        canvas.addEventListener('mousemove', (e) => {
            input.mouseX = e.clientX;
            input.mouseY = e.clientY;
        });

        document.getElementById('ns-start-btn').addEventListener('click', startGame);
        document.getElementById('ns-restart-btn').addEventListener('click', startGame);
    }

    let joystickActive = false;
    let joystickAngle = 0;
    let joystickPower = 0;

    function setupMobileControls() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
            document.getElementById('ns-mobile-controls').style.display = 'flex';
        }

        const joystickBase = document.querySelector('.ns-joystick-base');
        const joystickStick = document.getElementById('ns-joystick-stick');
        const shootBtn = document.getElementById('ns-shoot-btn');

        if (joystickBase) {
            joystickBase.addEventListener('touchstart', (e) => {
                e.preventDefault();
                joystickActive = true;
            });

            joystickBase.addEventListener('touchmove', (e) => {
                if (!joystickActive) return;
                e.preventDefault();

                const touch = e.touches[0];
                const rect = joystickBase.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const dx = touch.clientX - centerX;
                const dy = touch.clientY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 35;

                joystickAngle = Math.atan2(dy, dx);
                joystickPower = Math.min(distance / maxDistance, 1);

                const clampedDist = Math.min(distance, maxDistance);
                const stickX = (dx / distance) * clampedDist;
                const stickY = (dy / distance) * clampedDist;

                joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
            });

            joystickBase.addEventListener('touchend', (e) => {
                e.preventDefault();
                joystickActive = false;
                joystickPower = 0;
                joystickStick.style.transform = 'translate(-50%, -50%)';
            });
        }

        if (shootBtn) {
            shootBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                input.shoot = true;
            });

            shootBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                input.shoot = false;
            });
        }
    }

    function startGame() {
        game.running = true;
        game.score = 0;
        game.health = 3;
        game.kills = 0;
        game.difficulty = 1;
        game.lastScoreTime = Date.now();
        game.activePowerup = null;
        game.powerupEndTime = 0;

        player.x = canvas.width / 2;
        player.y = canvas.height / 2;

        projectiles = [];
        enemies = [];
        enemyProjectiles = [];
        powerups = [];
        particles = [];

        lastShot = 0;
        lastEnemySpawn = 0;

        updateHUD();
        updatePowerupDisplay();

        document.getElementById('ns-start-modal').style.display = 'none';
        document.getElementById('ns-gameover-modal').style.display = 'none';

        gameLoop();
    }

    function gameLoop() {
        if (!game.running) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        updatePlayer();
        handleShooting();
        spawnEnemies();
        spawnPowerups();
        updateProjectiles();
        updateEnemies();
        updateEnemyProjectiles();
        updatePowerups();
        updateParticles();
        updateScore();
        checkPowerupExpiration();

        drawParticles();
        drawPowerups();
        drawEnemies();
        drawEnemyProjectiles();
        drawProjectiles();
        drawPlayer();

        requestAnimationFrame(gameLoop);
    }

    function updatePlayer() {
        player.vx = 0;
        player.vy = 0;

        if (joystickActive) {
            player.vx = Math.cos(joystickAngle) * joystickPower * player.speed;
            player.vy = Math.sin(joystickAngle) * joystickPower * player.speed;
        } else {
            if (input.up) player.vy -= player.speed;
            if (input.down) player.vy += player.speed;
            if (input.left) player.vx -= player.speed;
            if (input.right) player.vx += player.speed;
        }

        if (player.vx !== 0 && player.vy !== 0) {
            player.vx *= 0.707;
            player.vy *= 0.707;
        }

        player.x += player.vx;
        player.y += player.vy;

        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    }

    function handleShooting() {
        if (!input.shoot) return;

        const now = Date.now();
        const cooldown = game.activePowerup === 'rapid' ? 100 : shotCooldown;

        if (now - lastShot < cooldown) return;

        lastShot = now;

        let angle = 0;
        if (enemies.length > 0) {
            const nearest = enemies.reduce((closest, enemy) => {
                const distCurrent = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                const distClosest = Math.hypot(closest.x - player.x, closest.y - player.y);
                return distCurrent < distClosest ? enemy : closest;
            });
            angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        } else {
            angle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
        }

        shootProjectile(angle);
    }

    function shootProjectile(angle) {
        projectiles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            radius: 4
        });
    }

    function spawnEnemies() {
        const now = Date.now();
        const rate = enemySpawnRate / game.difficulty;

        if (now - lastEnemySpawn < rate) return;

        lastEnemySpawn = now;

        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch (side) {
            case 0: x = Math.random() * canvas.width; y = -30; break;
            case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
            case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
            case 3: x = -30; y = Math.random() * canvas.height; break;
        }

        const speed = 1.2 + game.difficulty * 0.2;
        const canShoot = Math.random() < 0.3;

        enemies.push({
            x: x,
            y: y,
            radius: 10,
            speed: speed,
            health: 1,
            canShoot: canShoot,
            lastShot: 0,
            shotCooldown: 3000
        });
    }

    function spawnPowerups() {
        if (Math.random() < 0.003) {
            const types = ['shield', 'rapid', 'slow'];
            const type = types[Math.floor(Math.random() * types.length)];

            powerups.push({
                x: Math.random() * (canvas.width - 100) + 50,
                y: Math.random() * (canvas.height - 100) + 50,
                radius: 15,
                type: type,
                angle: 0
            });
        }
    }

    function updateProjectiles() {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.x += proj.vx;
            proj.y += proj.vy;

            if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
                projectiles.splice(i, 1);
                continue;
            }

            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);

                if (dist < enemy.radius + proj.radius) {
                    enemy.health--;
                    if (enemy.health <= 0) {
                        game.score += 5;
                        game.kills++;
                        updateHUD();
                        createExplosion(enemy.x, enemy.y, '#ef4444');
                        enemies.splice(j, 1);
                    }
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    function updateEnemies() {
        const slowFactor = game.activePowerup === 'slow' ? 0.4 : 1;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

            enemy.x += Math.cos(angle) * enemy.speed * slowFactor;
            enemy.y += Math.sin(angle) * enemy.speed * slowFactor;

            const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

            if (dist < player.radius + enemy.radius) {
                if (game.activePowerup === 'shield') {
                    game.activePowerup = null;
                    updatePowerupDisplay();
                    createExplosion(enemy.x, enemy.y, '#60a5fa');
                    enemies.splice(i, 1);
                } else {
                    game.health--;
                    updateHUD();
                    createExplosion(player.x, player.y, '#ef4444');
                    enemies.splice(i, 1);

                    if (game.health <= 0) {
                        endGame();
                    }
                }
                continue;
            }

            if (enemy.canShoot && dist < 300 && dist > 80) {
                const now = Date.now();
                if (now - enemy.lastShot > enemy.shotCooldown) {
                    enemy.lastShot = now;
                    enemyShoot(enemy);
                }
            }
        }
    }

    function enemyShoot(enemy) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

        enemyProjectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            radius: 5
        });
    }

    function updateEnemyProjectiles() {
        for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = enemyProjectiles[i];
            proj.x += proj.vx;
            proj.y += proj.vy;

            if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
                enemyProjectiles.splice(i, 1);
                continue;
            }

            const dist = Math.hypot(player.x - proj.x, player.y - proj.y);

            if (dist < player.radius + proj.radius) {
                if (game.activePowerup === 'shield') {
                    game.activePowerup = null;
                    updatePowerupDisplay();
                } else {
                    game.health--;
                    updateHUD();

                    if (game.health <= 0) {
                        endGame();
                    }
                }

                createExplosion(proj.x, proj.y, '#fbbf24');
                enemyProjectiles.splice(i, 1);
            }
        }
    }

    function updatePowerups() {
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            powerup.angle += 0.03;

            const dist = Math.hypot(player.x - powerup.x, player.y - powerup.y);

            if (dist < player.radius + powerup.radius) {
                activatePowerup(powerup.type);
                createExplosion(powerup.x, powerup.y, '#a78bfa');
                powerups.splice(i, 1);
            }
        }
    }

    function activatePowerup(type) {
        game.activePowerup = type;

        if (type === 'rapid') {
            game.powerupEndTime = Date.now() + 10000;
        } else if (type === 'slow') {
            game.powerupEndTime = Date.now() + 6000;
        }

        updatePowerupDisplay();
    }

    function checkPowerupExpiration() {
        if (game.activePowerup && game.activePowerup !== 'shield') {
            if (Date.now() >= game.powerupEndTime) {
                game.activePowerup = null;
                updatePowerupDisplay();
            }
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.015;

            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const speed = Math.random() * 2 + 1;

            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 1,
                color: color,
                life: 1
            });
        }
    }

    function updateScore() {
        const now = Date.now();
        if (now - game.lastScoreTime >= 1000) {
            game.score++;
            game.lastScoreTime = now;
            updateHUD();
        }

        game.difficulty = 1 + Math.floor(game.score / 40);
    }

    function updateHUD() {
        document.getElementById('ns-health').textContent = game.health;
        document.getElementById('ns-score').textContent = game.score;
    }

    function updatePowerupDisplay() {
        const display = document.getElementById('ns-powerup');

        if (game.activePowerup) {
            const names = {
                shield: 'Shield Active',
                rapid: 'Rapid Fire',
                slow: 'Slow Time'
            };
            display.textContent = names[game.activePowerup];
            display.style.display = 'block';
        } else {
            display.style.display = 'none';
        }
    }

    function drawPlayer() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#60a5fa';
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();

        if (game.activePowerup === 'shield') {
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#a78bfa';
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawProjectiles() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#60a5fa';
        ctx.fillStyle = '#60a5fa';

        projectiles.forEach(proj => {
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    function drawEnemies() {
        ctx.save();

        enemies.forEach(enemy => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = enemy.canShoot ? '#fbbf24' : '#ef4444';
            ctx.fillStyle = enemy.canShoot ? '#fbbf24' : '#ef4444';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    function drawEnemyProjectiles() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = '#fbbf24';

        enemyProjectiles.forEach(proj => {
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    function drawPowerups() {
        ctx.save();

        powerups.forEach(powerup => {
            const colors = {
                shield: '#a78bfa',
                rapid: '#fbbf24',
                slow: '#34d399'
            };

            ctx.save();
            ctx.translate(powerup.x, powerup.y);
            ctx.rotate(powerup.angle);

            ctx.shadowBlur = 15;
            ctx.shadowColor = colors[powerup.type];
            ctx.strokeStyle = colors[powerup.type];
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        });

        ctx.restore();
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function endGame() {
        game.running = false;

        const highScore = parseInt(localStorage.getItem('neonShooterHighScore') || '0');

        if (game.score > highScore) {
            localStorage.setItem('neonShooterHighScore', game.score.toString());
        }

        document.getElementById('ns-final-score').textContent = game.score;
        document.getElementById('ns-high-score').textContent = Math.max(game.score, highScore);
        document.getElementById('ns-enemies-killed').textContent = game.kills;
        document.getElementById('ns-gameover-modal').style.display = 'flex';
    }

    init();
})();
