window.addEventListener("DOMContentLoaded", () => {
  // キャンバスの設定
  const canvas = document.getElementById("winterCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // デバイスピクセル比に対応した鮮明な描画設定
  let dpr = window.devicePixelRatio || 1;
  let width, height;

  // 夜のテーマ設定（固定してコードを軽量化）
  const theme = {
    skyStart: "#708090", // 深い夜空
    skyEnd: "#1e1b4b",
    hillBack: "#1e293b",
    hillFront: "#e2e8f0",
    snowColor: "rgba(255, 255, 255, 0.85)",
    shadowColor: "rgba(30, 27, 75, 0.25)",
    ambient: "#cbd5e1",
  };

  // アニメーション設定
  const SNOWFLAKE_COUNT = 150; // 雪の量（パフォーマンスと見た目のベストバランス）
  let snowflakes = [];
  let particles = []; // クリックエフェクト用のスパークル
  let currentWind = 0.15; // 自動で変化する風の初期値

  // 雪だるまのアニメーションステート
  let snowman = {
    x: 0,
    y: 0,
    baseSize: 70, // 基準サイズ (リサイズ時に動的変化)
    jumpY: 0,
    jumpVal: 0,
    tilt: 0,
    tiltTarget: 0,
    isJumping: false,
    armAngle: 0,
    blushAlpha: 0.6,
    clickRadius: 100,
  };

  // キャンバスのリサイズ処理
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 雪だるまの位置を画面下部中央に
    snowman.x = width / 2;
    snowman.y = height * 0.82;
    snowman.baseSize = Math.min(width, height) * 0.12; // 画面サイズに比例して最適化
    if (snowman.baseSize < 55) snowman.baseSize = 55;
    if (snowman.baseSize > 95) snowman.baseSize = 95;
    snowman.clickRadius = snowman.baseSize * 2.2;

    // 雪を画面全体に再配置
    initSnowflakes();
  }

  // 雪片クラス
  class Snowflake {
    constructor(initRandomY = false) {
      this.reset(initRandomY);
    }

    reset(initRandomY = false) {
      this.x = Math.random() * width;
      this.y = initRandomY ? Math.random() * height : -10;
      this.r = Math.random() * 3.5 + 1; // 1px 〜 4.5px のサイズ
      this.speed = Math.random() * 1.2 + 0.4; // 落下速度
      this.density = Math.random() * 20; // 風への反応度
      this.opacity = Math.random() * 0.6 + 0.4;
      this.swaySpeed = Math.random() * 0.015 + 0.005;
      this.swayAngle = Math.random() * Math.PI * 2;
      this.swayRange = Math.random() * 1.2 + 0.4;
    }

    update() {
      // 横揺れ（サイン波）
      this.swayAngle += this.swaySpeed;
      this.x += Math.sin(this.swayAngle) * this.swayRange;

      // 落下速度と風の適用
      this.y += this.speed;
      this.x += currentWind * (this.density * 0.2 + 0.5);

      // 画面外に出た場合のループ処理
      if (this.y > height + 10) {
        this.reset(false);
      }
      if (this.x > width + 10) {
        this.x = -10;
      } else if (this.x < -10) {
        this.x = width + 10;
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = theme.snowColor;
      ctx.shadowBlur = this.r > 3 ? 3 : 0;
      ctx.shadowColor = "#ffffff";
      ctx.globalAlpha = this.opacity;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0; // シャドウのリセット
    }
  }

  // 雪だるまクリック時のスパークルパーティクル
  class Sparkle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1.5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 1.5; // やや上向き
      this.r = Math.random() * 3 + 1.5;
      this.alpha = 1;
      this.decay = Math.random() * 0.025 + 0.015;
      this.color = `hsl(${Math.random() * 40 + 190}, 100%, 85%)`; // 青〜シアン系のキラキラ
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.08; // 緩やかな重力
      this.alpha -= this.decay;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 雪片の初期化
  function initSnowflakes() {
    snowflakes = [];
    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      snowflakes.push(new Snowflake(true));
    }
  }

  // なだらかな丘の背景描画
  function drawHills() {
    // 遠くの丘 (後ろ)
    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.bezierCurveTo(
      width * 0.25,
      height * 0.7,
      width * 0.75,
      height * 0.85,
      width,
      height * 0.76,
    );
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = theme.hillBack;
    ctx.fill();

    // 近くの丘 (手前)
    ctx.beginPath();
    ctx.moveTo(0, height * 0.83);
    ctx.bezierCurveTo(
      width * 0.35,
      height * 0.88,
      width * 0.65,
      height * 0.78,
      width,
      height * 0.84,
    );
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = theme.hillFront;
    ctx.fill();
  }

  // 雪だるまの描画
  function drawSnowman() {
    const size = snowman.baseSize;

    ctx.save();
    // ジャンプアニメーションとわずかな傾きを適用
    ctx.translate(snowman.x, snowman.y - snowman.jumpY);
    ctx.rotate(snowman.tilt);

    // 影
    ctx.beginPath();
    ctx.ellipse(
      0,
      size * 1.05 + snowman.jumpY * 0.2,
      size * 1.1 - snowman.jumpY * 0.1,
      size * 0.25,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = theme.shadowColor;
    ctx.fill();

    // 腕 (グラデーション/枝っぽさ)
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#5c4033"; // 焦げ茶色

    // 左腕 (角度アニメーション含む)
    ctx.save();
    ctx.translate(-size * 0.7, -size * 0.1);
    ctx.rotate(-0.3 + Math.sin(snowman.armAngle) * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.7, -size * 0.3);
    // 枝分かれ1
    ctx.moveTo(-size * 0.4, -size * 0.17);
    ctx.lineTo(-size * 0.55, -size * 0.35);
    ctx.stroke();
    ctx.restore();

    // 右腕
    ctx.save();
    ctx.translate(size * 0.7, -size * 0.1);
    ctx.rotate(0.3 - Math.sin(snowman.armAngle) * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.7, -size * 0.3);
    // 枝分かれ2
    ctx.moveTo(size * 0.4, -size * 0.17);
    ctx.lineTo(size * 0.55, -size * 0.35);
    ctx.stroke();
    ctx.restore();

    // --- 体の下段 (大) ---
    let bGrad = ctx.createRadialGradient(
      -size * 0.2,
      -size * 0.2,
      size * 0.1,
      0,
      0,
      size,
    );
    bGrad.addColorStop(0, "#ffffff");
    bGrad.addColorStop(0.85, theme.ambient);
    bGrad.addColorStop(1, "#94a3b8");
    ctx.beginPath();
    ctx.arc(0, size * 0.4, size, 0, Math.PI * 2);
    ctx.fillStyle = bGrad;
    ctx.fill();

    // ボタン (石炭)
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(0, size * 0.1, size * 0.08, 0, Math.PI * 2);
    ctx.arc(0, size * 0.4, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // --- 体の上段/頭 (小) ---
    const headSize = size * 0.65;
    const headY = -size * 0.85;
    let hGrad = ctx.createRadialGradient(
      -headSize * 0.2,
      headY - headSize * 0.2,
      headSize * 0.1,
      0,
      headY,
      headSize,
    );
    hGrad.addColorStop(0, "#ffffff");
    hGrad.addColorStop(0.85, theme.ambient);
    hGrad.addColorStop(1, "#94a3b8");
    ctx.beginPath();
    ctx.arc(0, headY, headSize, 0, Math.PI * 2);
    ctx.fillStyle = hGrad;
    ctx.fill();

    // 目 (パッチリした黒い石)
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(
      -headSize * 0.3,
      headY - headSize * 0.15,
      headSize * 0.11,
      0,
      Math.PI * 2,
    );
    ctx.arc(
      headSize * 0.3,
      headY - headSize * 0.15,
      headSize * 0.11,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // にんじんの鼻 (立体的)
    ctx.save();
    ctx.translate(0, headY);
    ctx.beginPath();
    ctx.moveTo(-headSize * 0.08, -headSize * 0.02);
    ctx.lineTo(headSize * 0.55, headSize * 0.1); // 右を向く立体的な鼻
    ctx.lineTo(-headSize * 0.08, headSize * 0.12);
    ctx.quadraticCurveTo(
      -headSize * 0.15,
      headSize * 0.05,
      -headSize * 0.08,
      -headSize * 0.02,
    );
    ctx.closePath();
    let carrotGrad = ctx.createLinearGradient(
      0,
      0,
      headSize * 0.5,
      headSize * 0.1,
    );
    carrotGrad.addColorStop(0, "#ea580c");
    carrotGrad.addColorStop(1, "#f97316");
    ctx.fillStyle = carrotGrad;
    ctx.fill();
    ctx.restore();

    // 口 (スマイル)
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = headSize * 0.07;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      0,
      headY + headSize * 0.15,
      headSize * 0.25,
      0.1,
      Math.PI - 0.1,
      false,
    );
    ctx.stroke();

    // --- マフラー (揺れるアニメーション) ---
    ctx.save();
    ctx.translate(0, -size * 0.3);
    const scarfWidth = size * 0.6;
    const scarfHeight = size * 0.22;

    // 首元のマフラー本体
    ctx.beginPath();
    ctx.roundRect(
      -scarfWidth,
      -scarfHeight / 2,
      scarfWidth * 2,
      scarfHeight,
      size * 0.1,
    );
    ctx.fillStyle = "#ef4444"; // 赤
    ctx.fill();

    // ボーダー柄 (白ライン)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-scarfWidth * 0.6, -scarfHeight / 2, size * 0.1, scarfHeight);
    ctx.fillRect(scarfWidth * 0.2, -scarfHeight / 2, size * 0.1, scarfHeight);

    // 風でなびくマフラーの端
    ctx.translate(scarfWidth * 0.5, scarfHeight * 0.3);
    // 自然な風の揺らぎを計算
    const scarfSwing = Math.sin(Date.now() * 0.005) * 0.15 + currentWind * 0.2;
    ctx.rotate(0.3 + scarfSwing);
    ctx.beginPath();
    ctx.roundRect(0, 0, size * 0.25, size * 0.55, size * 0.05);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    // フリンジ (マフラーの端の房)
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, size * 0.5, size * 0.25, size * 0.08);
    ctx.restore();

    ctx.restore();

    ctx.restore(); // 雪だるまトランスフォーム全体の復元
  }

  // 背景のグラデーション描画
  function drawBackground() {
    let grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, theme.skyStart);
    grad.addColorStop(0.7, theme.skyEnd);
    grad.addColorStop(1, theme.skyEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 月を描画
    ctx.save();
    ctx.translate(width * 0.8, height * 0.2);

    // 月の輝き
    let glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
    glow.addColorStop(0, "rgba(254, 240, 138, 0.2)");
    glow.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // 月本体
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fillStyle = "#fef08a";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#fef08a";
    ctx.fill();
    ctx.shadowBlur = 0;

    // クレーター表現
    ctx.fillStyle = "rgba(234, 179, 8, 0.15)";
    ctx.beginPath();
    ctx.arc(-10, -5, 8, 0, Math.PI * 2);
    ctx.arc(5, 12, 6, 0, Math.PI * 2);
    ctx.arc(-5, 18, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // アニメーション更新＆描画ループ
  function animate() {
    // 背景
    drawBackground();

    // 自然な風のゆらぎを自動生成 (マウス追従なし)
    currentWind = 0.15 + Math.sin(Date.now() * 0.0005) * 0.1;

    // 丘
    drawHills();

    // 雪だるまアニメーションの制御
    snowman.armAngle = Date.now() * 0.002;

    // ジャンプ処理 (正弦波でなめらかに)
    if (snowman.isJumping) {
      snowman.jumpVal += 0.07;
      snowman.jumpY =
        Math.abs(Math.sin(snowman.jumpVal)) * snowman.baseSize * 0.65;
      snowman.tilt = Math.sin(snowman.jumpVal * 2) * 0.12;

      // 着地判定
      if (snowman.jumpVal >= Math.PI) {
        snowman.isJumping = false;
        snowman.jumpY = 0;
        snowman.tilt = 0;
        // 着地時の火花エフェクト
        for (let i = 0; i < 15; i++) {
          particles.push(
            new Sparkle(
              snowman.x + (Math.random() - 0.5) * snowman.baseSize * 1.5,
              snowman.y,
            ),
          );
        }
      }
    } else {
      // 待機時の微小なゆらぎ
      snowman.tilt += (snowman.tiltTarget - snowman.tilt) * 0.08;
      snowman.tiltTarget = Math.sin(Date.now() * 0.001) * 0.015;
    }

    // 雪だるま描画
    drawSnowman();

    // パーティクル（スパークル）の処理
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    // 雪片の処理
    snowflakes.forEach((snowflake) => {
      snowflake.update();
      snowflake.draw();
    });

    requestAnimationFrame(animate);
  }

  // 雪だるまクリック時のジャンプ
  function triggerJump() {
    if (!snowman.isJumping) {
      snowman.isJumping = true;
      snowman.jumpVal = 0;

      // タップ箇所中心から多量のきらめきを発生
      for (let i = 0; i < 20; i++) {
        particles.push(
          new Sparkle(snowman.x, snowman.y - snowman.baseSize * 0.8),
        );
      }
    }
  }

  // イベントリスナーの登録
  window.addEventListener("resize", resize);

  // クリック判定 (雪だるまとの接触判定)
  const checkClick = (clickX, clickY) => {
    // 雪だるまの中心座標（頭付近を考慮した高さ）
    const targetY = snowman.y - snowman.baseSize * 0.6;
    const dist = Math.hypot(clickX - snowman.x, clickY - targetY);

    if (dist < snowman.clickRadius) {
      triggerJump();
    }
  };

  window.addEventListener("mousedown", (e) => {
    checkClick(e.clientX, e.clientY);
  });

  window.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 0) {
        checkClick(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: true },
  );

  // 初期設定と起動

  resize();
  // アニメーション開始
  animate();
});
