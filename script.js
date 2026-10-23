
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
let score = 0;
let best = loadBest();
let playing = false;
let lastTime = 0;
let animationId = null;
let groundOffset = 0;
let coins = [];
let coinCount = 0;

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
    // The game still works if browser storage is unavailable.
  }
}

function createBird() {
  return {
    x: 90,
    y: 260,
    radius: 15,
    velocity: 0,
    rotation: 0
  };
}

function resetGame() {
  bird = createBird();
  pipes = [];
  coins = [];
  score = 0;
  coinCount = 0;
  groundOffset = 0;
  lastTime = 0;
  playing = true;
  
  coinsElement.textContent = coinCount;
  scoreElement.textContent = score;
  overlay.classList.add("hidden");

  pipes.push(makePipe(WIDTH + 80));

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function makePipe(x) {
  const margin = 110;
  const availableHeight = HEIGHT - GROUND_HEIGHT;
  const gapCenter =
  150 + Math.random() * 180;

  return {
    x,
    gapCenter,
    passed: false
  };
}

function makeCoin(x, y) {
  return {
    x: x,
    y: y,
    size: 18,
    collected: false
  };
}


function flap() {
  if (!playing) return;

  bird.velocity = FLAP_POWER;
}

function gameLoop(timestamp) {
  if (!playing) return;

  // Avoid huge physics jumps if the tab was inactive.
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

function update(delta) {
  bird.velocity += GRAVITY * delta;
  bird.y += bird.velocity * delta;

  bird.rotation = Math.min(
    Math.max(bird.velocity / 650, -0.45),
    1.1
  );

  groundOffset =
    (groundOffset + PIPE_SPEED * delta) % 32;

  for (const pipe of pipes) {
    pipe.x -= PIPE_SPEED * delta;

    const topHeight = pipe.gapCenter - PIPE_GAP / 2;
    const bottomY = pipe.gapCenter + PIPE_GAP / 2;

    // Detect collisions with either pipe.
    const overlapsX =
      bird.x + bird.radius > pipe.x &&
      bird.x - bird.radius < pipe.x + PIPE_WIDTH;

    if (overlapsX) {
      const hitsTop =
        bird.y - bird.radius < topHeight;

      const hitsBottom =
        bird.y + bird.radius > bottomY;

      if (hitsTop || hitsBottom) {
        endGame();
        return;
      }
    }

    // Award a point when the bird clears a pipe.
    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score += 1;
      scoreElement.textContent = score;
    }
  }

  pipes = pipes.filter(
    pipe => pipe.x + PIPE_WIDTH > -10
  );

  const lastPipe = pipes[pipes.length - 1];

  if (
    !lastPipe ||
    lastPipe.x < WIDTH - PIPE_SPACING
  ) {
    pipes.push(makePipe(WIDTH + 10));
  }

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

  // Slowly drifting clouds
const t = performance.now() / 1000;

drawCloud(65 - (t * 12) % 460, 100, 0.9);
drawCloud(290 - (t * 8) % 460, 175, 0.75);
drawCloud(180 - (t * 15) % 460, 340, 0.6);
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

  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Tail feathers.
  ctx.fillStyle = "#f0a51a";
  ctx.beginPath();
  ctx.moveTo(-bird.radius + 2, -2);
  ctx.lineTo(-bird.radius - 9, -8);
  ctx.lineTo(-bird.radius - 7, 5);
  ctx.closePath();
  ctx.fill();

  // Body.
  ctx.fillStyle = "#ffcf38";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#e6a51a";
  ctx.lineWidth = 2;
  ctx.stroke();

  
  // Animated pixel-style wing
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

  

  // Eye.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(6, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263238";
  ctx.beginPath();
  ctx.arc(8, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Beak.
  ctx.fillStyle = "#ff8438";
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(23, 4);
  ctx.lineTo(12, 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw() {
  drawBackground();

  for (const pipe of pipes) {
    drawPipe(pipe);
  }
// Draw all uncollected coins
for (const coin of coins) {
  if (!coin.collected) {
    drawCoin(coin);
  }
}
  drawGround();
  drawBird();
  
function drawCoin(coin) {
  const time = performance.now();
  const spin = Math.abs(Math.cos(time / 140));
  const size = coin.size || 18;

  ctx.save();
  ctx.translate(coin.x, coin.y);

  // Dark pixel outline
  ctx.fillStyle = "#8b510c";
  ctx.fillRect(-size / 2, -size / 2, size, size);

  // Spinning golden centre
  const width = Math.max(3, Math.round(size * spin));

  ctx.fillStyle = "#ffbd24";
  ctx.fillRect(-width / 2, -size / 2 + 2, width, size - 4);

  // Bright pixel highlight
  if (width > 7) {
    ctx.fillStyle = "#fff18a";
    ctx.fillRect(-width / 2 + 2, -size / 2 + 4, 3, 5);
  }

  // Golden edge pixels
  ctx.fillStyle = "#ffe45c";
  ctx.fillRect(-width / 2, -size / 2, width, 3);
  ctx.fillRect(-width / 2, size / 2 - 3, width, 3);

  ctx.restore();
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
    `You scored ${score} point${score === 1 ? "" : "s"}. Try again!`;

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

// Draw a preview while the game is waiting to start.
bird = createBird();
pipes = [makePipe(WIDTH + 80)];
draw();
