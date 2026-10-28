
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const coinsElement = document.getElementById("coins");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const instructions = document.getElementById("instructions");
const startBtn = document.getElementById("startBtn");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_HEIGHT = 55;

const GRAVITY = 1250;
const FLAP_POWER = -380;
const PIPE_WIDTH = 66;
const PIPE_GAP = 165;
const PIPE_SPACING = 230;
const PIPE_SPEED = 145;

const SKINS = {
  classic: {
    name: "Classic Chick",
    body: "#ffcf38",
    wing: "#ffe07a",
    darkWing: "#e8a51d",
    outline: "#b87514",
    beak: "#ff8438",
    accent: "#fff0a1"
  },
  sky: {
    name: "Sky Bird",
    body: "#43c7ff",
    wing: "#a8eaff",
    darkWing: "#1689cf",
    outline: "#12679d",
    beak: "#ff983c",
    accent: "#e4faff"
  },
  pink: {
    name: "Pink Bird",
    body: "#ff83c8",
    wing: "#ffc2e4",
    darkWing: "#d94391",
    outline: "#a72c70",
    beak: "#ffab43",
    accent: "#fff0f8"
  },
  purple: {
    name: "Purple Bird",
    body: "#ad85ff",
    wing: "#dfcaff",
    darkWing: "#7750d9",
    outline: "#5635a6",
    beak: "#ffb14b",
    accent: "#f5edff"
  }
};

let selectedSkin = "classic";
let bird;
let pipes = [];
let coins = [];
let particles = [];

let score = 0;
let coinCount = 0;
let best = loadNumber("flappyBirdBest");
let playing = false;
let lastTime = 0;
let animationId = null;
let groundOffset = 0;
let gameTime = 0;
let flapPulse = 0;

bestElement.textContent = best;

// Save and load safely.
function loadNumber(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function saveValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // The game still works if storage is unavailable.
  }
}

function loadSkin() {
  try {
    const saved = localStorage.getItem("flappyBirdSkin");
    return SKINS[saved] ? saved : "classic";
  } catch {
    return "classic";
  }
}

selectedSkin = loadSkin();

// Create the character selection menu automatically.
// No HTML edits are required.
function createSkinMenu() {
  const menu = document.createElement("div");

  menu.id = "bird-skin-menu";

  Object.assign(menu.style, {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    padding: "10px 6px",
    margin: "8px 0",
    fontFamily: "monospace",
    color: "#26364f"
  });

  const title = document.createElement("div");
  title.textContent = "CHOOSE YOUR BIRD";
  Object.assign(title.style, {
    width: "100%",
    textAlign: "center",
    fontWeight: "900",
    fontSize: "12px",
    letterSpacing: "2px",
    marginBottom: "2px"
  });

  menu.appendChild(title);

  for (const [id, skin] of Object.entries(SKINS)) {
    const button = document.createElement("button");

    button.type = "button";
    button.dataset.skin = id;
    button.textContent = skin.name;

    Object.assign(button.style, {
      padding: "9px 10px",
      border: "3px solid #26364f",
      borderRadius: "5px",
      background: skin.body,
      color: "#26364f",
      fontWeight: "900",
      fontSize: "11px",
      fontFamily: "monospace",
      cursor: "pointer",
      boxShadow: "0 3px 0 #26364f"
    });

    button.addEventListener("click", () => {
      selectedSkin = id;
      saveValue("flappyBirdSkin", id);
      updateSkinMenu();
      createParticles(90, 70, 12, "#ffffff");
      draw();
    });

    menu.appendChild(button);
  }

  // Put the menu directly above the game canvas.
  canvas.parentElement.insertBefore(menu, canvas);

  updateSkinMenu();
}

function updateSkinMenu() {
  const menu = document.getElementById("bird-skin-menu");
  if (!menu) return;

  menu.querySelectorAll("button[data-skin]").forEach(button => {
    const active = button.dataset.skin === selectedSkin;
    const skin = SKINS[button.dataset.skin];

    button.style.background = active ? "#fff2a8" : skin.body;
    button.style.borderColor = active ? "#f0a51a" : "#26364f";
    button.style.transform = active ? "translateY(-2px)" : "none";
    button.setAttribute("aria-pressed", String(active));
  });
}

function createBird() {
  return {
    x: 90,
    y: HEIGHT * 0.42,
    radius: 15,
    velocity: 0,
    rotation: 0
  };
}

function makePipe(x) {
  return {
    x,
    gapCenter: 150 + Math.random() * 180,
    passed: false,
    coinMade: false
  };
}

function makeCoin(x, y) {
  return {
    x,
    y,
    size: 18,
    collected: false
  };
}

function createParticles(x, y, amount, color) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 125;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.45,
      maxLife: 0.9,
      color,
      size: 2 + Math.random() * 4
    });
  }
}

