window.addEventListener("DOMContentLoaded", () => {
  // === モーショングラフィック（Canvas）エンジンの実装 ===
  const canvas = document.getElementById("autumnCanvas");
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

  // 演出パラメータ
  const activeSettings = {
    density: 120, // 画面上の葉の総量
    morphSpeed: 2, // 変形スピード
    baseWind: 2, // 基本の風力
  };

  const mouse = {
    x: -1000,
    y: -1000,
    radius: 140,
    vx: 0,
    vy: 0,
    lastX: 0,
    lastY: 0,
  };

  let leaves = [];

  // === 極座標定義によるモーフィングエンジン ===

  function getMapleRadius(angle, size) {
    const lobes = [
      { a: -Math.PI / 2, w: 0.22, h: 1.0 },
      { a: -Math.PI / 2 - 0.45, w: 0.18, h: 0.85 },
      { a: -Math.PI / 2 + 0.45, w: 0.18, h: 0.85 },
      { a: -Math.PI / 2 - 0.9, w: 0.16, h: 0.65 },
      { a: -Math.PI / 2 + 0.9, w: 0.16, h: 0.65 },
      { a: -Math.PI / 2 - 1.35, w: 0.14, h: 0.38 },
      { a: -Math.PI / 2 + 1.35, w: 0.14, h: 0.38 },
    ];

    const baseRadius = size * 0.14;
    let maxLobe = 0;
    for (let i = 0; i < lobes.length; i++) {
      const l = lobes[i];
      let diff = angle - l.a;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const lobeVal = Math.exp(-Math.pow(diff / l.w, 2)) * l.h * size * 0.86;
      if (lobeVal > maxLobe) maxLobe = lobeVal;
    }
    return baseRadius + maxLobe;
  }

  function getGinkgoRadius(angle, size) {
    let a = angle;
    while (a < -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    const center = -Math.PI / 2;
    let diff = a - center;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    const spread = 1.15;
    if (Math.abs(diff) < spread) {
      const slit = 0.18 * Math.exp(-Math.pow(diff / 0.14, 2));
      const edgeFactor = Math.cos(((diff / spread) * Math.PI) / 2);
      return size * (0.42 + edgeFactor * 0.58 - slit);
    } else {
      let backDiff = a - Math.PI / 2;
      while (backDiff < -Math.PI) backDiff += Math.PI * 2;
      while (backDiff > Math.PI) backDiff -= Math.PI * 2;
      const t = Math.abs(backDiff) / (Math.PI - spread);
      return size * 0.14 * Math.pow(t, 2);
    }
  }

  function parseRGBA(str) {
    const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match)
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: parseFloat(match[4]),
      };
    return { r: 120, g: 80, b: 80, a: 0.8 };
  }

  function interpolateColor(c1, c2, p) {
    const r = Math.round(c1.r * (1 - p) + c2.r * p);
    const g = Math.round(c1.g * (1 - p) + c2.g * p);
    const b = Math.round(c1.b * (1 - p) + c2.b * p);
    const a = c1.a * (1 - p) + c2.a * p;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // === 葉オブジェクト ===
  class Leaf {
    constructor(spawnOnScreen = false) {
      this.reset(spawnOnScreen);
    }
    reset(spawnOnScreen = false) {
      this.size = 13 + Math.random() * 18;
      this.x = Math.random() * window.innerWidth;
      this.y = -50 - Math.random() * 100;
      if (spawnOnScreen) this.y = Math.random() * window.innerHeight * 0.9;
      this.colorMaple = parseRGBA("rgba(122, 54, 45, 0.8)");
      this.colorGinkgo = parseRGBA("rgba(173, 146, 90, 0.8)");
      this.vy = (0.5 + Math.random() * 0.9) * (activeSettings.baseWind * 0.4);
      this.vx = (0.2 + Math.random() * 0.8) * (activeSettings.baseWind * 0.4);
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      this.swing = Math.random() * Math.PI * 2;
      this.swingSpeed = 0.015 + Math.random() * 0.025;
      this.swingRange = 0.4 + Math.random() * 1.2;
      this.windX = 0;
      this.windY = 0;
      this.windDecay = 0.95;
      this.morph = Math.random() < 0.5 ? 0 : 1;
      this.targetMorph = this.morph;
      this.morphRate = 0.005 + Math.random() * 0.01;
      this.nextChangeTimer = 300 + Math.random() * 600;
    }
    toggleTarget() {
      this.targetMorph = this.targetMorph === 0 ? 1 : 0;
    }
    update() {
      this.swing += this.swingSpeed;
      const hiraHira = Math.sin(this.swing) * this.swingRange;
      const baseWindX = activeSettings.baseWind * 0.4;
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouse.radius) {
        const force = (mouse.radius - dist) / mouse.radius;
        this.windX += mouse.vx * force * 1.4;
        this.windY += mouse.vy * force * 1.4;
        const angle = Math.atan2(this.y - mouse.y, this.x - mouse.x);
        this.windX += Math.cos(angle) * force * 1.8;
        this.windY += Math.sin(angle) * force * 0.6;
        if (Math.random() < 0.03) this.toggleTarget();
      }
      this.x += this.vx + baseWindX + hiraHira + this.windX;
      this.y += this.vy + this.windY;
      this.windX *= this.windDecay;
      this.windY *= this.windDecay;
      this.rotation += this.rotationSpeed + this.windX * 0.008;
      const speedMult = activeSettings.morphSpeed * 0.5;
      if (this.morph !== this.targetMorph) {
        const diff = this.targetMorph - this.morph;
        const step = this.morphRate * speedMult;
        if (Math.abs(diff) <= step) this.morph = this.targetMorph;
        else this.morph += Math.sign(diff) * step;
      }
      this.nextChangeTimer--;
      if (this.nextChangeTimer <= 0) {
        this.toggleTarget();
        this.nextChangeTimer = 400 + Math.random() * 800;
      }
      if (
        this.x > window.innerWidth + 60 ||
        this.y > window.innerHeight + 60 ||
        this.x < -60
      )
        this.reset(false);
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(Math.cos(this.swing * 0.6), 1.0);
      ctx.rotate(this.rotation);
      ctx.fillStyle = interpolateColor(
        this.colorMaple,
        this.colorGinkgo,
        this.morph,
      );
      this.drawLeafShape(this.size);
      this.drawVeins(this.size);
      this.drawStem(this.size);
      ctx.restore();
    }
    drawLeafShape(size) {
      const steps = 48;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2 - Math.PI;
        const r =
          getMapleRadius(angle, size) * (1 - this.morph) +
          getGinkgoRadius(angle, size) * this.morph;
        const px = Math.cos(angle) * r,
          py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    drawVeins(size) {
      ctx.save();
      if (this.morph < 0.95) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - this.morph) * 0.22})`;
        ctx.lineWidth = size * 0.035;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.2);
        ctx.lineTo(0, -size * 0.65);
        [-0.45, 0.45, -0.9, 0.9, -1.35, 1.35].forEach((a, i) => {
          const len = i < 2 ? size * 0.5 : i < 4 ? size * 0.4 : size * 0.25;
          ctx.moveTo(0, 0);
          ctx.lineTo(
            Math.cos(a - Math.PI / 2) * len,
            Math.sin(a - Math.PI / 2) * len,
          );
        });
        ctx.stroke();
      }
      if (this.morph > 0.05) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.morph * 0.16})`;
        ctx.lineWidth = size * 0.025;
        ctx.beginPath();
        for (let a = -Math.PI * 0.78; a <= -Math.PI * 0.22; a += 0.18) {
          ctx.moveTo(0, size * 0.35);
          ctx.lineTo(Math.cos(a) * size * 0.75, Math.sin(a) * size * 0.75);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    drawStem(size) {
      ctx.save();
      ctx.strokeStyle = "rgba(45, 38, 30, 0.22)";
      ctx.beginPath();
      ctx.moveTo(0, size * (0.15 * (1 - this.morph) + 0.35 * this.morph));
      ctx.quadraticCurveTo(
        -size * 0.08 * (1 - this.morph) + size * 0.12 * this.morph,
        size * 0.5 * (1 - this.morph) + size * 0.7 * this.morph,
        -size * 0.12 * (1 - this.morph) + size * 0.18 * this.morph,
        size * 0.7 * (1 - this.morph) + size * 1.1 * this.morph,
      );
      ctx.lineWidth = size * (0.07 * (1 - this.morph) + 0.05 * this.morph);
      ctx.stroke();
      ctx.restore();
    }
  }

  function spawnLeaves(count) {
    for (let i = 0; i < count; i++) leaves.push(new Leaf(true));
  }

  window.addEventListener("mousemove", (e) => {
    mouse.vx = e.clientX - mouse.lastX;
    mouse.vy = e.clientY - mouse.lastY;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  });

  // === アニメーションループ ===
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    leaves.forEach((leaf) => {
      leaf.update();
      leaf.draw();
    });
    mouse.vx *= 0.94;
    mouse.vy *= 0.94;
    requestAnimationFrame(animate);
  }

  window.onload = function () {
    spawnLeaves(activeSettings.density);
    animate();
  };
});
