window.addEventListener("DOMContentLoaded", () => {
  // Canvas要素とコンテキストのセットアップ
  const canvas = document.getElementById("leavescanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // パラメータ管理 (UI削除に伴いデフォルト値で固定)
  const settings = {
    leafCount: 80,
    baseWind: 1.0,
    theme: "fresh", // fresh, deep, autumn, neon
  };

  // マウスインタラクション用ステート
  const mouse = {
    x: -1000,
    y: -1000,
    px: -1000,
    py: -1000,
    vx: 0,
    vy: 0,
    down: false,
    radius: 180,
    force: 0.15,
  };

  // ウィンドウサイズ最適化
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", () => {
    resizeCanvas();
    initLeaves();
  });
  resizeCanvas();

  // 葉のカラーパレット定義
  const colorThemes = {
    fresh: {
      mainLeaves: [
        { h: 145, s: 80, l: 35 }, // エメラルドグリーン
        { h: 120, s: 75, l: 32 }, // ブライトグリーン
        { h: 80, s: 70, l: 38 }, // 黄緑
      ],
      backLeaves: [
        { h: 150, s: 40, l: 45 },
        { h: 120, s: 35, l: 40 },
      ],
    },
  };

  // 葉のクラス定義
  class Leaf {
    constructor(isBackdrop = false) {
      this.isBackdrop = isBackdrop; // 背景のボケた小さな葉かどうか
      this.reset(true);
    }

    reset(initAll = false) {
      // 初期スポーン位置
      if (initAll) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      } else {
        if (Math.random() < 0.6) {
          this.x = Math.random() * canvas.width;
          this.y = -50 - Math.random() * 100;
        } else {
          this.x = -50 - Math.random() * 100;
          this.y = Math.random() * canvas.height;
        }
      }

      // サイズと比率
      this.baseSize = this.isBackdrop
        ? 8 + Math.random() * 10
        : 18 + Math.random() * 22;

      this.scaleX = 1;
      this.scaleY = 0.3 + Math.random() * 0.2; // 葉のふくらみ具合

      // 物理パラメータ
      this.vx = (1.5 + Math.random() * 2.5) * (this.isBackdrop ? 0.6 : 1);
      this.vy = (1.0 + Math.random() * 1.5) * (this.isBackdrop ? 0.6 : 1);

      // 揺らぎ・ウェーブ挙動のシード
      this.waveSpeedX = 0.01 + Math.random() * 0.02;
      this.waveSpeedY = 0.01 + Math.random() * 0.02;
      this.waveAngleX = Math.random() * Math.PI * 2;
      this.waveAngleY = Math.random() * Math.PI * 2;
      this.waveAmpX = 1.0 + Math.random() * 2.0;
      this.waveAmpY = 0.5 + Math.random() * 1.5;

      // 3D回転パラメーター
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.02;

      this.pitch = Math.random() * Math.PI;
      this.pitchSpeed = 0.01 + Math.random() * 0.03;

      this.yaw = Math.random() * Math.PI;
      this.yawSpeed = 0.005 + Math.random() * 0.015;

      // カラー設定
      const themeData = colorThemes[settings.theme];
      const list = this.isBackdrop
        ? themeData.backLeaves
        : themeData.mainLeaves;
      const baseColor = list[Math.floor(Math.random() * list.length)];

      this.h = baseColor.h + (Math.random() - 0.5) * 10;
      this.s = baseColor.s + (Math.random() - 0.5) * 10;
      this.l = baseColor.l + (Math.random() - 0.5) * 8;
      this.alpha = this.isBackdrop
        ? 0.15 + Math.random() * 0.25
        : 0.85 + Math.random() * 0.15;

      // 葉脈の明度調整
      this.veinLightness = Math.max(10, this.l - 12);
    }

    update() {
      const windMultiplier = settings.baseWind;

      let currentVx = this.vx * windMultiplier;
      let currentVy = this.vy;

      // 波形モーション
      this.waveAngleX += this.waveSpeedX;
      this.waveAngleY += this.waveSpeedY;
      currentVx += Math.sin(this.waveAngleX) * this.waveAmpX;
      currentVy += Math.cos(this.waveAngleY) * this.waveAmpY;

      // マウスインタラクション
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mouse.radius) {
        const force = (1.0 - dist / mouse.radius) * mouse.force;

        if (mouse.down) {
          this.x += mouse.vx * force * 4;
          this.y += mouse.vy * force * 4;
        } else {
          const angle = Math.atan2(dy, dx);
          this.x += Math.cos(angle) * force * 15;
          this.y += Math.sin(angle) * force * 15;
        }

        this.rotation += 0.05;
        this.pitch += 0.08;
      }

      this.x += currentVx;
      this.y += currentVy;

      this.rotation += this.rotSpeed;
      this.pitch += this.pitchSpeed;
      this.yaw += this.yawSpeed;

      const margin = this.baseSize * 2;
      if (this.x > canvas.width + margin || this.y > canvas.height + margin) {
        this.reset(false);
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const currentScaleX = Math.cos(this.yaw) * this.scaleX;
      const currentScaleY = Math.sin(this.pitch) * this.scaleY;
      ctx.scale(currentScaleX, currentScaleY);

      if (this.isBackdrop) {
        ctx.filter = "blur(4px)";
      } else {
        // 明るい背景に合わせたソフトなシャドウ効果
        ctx.shadowColor = "rgba(15, 35, 20, 0.15)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 6;
      }

      const length = this.baseSize * 1.5;
      const width = this.baseSize * 1.2;

      const sideIndicator = Math.sin(this.pitch);
      const isFront = sideIndicator > 0;

      let hue = this.h;
      let saturation = this.s;
      let lightness = isFront ? this.l : this.l * 0.85;

      const grad = ctx.createLinearGradient(0, -width, 0, width);
      grad.addColorStop(
        0,
        `hsla(${hue}, ${saturation}%, ${lightness + 8}%, ${this.alpha})`,
      );
      grad.addColorStop(
        0.5,
        `hsla(${hue}, ${saturation}%, ${lightness}%, ${this.alpha})`,
      );
      grad.addColorStop(
        1,
        `hsla(${hue}, ${saturation}%, ${lightness - 12}%, ${this.alpha})`,
      );

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        length * 0.3,
        -width * 1.1,
        length * 0.7,
        -width * 1.0,
        length,
        0,
      );
      ctx.bezierCurveTo(
        length * 0.7,
        width * 1.0,
        length * 0.3,
        width * 1.1,
        0,
        0,
      );
      ctx.closePath();
      ctx.fill();

      if (!this.isBackdrop) {
        ctx.strokeStyle = `hsla(${hue}, ${saturation - 10}%, ${this.veinLightness}%, ${this.alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length * 0.9, 0);
        ctx.stroke();

        ctx.lineWidth = 0.7;
        const veinSteps = 4;
        for (let i = 1; i < veinSteps; i++) {
          const ratio = i / veinSteps;
          const px = length * ratio;

          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.quadraticCurveTo(
            px + length * 0.1,
            -width * 0.3 * (1 - ratio * 0.5),
            px + length * 0.15,
            -width * 0.45 * (1 - ratio * 0.8),
          );
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.quadraticCurveTo(
            px + length * 0.1,
            width * 0.3 * (1 - ratio * 0.5),
            px + length * 0.15,
            width * 0.45 * (1 - ratio * 0.8),
          );
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  // 葉の配列の生成
  let leaves = [];
  function initLeaves() {
    leaves = [];
    const count = settings.leafCount;

    const frontCount = Math.floor(count * 0.65);
    const backCount = count - frontCount;

    for (let i = 0; i < backCount; i++) {
      leaves.push(new Leaf(true));
    }
    for (let i = 0; i < frontCount; i++) {
      leaves.push(new Leaf(false));
    }
  }

  // 環境背景色の描画
  function drawBackground() {
    // 背景クリアと、線形グラデーション (#b6e081 -> #ffffff) の描画
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#b6e081");
    grad.addColorStop(1, "#ffffff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // マウスインタラクションの慣性計算
  function updateMouseDynamics() {
    if (mouse.px !== -1000 && mouse.py !== -1000) {
      mouse.vx = mouse.x - mouse.px;
      mouse.vy = mouse.y - mouse.py;
      mouse.vx *= 0.85;
      mouse.vy *= 0.85;
    }
    mouse.px = mouse.x;
    mouse.py = mouse.y;
  }

  // メインループ
  function animate() {
    drawBackground();
    updateMouseDynamics();

    for (let i = 0; i < leaves.length; i++) {
      leaves[i].update();
      leaves[i].draw();
    }

    // マウスドラッグ中の気流エフェクト (明るい背景用グリーン気流)
    if (mouse.down && Math.random() < 0.3) {
      ctx.save();
      ctx.strokeStyle = "rgba(4, 120, 87, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, Math.random() * 40 + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  // --- マウス・タッチイベントリスナー群 ---
  function getCoords(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function handleStart(e) {
    const coords = getCoords(e);
    mouse.x = coords.x;
    mouse.y = coords.y;
    mouse.px = coords.x;
    mouse.py = coords.y;
    mouse.down = true;
  }

  function handleMove(e) {
    const coords = getCoords(e);
    mouse.x = coords.x;
    mouse.y = coords.y;
  }

  function handleEnd() {
    mouse.down = false;
    mouse.x = -1000;
    mouse.y = -1000;
    mouse.px = -1000;
    mouse.py = -1000;
    mouse.vx = 0;
    mouse.vy = 0;
  }

  // イベント設定
  window.addEventListener("mousedown", handleStart);
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleEnd);
  window.addEventListener("touchstart", handleStart, { passive: true });
  window.addEventListener("touchmove", handleMove, { passive: true });
  window.addEventListener("touchend", handleEnd, { passive: true });

  window.onload = function () {
    initLeaves();
    animate();
  };
});