function resetGame() {
  bird = createBird();
  pipes = [];
  coins = [];
  particles = [];

  score = 0;
  coinCount = 0;
  groundOffset = 0;
  gameTime = 0;
  lastTime = 0;
  playing = true;

  scoreElement.textContent = score;
  coinsElement.textContent = coinCount;
  overlay.classList.add("hidden");

  pipes.push(makePipe(WIDTH + 80));

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function flap() {
  if (!playing) return;

  bird.velocity = FLAP_POWER;
  flapPulse = 0.12;
  createParticles(bird.x - 8, bird.y + 5, 3, "#fff0a1");
}

function gameLoop(timestamp) {
  if (!playing) return;

  const delta = lastTime
    ? Math.min((timestamp - lastTime) / 1000, 0.032)
    : 0;

  lastTime = timestamp;
  gameTime += delta;
  flapPulse = Math.max(0, flapPulse - delta);

  update(delta);
  draw();

  if (playing) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function update(delta) {
  bird.velocity += GRAVITY * delta;
  bird.y += bird.velocity * delta;

  bird.rotation = Math.max(
    -0.45,
    Math.min(bird.velocity / 650, 1.1)
  );

  groundOffset =
    (groundOffset + PIPE_SPEED * delta) % 32;

  // Move pipes and award points.
  for (const pipe of pipes) {
    pipe.x -= PIPE_SPEED * delta;

    const topHeight = pipe.gapCenter - PIPE_GAP / 2;
    const bottomY = pipe.gapCenter + PIPE_GAP / 2;

    const overlapsX =
      bird.x + bird.radius > pipe.x &&
      bird.x - bird.radius < pipe.x + PIPE_WIDTH;

    if (overlapsX) {
      if (
        bird.y - bird.radius < topHeight ||
        bird.y + bird.radius > bottomY
      ) {
        endGame();
        return;
      }
    }

    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score++;
      scoreElement.textContent = score;
      createParticles(bird.x, bird.y, 5, "#ffe45c");
    }

    // Put a coin inside each pipe gap.
    if (!pipe.coinMade && pipe.x < WIDTH - 70) {
      pipe.coinMade = true;
      coins.push(
        makeCoin(pipe.x + PIPE_WIDTH / 2, pipe.gapCenter)
      );
    }
  }

  pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > -10);

  const lastPipe = pipes[pipes.length - 1];

  if (!lastPipe || lastPipe.x < WIDTH - PIPE_SPACING) {
    pipes.push(makePipe(WIDTH + 10));
  }

  // Coin movement and collection.
  for (const coin of coins) {
    coin.x -= PIPE_SPEED * delta;

    const dx = bird.x - coin.x;
    const dy = bird.y - coin.y;

    if (!coin.collected && Math.hypot(dx, dy) < bird.radius + 10) {
      coin.collected = true;
      coinCount++;
      coinsElement.textContent = coinCount;
      saveValue("flappyBirdCoins", coinCount);
      createParticles(coin.x, coin.y, 12, "#ffcf38");
    }
  }

  coins = coins.filter(coin => !coin.collected && coin.x > -30);

  // Update sparkle particles.
  for (const particle of particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 100 * delta;
    particle.life -= delta;
  }

  particles = particles.filter(particle => particle.life > 0);

  // Ceiling and ground collisions.
  if (
    bird.y - bird.radius < 0 ||
    bird.y + bird.radius > HEIGHT - GROUND_HEIGHT
  ) {
    endGame();
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#79d8f5");
  sky.addColorStop(1, "#e1f9ff");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const t = gameTime || performance.now() / 1000;

  drawCloud(65 - (t * 12) % (WIDTH + 100), 100, 0.9);
  drawCloud(290 - (t * 8) % (WIDTH + 100), 175, 0.75);
  drawCloud(180 - (t * 15) % (WIDTH + 100), 340, 0.6);
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.arc(22, -10, 25, 0, Math.PI * 2);
  ctx.arc(47, 0, 18, 0, Math.PI * 2);
  ctx.arc(23, 7, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPipe(pipe) {
  const topHeight = pipe.gapCenter - PIPE_GAP / 2;
  const bottomY = pipe.gapCenter + PIPE_GAP / 2;
  const bottomHeight = HEIGHT - GROUND_HEIGHT - bottomY;

  drawPipeBody(pipe.x, 0, PIPE_WIDTH, topHeight, true);
  drawPipeBody(pipe.x, bottomY, PIPE_WIDTH, bottomHeight, false);
}

function drawPipeBody(x, y, width, height, isTop) {
  if (height <= 0) return;

  const capHeight = 23;
  const capY = isTop ? y + height - capHeight : y;

  ctx.fillStyle = "#25b95d";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "#48dc75";
  ctx.fillRect(x + 8, y, 10, height);

  ctx.fillStyle = "#168743";
  ctx.fillRect(x + width - 9, y, 9, height);

  ctx.fillStyle = "#20a64f";
  ctx.fillRect(x - 5, capY, width + 10, capHeight);

  ctx.strokeStyle = "#14783c";
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 5, capY, width + 10, capHeight);
}

function drawGround() {
  const y = HEIGHT - GROUND_HEIGHT;

  ctx.fillStyle = "#8ed65d";
  ctx.fillRect(0, y, WIDTH, 12);

  ctx.fillStyle = "#d5a65c";
  ctx.fillRect(0, y + 12, WIDTH, GROUND_HEIGHT - 12);

  ctx.fillStyle = "#b78343";

  for (let x = -32 + groundOffset; x < WIDTH; x += 32) {
    ctx.fillRect(x, y + 24, 16, 5);
    ctx.fillRect(x + 10, y + 41, 16, 5);
  }

  ctx.fillStyle = "#68bb46";
  ctx.fillRect(0, y, WIDTH, 5);
}

function drawBird() {
  const skin = SKINS[selectedSkin];
  const wingWave = Math.sin(performance.now() / 65);

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Pixel tail.
  ctx.fillStyle = skin.darkWing;
  ctx.fillRect(-22, -5, 7, 5);
  ctx.fillRect(-19, 0, 5, 5);

  // Pixel body with a soft shadow.
  ctx.fillStyle = "rgba(30,45,65,0.18)";
  ctx.fillRect(-12, 10, 25, 5);

  ctx.fillStyle = skin.outline;
  ctx.fillRect(-15, -12, 27, 25);

  ctx.fillStyle = skin.body;
  ctx.fillRect(-13, -14, 25, 25);
  ctx.fillRect(-8, -17, 17, 4);
  ctx.fillRect(-17, -8, 4, 13);

  // Animated pixel wing.
  ctx.save();
  ctx.translate(-4, 3 + wingWave * 3);
  ctx.rotate(wingWave * 0.18);

  ctx.fillStyle = skin.darkWing;
  ctx.fillRect(-9, -4, 12, 10);

  ctx.fillStyle = skin.wing;
  ctx.fillRect(-7, -4, 9, 7);

  ctx.fillStyle = skin.accent;
  ctx.fillRect(-5, -3, 5, 3);
  ctx.restore();

  // Eye.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, -8, 8, 8);

  ctx.fillStyle = "#263238";
  ctx.fillRect(8, -6, 3, 4);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(9, -6, 1, 1);

  // Beak.
  ctx.fillStyle = skin.beak;
  ctx.fillRect(12, -1, 7, 5);
  ctx.fillRect(15, 4, 4, 3);

  // Tiny feet.
  ctx.fillStyle = "#e87832";
  ctx.fillRect(-5, 12, 5, 3);
  ctx.fillRect(5, 12, 5, 3);

  ctx.restore();
}

function drawCoin(coin) {
  const spin = Math.abs(Math.cos(performance.now() / 140));
  const size = coin.size;
  const width = Math.max(3, Math.round(size * spin));

  ctx.save();
  ctx.translate(coin.x, coin.y);

  ctx.fillStyle = "#8b510c";
  ctx.fillRect(-size / 2, -size / 2, size, size);

  ctx.fillStyle = "#ffbd24";
  ctx.fillRect(-width / 2, -size / 2 + 2, width, size - 4);

  ctx.fillStyle = "#fff18a";
  if (width > 7) {
    ctx.fillRect(-width / 2 + 2, -size / 2 + 4, 3, 5);
  }

  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;

    const size = Math.max(1, Math.round(particle.size));
    ctx.fillRect(
      Math.round(particle.x),
      Math.round(particle.y),
      size,
      size
    );
  }

  ctx.globalAlpha = 1;
}

function draw() {
  drawBackground();

  for (const pipe of pipes) {
    drawPipe(pipe);
  }

  for (const coin of coins) {
    if (!coin.collected) drawCoin(coin);
  }

  drawParticles();

  drawGround();

  if (bird) drawBird();
}

function endGame() {
  if (!playing) return;

  playing = false;

  if (score > best) {
    best = score;
    bestElement.textContent = best;
    saveValue("flappyBirdBest", best);
  }

  message.textContent = "Game Over! 🐣";
  instructions.textContent =
    `You scored ${score} point${score === 1 ? "" : "s"}. Try again!`;

  startBtn.textContent = "Play Again ↻";
  overlay.classList.remove("hidden");
}

startBtn.addEventListener("click", resetGame);

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  if (playing) flap();
});

document.addEventListener("keydown", event => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();

    if (playing && !event.repeat) {
      flap();
    } else if (!playing && event.code === "Space") {
      resetGame();
    }
  }
});

// Start with a preview without starting the game.
bird = createBird();
pipes = [makePipe(WIDTH + 80)];

createSkinMenu();
draw();
