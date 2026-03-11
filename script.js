// ─── CONFIG ─────────────────────────────────────────────────────────────
const DIFFICULTIES = {
    easy: { carSpeed: 3.2, laneCount: 4, obstacleSeed: 60 },
    medium: { carSpeed: 4.5, laneCount: 5, obstacleSeed: 45 },
    hard: { carSpeed: 6.2, laneCount: 6, obstacleSeed: 30 },
};
let diff = 'easy';
let cfg = DIFFICULTIES[diff];

const TOTAL_LAPS = 3;
const ROAD_W = 600;

// ─── CANVAS SETUP ────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const speedoCanvas = document.getElementById('speedoCanvas');
const speedoCtx = speedoCanvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ─── STATE ───────────────────────────────────────────────────────────────
let state = 'menu'; // menu | playing | over | win
let keys = {};
let mobileKeys = {};

// Player
let player, score, obstacles, particles, roadY, lap, raceTime, bestScore;
let nitro, nitroRegen, speedMultiplier;
let frameCount, obstacleTimer;
let totalDistance, lapDistance;

function initGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height * 0.75,
        w: 36, h: 64,
        vx: 0, vy: 0,
        angle: 0,
        speed: 0,
        maxSpeed: cfg.carSpeed,
        alive: true,
        color: '#00f5ff',
        trail: [],
    };
    score = 0;
    obstacles = [];
    particles = [];
    roadY = 0;
    lap = 1;
    raceTime = 0;
    nitro = 100;
    nitroRegen = false;
    speedMultiplier = 1;
    frameCount = 0;
    obstacleTimer = 0;
    totalDistance = 0;
    lapDistance = 0;
    bestScore = bestScore || 0;
}

// ─── ROAD / TRACK ─────────────────────────────────────────────────────────
function getRoadLeft() { return canvas.width / 2 - ROAD_W / 2; }
function getRoadRight() { return canvas.width / 2 + ROAD_W / 2; }

function drawRoad() {
    const W = canvas.width, H = canvas.height;
    const rl = getRoadLeft(), rr = getRoadRight();

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    sky.addColorStop(0, '#05050f');
    sky.addColorStop(1, '#0d1b4b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.5);

    // Ground beyond road
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(0, H * 0.5, W, H);

    // Road surface
    const roadGrad = ctx.createLinearGradient(rl, 0, rr, 0);
    roadGrad.addColorStop(0, '#1e1e2e');
    roadGrad.addColorStop(0.5, '#252535');
    roadGrad.addColorStop(1, '#1e1e2e');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(rl, 0, ROAD_W, H);

    // Road edge glow lines
    const drawEdge = (x, col) => {
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.restore();
    };
    drawEdge(rl, '#00f5ff');
    drawEdge(rr, '#00f5ff');

    // Lane dashes
    const lanes = cfg.laneCount;
    const laneW = ROAD_W / lanes;
    const dashH = 60, dashGap = 40;
    const totalDash = dashH + dashGap;
    const offset = (roadY % totalDash);

    ctx.setLineDash([dashH, dashGap]);
    ctx.lineDashOffset = -offset;
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 2;

    for (let i = 1; i < lanes; i++) {
        const x = rl + i * laneW;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Roadside details — trees / barriers
    drawRoadsideSceenery();
}

function drawRoadsideSceenery() {
    const H = canvas.height;
    const rl = getRoadLeft(), rr = getRoadRight();
    const treeSpacing = 120;
    const offset = roadY % treeSpacing;

    for (let y = -offset; y < H + treeSpacing; y += treeSpacing) {
        // Left trees
        drawTree(rl - 50, y, '#0d4a0d', '#1a7a1a');
        drawTree(rl - 100, y + 60, '#0a3a0a', '#155515');
        // Right trees
        drawTree(rr + 50, y + 30, '#0d4a0d', '#1a7a1a');
        drawTree(rr + 100, y, '#0a3a0a', '#155515');
        // Barrier marks
        ctx.fillStyle = '#ff2d5588';
        ctx.fillRect(rl - 12, y - 2, 8, 30);
        ctx.fillStyle = '#ffffff22';
        ctx.fillRect(rl - 12, y + 30, 8, 12);
        ctx.fillStyle = '#ff2d5588';
        ctx.fillRect(rr + 4, y + 15, 8, 30);
    }
}

function drawTree(x, y, dark, light) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x, y - 30); ctx.lineTo(x - 18, y + 10); ctx.lineTo(x + 18, y + 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x, y - 40); ctx.lineTo(x - 12, y - 5); ctx.lineTo(x + 12, y - 5);
    ctx.closePath(); ctx.fill();
}

