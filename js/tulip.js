// --- 設定 & グローバル変数 ---
// ID変更に合わせて tulipcanvas を取得
window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("tulipcanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  let tulips = [];
  let particles = [];
  let globalWindAngle = 0;

  // デフォルト設定（UIがなくても心地よく鑑賞できる最適な値に調整）
  const windStrengthSetting = 1.0;
  const growthSpeedSetting = 1.5;
  const selectedPalette = "pink"; // クリック時に追加されるチューリップの基本色

  // カラーパレット定義
  const PALETTES = {
    pink: {
      petalOuter: "#ff758f",
      petalInner: "#ff8fab",
      petalHighlight: "#ffe5ec",
      center: "#ffb3c1",
    },
    yellow: {
      petalOuter: "#f9c74f",
      petalInner: "#f9dcc4",
      petalHighlight: "#fff2e6",
      center: "#f3a712",
    },
    purple: {
      petalOuter: "#9d4edd",
      petalInner: "#c77dff",
      petalHighlight: "#e0aaff",
      center: "#7b2cbf",
    },
    orange: {
      petalOuter: "#f3722c",
      petalInner: "#f8961e",
      petalHighlight: "#f9c74f",
      center: "#f9844a",
    },
  };

  // --- クラス定義 ---

  // 背景の光る粒子（パーティクル）
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(init = false) {
      this.x = Math.random() * width;
      this.y = init ? Math.random() * height : height + 10;
      this.size = Math.random() * 3 + 1;
      this.speedY = -(Math.random() * 0.8 + 0.4);
      this.speedX = Math.random() * 0.6 - 0.3;
      this.alpha = Math.random() * 0.6 + 0.3;
      this.hue = Math.random() > 0.5 ? 340 : 80; // ピンクか明るい黄緑の光
    }

    update() {
      this.y += this.speedY;
      // 風の力を少し受ける
      this.x += this.speedX + Math.sin(globalWindAngle) * 0.3;

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset(false);
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.shadowBlur = this.size * 1.5;
      ctx.shadowColor = `hsla(${this.hue}, 100%, 60%, 0.5)`;
      ctx.fillStyle = `hsla(${this.hue}, 100%, 85%, 1)`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 葉っぱの定義
  class Leaf {
    constructor(parentStemHeight, isLeft, scale = 1) {
      this.parentStemPercent = 0.3 + Math.random() * 0.3; // 茎のどの高さから生えるか (0.3 ~ 0.6)
      this.isLeft = isLeft;
      this.size = (40 + Math.random() * 30) * scale;
      this.angleOffset = isLeft ? -Math.PI / 4 : Math.PI / 4;
      this.flexibility = 0.3 + Math.random() * 0.4;
      this.currentGrowth = 0; // 0 から 1 に成長
    }

    update(growth, windEffect) {
      // 茎がある程度伸びてから葉っぱが成長し始める
      if (growth > this.parentStemPercent) {
        const targetGrowth =
          (growth - this.parentStemPercent) / (1 - this.parentStemPercent);
        this.currentGrowth +=
          (Math.min(1, targetGrowth) - this.currentGrowth) * 0.1;
      }
    }

    draw(startX, startY, stemAngle, scale = 1) {
      if (this.currentGrowth <= 0) return;

      ctx.save();
      ctx.translate(startX, startY);
      // 茎の傾き ＋ 葉っぱ本来の角度 ＋ 風の追加影響
      const leafAngle =
        stemAngle +
        this.angleOffset +
        Math.sin(globalWindAngle) * 0.15 * this.flexibility;
      ctx.rotate(leafAngle);

      // 成長に応じたサイズ
      const currentSize = this.size * this.currentGrowth * scale;

      // 葉を描画
      ctx.beginPath();
      ctx.moveTo(0, 0);

      // コントロールポイントを調整して美しい葉の曲線を表現
      const cp1x = this.isLeft ? -currentSize * 0.5 : currentSize * 0.5;
      const cp1y = -currentSize * 0.4;
      const cp2x = this.isLeft ? -currentSize * 0.2 : currentSize * 0.2;
      const cp2y = -currentSize * 0.9;
      const endX = 0;
      const endY = -currentSize;

      // 左半分 / 右半分
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.bezierCurveTo(cp2x * 0.4, cp2y * 0.8, cp1x * 0.1, cp1y * 0.5, 0, 0);

      // 葉のグラデーション
      const grad = ctx.createLinearGradient(0, 0, cp1x, -currentSize * 0.5);
      grad.addColorStop(0, "#2d6a4f");
      grad.addColorStop(0.5, "#40916c");
      grad.addColorStop(1, "#1b4332");

      ctx.fillStyle = grad;
      ctx.fill();

      // 葉脈を薄く入れる
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -currentSize * 0.9);
      ctx.stroke();

      ctx.restore();
    }
  }

  // チューリップ本体
  class Tulip {
    constructor(x, targetHeight, paletteName) {
      this.x = x;
      this.baseY = height + 50; // 画面下部より少し外からスタート
      this.targetHeight = targetHeight; // 茎の最大の長さ
      this.scale = 0.6 + Math.random() * 0.5; // 個別のサイズ倍率

      // 成長状態 (0: 種/地面 -> 1: 完全成長)
      this.growth = 0;

      // 揺れの物理パラメータ
      this.swayOffset = Math.random() * Math.PI * 2; // 個別の初期位相
      this.swaySpeed = 0.015 + Math.random() * 0.01;
      this.flexibility = 0.5 + Math.random() * 0.8; // 柔らかさ（しなり具合）

      // 茎のセグメント化（リアルな曲線しなりのため）
      this.segmentsCount = 10;

      // カラーパレットを設定
      this.palette = PALETTES[paletteName] || PALETTES.pink;

      // 葉っぱを生成
      this.leaves = [
        new Leaf(0.25, true, this.scale), // 左の葉
        new Leaf(0.45, false, this.scale), // 右の葉
      ];

      // 花が開くタイミング調整用
      this.bloomStart = 0.75; // 茎が75%伸びたら花が咲き始める
      this.bloomScale = 0;
    }

    update() {
      // 1. 成長ロジック
      if (this.growth < 1) {
        this.growth += 0.005 * growthSpeedSetting;
        if (this.growth > 1) this.growth = 1;
      }

      // 花の咲き具合
      if (this.growth > this.bloomStart) {
        const t = (this.growth - this.bloomStart) / (1 - this.bloomStart);
        // イージングをかけてふわっと咲かせる
        this.bloomScale = 1 - Math.pow(1 - t, 3);
      }

      // 2. 葉っぱの更新
      this.leaves.forEach((leaf) =>
        leaf.update(this.growth, windStrengthSetting),
      );
    }

    draw() {
      // 成長中の実際の茎の長さ
      const currentStemLength = this.targetHeight * this.growth;

      // 茎の各点を計算（風の影響でゆらゆらとしなる曲線）
      let points = [];
      let currentX = this.x;
      let currentY = this.baseY;

      // 風による全体への力
      const windForce =
        Math.sin(globalWindAngle + this.swayOffset) *
        0.25 *
        windStrengthSetting *
        this.flexibility;

      points.push({ x: currentX, y: currentY, angle: 0 });

      const segmentLength = currentStemLength / this.segmentsCount;

      for (let i = 1; i <= this.segmentsCount; i++) {
        const ratio = i / this.segmentsCount;

        // 上に行くほど風の影響（曲がり具合）を大きく受けるように
        const segmentWind = windForce * Math.pow(ratio, 1.8);

        // 茎本来の緩やかなカーブ（ちょっと左や右に最初から傾いているような個性）
        const naturalCurvature = Math.sin(this.swayOffset + ratio) * 0.05;

        const angle = segmentWind + naturalCurvature;

        currentX += Math.sin(angle) * segmentLength;
        currentY -= Math.cos(angle) * segmentLength;

        points.push({ x: currentX, y: currentY, angle: angle });
      }

      const tip = points[points.length - 1];

      // --- 茎 (Stem) の描画 ---
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      // グラデーションの茎
      const stemGrad = ctx.createLinearGradient(
        this.x,
        this.baseY,
        tip.x,
        tip.y,
      );
      stemGrad.addColorStop(0, "#1b4332");
      stemGrad.addColorStop(1, "#52b788");

      ctx.strokeStyle = stemGrad;
      ctx.lineWidth = 6 * this.scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 茎の影
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.stroke();
      ctx.restore();

      // --- 葉っぱ (Leaves) の描画 ---
      this.leaves.forEach((leaf) => {
        // 該当パーセンテージのインデックスを取得
        const segIndex = Math.floor(
          leaf.parentStemPercent * this.segmentsCount,
        );
        if (segIndex < points.length) {
          const pt = points[segIndex];
          leaf.draw(pt.x, pt.y, pt.angle, this.scale);
        }
      });

      // --- 花 (Flower) の描画 ---
      if (this.bloomScale > 0) {
        this.drawFlower(tip.x, tip.y, tip.angle, this.scale * this.bloomScale);
      }
    }

    // チューリップの花の描画
    drawFlower(x, y, angle, scale) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      const flowerWidth = 32;
      const flowerHeight = 52;

      // 影の設定
      ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // 1. 後ろ側の花びら (Back Petals) - 左右に少し広がる
      ctx.fillStyle = this.palette.petalOuter;

      // 左後ろ
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        -flowerWidth * 0.9,
        -flowerHeight * 0.2,
        -flowerWidth * 0.7,
        -flowerHeight * 0.9,
        -flowerWidth * 0.3,
        -flowerHeight * 0.85,
      );
      ctx.bezierCurveTo(
        -flowerWidth * 0.1,
        -flowerHeight * 0.8,
        -flowerWidth * 0.1,
        -flowerHeight * 0.3,
        0,
        0,
      );
      ctx.fill();

      // 右後ろ
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        flowerWidth * 0.9,
        -flowerHeight * 0.2,
        flowerWidth * 0.7,
        -flowerHeight * 0.9,
        flowerWidth * 0.3,
        -flowerHeight * 0.85,
      );
      ctx.bezierCurveTo(
        flowerWidth * 0.1,
        -flowerHeight * 0.8,
        flowerWidth * 0.1,
        -flowerHeight * 0.3,
        0,
        0,
      );
      ctx.fill();

      // 2. 中央のめしべ/中心部 (Flower Center Inside)
      ctx.fillStyle = this.palette.center;
      ctx.beginPath();
      ctx.ellipse(
        0,
        -flowerHeight * 0.35,
        flowerWidth * 0.2,
        flowerHeight * 0.25,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // 3. 中央のメイン花びら (Center Front Petal)
      // グラデーションで奥行きを表現
      const centerGrad = ctx.createLinearGradient(0, 0, 0, -flowerHeight);
      centerGrad.addColorStop(0, this.palette.petalOuter);
      centerGrad.addColorStop(0.5, this.palette.petalInner);
      centerGrad.addColorStop(1, this.palette.petalHighlight);

      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // 美しいチューリップのふっくらした形をベジェ曲線で再現
      ctx.bezierCurveTo(
        -flowerWidth * 0.7,
        -flowerHeight * 0.1,
        -flowerWidth * 0.6,
        -flowerHeight * 0.95,
        0,
        -flowerHeight,
      );
      ctx.bezierCurveTo(
        flowerWidth * 0.6,
        -flowerHeight * 0.95,
        flowerWidth * 0.7,
        -flowerHeight * 0.1,
        0,
        0,
      );
      ctx.closePath();
      ctx.fill();

      // 中央花びらのハイライト/テクスチャライン
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.quadraticCurveTo(
        -flowerWidth * 0.15,
        -flowerHeight * 0.4,
        0,
        -flowerHeight * 0.9,
      );
      ctx.stroke();

      // 4. ガク (Receptacle / Green base of the flower)
      ctx.fillStyle = "#40916c";
      ctx.beginPath();
      ctx.moveTo(-flowerWidth * 0.2, -2);
      ctx.quadraticCurveTo(0, 10, flowerWidth * 0.2, -2);
      ctx.quadraticCurveTo(0, -2, -flowerWidth * 0.2, -2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- 初期設定 & リサイズ処理 ---

  function init() {
    tulips = [];
    particles = [];

    // 画面サイズに応じて適正な初期チューリップ数を決定
    const initialTulipsCount = Math.max(
      3,
      Math.min(8, Math.floor(width / 150)),
    );

    for (let i = 0; i < initialTulipsCount; i++) {
      // 等間隔に分散配置
      const spacing = width / (initialTulipsCount + 1);
      const x = spacing * (i + 1) + (Math.random() * 40 - 20);
      const targetHeight = height * 0.45 + Math.random() * (height * 0.2);

      // 初期チューリップはいろいろな色がランダムに咲くように設定
      const palettes = ["pink", "yellow", "purple", "orange"];
      const randomPalette =
        palettes[Math.floor(Math.random() * palettes.length)];

      // 時間差で生えさせる
      setTimeout(() => {
        tulips.push(new Tulip(x, targetHeight, randomPalette));
      }, i * 350);
    }

    // 粒子の生成
    const particleCount = Math.floor((width * height) / 15000);
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
  }

  // リサイズ時のハンドラ
  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    // 茎のボトム位置などを追従させるために再初期化
    init();
  });

  // --- アニメーションループ ---

  function animate(timestamp) {
    // 背景のクリア
    ctx.fillStyle = "rgba(182, 224, 129, 0.25)";
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#e8f7d3");
    bgGrad.addColorStop(0.6, "#b6e081");
    bgGrad.addColorStop(1, "#9cd162");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 地面のうっすらとした丘の描画（レイヤーの深み出し）
    drawGround();

    // グローバルな風の周期更新
    globalWindAngle += 0.012 * windStrengthSetting;

    // 背景粒子の描画
    particles.forEach((p) => {
      p.update();
      p.draw();
    });

    // チューリップの更新と描画
    tulips.forEach((t) => {
      t.update();
      t.draw();
    });

    // 手前の地面の丘を描画（チューリップの根元を隠して自然に見せる）
    drawForegroundGround();

    requestAnimationFrame(animate);
  }

  // 背景用のなだらかな丘
  function drawGround() {
    ctx.save();
    ctx.fillStyle = "#7bc655";
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.quadraticCurveTo(width * 0.3, height - 40, width * 0.7, height - 15);
    ctx.lineTo(width, height - 50);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 手前用のなだらかな丘
  function drawForegroundGround() {
    ctx.save();

    // グラデーションの芝生/地面
    const groundGrad = ctx.createLinearGradient(0, height - 40, 0, height);
    groundGrad.addColorStop(0, "#599c35");
    groundGrad.addColorStop(0.3, "#437d23");
    groundGrad.addColorStop(1, "#2e5a14");
    ctx.fillStyle = groundGrad;

    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height - 25);
    ctx.quadraticCurveTo(width * 0.4, height - 10, width * 0.8, height - 30);
    ctx.lineTo(width, height - 20);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 境界のぼかし（ハイライト）
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  // --- インタラクション (クリックでチューリップ植え付け) ---

  canvas.addEventListener("click", (e) => {
    // クリック位置から新チューリップが成長
    const clickX = e.clientX;
    const clickY = e.clientY;

    let targetHeight = height - clickY;
    targetHeight = Math.max(
      height * 0.3,
      Math.min(height * 0.85, targetHeight),
    );

    // クリック時に咲くカラーはランダムなパレットを選択
    const palettes = ["pink", "yellow", "purple", "orange"];
    const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];

    // チューリップを追加
    const newTulip = new Tulip(clickX, targetHeight, randomPalette);
    tulips.push(newTulip);

    // クリックエフェクト（ちょっとしたきらめき）
    createSparks(clickX, height - 10);
  });

  // タッチ操作のサポート（モバイル対応）
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const clickX = touch.clientX;
      const clickY = touch.clientY;
      let targetHeight = height - clickY;
      targetHeight = Math.max(
        height * 0.3,
        Math.min(height * 0.85, targetHeight),
      );

      const palettes = ["pink", "yellow", "purple", "orange"];
      const randomPalette =
        palettes[Math.floor(Math.random() * palettes.length)];

      const newTulip = new Tulip(clickX, targetHeight, randomPalette);
      tulips.push(newTulip);
      createSparks(clickX, height - 10);
    }
  });

  // 植えた時のきらめきエフェクト
  function createSparks(x, y) {
    for (let i = 0; i < 15; i++) {
      const p = new Particle();
      p.x = x + (Math.random() * 40 - 20);
      p.y = y - Math.random() * 20;
      p.speedY = -(Math.random() * 3 + 2);
      p.speedX = Math.random() * 4 - 2;
      p.size = Math.random() * 3 + 1.5;
      p.alpha = 1;
      particles.push(p);
    }
  }

  // --- スタート ---

  init();
  animate();
});
