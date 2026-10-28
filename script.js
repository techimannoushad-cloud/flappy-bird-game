
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
  classic: { name: "Classic Chick", body: "#ffcf38", wing: "#fff0a1", beak: "#ff8438" },
  sky:     { name: "Sky Bird",     body: "#49c7ff", wing: "#c9f3ff", beak: "#ff8438" },
  pink:    { name: "Pink Bird",    body: "#ff80bd", wing: "#ffe0ef", beak: "#ff9c38" },
  purple:  { name: "Purple Bird",  body: "#b17aff", wing: "#ead4ff", beak: "#ff9c38" }
};

const POWERUPS = {
  shield: { emoji: "🛡️", name: "Shield", color: "#54c9ff" },
  magnet: { emoji: "🧲", name: "Magnet", color: "#ff6688" },
  slow:   { emoji: "⏳", name: "Slow Motion", color: "#8e83ff" },
  double: { emoji: "✨", name: "Double Coins", color: "#ffd84d" }
};

let bird;
let pipes = [];
let coins = [];
let pickups = [];
let particles = [];

let score = 0;
let best = loadNumber("flappyBirdBest");
let coinCount = 0;
let playing = false;
let lastTime = 0;
let animationId = null;
let groundOffset = 0;
let pipeCount = 0;

let selectedSkin = loadSkin();
let shieldCharges = 0;
let shieldGrace = 0;
let magnetTime = 0;
let slowTime = 0;
let doubleTime = 0;
let notice = "";
let noticeTime = 0;

bestElement.textContent = best;

// ---------- SAVE DATA ----------