// ─── PLAYER CAR ───────────────────────────────────────────────────────────
function drawCar(x, y, w, h, color, isPlayer) {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 4, w * 0.6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    grad.addColorStop(0, lightenColor(color, 40));
    grad.addColorStop(1, darkenColor(color, 40));
    ctx.fillStyle = grad;
    roundRect(ctx, -w / 2, -h / 2, w, h, 6);
    ctx.fill();

    // Windshield
    ctx.fillStyle = isPlayer ? '#00f5ff44' : '#ff2d5544';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h / 2 + 8);
    ctx.lineTo(w / 2 - 4, -h / 2 + 8);
    ctx.lineTo(w / 2 - 8, -h / 4);
    ctx.lineTo(-w / 2 + 8, -h / 4);
    ctx.closePath();
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#111';
    const wy = isPlayer ? [-h / 2 + 6, h / 2 - 10] : [-h / 2 + 6, h / 2 - 10];
    for (const yy of wy) {
        ctx.fillRect(-w / 2 - 5, yy, 7, 14);
        ctx.fillRect(w / 2 - 2, yy, 7, 14);
    }

    // Headlights / taillights
    if (isPlayer) {
        ctx.fillStyle = '#ffffaa';
        ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 10;
        ctx.fillRect(-w / 2 + 4, -h / 2 - 3, 10, 5);
        ctx.fillRect(w / 2 - 14, -h / 2 - 3, 10, 5);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff2d55';
        ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 8;
        ctx.fillRect(-w / 2 + 4, h / 2 - 2, 10, 5);
        ctx.fillRect(w / 2 - 14, h / 2 - 2, 10, 5);
    } else {
        ctx.fillStyle = color + '99';
        ctx.shadowColor = color; ctx.shadowBlur = 8;
        ctx.fillRect(-w / 2 + 4, h / 2 - 2, 10, 5);
        ctx.fillRect(w / 2 - 14, h / 2 - 2, 10, 5);
    }
    ctx.shadowBlur = 0;

    ctx.restore();
}

function drawPlayerCar() {
    const p = player;
    // Trail
    p.trail.push({ x: p.x, y: p.y, alpha: 0.6 });
    if (p.trail.length > 20) p.trail.shift();
    p.trail.forEach((t, i) => {
        const alpha = (i / p.trail.length) * t.alpha * (nitroRegen ? 1 : 0.3);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = nitroRegen ? '#00f5ff' : '#ffffff44';
        ctx.shadowColor = nitroRegen ? '#00f5ff' : 'transparent';
        ctx.shadowBlur = nitroRegen ? 10 : 0;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y + p.h / 2, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    drawCar(p.x, p.y, p.w, p.h, '#00f5ff', true);
}

// ─── OBSTACLES ────────────────────────────────────────────────────────────
const OBS_COLORS = ['#ff6b35', '#e63946', '#a8dadc', '#f4a261', '#e76f51', '#48cae4'];

function spawnObstacle() {
    const rl = getRoadLeft(), rr = getRoadRight();
    const margin = 30;
    const x = rl + margin + Math.random() * (ROAD_W - margin * 2);
    const colorIdx = Math.floor(Math.random() * OBS_COLORS.length);
    obstacles.push({
        x, y: -80,
        w: 34 + Math.random() * 8, h: 60 + Math.random() * 10,
        color: OBS_COLORS[colorIdx],
        speed: cfg.carSpeed * (0.3 + Math.random() * 0.4),
    });
}

function updateObstacles() {
    obstacleTimer++;
    if (obstacleTimer >= cfg.obstacleSeed) {
        obstacleTimer = 0;
        spawnObstacle();
        if (Math.random() < 0.3) spawnObstacle();
    }
    obstacles.forEach(o => {
        o.y += (o.speed + player.speed) * speedMultiplier;
    });
    obstacles = obstacles.filter(o => o.y < canvas.height + 100);
}

function drawObstacles() {
    obstacles.forEach(o => drawCar(o.x, o.y, o.w, o.h, o.color, false));
}

// ─── COLLISION ────────────────────────────────────────────────────────────
function checkCollisions() {
    const p = player;
    const px1 = p.x - p.w / 2 + 4, px2 = p.x + p.w / 2 - 4;
    const py1 = p.y - p.h / 2 + 4, py2 = p.y + p.h / 2 - 4;

    for (const o of obstacles) {
        const ox1 = o.x - o.w / 2, ox2 = o.x + o.w / 2;
        const oy1 = o.y - o.h / 2, oy2 = o.y + o.h / 2;
        if (px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < oy2) {
            explode(p.x, p.y);
            gameOver();
            return;
        }
    }

    // Road bounds
    const rl = getRoadLeft() + p.w / 2;
    const rr = getRoadRight() - p.w / 2;
    if (p.x < rl || p.x > rr) {
        explode(p.x, p.y);
        gameOver();
    }
}

// ─── PARTICLES ────────────────────────────────────────────────────────────
function explode(x, y) {
    for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 8;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.02 + Math.random() * 0.03,
            size: 3 + Math.random() * 8,
            color: ['#ff2d55', '#ffd60a', '#ff6b35', '#ffffff'][Math.floor(Math.random() * 4)],
        });
    }
}

