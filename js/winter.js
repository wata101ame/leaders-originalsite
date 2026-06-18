window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("winterCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  const flakes = [];
  const count = 150;

  class Snowflake {
    constructor() {
      this.reset();
      this.y = Math.random() * window.innerHeight;
    }

    reset() {
      this.x = Math.random() * window.innerWidth;
      this.y = -10;
      this.size = Math.random() * 3 + 1;
      this.speed = Math.random() * 1 + 0.5;
      this.velX = Math.random() * 0.5 - 0.25;
      this.opacity = Math.random() * 0.5 + 0.3;
    }

    update() {
      this.y += this.speed;
      this.x += this.velX;

      if (this.y > window.innerHeight) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < count; i++) {
    flakes.push(new Snowflake());
  }

  function drawBackground() {
    const winterGrad = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    winterGrad.addColorStop(0, "#000428"); // 深い紺色
    winterGrad.addColorStop(1, "#004e92"); // 明るい青
    ctx.fillStyle = winterGrad;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function animate() {
    drawBackground();
    flakes.forEach((f) => {
      f.update();
      f.draw();
    });
    requestAnimationFrame(animate);
  }

  animate();
});
