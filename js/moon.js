window.addEventListener("DOMContentLoaded", () => {
  // キャンバスの初期設定
  const canvas = document.getElementById("starCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const sky = document.getElementById("sky");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // リサイズ対応
  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initStars();
  });

  // 星オブジェクトの設計
  class Star {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height * 0.8; // 下部には少なめにする
      this.size = Math.random() * 1.5 + 0.2; // 星の大きさ
      this.baseOpacity = Math.random() * 0.7 + 0.3; // ベースの透明度
      this.opacity = this.baseOpacity;
      this.speed = Math.random() * 0.05 + 0.01; // 瞬きのスピード
      this.angle = Math.random() * Math.PI * 2;
      // 星の色（青白い、白、黄色っぽいなどのバリエーション）
      const colors = ["#ffffff", "#fff9e6", "#e6f2ff", "#f3e5ab"];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    // 瞬きのアニメーション更新
    update() {
      this.angle += this.speed;
      // コサイン波を使って滑らかに不透明度を揺らす
      this.opacity = this.baseOpacity + Math.sin(this.angle) * 0.3;
      if (this.opacity < 0.1) this.opacity = 0.1;
      if (this.opacity > 1) this.opacity = 1;
    }

    draw() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.fill();
      ctx.restore();
    }
  }

  // 流れ星オブジェクトの設計
  class ShootingStar {
    constructor(startX, startY) {
      this.reset(startX, startY);
    }

    reset(startX, startY) {
      // 開始座標（指定がなければ画面上部・左側からランダム）
      this.x = startX !== undefined ? startX : Math.random() * width * 0.6;
      this.y = startY !== undefined ? startY : Math.random() * height * 0.4;

      // 角度（右斜め下へ流れる）
      this.length = Math.random() * 80 + 50; // 尾の長さ
      this.speed = Math.random() * 15 + 10; // 速度
      this.dx = Math.cos(Math.PI / 6) * this.speed; // 30度傾斜
      this.dy = Math.sin(Math.PI / 6) * this.speed;
      this.opacity = 1;
      this.fadeSpeed = Math.random() * 0.02 + 0.015; // 消え去るスピード
      this.active = true;
    }

    update() {
      this.x += this.dx;
      this.y += this.dy;
      this.opacity -= this.fadeSpeed;

      if (this.opacity <= 0) {
        this.active = false;
      }
    }

    draw() {
      if (!this.active) return;

      ctx.save();
      // 流れ星の頭から尾にかけてのグラデーションを作成
      const grad = ctx.createLinearGradient(
        this.x,
        this.y,
        this.x - this.dx * (this.length / this.speed),
        this.y - this.dy * (this.length / this.speed),
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
      grad.addColorStop(0.1, `rgba(230, 240, 255, ${this.opacity * 0.6})`);
      grad.addColorStop(1, `rgba(100, 150, 255, 0)`);

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.random() * 1.5 + 1.5;
      ctx.lineCap = "round";
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x - this.dx * (this.length / this.speed),
        this.y - this.dy * (this.length / this.speed),
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  // 星と流れ星の配列定義
  let stars = [];
  let shootingStars = [];
  const maxStars = 150;

  function initStars() {
    stars = [];
    for (let i = 0; i < maxStars; i++) {
      stars.push(new Star());
    }
  }

  // 定期的に自然発生する流れ星のトリガー
  function triggerNaturalShootingStar() {
    if (Math.random() < 0.003 && shootingStars.length < 3) {
      shootingStars.push(new ShootingStar());
    }
  }

  // インタラクティブ：クリック・タップした位置に流れ星を降らせる
  sky.addEventListener("mousedown", (e) => {
    shootingStars.push(new ShootingStar(e.clientX, e.clientY));
  });

  // モバイルタッチ対応
  sky.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 0) {
        shootingStars.push(
          new ShootingStar(e.touches[0].clientX, e.touches[0].clientY),
        );
      }
    },
    { passive: true },
  );

  // アニメーションループ
  function animate() {
    // 前のフレームを少し透明度を残して消すことで、星の残像感を作る
    ctx.fillStyle = "rgba(5, 5, 16, 0.2)";
    ctx.fillRect(0, 0, width, height);

    // 背景クリアを確実に行いつつ、暗闇を維持
    ctx.clearRect(0, 0, width, height);

    // 1. 固定の星屑を描画
    stars.forEach((star) => {
      star.update();
      star.draw();
    });

    // 2. 流れ星の自然発生チェックと描画
    triggerNaturalShootingStar();

    shootingStars = shootingStars.filter((s) => s.active);
    shootingStars.forEach((s) => {
      s.update();
      s.draw();
    });

    requestAnimationFrame(animate);
  }

  // 初期化と実行
  initStars();
  animate();
});