function updateParticles() {
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.2;
        p.life -= p.decay;
    });
    particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ─── PLAYER UPDATE ────────────────────────────────────────────────────────
function updatePlayer() {
    const LEFT = keys['ArrowLeft'] || keys['a'] || keys['A'] || mobileKeys['left'];
    const RIGHT = keys['ArrowRight'] || keys['d'] || keys['D'] || mobileKeys['right'];
    const ACCEL = keys['ArrowUp'] || keys['w'] || keys['W'];
    const BRAKE = keys['ArrowDown'] || keys['s'] || keys['S'];
    const NITRO_KEY = keys['Shift'] || mobileKeys['nitro'];

    // Speed
    if (ACCEL) player.speed = Math.min(player.maxSpeed, player.speed + 0.15);
    else if (BRAKE) player.speed = Math.max(0, player.speed - 0.3);
    else player.speed += (player.maxSpeed * 0.7 - player.speed) * 0.03;

    // Nitro
    if (NITRO_KEY && nitro > 0) {
        speedMultiplier = 2.0;
        nitroRegen = true;
        nitro = Math.max(0, nitro - 1.2);
    } else {
        speedMultiplier = 1;
        nitroRegen = false;
        if (nitro < 100) nitro = Math.min(100, nitro + 0.3);
    }

    // Steering
    const steer = 5 + player.speed * 0.5;
    if (LEFT) player.x -= steer;
    if (RIGHT) player.x += steer;

    // Road scroll
    const totalSpeed = player.speed * speedMultiplier;
    roadY += totalSpeed * 3;
    totalDistance += totalSpeed;
    lapDistance += totalSpeed;

    // Laps (1 lap ≈ 6000 units)
    const LAP_DIST = 6000;
    if (lapDistance >= LAP_DIST) {
        lapDistance = 0;
        lap++;
        score += 500;
        if (lap > TOTAL_LAPS) { gameWin(); return; }
        flashLap();
    }

    // Score ticking
    score += Math.floor(totalSpeed * 0.1);
    raceTime += 1 / 60;
    frameCount++;

    // Update nitro bar
    document.getElementById('nitroFill').style.width = nitro + '%';
    document.getElementById('nitroFill').style.background =
        nitro > 50 ? 'linear-gradient(90deg, #00b4d8, #00f5ff)' :
            nitro > 20 ? 'linear-gradient(90deg, #ffd60a, #ffaa00)' :
                'linear-gradient(90deg, #ff2d55, #ff6b35)';
}

// ─── SPEEDOMETER ──────────────────────────────────────────────────────────
function drawSpeedo() {
    const c = speedoCtx, w = 160, cx = w / 2, cy = w / 2, r = 65;
    c.clearRect(0, 0, w, w);

    // BG
    c.beginPath();
    c.arc(cx, cy, r + 5, 0, Math.PI * 2);
    c.fillStyle = 'rgba(0,0,0,0.7)';
    c.fill();
    c.strokeStyle = '#00f5ff44';
    c.lineWidth = 2;
    c.stroke();

    // Ticks
    for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (0.75 + i / 10 * 1.5);
        const inner = i % 2 === 0 ? r - 18 : r - 12;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        c.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
        c.strokeStyle = i === 10 ? '#ff2d55' : '#ffffff55';
        c.lineWidth = i % 2 === 0 ? 2 : 1;
        c.stroke();
    }

    // Needle
    const spd = (player ? player.speed : 0) * speedMultiplier;
    const maxSpd = cfg.carSpeed * 2;
    const ratio = Math.min(spd / maxSpd, 1);
    const needleA = Math.PI * (0.75 + ratio * 1.5);

    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(needleA) * (r - 10), cy + Math.sin(needleA) * (r - 10));
    c.strokeStyle = nitroRegen ? '#00f5ff' : '#ff2d55';
    c.lineWidth = 2.5;
    c.shadowColor = nitroRegen ? '#00f5ff' : '#ff2d55';
    c.shadowBlur = 10;
    c.stroke();
    c.shadowBlur = 0;

    // Center dot
    c.beginPath(); c.arc(cx, cy, 5, 0, Math.PI * 2);
    c.fillStyle = '#fff'; c.fill();

    // Speed label
    c.fillStyle = '#ffffff';
    c.font = 'bold 22px Bebas Neue, sans-serif';
    c.textAlign = 'center';
    c.fillText(Math.floor(spd * 60) + '', cx, cy + 22);
    c.font = '9px Rajdhani, sans-serif';
    c.fillStyle = '#ffffff66';
    c.fillText('KM/H', cx, cy + 33);
}

