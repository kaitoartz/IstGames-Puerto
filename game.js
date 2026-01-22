const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Shortcuts from CONFIG
const C = CONFIG;
const TILE_SIZE = C.SETTINGS.TILE_SIZE;
const GAME_SPEED = C.SETTINGS.GAME_SPEED;

// ==========================================
// ASSET MANAGER (Images)
// ==========================================
const Assets = {
    images: {},
    loaded: 0,
    total: 0,
    init: function () {
        const sources = C.SPRITES;
        if (!sources) return;

        this.total = Object.keys(sources).filter(k => sources[k]).length;

        for (let key in sources) {
            const val = sources[key];
            if (val) {
                if (Array.isArray(val)) {
                    // Handle Arrays (e.g. WALLS)
                    val.forEach((src, index) => {
                        const img = new Image();
                        img.src = src;
                        this.images[`${key}_${index}`] = img;
                    });
                } else {
                    const img = new Image();
                    img.src = val;
                    img.onload = () => {
                        this.loaded++;
                        console.log(`Loaded sprite: ${key}`);
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load sprite: ${key}`);
                    };
                    this.images[key] = img;
                }
            }
        }
    },
    get: function (key) {
        return this.images[key];
    }
};

Assets.init();

// ==========================================
// AUDIO SYSTEM
// ==========================================
const AudioSys = {
    ctx: null,
    masterGain: null,
    isMuted: false,

    init: function () {
        if (!this.ctx) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            // Resume if needed
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(e => console.warn("Audio resume failed", e));
            }
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.warn("Audio resume failed", e));
        }
    },

    toggleMute: function () {
        if (!this.ctx) this.init();
        this.isMuted = !this.isMuted;

        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        }

        const btn = document.getElementById('mute-btn');
        if (btn) btn.innerText = this.isMuted ? '🔇' : '🔊';
    },

    playTone: function (freq, type, duration, vol = 0.1) {
        // Prevent stacking: If context is not running, do NOT schedule
        if (!this.ctx || this.ctx.state !== 'running' || this.isMuted) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            // Connect to Master instead of Destination
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.masterGain); // Use Master Gain

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn("Audio play error", e);
        }
    },
    playSequence: function (sequence) {
        if (!this.ctx || this.ctx.state !== 'running' || this.isMuted) return;

        sequence.forEach(note => {
            setTimeout(() => {
                // Re-check mute inside timeout in case it changed
                if (!this.isMuted && this.ctx.state === 'running') {
                    this.playTone(note.freq, note.type, note.duration, note.vol);
                }
            }, note.delay);
        });
    },
    playStep: function () {
        const s = C.AUDIO.STEP;
        this.playTone(s.freq, s.type, s.duration, s.vol);
    },
    playBumper: function () {
        const s = C.AUDIO.BUMP;
        this.playTone(s.freq, s.type, s.duration, s.vol);
    },
    playLose: function () {
        this.playSequence(C.AUDIO.LOSE);
    },
    playWin: function () {
        this.playSequence(C.AUDIO.WIN);
    }
};

// ==========================================
// EFFECTS SYSTEM
// ==========================================
function triggerShake() {
    const wrapper = document.querySelector('.canvas-wrapper');
    wrapper.classList.remove('shake-effect');
    void wrapper.offsetWidth;
    wrapper.classList.add('shake-effect');
}

let confettiParticles = [];
function triggerConfetti() {
    for (let i = 0; i < 100; i++) {
        confettiParticles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 1) * 10 - 2,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            life: 100
        });
    }
}

function updateConfetti() {
    if (confettiParticles.length === 0) return;

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        let p = confettiParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.life--;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 5, 5);

        if (p.life <= 0) confettiParticles.splice(i, 1);
    }
}

// ==========================================
// GAME STATE & LEVELS
// ==========================================
let mapLayout = [];
let wallTextureMap = []; // Stores the texture index for each wall
let enemies = [];
let currentLevelIndex = 0;
let gameActive = true;
let animationFrameId;
let lastTime = 0;
let player = { x: 1, y: 1, dir: 'right' };

// Timer
let gameStartTime = 0;
let timerInterval = null;
let finalTime = "00:00";

function startTimer() {
    if (!C.SETTINGS.ENABLE_TIMER) return;
    gameStartTime = Date.now();
    const timerEl = document.getElementById('game-timer');
    if (timerEl) timerEl.innerText = "00:00";

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!gameActive) return;
        const delta = Math.floor((Date.now() - gameStartTime) / 1000);
        const mins = Math.floor(delta / 60).toString().padStart(2, '0');
        const secs = (delta % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.innerText = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const timerEl = document.getElementById('game-timer');
    finalTime = timerEl ? timerEl.innerText : "00:00";
}

function initLevel(levelIndex) {
    if (!C.LEVELS || levelIndex >= C.LEVELS.length) {
        gameOver(true, "¡Has completado todos los niveles!");
        return;
    }

    currentLevelIndex = levelIndex;
    const levelData = C.LEVELS[levelIndex];

    mapLayout = JSON.parse(JSON.stringify(levelData.MAP));
    enemies = JSON.parse(JSON.stringify(levelData.ENEMIES));

    // Initialize random wall textures
    wallTextureMap = [];
    const wallOptionsCount = C.SPRITES.WALLS ? C.SPRITES.WALLS.length : 0;
    
    for (let r = 0; r < mapLayout.length; r++) {
        let row = [];
        for (let c = 0; c < mapLayout[r].length; c++) {
            if (mapLayout[r][c] === 1 && wallOptionsCount > 0) {
                row.push(Math.floor(Math.random() * wallOptionsCount));
            } else {
                row.push(0);
            }
        }
        wallTextureMap.push(row);
    }

    canvas.width = mapLayout[0].length * TILE_SIZE;
    canvas.height = mapLayout.length * TILE_SIZE;

    let startFound = false;
    for (let r = 0; r < mapLayout.length; r++) {
        for (let c = 0; c < mapLayout[r].length; c++) {
            if (mapLayout[r][c] === 2) {
                player.x = c;
                player.y = r;
                startFound = true;
                break;
            }
        }
        if (startFound) break;
    }

    gameActive = true;
    lastTime = performance.now();

    const overlayTitle = document.getElementById('overlay-title');
    if (overlayTitle) {
        overlayTitle.innerText = "Nivel: " + (levelData.NAME || (levelIndex + 1));
    }

    // Ensure overlay is hidden at start of level
    document.getElementById('game-overlay').classList.add('hidden');
    document.getElementById('game-overlay').classList.remove('visible');

    startTimer();
    render(); // Draw initial state
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < mapLayout.length; r++) {
        for (let c = 0; c < mapLayout[r].length; c++) {
            drawTile(ctx, mapLayout[r][c], c, r);
        }
    }

    enemies.forEach(enemy => drawEnemy(ctx, enemy));
    drawPlayer(ctx, player.x, player.y);

    updateConfetti();
    if (confettiParticles.length > 0) {
        requestAnimationFrame(render);
    }
}

// Drawing helpers
function drawPlayer(ctx, x, y) {
    const cx = x * TILE_SIZE;
    const cy = y * TILE_SIZE;
    const center_x = x * TILE_SIZE + TILE_SIZE / 2;
    const center_y = y * TILE_SIZE + TILE_SIZE / 2;
    
    // Determinar ángulo de rotación según dirección
    let rotation = 0;
    if (player.dir === 'right') rotation = 0;
    else if (player.dir === 'down') rotation = Math.PI / 2;
    else if (player.dir === 'left') rotation = Math.PI;
    else if (player.dir === 'up') rotation = -Math.PI / 2;
    
    const img = Assets.get('PLAYER');
    if (img && img.complete && img.naturalWidth !== 0) {
        ctx.save();
        ctx.translate(center_x, center_y);
        ctx.rotate(rotation);
        ctx.drawImage(img, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        ctx.restore();
        return;
    }
    
    // Fallback: círculo con indicador de dirección
    const r = TILE_SIZE / 3;
    ctx.fillStyle = C.PLAYER.COLOR_BODY;
    ctx.beginPath();
    ctx.arc(center_x, center_y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.PLAYER.COLOR_HELMET;
    ctx.beginPath();
    ctx.arc(center_x, center_y - 2, r, Math.PI, 0);
    ctx.fill();
    
    // Flecha de dirección
    ctx.save();
    ctx.translate(center_x, center_y);
    ctx.rotate(rotation);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, 0);
    ctx.lineTo(-r * 0.2, -r * 0.3);
    ctx.lineTo(-r * 0.2, r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawEnemy(ctx, enemy) {
    const x = enemy.x * TILE_SIZE;
    const y = enemy.y * TILE_SIZE;
    let imgKey = (enemy.type === 'forklift') ? 'FORKLIFT' : (enemy.type === 'truck' ? 'TRUCK' : null);
    const img = Assets.get(imgKey);

    if (img && img.complete && img.naturalWidth !== 0) {
        ctx.save();
        
        // Tamaño extendido para sprites (sobresalen del tile)
        let spriteWidth = TILE_SIZE;
        let spriteHeight = TILE_SIZE;
        let offsetX = 0;
        let offsetY = 0;
        
        if (enemy.type === 'truck') {
            // Camiones verticales son más largos
            if (enemy.dy !== 0) {
                spriteHeight = TILE_SIZE * 1.5;
                offsetY = -TILE_SIZE * 0.25; // Centrar verticalmente
            } else {
                // Camiones horizontales son más anchos
                spriteWidth = TILE_SIZE * 1.5;
                offsetX = -TILE_SIZE * 0.25; // Centrar horizontalmente
            }
        } else if (enemy.type === 'forklift') {
            // Montacargas un poco más grande
            spriteWidth = TILE_SIZE * 1.2;
            spriteHeight = TILE_SIZE * 1.2;
            offsetX = -TILE_SIZE * 0.1;
            offsetY = -TILE_SIZE * 0.1;
        }
        
        // Manejo de volteo horizontal y vertical
        let flipH = enemy.dx < 0;
        let flipV = enemy.dy < 0;
        
        if (flipH && flipV) {
            ctx.scale(-1, -1);
            ctx.drawImage(img, -x - spriteWidth - offsetX, -y - spriteHeight - offsetY, spriteWidth, spriteHeight);
        } else if (flipH) {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -x - spriteWidth - offsetX, y + offsetY, spriteWidth, spriteHeight);
        } else if (flipV) {
            ctx.scale(1, -1);
            ctx.drawImage(img, x + offsetX, -y - spriteHeight - offsetY, spriteWidth, spriteHeight);
        } else {
            ctx.drawImage(img, x + offsetX, y + offsetY, spriteWidth, spriteHeight);
        }
        ctx.restore();
        return;
    }
    if (enemy.type === 'forklift') {
        ctx.fillStyle = C.ENEMY_COLORS.FORKLIFT;
        ctx.fillRect(x + 5, y + 10, TILE_SIZE - 10, TILE_SIZE - 20);
        ctx.fillStyle = 'black';
        ctx.fillRect(x + 5, y + TILE_SIZE - 8, 8, 6);
        ctx.fillRect(x + TILE_SIZE - 13, y + TILE_SIZE - 8, 8, 6);
    } else {
        ctx.fillStyle = C.ENEMY_COLORS.TRUCK;
        ctx.fillRect(x + 2, y + 8, TILE_SIZE - 4, TILE_SIZE - 16);
        ctx.fillStyle = '#eee';
        ctx.fillRect(x + TILE_SIZE - 12, y + 10, 8, 12);
    }
}

function drawTile(ctx, type, c, r) {
    const x = c * TILE_SIZE;
    const y = r * TILE_SIZE;
    if (type === 1) {
        // Use the pre-assigned texture index for this tile
        const texIndex = wallTextureMap[r] ? wallTextureMap[r][c] : 0;
        const img = Assets.get(`WALLS_${texIndex}`);
        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
            ctx.fillStyle = C.COLORS.WALL;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        }
    } else {
        const floorImg = Assets.get('FLOOR');
        if (floorImg && floorImg.complete && floorImg.naturalWidth !== 0) {
            ctx.drawImage(floorImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
            ctx.fillStyle = C.COLORS.PATH;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
        if (type === 2) {
            ctx.fillStyle = C.COLORS.START_TEXT;
            ctx.font = '20px Arial';
            ctx.fillText('➝', x + 5, y + 28);
        }
        if (type === 3) {
            const goalImg = Assets.get('GOAL');
            if (goalImg && goalImg.complete && goalImg.naturalWidth !== 0) {
                ctx.drawImage(goalImg, x, y, TILE_SIZE, TILE_SIZE);
            } else {
                ctx.fillStyle = C.COLORS.END_ZONE;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.globalAlpha = 1.0;
            }
        }
        if (type === 4) {
            const stopImg = Assets.get('STOP_SIGN');
            if (stopImg && stopImg.complete && stopImg.naturalWidth !== 0) {
                ctx.drawImage(stopImg, x, y, TILE_SIZE, TILE_SIZE);
            } else {
                ctx.fillStyle = C.COLORS.HAZARD_SIGN;
                ctx.beginPath();
                const cx = x + TILE_SIZE / 2;
                const cy = y + TILE_SIZE / 2;
                const r_sign = TILE_SIZE / 2 - 4;
                for (let i = 0; i < 8; i++) {
                    const angle = (i * 45 + 22.5) * Math.PI / 180;
                    ctx.lineTo(cx + r_sign * Math.cos(angle), cy + r_sign * Math.sin(angle));
                }
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('PARE', cx, cy + 3);
            }
        }
        if (type === 5) {
            // INFO SIGN
            ctx.fillStyle = '#2196F3'; // Blue
            ctx.beginPath();
            const cx = x + TILE_SIZE / 2;
            const cy = y + TILE_SIZE / 2;
            ctx.arc(cx, cy, TILE_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('i', cx, cy + 5);
        }
        if (type === 6) {
            // WARNING SIGN (Yellow)
            ctx.fillStyle = C.COLORS.WARNING_SIGN || '#FFC107'; // Yellow
            ctx.beginPath();
            const cx = x + TILE_SIZE / 2;
            const cy = y + TILE_SIZE / 2 - 3;
            const size = TILE_SIZE / 3;
            // Draw triangle
            ctx.moveTo(cx, cy - size);
            ctx.lineTo(cx + size, cy + size);
            ctx.lineTo(cx - size, cy + size);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', cx, cy + size / 2);
        }
        if (type === 7) {
            // BOX (Caja como obstáculo)
            const boxImg = Assets.get('BOX');
            if (boxImg && boxImg.complete && boxImg.naturalWidth !== 0) {
                ctx.drawImage(boxImg, x, y, TILE_SIZE, TILE_SIZE);
            } else {
                // Fallback: dibujar cuadrado marrón
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

// ==========================================
// GAME LOGIC
// ==========================================
function updateEnemies(timestamp) {
    if (!gameActive) {
        animationFrameId = requestAnimationFrame(updateEnemies);
        return;
    }
    if (timestamp - lastTime > GAME_SPEED * 3) {
        enemies.forEach(enemy => {
            let nextX = enemy.x + enemy.dx;
            let nextY = enemy.y + enemy.dy;
            let bounce = false;
            // Bounds and wall check
            if (nextY >= mapLayout.length || nextY < 0 || nextX >= mapLayout[0].length || nextX < 0 || mapLayout[nextY][nextX] === 1) {
                bounce = true;
            } else {
                if (enemy.dx !== 0 && ((enemy.maxX && nextX > enemy.maxX) || (enemy.minX && nextX < enemy.minX))) bounce = true;
                if (enemy.dy !== 0 && ((enemy.maxY && nextY > enemy.maxY) || (enemy.minY && nextY < enemy.minY))) bounce = true;
            }
            if (bounce) {
                enemy.dx *= -1;
                enemy.dy *= -1;
            } else {
                enemy.x += enemy.dx;
                enemy.y += enemy.dy;
            }
        });
        checkCollisions();
        checkProximity(); // New Proximity Check
        lastTime = timestamp;
        render();
    }
    animationFrameId = requestAnimationFrame(updateEnemies);
}

// Proximity Warning System
function checkProximity() {
    if (!gameActive) return;
    let danger = false;
    enemies.forEach(enemy => {
        const dist = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);
        if (dist <= 2) { // Warning radius
            danger = true;
        }
    });

    const wrapper = document.querySelector('.canvas-wrapper');
    if (danger) {
        wrapper.classList.add('danger-glow');
        if (Math.random() > 0.9) AudioSys.playTone(400, 'sine', 0.1, 0.05); // Subtle beep
    } else {
        wrapper.classList.remove('danger-glow');
    }
}

function showToast(message) {
    let toast = document.getElementById('game-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'game-toast';
        toast.style.position = 'absolute';
        toast.style.top = '10%';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(0, 0, 0, 0.8)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '1000';
        toast.style.transition = 'opacity 0.5s';
        toast.style.pointerEvents = 'none';
        toast.style.textAlign = 'center';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.opacity = '1';
    
    // Auto hide after 3 seconds
    if (toast.timeout) clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => {
        toast.style.opacity = '0';
    }, 4000);
}

function tryMove(dx, dy) {
    if (!gameActive) return;
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (newX < 0 || newX >= mapLayout[0].length || newY < 0 || newY >= mapLayout.length) return;
    if (mapLayout[newY][newX] === 1 || mapLayout[newY][newX] === 7) {
        AudioSys.playBumper();
        return;
    }

    // Actualizar dirección del jugador
    if (dx > 0) player.dir = 'right';
    else if (dx < 0) player.dir = 'left';
    else if (dy > 0) player.dir = 'down';
    else if (dy < 0) player.dir = 'up';

    player.x = newX;
    player.y = newY;
    AudioSys.playStep();
    checkCollisions();
    render();
}

function checkCollisions() {
    // Stop Sign Warning (Type 4)
    if (mapLayout[player.y][player.x] === 4) {
        showToast(C.TEXTS.SIGN_STOP || "⚠️ PARE: Zona de precaución. Procede con cuidado.");
    }
    // Info Signs (Type 5)
    if (mapLayout[player.y][player.x] === 5) {
            showToast(C.TEXTS.SIGN_SAFE);
    }
    // Yellow Warning Sign (Type 6)
    if (mapLayout[player.y][player.x] === 6) {
        showToast(C.TEXTS.SIGN_WARNING || "⚠️ ADVERTENCIA: ¿Seguro que quieres pasar por aquí?");
    }
    // Enemies
    for (let enemy of enemies) {
        if (enemy.x === player.x && enemy.y === player.y) {
            gameOver(false, C.TEXTS.GAME_OVER_MSG_COLLISION);
            return;
        }
    }
    // Goal
    if (mapLayout[player.y][player.x] === 3) {
        if (currentLevelIndex < C.LEVELS.length - 1) {
            // Level Complete -> Show Manual Transition Overlay
            showLevelCompleteOverlay();
        } else {
            // Final Win
            gameOver(true, C.TEXTS.WIN_MSG);
        }
    }
}

function showLevelCompleteOverlay() {
    gameActive = false;
    stopTimer();
    AudioSys.playWin();
    triggerConfetti();
    render();

    const overlay = document.getElementById('game-overlay');
    const title = document.getElementById('overlay-title');
    const msg = document.getElementById('overlay-message');
    const tip = document.getElementById('safety-tip');
    const nextBtn = document.getElementById('next-level-btn');
    const restartBtn = document.getElementById('restart-btn');

    overlay.classList.remove('hidden');
    overlay.classList.add('visible');

    title.innerText = C.TEXTS.LEVEL_COMPLETED_TITLE || "¡Nivel Superado!";
    title.style.color = "#4CAF50";
    msg.innerText = `${C.TEXTS.LEVEL_COMPLETED_MSG}\nTiempo: ${finalTime}`;
    tip.innerText = C.TEXTS.TIP_WIN;

    if (nextBtn) nextBtn.classList.remove('hidden');
    if (restartBtn) restartBtn.innerText = "Repetir Nivel";
}

function gameOver(win, message) {
    gameActive = false;
    stopTimer();
    const overlay = document.getElementById('game-overlay');
    const title = document.getElementById('overlay-title');
    const msg = document.getElementById('overlay-message');
    const tip = document.getElementById('safety-tip');
    const nextBtn = document.getElementById('next-level-btn');
    const restartBtn = document.getElementById('restart-btn');

    overlay.classList.remove('hidden');
    overlay.classList.add('visible');

    title.innerText = win ? C.TEXTS.WIN_TITLE : C.TEXTS.GAME_OVER_TITLE;
    title.style.color = win ? "#4CAF50" : "#d32f2f";
    msg.innerText = win ? `${message}\nTiempo: ${finalTime}` : message;
    tip.innerText = win ? C.TEXTS.TIP_WIN : C.TEXTS.TIP_LOSE;

    if (nextBtn) nextBtn.classList.add('hidden');
    if (restartBtn) restartBtn.innerText = "Reiniciar";

    if (win) {
        AudioSys.playWin();
        triggerConfetti();
        render();
    } else {
        AudioSys.playLose();
        triggerShake();
    }
}

function resetGame() {
    // Restart current level
    initLevel(currentLevelIndex);
}

function nextLevel() {
    initLevel(currentLevelIndex + 1);
}

// ==========================================
// INIT & EVENTS
// ==========================================
function initHeader() {
    if (!C.HEADER) return;
    const header = document.querySelector('.game-header');
    if (!header) return;
    const getLogoHTML = (type) => {
        if (type === 'shield') return `<div class="logo-shield"><span>MISIÓN<br>TRABAJO<br>SEGURO</span></div>`;
        if (type === 'ist') return `<div class="logo-ist">ist</div>`;
        return '';
    };
    header.innerHTML = `
        <div class="logo-container">${getLogoHTML(C.HEADER.LEFT_LOGO)}</div>
        <h1>${C.HEADER.TITLE || "Desbloquea el Camino Seguro"}</h1>
        <div class="logo-container">${getLogoHTML(C.HEADER.RIGHT_LOGO)}</div>
    `;
}

// Input Handling
const handleInput = (action) => {
    AudioSys.init();
    if (action === 'up') tryMove(0, -1);
    if (action === 'down') tryMove(0, 1);
    if (action === 'left') tryMove(-1, 0);
    if (action === 'right') tryMove(1, 0);
};

window.addEventListener('keydown', (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') handleInput('up');
    if (key === 'arrowdown' || key === 's') handleInput('down');
    if (key === 'arrowleft' || key === 'a') handleInput('left');
    if (key === 'arrowright' || key === 'd') handleInput('right');

    // Also init audio on any key just in case
    AudioSys.init();
});

// Button Controls
// Button Controls
const registerControl = (id, direction) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const action = () => handleInput(direction);
    btn.addEventListener('click', action); // Mouse
    btn.addEventListener('touchstart', (e) => { // Touch
        e.preventDefault(); // Prevent duplicate click
        action();
    });
};

registerControl('btn-up', 'up');
registerControl('btn-down', 'down');
registerControl('btn-left', 'left');
registerControl('btn-right', 'right');

document.getElementById('restart-btn').addEventListener('click', () => { AudioSys.init(); resetGame(); });
document.getElementById('restart-btn').addEventListener('touchstart', (e) => { e.preventDefault(); AudioSys.init(); resetGame(); });

const nextBtn = document.getElementById('next-level-btn');
if (nextBtn) {
    const nextAction = () => { AudioSys.init(); nextLevel(); };
    nextBtn.addEventListener('click', nextAction);
    nextBtn.addEventListener('touchstart', (e) => { e.preventDefault(); nextAction(); });
}

document.getElementById('mute-btn').addEventListener('click', (e) => {
    e.target.blur();
    AudioSys.toggleMute();
});
document.getElementById('mute-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.target.blur();
    AudioSys.toggleMute();
});

// Initial Start - Wait for DOM to be ready
function startGame() {
    // initHeader(); // Disabled to preserve HTML logos
    initLevel(0);
    updateEnemies(performance.now());
    // Init Audio on page load click anywhere (failsafe)
    window.addEventListener('click', () => AudioSys.init(), { once: true });
}

// Intro Popup Handler
function showIntroPopup() {
    const popup = document.getElementById('intro-popup');
    const startBtn = document.getElementById('start-game-btn');
    
    if (popup && startBtn) {
        popup.classList.add('visible');
        popup.classList.remove('hidden');
        
        const handleStart = () => {
            AudioSys.init();
            popup.classList.remove('visible');
            popup.classList.add('hidden');
            startGame();
        };
        
        startBtn.addEventListener('click', handleStart);
        startBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleStart();
        });
    }
}

// Make sure DOM is loaded before starting
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showIntroPopup);
} else {
    showIntroPopup();
}
