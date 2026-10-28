
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

let bird;
let pipes = [];
let coins = [];
let powerups = [];
let particles = [];

let score = 0;
let coinCount = 0;
let best = loadBest();
let playing = false;
let lastTime = 0;
let animationId = null;
let groundOffset = 0;
let shieldCharges = 0;
let shieldTime = 0;
let pipeCount = 0;

bestElement.textContent = best;

function loadBest() {
  try {
    return Number(localStorage.getItem("flappyBirdBest")) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem("flappyBirdBest", String(best));
  } catch {
    // Continue playing if storage is unavailable.
  }
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
  const minCenter = 125;
  const maxCenter = Math.min(
    HEIGHT - GROUND_HEIGHT - 100,
    340
  );

  return {
    x,
    gapCenter:
      minCenter + Math.random() * (maxCenter - minCenter),
    passed: false
  };
}

function makeCoin(x, y) {
  return {
    x,
    y,
    size: 18,
    collected: false,
    phase: Math.random() * Math.PI * 2
  };
}

function makePowerup(x, y) {
  return {
    x,
    y,
    size: 24,
    collected: false,
    phase: Math.random() * Math.PI * 2
  };
}

function resetGame() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  bird = createBird();
  pipes = [];
  coins = [];
  powerups = [];
  particles = [];

  score = 0;
  coinCount = 0;
  groundOffset = 0;
  shieldCharges = 0;
  shieldTime = 0;
  pipeCount = 0;
  lastTime = 0;
  playing = true;

  scoreElement.textContent = score;
  coinsElement.textContent = coinCount;

  startBtn.textContent = "Play Again ↻";
  overlay.classList.add("hidden");

  const firstPipe = makePipe(WIDTH + 80);
  pipes.push(firstPipe);

  coins.push(
    makeCoin(
      firstPipe.x + PIPE_WIDTH + 35,
      firstPipe.gapCenter
    )
  );

  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function flap() {
  if (!playing) return;
  bird.velocity = FLAP_POWER;
}

function gameLoop(timestamp) {
  if (!playing) return;

  const delta = lastTime
    ? Math.min((timestamp - lastTime) / 1000, 0.032)
    : 0;

  lastTime = timestamp;

  update(delta);
  draw();

  if (playing) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function addSparkles(x, y, amount = 12) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 110;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.4,
      maxLife: 0.85,
      size: 3 + Math.random() * 4,
      color: Math.random() > 0.35
        ? "#ffe45c"
        : "#ffffff"
    });
  }
}