// ─── HUD UPDATE ────────────────────────────────────────────────────────────
function updateHUD() {
    document.getElementById('scoreDisplay').textContent = score.toLocaleString();
    document.getElementById('lapDisplay').textContent = lap + ' / ' + TOTAL_LAPS;
    const best = Math.max(bestScore, score);
    document.getElementById('bestDisplay').textContent = best > 0 ? best.toLocaleString() : '---';
}

// ─── BACKGROUND STARS ─────────────────────────────────────────────────────
const stars = Array.from({ length: 60 }, () => ({
    x: Math.random(), y: Math.random() * 0.5,
    s: Math.random() * 1.5 + 0.5,
    a: Math.random(),
}));

function drawStars() {
    stars.forEach(s => {
        ctx.save();
        ctx.globalAlpha = s.a * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ─── LAP FLASH ────────────────────────────────────────────────────────────
function flashLap() {
    const el = document.getElementById('lapFlash');
    el.textContent = lap > TOTAL_LAPS ? 'RACE COMPLETE!' : 'LAP ' + (lap - 1) + ' COMPLETE!';
    el.style.opacity = '1';
    setTimeout(() => el.style.opacity = '0', 1500);
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────
function gameLoop() {
    if (state !== 'playing') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStars();
    drawRoad();
    updateObstacles();
    drawObstacles();
    updatePlayer();
    drawPlayerCar();
    checkCollisions();
    updateParticles();
    drawParticles();
    updateHUD();
    drawSpeedo();

    requestAnimationFrame(gameLoop);
}

// ─── GAME CONTROL ─────────────────────────────────────────────────────────
function startGame() {
    cfg = DIFFICULTIES[diff];
    initGame();
    state = 'playing';
    hide('startScreen');
    hide('overScreen');
    hide('winScreen');
    gameLoop();
}

function gameOver() {
    state = 'over';
    player.alive = false;
    bestScore = Math.max(bestScore, score);
    setTimeout(() => {
        document.getElementById('finalScore').textContent = score.toLocaleString();
        document.getElementById('finalTime').textContent = 'TIME: ' + raceTime.toFixed(1) + 's';
        show('overScreen');
    }, 800);
}

function gameWin() {
    state = 'win';
    bestScore = Math.max(bestScore, score);
    document.getElementById('winScore').textContent = score.toLocaleString();
    document.getElementById('winTime').textContent = 'TIME: ' + raceTime.toFixed(1) + 's';
    show('winScreen');
}

function showStart() {
    state = 'menu';
    hide('overScreen');
    hide('winScreen');
    show('startScreen');
}

function setDiff(d) {
    diff = d;
    ['easy', 'medium', 'hard'].forEach(x => {
        document.getElementById('d' + x.charAt(0).toUpperCase() + x.slice(1)).classList.toggle('active', x === d);
    });
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ─── KEYS ────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ─── MOBILE CONTROLS ─────────────────────────────────────────────────────
function setupMobile() {
    const btns = [
        ['mLeft', 'left'],
        ['mRight', 'right'],
        ['mNitro', 'nitro'],
    ];
    btns.forEach(([id, key]) => {
        const el = document.getElementById(id);
        el.addEventListener('touchstart', e => { mobileKeys[key] = true; e.preventDefault(); }, { passive: false });
        el.addEventListener('touchend', e => { mobileKeys[key] = false; e.preventDefault(); }, { passive: false });
        el.addEventListener('mousedown', () => mobileKeys[key] = true);
        el.addEventListener('mouseup', () => mobileKeys[key] = false);
        el.addEventListener('mouseleave', () => mobileKeys[key] = false);
    });
}
setupMobile();

// ─── UTILS ───────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function lightenColor(hex, amt) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + amt);
    const g = Math.min(255, ((num >> 8) & 0xff) + amt);
    const b = Math.min(255, (num & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, amt) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amt);
    const g = Math.max(0, ((num >> 8) & 0xff) - amt);
    const b = Math.max(0, (num & 0xff) - amt);
    return `rgb(${r},${g},${b})`;
}

// Draw static speedo on load
drawSpeedo();
