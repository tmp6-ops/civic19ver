const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreText = document.getElementById('scoreText');
const highScoreText = document.getElementById('highScoreText');
const soundToggle = document.getElementById('soundToggle');

// --- Sound Synthesizer (Web Audio API - No external files needed) ---
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playJumpSound() {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {
    console.error(e);
  }
}

function playScoreSound() {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const now = audioCtx.currentTime;
    [660, 880].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.08);
    });
  } catch (e) {
    console.error(e);
  }
}

function playGameOverSound() {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.error(e);
  }
}

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
  initAudio();
});

// --- Game Constants & State ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 250;
const GROUND_Y = 210;

let gameSpeed = 5;
let score = 0;
let highScore = 0;
let gameOver = false;
let isStarted = false;
let animationFrameId = null;

// Load stored high score
try {
  const savedHi = localStorage.getItem('dino_high_score');
  if (savedHi) {
    highScore = parseInt(savedHi, 10) || 0;
  }
} catch (e) {}

// --- Dinosaur Object ---
const dino = {
  x: 50,
  y: GROUND_Y - 44,
  width: 44,
  height: 44,
  vy: 0,
  gravity: 0.75,
  jumpPower: -12.5,
  isGrounded: true,
  legState: 0,
  legTimer: 0,

  reset() {
    this.y = GROUND_Y - this.height;
    this.vy = 0;
    this.isGrounded = true;
    this.legState = 0;
    this.legTimer = 0;
  },

  jump() {
    if (this.isGrounded) {
      this.vy = this.jumpPower;
      this.isGrounded = false;
      playJumpSound();
    }
  },

  update() {
    this.y += this.vy;
    this.vy += this.gravity;

    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      this.isGrounded = true;
    }

    if (this.isGrounded && isStarted && !gameOver) {
      this.legTimer++;
      if (this.legTimer % 6 === 0) {
        this.legState = 1 - this.legState;
      }
    }
  },

  draw() {
    ctx.fillStyle = '#535353';

    // Body
    ctx.fillRect(this.x + 14, this.y + 12, 22, 22);

    // Head & Snout
    ctx.fillRect(this.x + 22, this.y, 20, 16);
    ctx.fillRect(this.x + 36, this.y + 6, 8, 10);

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + 26, this.y + 3, 3, 3);
    ctx.fillStyle = '#535353';

    // Tail
    ctx.fillRect(this.x + 4, this.y + 16, 10, 10);
    ctx.fillRect(this.x, this.y + 12, 6, 8);

    // Front arm
    ctx.fillRect(this.x + 32, this.y + 20, 6, 3);

    // Legs
    if (this.isGrounded && isStarted && !gameOver) {
      if (this.legState === 0) {
        ctx.fillRect(this.x + 18, this.y + 34, 4, 10);
        ctx.fillRect(this.x + 20, this.y + 42, 6, 2);

        ctx.fillRect(this.x + 28, this.y + 34, 4, 6);
      } else {
        ctx.fillRect(this.x + 18, this.y + 34, 4, 6);

        ctx.fillRect(this.x + 28, this.y + 34, 4, 10);
        ctx.fillRect(this.x + 30, this.y + 42, 6, 2);
      }
    } else {
      // Both legs down
      ctx.fillRect(this.x + 18, this.y + 34, 4, 10);
      ctx.fillRect(this.x + 20, this.y + 42, 6, 2);
      ctx.fillRect(this.x + 28, this.y + 34, 4, 10);
      ctx.fillRect(this.x + 30, this.y + 42, 6, 2);
    }
  }
};

// --- Obstacles (Cactus & Birds) ---
let obstacles = [];
let obstacleSpawnTimer = 0;
let nextSpawnInterval = 100;

function spawnObstacle() {
  const isBird = score > 150 && Math.random() < 0.25;

  if (isBird) {
    const flightHeight = Math.random() < 0.5 ? GROUND_Y - 55 : GROUND_Y - 32;
    obstacles.push({
      type: 'bird',
      x: CANVAS_WIDTH,
      y: flightHeight,
      width: 32,
      height: 24,
      frame: 0,
      frameTimer: 0
    });
  } else {
    const isLarge = Math.random() < 0.4;
    const w = isLarge ? 24 : 18;
    const h = isLarge ? 48 : 36;
    obstacles.push({
      type: 'cactus',
      x: CANVAS_WIDTH,
      y: GROUND_Y - h,
      width: w,
      height: h
    });
  }

  // Randomize distance to next obstacle
  nextSpawnInterval = Math.floor(Math.random() * 50) + Math.max(60, 110 - gameSpeed * 3);
}

function drawCactus(obs) {
  ctx.fillStyle = '#535353';
  // Main stem
  ctx.fillRect(obs.x + obs.width * 0.3, obs.y, obs.width * 0.4, obs.height);
  // Left arm
  ctx.fillRect(obs.x, obs.y + obs.height * 0.3, obs.width * 0.35, 5);
  ctx.fillRect(obs.x, obs.y + obs.height * 0.15, 5, obs.height * 0.2);
  // Right arm
  ctx.fillRect(obs.x + obs.width * 0.65, obs.y + obs.height * 0.4, obs.width * 0.35, 5);
  ctx.fillRect(obs.x + obs.width - 5, obs.y + obs.height * 0.25, 5, obs.height * 0.2);
}