function loadNumber(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function saveNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

function loadSkin() {
  try {
    const saved = localStorage.getItem("flappyBirdSkin");
    return SKINS[saved] ? saved : "classic";
  } catch {
    return "classic";
  }
}

function saveSkin() {
  try {
    localStorage.setItem("flappyBirdSkin", selectedSkin);
  } catch {}
}

// ---------- BIRD SELECTOR ----------

function createSkinMenu() {
  if (document.getElementById("bird-skin-menu")) return;

  const menu = document.createElement("div");
  menu.id = "bird-skin-menu";

  Object.assign(menu.style, {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    margin: "8px 0",
    borderRadius: "14px",
    background: "#8be0f5",
    fontFamily: "monospace",
    textAlign: "center"
  });

  const heading = document.createElement("strong");
  heading.textContent = "CHOOSE YOUR BIRD";
  heading.style.letterSpacing = "2px";
  heading.style.fontSize = "12px";
  menu.appendChild(heading);

  const buttons = document.createElement("div");

  Object.assign(buttons.style, {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "7px"
  });

  Object.entries(SKINS).forEach(([id, skin]) => {
    const button = document.createElement("button");
    button.dataset.skin = id;
    button.textContent = skin.name;

    Object.assign(button.style, {
      background: skin.body,
      color: "#26334f",
      border: "3px solid #26334f",
      borderRadius: "5px",
      padding: "6px 9px",
      fontWeight: "bold",
      fontFamily: "monospace",
      cursor: "pointer"
    });

    button.addEventListener("click", () => {
      selectedSkin = id;
      saveSkin();
      updateSkinButtons();
      draw();
    });

    buttons.appendChild(button);
  });

  menu.appendChild(buttons);
  canvas.insertAdjacentElement("beforebegin", menu);
  updateSkinButtons();
}

function updateSkinButtons() {
  document.querySelectorAll("#bird-skin-menu button[data-skin]")
    .forEach(button => {
      const active = button.dataset.skin === selectedSkin;
      button.style.outline = active ? "3px solid #20a65a" : "none";
      button.style.outlineOffset = "1px";
      button.setAttribute("aria-pressed", String(active));
    });
}

// ---------- GAME SETUP ----------

function createBird() {
  return {
    x: 90,
    y: HEIGHT * 0.43,
    radius: 15,
    velocity: 0,
    rotation: 0
  };
}

function resetGame() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  bird = createBird();
  pipes = [];
  coins = [];
  pickups = [];
  particles = [];

  score = 0;
  coinCount = 0;
  groundOffset = 0;
  pipeCount = 0;
  lastTime = 0;

  shieldCharges = 0;
  shieldGrace = 0;
  magnetTime = 0;
  slowTime = 0;
  doubleTime = 0;
  notice = "";
  noticeTime = 0;

  playing = true;

  scoreElement.textContent = score;
  coinsElement.textContent = coinCount;
  overlay.classList.add("hidden");

  pipes.push(makePipe(WIDTH + 80));

  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function makePipe(x) {
  const gapCenter = 150 + Math.random() * 180;

  pipeCount++;

  // Coins appear near the centre of the pipe gap.
  if (Math.random() < 0.8) {
    coins.push(makeCoin(
      x + PIPE_WIDTH + 28,
      gapCenter + (Math.random() - 0.5) * 45
    ));
  }

  // Spawn a power-up every few pipes, with a random type.
  if (pipeCount % 3 === 0) {
    const types = Object.keys(POWERUPS);
    const type = types[Math.floor(Math.random() * types.length)];

    pickups.push({
      x: x + PIPE_WIDTH + 45,
      y: gapCenter,
      type,
      size: 24,
      collected: false
    });
  }

  return { x, gapCenter, passed: false };
}

function makeCoin(x, y) {
  return { x, y, size: 18, collected: false };
}

// ---------- INPUT ----------

function flap() {
  if (!playing) return;

  bird.velocity = FLAP_POWER;
  burst(bird.x - 9, bird.y + 5, "#fff0a1", 3);
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

// ---------- UPDATE ----------

function update(delta) {
  magnetTime = Math.max(0, magnetTime - delta);
  slowTime = Math.max(0, slowTime - delta);
  doubleTime = Math.max(0, doubleTime - delta);
  shieldGrace = Math.max(0, shieldGrace - delta);
  noticeTime = Math.max(0, noticeTime - delta);

  bird.velocity += GRAVITY * delta;
  bird.y += bird.velocity * delta;

  bird.rotation = Math.min(
    Math.max(bird.velocity / 650, -0.45),
    1.1
  );

  const speed = PIPE_SPEED * (slowTime > 0 ? 0.48 : 1);

  groundOffset = (groundOffset + speed * delta) % 32;

  // Move pipes and check collisions.
  for (const pipe of pipes) {
    pipe.x -= speed * delta;

    const topHeight = pipe.gapCenter - PIPE_GAP / 2;
    const bottomY = pipe.gapCenter + PIPE_GAP / 2;

    const overlapsX =
      bird.x + bird.radius > pipe.x &&
      bird.x - bird.radius < pipe.x + PIPE_WIDTH;

    const hitsPipe = overlapsX && (
      bird.y - bird.radius < topHeight ||
      bird.y + bird.radius > bottomY
    );

    if (hitsPipe && shieldGrace <= 0) {
      if (shieldCharges > 0) {
        shieldCharges--;
        shieldGrace = 0.9;
        bird.velocity = FLAP_POWER * 0.65;
        showNotice("SHIELD BLOCKED HIT!");
        burst(bird.x, bird.y, "#54c9ff", 14);
      } else {
        endGame();
        return;
      }
    }

    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score++;
      scoreElement.textContent = score;
      burst(bird.x, bird.y, "#fff0a1", 5);
    }
  }

  pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > -10);

  const lastPipe = pipes[pipes.length - 1];

  if (!lastPipe || lastPipe.x < WIDTH - PIPE_SPACING) {
    pipes.push(makePipe(WIDTH + 10));
  }

  // Ceiling and ground collisions can also use a shield.
  const hitsBoundary =
    bird.y - bird.radius < 0 ||
    bird.y + bird.radius > HEIGHT - GROUND_HEIGHT;

  if (hitsBoundary && shieldGrace <= 0) {
    if (shieldCharges > 0) {
      shieldCharges--;
      shieldGrace = 0.9;
      bird.y = Math.max(
        bird.radius,
        Math.min(HEIGHT - GROUND_HEIGHT - bird.radius, bird.y)
      );
      bird.velocity = -240;
      showNotice("SHIELD BLOCKED HIT!");
      burst(bird.x, bird.y, "#54c9ff", 14);
    } else {
      endGame();
      return;
    }
  }

  // Move and collect coins.
  for (const coin of coins) {
    coin.x -= speed * delta;

    if (magnetTime > 0) {
      const dx = bird.x - coin.x;
      const dy = bird.y - coin.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 150 && distance > 1) {
        const pull = 360 * delta;
        coin.x += dx / distance * pull;
        coin.y += dy / distance * pull;
      }
    }

    if (!coin.collected &&
        Math.hypot(bird.x - coin.x, bird.y - coin.y) <
          bird.radius + coin.size / 2) {
      coin.collected = true;

      const gained = doubleTime > 0 ? 2 : 1;
      coinCount += gained;
      coinsElement.textContent = coinCount;

      burst(coin.x, coin.y, "#ffd84d", 9);
      showNotice(gained === 2 ? "+2 COINS!" : "+1 COIN!");
    }
  }

  coins = coins.filter(coin => !coin.collected && coin.x > -30);

  // Move and collect power-up pickups.
  for (const pickup of pickups) {
    pickup.x -= speed * delta;

    if (!pickup.collected &&
        Math.hypot(bird.x - pickup.x, bird.y - pickup.y) <
          bird.radius + pickup.size / 2) {
      pickup.collected = true;
      activatePowerup(pickup.type);
      burst(pickup.x, pickup.y, POWERUPS[pickup.type].color, 15);
    }
  }

  pickups = pickups.filter(
    pickup => !pickup.collected && pickup.x > -40
  );

  // Update decorative particles.
  for (const p of particles) {
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.life -= delta;
  }

  particles = particles.filter(p => p.life > 0);
}

