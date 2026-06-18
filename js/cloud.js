window.addEventListener("DOMContentLoaded", () => {
  // --- 設定とグローバル変数 ---
  const canvas = document.getElementById("cloudCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const clouds = [];

  // パラメータの固定値設定
  let baseWindSpeed = 0.6; // 風の強さ
  let maxClouds = 15; // 雲の量

  // カラーテーマ設定 (青空/昼に固定)
  const themes = {
    day: {
      skyTop: "#38bdf8",
      skyBottom: "#bae6fd",
      cloudColor: "rgba(255, 255, 255, 0.75)",
      cloudShadow: "rgba(14, 165, 233, 0.15)",
      particleCount: 15,
    },
  };

  let currentTheme = themes.day;

  // 背景用のパーティクル
  const particles = [];

  // --- クラス定義 ---

  // 雲を構成する「塊（パフ）」のクラス
  class CloudPuff {
    constructor(offsetX, offsetY, radius) {
      this.offsetX = offsetX; // 雲の中心からのズレ
      this.offsetY = offsetY;
      this.radius = radius;
      this.phase = Math.random() * Math.PI * 2; // 個別のうごめきアニメーション用
      this.speed = 0.01 + Math.random() * 0.01;
    }

    update() {
      this.phase += this.speed;
    }
  }

  // ひとまとまりの「雲」のクラス
  class Cloud {
    constructor(x, y, scale = 1, direction = 1) {
      this.x = x;
      this.y = y;
      this.scale = scale;
      this.direction = direction; // 1: 左から右, -1: 右から左
      this.speedMultiplier = 0.4 + Math.random() * 0.6; // 雲ごとの速度のばらつき
      this.opacity = 0.3 + Math.random() * 0.5; // 不透明度のばらつき
      this.puffs = [];

      this.generatePuffs();
    }

    // オーガニックな雲の形をつくるために複数の円（パフ）を生成
    generatePuffs() {
      const puffCount = 7 + Math.floor(Math.random() * 8); // 7〜15個の塊

      // 中央のコア
      this.puffs.push(new CloudPuff(0, 0, 60 * this.scale));

      // 周囲にランダムに配置
      for (let i = 0; i < puffCount; i++) {
        const angle =
          (i / puffCount) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
        const distance = (20 + Math.random() * 50) * this.scale;
        const radius = (30 + Math.random() * 40) * this.scale;

        const ox = Math.cos(angle) * distance;
        // 少し横に引き伸ばした楕円状にするため、Y方向のズレを抑える
        const oy = Math.sin(angle) * distance * 0.6;

        this.puffs.push(new CloudPuff(ox, oy, radius));
      }
    }

    update() {
      // 風速と方向に基づいて移動
      this.x += baseWindSpeed * this.speedMultiplier * this.direction;

      // 各パフのうごめきを更新
      this.puffs.forEach((puff) => puff.update());
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);

      // --- 影の描画 ---
      ctx.fillStyle = currentTheme.cloudShadow;
      this.puffs.forEach((puff) => {
        const wobble = Math.sin(puff.phase) * 3 * this.scale;
        const r = Math.max(10, puff.radius + wobble);

        ctx.beginPath();
        ctx.arc(
          puff.offsetX,
          puff.offsetY + 12 * this.scale,
          r,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });

      // --- 本体の描画 ---
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = currentTheme.cloudColor;

      this.puffs.forEach((puff) => {
        const wobble = Math.sin(puff.phase) * 3 * this.scale;
        const r = Math.max(10, puff.radius + wobble);

        ctx.beginPath();
        ctx.arc(puff.offsetX, puff.offsetY, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ハイライト（立体感を出すための白い縁取り風のレイヤー）
      ctx.globalAlpha = this.opacity * 0.3;
      ctx.fillStyle = "#ffffff";
      this.puffs.forEach((puff) => {
        const wobble = Math.sin(puff.phase) * 3 * this.scale;
        const r = Math.max(5, (puff.radius + wobble) * 0.85);

        ctx.beginPath();
        ctx.arc(
          puff.offsetX - 5 * this.scale,
          puff.offsetY - 5 * this.scale,
          r,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });

      ctx.restore();
    }

    // 画面外に完全に外れたかを判定
    isOffscreen() {
      const margin = 200 * this.scale;
      if (this.direction > 0) {
        return this.x - margin > width;
      } else {
        return this.x + margin < 0;
      }
    }
  }

  // 背景に漂う光の粒子などのエフェクト用クラス
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = 1 + Math.random() * 3;
      this.speedX = (Math.random() - 0.5) * 0.5 + baseWindSpeed * 0.2;
      this.speedY = (Math.random() - 0.5) * 0.2;
      this.opacity = 0.1 + Math.random() * 0.6;
      this.color = "#ffffff";
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      // 画面外に出たらリセット
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
        this.reset();
        if (Math.random() > 0.5) {
          this.x = baseWindSpeed > 0 ? 0 : width;
        } else {
          this.y = Math.random() * height;
        }
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- 雲の管理機能 ---

  // 新しい雲を画面端に作成
  function spawnCloud(fromEdge = true) {
    const direction = Math.random() > 0.4 ? 1 : -1;

    let x;
    if (fromEdge) {
      x = direction > 0 ? -250 : width + 250;
    } else {
      x = Math.random() * width;
    }

    const y = Math.random() * (height * 0.7);
    const scale = 0.4 + Math.random() * 1.2;

    clouds.push(new Cloud(x, y, scale, direction));
  }

  // 初期化処理
  function init() {
    clouds.length = 0;
    particles.length = 0;

    for (let i = 0; i < maxClouds; i++) {
      spawnCloud(false);
    }

    for (let i = 0; i < currentTheme.particleCount; i++) {
      particles.push(new Particle());
    }

    sortClouds();
  }

  function sortClouds() {
    clouds.sort((a, b) => {
      return a.y * a.scale - b.y * b.scale;
    });
  }

  // 背景のグラデーションを描画
  function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, currentTheme.skyTop);
    gradient.addColorStop(1, currentTheme.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // --- アニメーションループ ---
  function animate() {
    drawSky();

    particles.forEach((p) => {
      p.update();
      p.draw();
    });

    for (let i = clouds.length - 1; i >= 0; i--) {
      const cloud = clouds[i];
      cloud.update();
      cloud.draw();

      if (cloud.isOffscreen()) {
        clouds.splice(i, 1);
        if (clouds.length < maxClouds) {
          spawnCloud(true);
          sortClouds();
        }
      }
    }

    if (clouds.length < maxClouds && Math.random() < 0.02) {
      spawnCloud(true);
      sortClouds();
    }

    requestAnimationFrame(animate);
  }

  // --- インタラクティブイベント ---

  // クリックした場所に新しい雲を作る
  window.addEventListener("click", (e) => {
    const scale = 0.5 + Math.random() * 0.8;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const newCloud = new Cloud(e.clientX, e.clientY, scale, direction);
    clouds.push(newCloud);
    sortClouds();

    if (clouds.length > maxClouds + 5) {
      clouds.shift();
    }
  });

  // タッチデバイス対応
  window.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    const scale = 0.5 + Math.random() * 0.8;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const newCloud = new Cloud(touch.clientX, touch.clientY, scale, direction);
    clouds.push(newCloud);
    sortClouds();

    if (clouds.length > maxClouds + 5) {
      clouds.shift();
    }
  });

  // リサイズ対応
  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    init();
  });

  // --- 開始 ---
  window.onload = function () {
    init();
    animate();
  };
});