function update(delta) {
  bird.velocity += GRAVITY * delta;
  bird.y += bird.velocity * delta;

  bird.rotation = Math.min(
    Math.max(bird.velocity / 650, -0.45),
    1.1
  );

  groundOffset =
    (groundOffset + PIPE_SPEED * delta) % 32;

  shieldTime = Math.max(0, shieldTime - delta);

  // Move pipes and check collisions.
  for (const pipe of pipes) {
    pipe.x -= PIPE_SPEED * delta;

    const topHeight = pipe.gapCenter - PIPE_GAP / 2;
    const bottomY = pipe.gapCenter + PIPE_GAP / 2;

    const overlapsX =
      bird.x + bird.radius > pipe.x &&
      bird.x - bird.radius < pipe.x + PIPE_WIDTH;

    if (overlapsX) {
      const hitsTop = bird.y - bird.radius < topHeight;
      const hitsBottom = bird.y + bird.radius > bottomY;

      if (hitsTop || hitsBottom) {
        if (shieldTime <= 0) {
          if (shieldCharges > 0) {
            shieldCharges--;
            shieldTime = 1.4;
            addSparkles(bird.x, bird.y, 18);
          } else {
            endGame();
            return;
          }
        }
      }
    }

    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score++;
      scoreElement.textContent = score;
    }
  }

  pipes = pipes.filter(
    pipe => pipe.x + PIPE_WIDTH > -15
  );

  const lastPipe = pipes[pipes.length - 1];

  if (!lastPipe || lastPipe.x < WIDTH - PIPE_SPACING) {
    const newPipe = makePipe(WIDTH + 10);
    pipes.push(newPipe);
    pipeCount++;

    // A collectible coin accompanies every pipe.
    coins.push(
      makeCoin(
        newPipe.x + PIPE_WIDTH + 35,
        newPipe.gapCenter
      )
    );

    // A shield appears every third new pipe.
    if (pipeCount % 3 === 0) {
      powerups.push(
        makePowerup(
          newPipe.x + PIPE_WIDTH + 80,
          newPipe.gapCenter
        )
      );
    }
  }

  // Move and collect coins.
  for (const coin of coins) {
    if (coin.collected) continue;

    coin.x -= PIPE_SPEED * delta;

    const dx = bird.x - coin.x;
    const dy = bird.y - coin.y;

    if (
      Math.hypot(dx, dy) <
      bird.radius + coin.size / 2
    ) {
      coin.collected = true;
      coinCount++;
      coinsElement.textContent = coinCount;
      addSparkles(coin.x, coin.y, 12);
    }
  }

  coins = coins.filter(
    coin => !coin.collected && coin.x > -30
  );

  // Move and collect shield power-ups.
  for (const item of powerups) {
    if (item.collected) continue;

    item.x -= PIPE_SPEED * delta;

    const dx = bird.x - item.x;
    const dy = bird.y - item.y;

    if (
      Math.hypot(dx, dy) <
      bird.radius + item.size / 2
    ) {
      item.collected = true;
      shieldCharges++;
      addSparkles(item.x, item.y, 18);
    }
  }

  powerups = powerups.filter(
    item => !item.collected && item.x > -35
  );

  // Update floating sparkle particles.
  for (const particle of particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 100 * delta;
    particle.life -= delta;
  }

  particles = particles.filter(
    particle => particle.life > 0
  );

  // Ceiling and ground collisions.
  const hitsBoundary =
    bird.y - bird.radius < 0 ||
    bird.y + bird.radius > HEIGHT - GROUND_HEIGHT;

  if (hitsBoundary && shieldTime <= 0) {
    if (shieldCharges > 0) {
      shieldCharges--;
      shieldTime = 1.4;

      bird.y = Math.max(
        bird.radius,
        Math.min(
          bird.y,
          HEIGHT - GROUND_HEIGHT - bird.radius
        )
      );

      bird.velocity = -100;
      addSparkles(bird.x, bird.y, 18);
    } else {
      endGame();
      return;
    }
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);

  sky.addColorStop(0, "#79d8f5");
  sky.addColorStop(1, "#e1f9ff");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const t = performance.now() / 1000;

  drawCloud(65 - (t * 12) % (WIDTH + 100), 100, 0.9);
  drawCloud(290 - (t * 8) % (WIDTH + 100), 175, 0.75);
  drawCloud(180 - (t * 15) % (WIDTH + 100), 340, 0.6);
}