function activatePowerup(type) {
  switch (type) {
    case "shield":
      shieldCharges++;
      showNotice("SHIELD READY!");
      break;

    case "magnet":
      magnetTime = 8;
      showNotice("COIN MAGNET!");
      break;

    case "slow":
      slowTime = 6;
      showNotice("SLOW MOTION!");
      break;

    case "double":
      doubleTime = 8;
      showNotice("DOUBLE COINS!");
      break;
  }
}

function showNotice(text) {
  notice = text;
  noticeTime = 1.5;
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 100;

    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0.35 + Math.random() * 0.4
    });
  }
}

// ---------- BACKGROUND ----------

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#79d8f5");
  sky.addColorStop(1, "#e1f9ff");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

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

// ---------- PIXEL-ART PIPES ----------

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

// ---------- BIRD SKINS & ANIMATION ----------

function drawBird() {
  const skin = SKINS[selectedSkin];

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Tail.
  ctx.fillStyle = skin.beak;
  ctx.fillRect(-23, -5, 9, 5);
  ctx.fillRect(-20, 1, 7, 5);

  // Pixel-style body.
  ctx.fillStyle = "#694526";
  ctx.fillRect(-13, -13, 26, 26);

  ctx.fillStyle = skin.body;
  ctx.fillRect(-11, -13, 22, 23);
  ctx.fillRect(-7, -16, 15, 4);
  ctx.fillRect(-7, 10, 15, 4);

  // Animated wing.
  const flap = Math.sin(performance.now() / 65);
  ctx.fillStyle = "#694526";
  ctx.fillRect(-9, Math.round(1 + flap * 3), 13, 9);

  ctx.fillStyle = skin.wing;
  ctx.fillRect(-8, Math.round(0 + flap * 3), 11, 7);
  ctx.fillRect(-5, Math.round(3 + flap * 3), 7, 4);

  // Eye.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, -8, 7, 7);

  ctx.fillStyle = "#263238";
  ctx.fillRect(8, -6, 3, 4);

  // Beak.
  ctx.fillStyle = skin.beak;
  ctx.fillRect(12, -2, 8, 5);
  ctx.fillRect(15, 3, 5, 3);

  // Feet.
  ctx.fillStyle = "#f28c38";
  ctx.fillRect(-5, 12, 4, 5);
  ctx.fillRect(5, 12, 4, 5);
  ctx.fillRect(-8, 16, 8, 2);
  ctx.fillRect(3, 16, 8, 2);

  // Shield aura when a shield is equipped or protecting the bird.
  if (shieldCharges > 0 || shieldGrace > 0) {
    ctx.strokeStyle = "#54c9ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(-20, -21, 40, 42);

    ctx.fillStyle = "rgba(84,201,255,0.12)";
    ctx.fillRect(-20, -21, 40, 42);
  }

  ctx.restore();
}

// ---------- COINS & POWER-UPS ----------

function drawCoin(coin) {
  const spin = Math.abs(Math.cos(performance.now() / 140));
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

function drawPickup(pickup) {
  const power = POWERUPS[pickup.type];
  const pulse = 1 + Math.sin(performance.now() / 100) * 0.08;

  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = "#26334f";
  ctx.fillRect(-17, -17, 34, 34);

  ctx.fillStyle = power.color;
  ctx.fillRect(-14, -14, 28, 28);

  ctx.font = "19px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(power.emoji, 0, 1);

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life * 2.5);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 4);
  }

  ctx.globalAlpha = 1;
}

function drawPowerupStatus() {
  const active = [];

  if (shieldCharges > 0) active.push(`SHIELD x${shieldCharges}`);
  if (magnetTime > 0) active.push(`MAGNET ${Math.ceil(magnetTime)}s`);
  if (slowTime > 0) active.push(`SLOW ${Math.ceil(slowTime)}s`);
  if (doubleTime > 0) active.push(`DOUBLE ${Math.ceil(doubleTime)}s`);

  ctx.save();
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "left";

  active.forEach((label, i) => {
    const y = 22 + i * 19;

    ctx.fillStyle = "rgba(25,45,65,0.8)";
    ctx.fillRect(8, y - 13, ctx.measureText(label).width + 12, 17);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, 14, y);
  });

  if (noticeTime > 0) {
    ctx.textAlign = "center";
    ctx.font = "bold 15px monospace";
    ctx.fillStyle = "#26334f";
    ctx.fillText(notice, WIDTH / 2, 45);
  }

  ctx.restore();
}

// ---------- DRAW FRAME ----------

function draw() {
  drawBackground();

  for (const pipe of pipes) drawPipe(pipe);
  for (const coin of coins) if (!coin.collected) drawCoin(coin);
  for (const pickup of pickups) if (!pickup.collected) drawPickup(pickup);

  drawGround();
  drawBird();
  drawParticles();
  drawPowerupStatus();
}

// ---------- GAME OVER & INPUT ----------

function endGame() {
  playing = false;

  if (score > best) {
    best = score;
    bestElement.textContent = best;
    saveNumber("flappyBirdBest", best);
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

// ---------- STARTUP ----------

createSkinMenu();
bird = createBird();
pipes = [makePipe(WIDTH + 80)];
draw();
