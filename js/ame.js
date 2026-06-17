window.addEventListener("DOMContentLoaded", () => {
  // Canvasの取得先IDをame-canvasに変更
  const canvas = document.getElementById("ame-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hintText = document.getElementById("hint-text");

  // --- 固定設定値 ---
  const CONFIG = {
    speed: 1.0, // 波の広がる速度倍率
    maxRadius: 250, // 波紋の最大半径
    lineWidth: 1.5, // 線の基本の太さ
    rainChance: 0.015, // 自動滴下のフレームごと確率
  };

  // 固定色 (白: #ffffff)
  const RIPPLE_COLOR = { r: 255, g: 255, b: 255 };

  // --- 波紋オブジェクトクラス ---
  class RippleRing {
    constructor(x, y, delay, maxRadius, speedFactor) {
      this.x = x;
      this.y = y;
      this.delay = delay; // 開始遅延フレーム数
      this.radius = 0;
      this.maxRadius = maxRadius * (0.8 + Math.random() * 0.4); // 半径にわずかな個体差
      this.speedFactor = speedFactor;
      this.alpha = 1.0;
      this.age = 0;
    }

    update() {
      if (this.delay > 0) {
        this.delay--;
        return true; // まだ開始していない
      }

      this.age++;

      // イージング効果: 最初は速く、後半はゆっくり広がる
      const progress = this.radius / this.maxRadius;
      const currentSpeed =
        (1.0 - progress * 0.85) * 8 * CONFIG.speed * this.speedFactor;

      this.radius += Math.max(currentSpeed, 0.5);

      // アルファ(透明度)のフェードアウト
      this.alpha = 1.0 - this.radius / this.maxRadius;

      // 寿命に達するかアルファ値が0以下になったら消滅
      return this.radius < this.maxRadius && this.alpha > 0;
    }

    draw() {
      if (this.delay > 0 || this.alpha <= 0) return;

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

      // 広がるにつれて線が細くなる効果
      ctx.lineWidth = CONFIG.lineWidth * this.alpha;
      ctx.strokeStyle = `rgba(${RIPPLE_COLOR.r}, ${RIPPLE_COLOR.g}, ${RIPPLE_COLOR.b}, ${this.alpha})`;
      ctx.stroke();
    }
  }

  // 波紋の全体管理配列
  let ripples = [];

  // 水面に1回滴が落ちたときに、干渉する複数の波紋（同心円群）を作る
  function createRipple(x, y, speedFactor = 1.0) {
    const ringCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < ringCount; i++) {
      const delay = i * 15;
      ripples.push(new RippleRing(x, y, delay, CONFIG.maxRadius, speedFactor));
    }
  }

  // --- レンダリング・ループ ---
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener("resize", resize);
  resize();

  function drawLoop() {
    // 残像なし固定：毎フレームキャンバスを完全にクリア
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 自動滴下
    if (Math.random() < CONFIG.rainChance) {
      const rx = Math.random() * window.innerWidth;
      const ry = Math.random() * window.innerHeight;
      createRipple(rx, ry, 0.6); // 自動の雨は少し穏やかに
    }

    // 波紋の更新と描画
    ripples = ripples.filter((ripple) => {
      const alive = ripple.update();
      if (alive) {
        ripple.draw();
      }
      return alive;
    });

    requestAnimationFrame(drawLoop);
  }

  // ループ開始
  drawLoop();

  // --- インタラクション操作 ---

  // 一定時間で案内テキストをフェードアウト
  setTimeout(() => {
    hintText.classList.add("opacity-0");
  }, 6000);

  let isPointerDown = false;
  let lastPos = { x: 0, y: 0 };

  function handleStart(e) {
    isPointerDown = true;
    hintText.classList.add("opacity-0");

    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);

    lastPos = { x, y };
    createRipple(x, y, 1.0);
  }

  function handleMove(e) {
    if (!isPointerDown) return;

    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);

    // 前回の位置から一定距離離れた場合のみドラッグ波紋を生成
    const distance = Math.hypot(x - lastPos.x, y - lastPos.y);
    if (distance > 45) {
      createRipple(x, y, 0.8);
      lastPos = { x, y };
    }
  }

  function handleEnd() {
    isPointerDown = false;
  }

  // マウスイベント
  window.addEventListener("mousedown", handleStart);
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleEnd);

  // タッチイベント (スマホ・タブレット対応)
  window.addEventListener("touchstart", handleStart, { passive: true });
  window.addEventListener("touchmove", handleMove, { passive: true });
  window.addEventListener("touchend", handleEnd);
});
