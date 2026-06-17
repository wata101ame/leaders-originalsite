const canvas = document.getElementById("rainCanvas");
const ctx = canvas.getContext("2d");
let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  initRain();
});

let rainParticles = [];
let splashParticles = [];
let rainSettings = {
  count: 140,
  speedMin: 10,
  speedMax: 20,
  lengthMin: 15,
  lengthMax: 30,
  angle: -0.05,
};

class RainDrop {
  constructor() {
    this.reset();
    this.y = Math.random() * height;
  }
  reset() {
    this.x = Math.random() * width;
    this.y = -20;
    this.speed =
      Math.random() * (rainSettings.speedMax - rainSettings.speedMin) +
      rainSettings.speedMin;
    this.length =
      Math.random() * (rainSettings.lengthMax - rainSettings.lengthMin) +
      rainSettings.lengthMin;
    this.weight = Math.random() * 1 + 0.5;
    const hue = Math.random() > 0.5 ? 270 : 150;
    this.color = `rgba(${hue === 270 ? "168, 85, 247" : "52, 211, 153"}, ${Math.random() * 0.25 + 0.1})`;
  }
  update() {
    this.x += rainSettings.angle * this.speed;
    this.y += this.speed;
    if (this.y > height) {
      if (Math.random() > 0.4) createSplash(this.x, height - 10);
      this.reset();
    }
  }
  draw() {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + rainSettings.angle * this.length, this.y + this.length);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.weight;
    ctx.stroke();
  }
}

class Splash {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 4 - 2;
    this.vy = -Math.random() * 3 - 1;
    this.life = 1.0;
    this.decay = Math.random() * 0.05 + 0.03;
    this.color =
      Math.random() > 0.5
        ? "rgba(168, 85, 247, 0.4)"
        : "rgba(52, 211, 153, 0.4)";
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= this.decay;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace("0.4", this.life * 0.4);
    ctx.fill();
  }
}

function initRain() {
  rainParticles = [];
  for (let i = 0; i < rainSettings.count; i++) {
    rainParticles.push(new RainDrop());
  }
}

function createSplash(x, y) {
  for (let i = 0; i < 3; i++) {
    splashParticles.push(new Splash(x, y));
  }
}

// 描画アニメーション
function animate() {
  ctx.fillStyle = "rgba(15, 23, 42, 0.15)";
  ctx.fillRect(0, 0, width, height);
  rainParticles.forEach((particle) => {
    particle.update();
    particle.draw();
  });
  for (let i = splashParticles.length - 1; i >= 0; i--) {
    const splash = splashParticles[i];
    splash.update();
    splash.draw();
    if (splash.life <= 0) splashParticles.splice(i, 1);
  }
  requestAnimationFrame(animate);
}

// 波紋
const rippleContainer = document.getElementById("rippleContainer");
window.addEventListener("click", (e) => createRipple(e.clientX, e.clientY));
window.addEventListener("touchstart", (e) => {
  if (e.touches.length > 0)
    createRipple(e.touches[0].clientX, e.touches[0].clientY);
});

function createRipple(x, y) {
  const ripple = document.createElement("div");
  ripple.classList.add("ripple");
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  if (Math.random() > 0.5) {
    ripple.style.borderColor = "rgba(168, 85, 247, 0.5)";
    ripple.style.boxShadow = "0 0 15px rgba(168, 85, 247, 0.2)";
  } else {
    ripple.style.borderColor = "rgba(52, 211, 153, 0.5)";
    ripple.style.boxShadow = "0 0 15px rgba(52, 211, 153, 0.2)";
  }
  rippleContainer.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

window.onload = () => {
  initRain();
  animate();
};
