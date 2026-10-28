
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
    price: 0,
    body: "#ffcf38",
    wing: "#ffe07a",
    outline: "#e6a51a",
    beak: "#ff8438",
    icon: "🐤"
  },
  sky: {
    name: "Sky Bird",
    price: 250,
    body: "#48c9f5",
    wing: "#b7f0ff",
    outline: "#168ab5",
    beak: "#ff8438",
    icon: "🐦"
  },
  pink: {
    name: "Pink Bird",
    price: 400,
    body: "#ff83bd",
    wing: "#ffc5e0",
    outline: "#d94d91",
    beak: "#ff9b45",
    icon: "🐤"
  },
  purple: {
    name: "Purple Bird",
    price: 600,
    body: "#ad7aff",
    wing: "#e0c5ff",
    outline: "#7443c6",
    beak: "#ff9b45",
    icon: "🐦"
  }
};

const POWERUPS = {
  shield: { name: "Shield", icon: "🛡️", color: "#56baff", duration: 8000 },
  magnet: { name: "Magnet", icon: "🧲", color: "#ff6f91", duration: 8000 },
  slow: { name: "Slow", icon: "🐢", color: "#8bdc65", duration: 6000 },
  double: { name: "Double", icon: "✨", color: "#ffc83d", duration: 8000 }
};

let bird;
let pipes = [];
let coins = [];
let powerups = [];

let score = 0;
let best = loadNumber("flappyBirdBest", 0);
let wallet = loadNumber("flappyBirdWallet", 0);
let runCoins = 0;

let playing = false;
let lastTime = 0;
let animationId = null;
let groundOffset = 0;

let selectedSkin = loadSkin();
let ownedSkins = loadOwnedSkins();

let activePowerups = {
  shield: 0,
  magnet: 0,
  slow: 0,
  double: 0
};

let shieldReady = false;
let powerupMessage = "";
let powerupMessageUntil = 0;
let nextPowerupId = 0;
let shopMessage = "";
let shopMessageUntil = 0;
let shopOpen = false;

// ---------- SAVE DATA ----------

function loadNumber(key, fallback) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function saveNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

function loadSkin() {
  try {
    const skin = localStorage.getItem("flappyBirdSkin");
    return SKINS[skin] ? skin : "classic";
  } catch {
    return "classic";
  }
}

function loadOwnedSkins() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("flappyBirdOwnedSkins") || '["classic"]'
    );

    const valid = Array.isArray(saved)
      ? saved.filter(id => SKINS[id])
      : ["classic"];

    if (!valid.includes("classic")) valid.push("classic");
    return [...new Set(valid)];
  } catch {
    return ["classic"];
  }
}

function saveOwnedSkins() {
  try {
    localStorage.setItem("flappyBirdOwnedSkins", JSON.stringify(ownedSkins));
  } catch {}
}

function saveWallet() {
  saveNumber("flappyBirdWallet", wallet);
}

function saveBest() {
  saveNumber("flappyBirdBest", best);
}

function updateHUD() {
  scoreElement.textContent = score;
  bestElement.textContent = best;
  coinsElement.textContent = wallet;
}

// ---------- BIRD SHOP ----------