function drawCloud(x, y, scale) {
  if (x < -70) x += WIDTH + 100;

  ctx.save();
  ctx.translate(Math.round(x), y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(-5, -5, 48, 20);
  ctx.fillRect(5, -18, 26, 20);
  ctx.fillRect(20, -10, 28, 18);
  ctx.fillRect(8, 8, 28, 10);

  ctx.restore();
}

function drawPipe(pipe) {
  const topHeight = pipe.gapCenter - PIPE_GAP / 2;
  const bottomY = pipe.gapCenter + PIPE_GAP / 2;
  const bottomHeight =
    HEIGHT - GROUND_HEIGHT - bottomY;

  drawPipeBody(pipe.x, 0, PIPE_WIDTH, topHeight, true);
  drawPipeBody(
    pipe.x,
    bottomY,
    PIPE_WIDTH,
    bottomHeight,
    false
  );
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

function drawCoin(coin) {
  const time = performance.now() / 140 + coin.phase;
  const spin = Math.abs(Math.cos(time));
  const size = coin.size;
  const width = Math.max(3, Math.round(size * spin));

  ctx.save();
  ctx.translate(Math.round(coin.x), Math.round(coin.y));

  ctx.fillStyle = "#8b510c";
  ctx.fillRect(-size / 2, -size / 2, size, size);

  ctx.fillStyle = "#ffbd24";
  ctx.fillRect(-width / 2, -size / 2 + 2, width, size - 4);

  if (width > 7) {
    ctx.fillStyle = "#fff18a";
    ctx.fillRect(-width / 2 + 2, -size / 2 + 4, 3, 5);
  }

  ctx.fillStyle = "#ffe45c";
  ctx.fillRect(-width / 2, -size / 2, width, 3);
  ctx.fillRect(-width / 2, size / 2 - 3, width, 3);

  ctx.restore();
}

function drawPowerup(item) {
  const bob = Math.sin(
    performance.now() / 180 + item.phase
  ) * 4;

  ctx.save();
  ctx.translate(
    Math.round(item.x),
    Math.round(item.y + bob)
  );

  // Blue pixel shield.
  ctx.fillStyle = "#173b83";
  ctx.fillRect(-10, -12, 20, 20);
  ctx.fillRect(-7, 8, 14, 5);
  ctx.fillRect(-4, 13, 8, 4);

  ctx.fillStyle = "#55d9ff";
  ctx.fillRect(-7, -9, 14, 15);
  ctx.fillRect(-4, 6, 8, 5);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-3, -6, 3, 7);
  ctx.fillRect(0, -2, 3, 3);

  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(
      0,
      particle.life / particle.maxLife
    );

    ctx.fillStyle = particle.color;
    ctx.fillRect(
      Math.round(particle.x),
      Math.round(particle.y),
      particle.size,
      particle.size
    );
  }

  ctx.globalAlpha = 1;
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
  ctx.save();

  ctx.translate(Math.round(bird.x), Math.round(bird.y));
  ctx.rotate(bird.rotation);

  ctx.fillStyle = "#f0a51a";
  ctx.fillRect(-23, -8, 9, 7);
  ctx.fillRect(-21, 0, 8, 6);

  ctx.fillStyle = "#ffcf38";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#e6a51a";
  ctx.lineWidth = 2;
  ctx.stroke();

  const flap = Math.sin(performance.now() / 65);

  ctx.save();
  ctx.translate(-4, 3 + flap * 3);
  ctx.rotate(flap * 0.35);

  ctx.fillStyle = "#e8a51d";
  ctx.fillRect(-8, -4, 11, 9);

  ctx.fillStyle = "#fff0a1";
  ctx.fillRect(-7, -4, 9, 6);

  ctx.fillStyle = "#ffe07a";
  ctx.fillRect(-5, -2, 6, 3);

  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(6, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263238";
  ctx.beginPath();
  ctx.arc(8, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff8438";
  ctx.fillRect(12, 0, 10, 5);
  ctx.fillRect(12, 5, 6, 3);

  // Show an aura when shield protection is active.
  if (shieldTime > 0) {
    ctx.strokeStyle = "#55d9ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function draw() {
  drawBackground();

  for (const pipe of pipes) {
    drawPipe(pipe);
  }

  for (const coin of coins) {
    if (!coin.collected) drawCoin(coin);
  }

  for (const item of powerups) {
    if (!item.collected) drawPowerup(item);
  }

  drawGround();
  drawBird();
  drawParticles();

  // Small power-up status indicator.
  if (shieldCharges > 0) {
    ctx.fillStyle = "#173b83";
    ctx.font = "bold 14px monospace";
    ctx.fillText("SHIELD x" + shieldCharges, 12, 24);
  }
}

function endGame() {
  playing = false;

  if (score > best) {
    best = score;
    bestElement.textContent = best;
    saveBest();
  }

  message.textContent = "Game Over! 🐣";
  instructions.textContent =
    `You scored ${score} point${score === 1 ? "" : "s"} and collected ${coinCount} coin${coinCount === 1 ? "" : "s"}!`;

  startBtn.textContent = "Play Again ↻";
  overlay.classList.remove("hidden");
}

startBtn.addEventListener("click", resetGame);

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();

  if (playing) {
    flap();
  }
});

document.addEventListener("keydown", event => {
  if (
    event.code === "Space" ||
    event.code === "ArrowUp"
  ) {
    event.preventDefault();

    if (playing && !event.repeat) {
      flap();
    } else if (!playing && event.code === "Space") {
      resetGame();
    }
  }
});

// Draw the initial preview.
bird = createBird();
pipes = [makePipe(WIDTH + 80)];
coins = [
  makeCoin(
    WIDTH + 80 + PIPE_WIDTH + 35,
    pipes[0].gapCenter
  )
];

draw();