function drawBird(obs) {
  ctx.fillStyle = '#535353';
  obs.frameTimer++;
  if (obs.frameTimer % 8 === 0) {
    obs.frame = 1 - obs.frame;
  }

  // Body
  ctx.fillRect(obs.x + 8, obs.y + 8, 16, 8);
  // Beak / Head
  ctx.fillRect(obs.x, obs.y + 10, 8, 5);
  // Wings
  if (obs.frame === 0) {
    // Wing up
    ctx.fillRect(obs.x + 12, obs.y, 6, 8);
  } else {
    // Wing down
    ctx.fillRect(obs.x + 12, obs.y + 14, 6, 8);
  }
}

// --- Clouds & Ground Details ---
let clouds = [
  { x: 200, y: 50, speed: 0.5 },
  { x: 500, y: 30, speed: 0.4 },
  { x: 750, y: 65, speed: 0.6 }
];

function updateAndDrawClouds() {
  ctx.fillStyle = '#dcdcdc';
  clouds.forEach(c => {
    if (isStarted && !gameOver) {
      c.x -= c.speed;
      if (c.x < -60) {
        c.x = CANVAS_WIDTH + Math.random() * 50;
        c.y = 20 + Math.random() * 60;
      }
    }
    // Simple pixelated cloud
    ctx.fillRect(c.x, c.y, 48, 12);
    ctx.fillRect(c.x + 10, c.y - 8, 26, 8);
    ctx.fillRect(c.x + 18, c.y - 14, 14, 6);
  });
}

let groundOffset = 0;
function drawGround() {
  ctx.strokeStyle = '#535353';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
  ctx.stroke();

  // Little moving terrain speckles
  if (isStarted && !gameOver) {
    groundOffset = (groundOffset + gameSpeed) % 40;
  }
  ctx.fillStyle = '#8c8c8c';
  for (let i = -groundOffset; i < CANVAS_WIDTH; i += 30) {
    ctx.fillRect(i, GROUND_Y + 8, 8, 2);
    ctx.fillRect(i + 14, GROUND_Y + 16, 5, 2);
  }
}

// --- Collision Detection ---
function checkCollision(r1, r2) {
  // Add a small padding tolerance for nicer collision feel
  const pad = 4;
  return (
    r1.x + pad < r2.x + r2.width - pad &&
    r1.x + r1.width - pad > r2.x + pad &&
    r1.y + pad < r2.y + r2.height - pad &&
    r1.y + r1.height - pad > r2.y + pad
  );
}

// --- Format score display ---
function padScore(num) {
  return String(num).padStart(5, '0');
}

function updateScoreDisplay() {
  scoreText.textContent = padScore(Math.floor(score));
  highScoreText.textContent = 'HI ' + padScore(highScore);
}

// --- Start / Reset Game ---
function startGame() {
  initAudio();
  isStarted = true;
  gameOver = false;
  score = 0;
  gameSpeed = 5;
  obstacles = [];
  obstacleSpawnTimer = 0;
  nextSpawnInterval = 80;
  dino.reset();
  dino.jump();
}

function triggerGameOver() {
  gameOver = true;
  playGameOverSound();

  if (Math.floor(score) > highScore) {
    highScore = Math.floor(score);
    try {
      localStorage.setItem('dino_high_score', highScore);
    } catch (e) {}
  }
  updateScoreDisplay();
}

// --- Input Handling ---
function handleAction() {
  initAudio();
  if (!isStarted || gameOver) {
    startGame();
  } else {
    dino.jump();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleAction();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleAction();
});

// --- Main Loop ---
function gameLoop() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  updateAndDrawClouds();
  drawGround();

  if (isStarted && !gameOver) {
    score += 0.15;
    // Speed progression
    gameSpeed = 5 + Math.floor(score / 100) * 0.45;

    // Beep sound every 100 points
    if (Math.floor(score) > 0 && Math.floor(score) % 100 === 0 && Math.floor(score - 0.15) % 100 !== 0) {
      playScoreSound();
    }

    // Spawn obstacles
    obstacleSpawnTimer++;
    if (obstacleSpawnTimer >= nextSpawnInterval) {
      spawnObstacle();
      obstacleSpawnTimer = 0;
    }

    // Update and draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= gameSpeed;

      if (obs.type === 'bird') {
        drawBird(obs);
      } else {
        drawCactus(obs);
      }

      if (checkCollision(dino, obs)) {
        triggerGameOver();
      }

      if (obs.x + obs.width < 0) {
        obstacles.splice(i, 1);
      }
    }

    updateScoreDisplay();
  } else {
    // Draw existing obstacles when dead
    obstacles.forEach(obs => {
      if (obs.type === 'bird') drawBird(obs);
      else drawCactus(obs);
    });
  }

  dino.update();
  dino.draw();

  // Overlay Screens
  if (!isStarted) {
    ctx.fillStyle = '#535353';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS SPACE OR CLICK TO PLAY', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
  } else if (gameOver) {
    ctx.fillStyle = '#535353';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('G A M E   O V E R', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('Press Space / Tap to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Initial draw
updateScoreDisplay();
gameLoop();