function createShop() {
  if (document.getElementById("bird-shop")) return;

  const style = document.createElement("style");
  style.id = "bird-shop-style";
  style.textContent = `
    #bird-shop {
      position: relative;
      z-index: 20;
      width: min(100%, 440px);
      margin: 12px auto;
      padding: 14px;
      box-sizing: border-box;
      color: #fff4b8;
      background: #20243a;
      border: 4px solid #7771b5;
      box-shadow: 0 5px 0 #101323;
      font-family: monospace;
    }
    #bird-shop * { box-sizing: border-box; }
    #bird-shop .shop-title {
      font-size: 20px;
      font-weight: 900;
      text-align: center;
      margin: 3px 0 8px;
      text-shadow: 2px 2px #111323;
    }
    #bird-shop .shop-wallet {
      text-align: center;
      color: #ffda55;
      font-weight: bold;
      margin-bottom: 12px;
    }
    #bird-shop .shop-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
    }
    #bird-shop .shop-card {
      min-width: 0;
      padding: 10px 6px;
      text-align: center;
      background: #333955;
      border: 2px solid #69759c;
    }
    #bird-shop .shop-sprite {
      height: 48px;
      font-size: 35px;
      line-height: 48px;
      image-rendering: pixelated;
    }
    #bird-shop .shop-name {
      font-weight: bold;
      font-size: 13px;
      margin: 5px 0;
    }
    #bird-shop .shop-price {
      color: #ffda55;
      font-size: 12px;
      margin-bottom: 8px;
    }
    #bird-shop button {
      width: 100%;
      min-height: 35px;
      border: 2px solid #fff1a0;
      background: #e6a93c;
      color: #282139;
      padding: 7px 3px;
      font: bold 12px monospace;
      cursor: pointer;
    }
    #bird-shop button:disabled {
      opacity: .55;
      cursor: not-allowed;
    }
    #bird-shop .shop-close {
      margin-top: 12px;
      background: #d66d7c;
      color: white;
    }
    #bird-shop .shop-status {
      min-height: 20px;
      margin-top: 10px;
      text-align: center;
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    #bird-shop-toggle {
      display: block;
      margin: 12px auto;
      padding: 10px 16px;
      border: 3px solid #fff1a0;
      background: #e6a93c;
      color: #282139;
      font: bold 14px monospace;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  // Insert the shop after the game canvas so existing HTML stays unchanged.
  const wrapper = document.createElement("section");
  wrapper.style.width = "100%";
  wrapper.style.maxWidth = "440px";
  wrapper.style.margin = "0 auto";

  const toggle = document.createElement("button");
  toggle.id = "bird-shop-toggle";
  toggle.textContent = "🛍️ BIRD SKIN SHOP";
  toggle.type = "button";
  toggle.addEventListener("click", () => {
    shopOpen = !shopOpen;
    renderShop();
  });

  const shop = document.createElement("div");
  shop.id = "bird-shop";
  shop.hidden = true;

  wrapper.append(toggle, shop);

  const canvasParent = canvas.parentElement;
  if (canvasParent && canvasParent.parentElement) {
    canvasParent.insertAdjacentElement("afterend", wrapper);
  } else {
    canvas.insertAdjacentElement("afterend", wrapper);
  }

  renderShop();
}

function renderShop() {
  const shop = document.getElementById("bird-shop");
  const toggle = document.getElementById("bird-shop-toggle");
  if (!shop || !toggle) return;

  shop.hidden = !shopOpen;
  toggle.textContent = shopOpen ? "🔽 CLOSE BIRD SHOP" : "🛍️ BIRD SKIN SHOP";

  if (!shopOpen) return;

  shop.innerHTML = `
    <div class="shop-title">★ PIXEL BIRD SHOP ★</div>
    <div class="shop-wallet">🪙 YOUR COINS: ${wallet}</div>
    <div class="shop-grid">
      ${Object.entries(SKINS).map(([id, skin]) => {
        const owned = ownedSkins.includes(id);
        const selected = selectedSkin === id;
        const affordable = wallet >= skin.price;

        let buttonText = "BUY";
        if (selected) buttonText = "✓ SELECTED";
        else if (owned) buttonText = "SELECT";
        else if (!affordable) buttonText = "NEED MORE COINS";

        return `
          <div class="shop-card">
            <div class="shop-sprite" style="color:${skin.body}">
              ${skin.icon}
            </div>
            <div class="shop-name">${skin.name}</div>
            <div class="shop-price">
              ${skin.price === 0 ? "FREE" : "🪙 " + skin.price + " COINS"}
            </div>
            <button
              type="button"
              data-buy-skin="${id}"
              ${selected || (!owned && !affordable) ? "disabled" : ""}
            >${buttonText}</button>
          </div>
        `;
      }).join("")}
    </div>
    <div class="shop-status" id="shop-status">
      ${shopMessage}
    </div>
    <button class="shop-close" type="button" id="shop-close">
      CONTINUE PLAYING
    </button>
  `;

  shop.querySelectorAll("[data-buy-skin]").forEach(button => {
    button.addEventListener("click", () => {
      buyOrSelectSkin(button.dataset.buySkin);
    });
  });

  shop.querySelector("#shop-close").addEventListener("click", () => {
    shopOpen = false;
    renderShop();
  });
}

function buyOrSelectSkin(id) {
  const skin = SKINS[id];
  if (!skin) return;

  if (ownedSkins.includes(id)) {
    selectedSkin = id;
    saveSkin();
    shopMessage = `${skin.name} selected!`;
  } else {
    if (wallet < skin.price) {
      shopMessage = "Not enough coins yet!";
      renderShop();
      return;
    }

    wallet -= skin.price;
    ownedSkins.push(id);
    selectedSkin = id;

    saveWallet();
    saveOwnedSkins();
    saveSkin();

    shopMessage = `${skin.name} unlocked!`;
  }

  shopMessageUntil = performance.now() + 2500;
  updateHUD();
  updateSkinButtons();
  renderShop();
  draw();
}

function setupSkinSelector() {
  document.querySelectorAll(
    "[data-skin], .skin-btn, .bird-skin, " +
    "#skin-selector button, #bird-selector button, " +
    ".bird-selector button, .character-select button"
  ).forEach(button => {
    const id = getSkinFromButton(button);
    if (!id) return;

    button.addEventListener("click", () => {
      if (!ownedSkins.includes(id)) {
        shopMessage = "Unlock this bird in the shop!";
        shopOpen = true;
        renderShop();
        return;
      }

      selectedSkin = id;
      saveSkin();
      updateSkinButtons();
      renderShop();
      draw();
    });
  });

  updateSkinButtons();
}

function getSkinFromButton(button) {
  const label = (
    button.dataset.skin ||
    button.textContent ||
    ""
  ).toLowerCase();

  if (label.includes("classic") || label.includes("chick")) return "classic";
  if (label.includes("sky") || label.includes("blue")) return "sky";
  if (label.includes("pink")) return "pink";
  if (label.includes("purple")) return "purple";
  return null;
}

function updateSkinButtons() {
  document.querySelectorAll(
    "[data-skin], .skin-btn, .bird-skin, " +
    "#skin-selector button, #bird-selector button, " +
    ".bird-selector button, .character-select button"
  ).forEach(button => {
    const id = getSkinFromButton(button);
    if (!id) return;

    button.classList.toggle("selected", selectedSkin === id);
    button.classList.toggle("active", selectedSkin === id);
    button.setAttribute("aria-pressed", String(selectedSkin === id));
    button.disabled = !ownedSkins.includes(id);
  });
}

// ---------- GAME SETUP ----------

function createBird() {
  return {
    x: 90,
    y: HEIGHT * 0.42,
    radius: 15,
    velocity: 0,
    rotation: 0
  };
}

function resetPowerups() {
  Object.keys(activePowerups).forEach(type => {
    activePowerups[type] = 0;
  });
  shieldReady = false;
  powerupMessage = "";
}

function resetGame() {
  if (animationId !== null) cancelAnimationFrame(animationId);

  bird = createBird();
  pipes = [];
  coins = [];
  powerups = [];
  score = 0;
  runCoins = 0;
  groundOffset = 0;
  lastTime = 0;
  nextPowerupId = 0;

  resetPowerups();
  playing = true;

  updateHUD();
  overlay.classList.add("hidden");

  pipes.push(makePipe(WIDTH + 80));

  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function makePipe(x) {
  const gapCenter = Math.max(
    110,
    Math.min(
      HEIGHT - GROUND_HEIGHT - 110,
      150 + Math.random() * 180
    )
  );

  if (Math.random() < 0.42) {
    const types = Object.keys(POWERUPS);
    const type = types[Math.floor(Math.random() * types.length)];

    powerups.push({
      id: nextPowerupId++,
      type,
      x: x + PIPE_WIDTH + 24,
      y: gapCenter,
      size: 25,
      collected: false
    });
  }

  if (Math.random() < 0.8) {
    coins.push(makeCoin(
      x + PIPE_WIDTH + 24,
      gapCenter + Math.random() * 44 - 22
    ));
  }

  return { x, gapCenter, passed: false };
}

function makeCoin(x, y) {
  return { x, y, size: 18, collected: false };
}

function flap() {
  if (playing) bird.velocity = FLAP_POWER;
}

function gameLoop(timestamp) {
  if (!playing) return;

  const delta = lastTime
    ? Math.min((timestamp - lastTime) / 1000, 0.032)
    : 0;

  lastTime = timestamp;
  update(delta);
  draw();

  if (playing) animationId = requestAnimationFrame(gameLoop);
}

// ---------- GAME LOGIC ----------

function update(delta) {
  const now = performance.now();

  Object.keys(activePowerups).forEach(type => {
    if (activePowerups[type] <= now) {
      activePowerups[type] = 0;
      if (type === "shield") shieldReady = false;
    }
  });

  const speed = activePowerups.slow > now
    ? PIPE_SPEED * 0.55
    : PIPE_SPEED;

  bird.velocity += GRAVITY * delta;
  bird.y += bird.velocity * delta;
  bird.rotation = Math.min(Math.max(bird.velocity / 650, -0.45), 1.1);

  groundOffset = (groundOffset + speed * delta) % 32;

  for (const pipe of pipes) {
    pipe.x -= speed * delta;

    const topHeight = pipe.gapCenter - PIPE_GAP / 2;
    const bottomY = pipe.gapCenter + PIPE_GAP / 2;

    const overlapsX =
      bird.x + bird.radius > pipe.x &&
      bird.x - bird.radius < pipe.x + PIPE_WIDTH;

    if (overlapsX) {
      const hitsTop = bird.y - bird.radius < topHeight;
      const hitsBottom = bird.y + bird.radius > bottomY;

      if (hitsTop || hitsBottom) {
        if (shieldReady) {
          shieldReady = false;
          activePowerups.shield = 0;
          bird.velocity = -180;
          pipe.x = bird.x + bird.radius + 3;
          showPowerupMessage("SHIELD SAVED YOU!");
        } else {
          endGame();
          return;
        }
      }
    }

    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score += activePowerups.double > now ? 2 : 1;
      scoreElement.textContent = score;
    }
  }

  pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > -20);

  const lastPipe = pipes[pipes.length - 1];
  if (!lastPipe || lastPipe.x < WIDTH - PIPE_SPACING) {
    pipes.push(makePipe(WIDTH + 10));
  }

  for (const coin of coins) coin.x -= speed * delta;
  for (const powerup of powerups) powerup.x -= speed * delta;

  if (activePowerups.magnet > now) {
    for (const coin of coins) {
      if (coin.collected) continue;

      const dx = bird.x - coin.x;
      const dy = bird.y - coin.y;

      if (Math.hypot(dx, dy) < 175) {
        const pull = Math.min(1, delta * 4.5);
        coin.x += dx * pull;
        coin.y += dy * pull;
      }
    }
  }

  for (const coin of coins) {
    if (coin.collected) continue;

    if (distanceToBird(coin.x, coin.y) < bird.radius + 12) {
      coin.collected = true;
      runCoins++;
      wallet++;
      saveWallet();
      updateHUD();
      showPowerupMessage("+1 COIN!");
      if (shopOpen) renderShop();
    }
  }

  for (const powerup of powerups) {
    if (powerup.collected) continue;

    if (distanceToBird(powerup.x, powerup.y) < bird.radius + 17) {
      powerup.collected = true;
      activatePowerup(powerup.type);
    }
  }

  coins = coins.filter(coin => !coin.collected && coin.x > -30);
  powerups = powerups.filter(p => !p.collected && p.x > -35);

  if (
    bird.y - bird.radius < 0 ||
    bird.y + bird.radius > HEIGHT - GROUND_HEIGHT
  ) {
    if (shieldReady) {
      shieldReady = false;
      activePowerups.shield = 0;
      bird.y = Math.max(
        bird.radius,
        Math.min(HEIGHT - GROUND_HEIGHT - bird.radius, bird.y)
      );
      bird.velocity = -180;
      showPowerupMessage("SHIELD SAVED YOU!");
    } else {
      endGame();
    }
  }
}

function distanceToBird(x, y) {
  return Math.hypot(bird.x - x, bird.y - y);
}

function activatePowerup(type) {
  const data = POWERUPS[type];
  if (!data) return;

  activePowerups[type] = performance.now() + data.duration;
  if (type === "shield") shieldReady = true;

  showPowerupMessage(`${data.name.toUpperCase()} ACTIVATED!`);
}

function showPowerupMessage(text) {
  powerupMessage = text;
  powerupMessageUntil = performance.now() + 1500;
}

function endGame() {
  playing = false;

  if (score > best) {
    best = score;
    saveBest();
  }

  updateHUD();
  message.textContent = "Game Over! 🐣";
  instructions.textContent =
    `Score: ${score} | Coins collected this run: ${runCoins}`;

  startBtn.textContent = "Play Again ↻";
  overlay.classList.remove("hidden");
}

// ---------- DRAWING ----------

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

function drawPipe(pipe) {
  const topHeight = pipe.gapCenter - PIPE_GAP / 2;
  const bottomY = pipe.gapCenter + PIPE_GAP / 2;

  drawPipeBody(pipe.x, 0, PIPE_WIDTH, topHeight, true);
  drawPipeBody(
    pipe.x,
    bottomY,
    PIPE_WIDTH,
    HEIGHT - GROUND_HEIGHT - bottomY,
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
  const skin = SKINS[selectedSkin] || SKINS.classic;

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  if (shieldReady) {
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(86,186,255,0.16)";
    ctx.fill();
    ctx.strokeStyle = "#56baff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = skin.outline;
  ctx.beginPath();
  ctx.moveTo(-bird.radius + 2, -2);
  ctx.lineTo(-bird.radius - 9, -8);
  ctx.lineTo(-bird.radius - 7, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = skin.body;
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = skin.outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  const flapAmount = Math.sin(performance.now() / 65);

  ctx.save();
  ctx.translate(-4, 3 + flapAmount * 3);
  ctx.rotate(flapAmount * 0.35);

  ctx.fillStyle = skin.outline;
  ctx.fillRect(-8, -4, 11, 9);

  ctx.fillStyle = skin.wing;
  ctx.fillRect(-7, -4, 9, 6);
  ctx.fillRect(-5, -2, 6, 3);
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(6, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263238";
  ctx.beginPath();
  ctx.arc(8, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skin.beak;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(23, 4);
  ctx.lineTo(12, 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawCoin(coin) {
  const spin = Math.abs(Math.cos(performance.now() / 140));
  const size = coin.size || 18;
  const width = Math.max(3, Math.round(size * spin));

  ctx.save();
  ctx.translate(coin.x, coin.y);

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

function drawPowerup(powerup) {
  const data = POWERUPS[powerup.type];
  if (!data) return;

  const pulse = 1 + Math.sin(performance.now() / 130) * 0.08;

  ctx.save();
  ctx.translate(powerup.x, powerup.y);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(-17, -17, 34, 34);

  ctx.strokeStyle = data.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(-17, -17, 34, 34);

  ctx.font = "21px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(data.icon, 0, 1);

  ctx.restore();
}

function drawPowerupHUD() {
  const now = performance.now();
  const active = Object.keys(activePowerups).filter(
    type => activePowerups[type] > now
  );

  if (!active.length) return;

  ctx.save();
  ctx.font = "12px monospace";
  ctx.textBaseline = "middle";

  let x = 12;

  for (const type of active) {
    const data = POWERUPS[type];
    const seconds = Math.ceil((activePowerups[type] - now) / 1000);
    const label = `${data.icon} ${seconds}s`;
    const width = ctx.measureText(label).width + 14;

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(x, 12, width, 25);

    ctx.strokeStyle = data.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 12, width, 25);

    ctx.fillStyle = "#263238";
    ctx.fillText(label, x + 7, 25);

    x += width + 6;
  }

  ctx.restore();
}

function drawPowerupMessage() {
  if (!powerupMessage || performance.now() > powerupMessageUntil) return;

  ctx.save();
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const width = ctx.measureText(powerupMessage).width + 24;
  const x = WIDTH / 2;
  const y = 48;

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillRect(x - width / 2, y - 15, width, 30);

  ctx.strokeStyle = "#243b53";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - width / 2, y - 15, width, 30);

  ctx.fillStyle = "#243b53";
  ctx.fillText(powerupMessage, x, y);
  ctx.restore();
}

function draw() {
  drawBackground();

  for (const pipe of pipes) drawPipe(pipe);
  for (const coin of coins) if (!coin.collected) drawCoin(coin);
  for (const powerup of powerups) if (!powerup.collected) drawPowerup(powerup);

  drawGround();
  drawBird();
  drawPowerupHUD();
  drawPowerupMessage();
}

// ---------- CONTROLS ----------

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

createShop();
setupSkinSelector();
updateHUD();

bird = createBird();
pipes = [makePipe(WIDTH + 80)];
draw();
