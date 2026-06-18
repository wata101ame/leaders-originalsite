window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("sakuraCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // キャンバスの解像度をウィンドウサイズに合わせる
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // デバイスピクセル比に対応する初期化
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
  });
  resizeCanvas();

  // アニメーション設定パラメータ
  const config = {
    count: 150, // 画面に舞う花びらの数
    baseSpeed: 1.0, // 落下速度の倍率
    baseWind: 1.5, // 基本の風量
  };

  // マウス/タッチ座標とインタラクション用の風
  const interaction = {
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    targetWindX: 0,
    currentWindX: 0,
    gustTimer: 0,
    gustStrength: 0,
  };

  // 背景のグラデーションカラー設定 (上がピンク、下が水色)
  const themeColor = {
    top: "#fce4ec", // 上部：淡いサクラピンク
    bottom: "#e3f2fd", // 下部：さわやかな淡いブルー
  };

  // 桜の花びらクラス
  class Petal {
    constructor() {
      this.reset(true);
    }

    reset(isInit = false) {
      // 初期配置。最初だけ画面全体に散りばめ、それ以降は画面上部か左右から発生させる
      if (isInit) {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
      } else {
        // 風向きによって左側か右側から発生させる確率を変える
        const windDir = interaction.currentWindX + config.baseWind;
        if (windDir > 1) {
          // 風が右に強い場合は、上部か左側から発生
          if (Math.random() < 0.4) {
            this.x = -20;
            this.y = Math.random() * window.innerHeight;
          } else {
            this.x = Math.random() * window.innerWidth;
            this.y = -20;
          }
        } else if (windDir < -1) {
          // 風が左に強い場合は、上部か右側から発生
          if (Math.random() < 0.4) {
            this.x = window.innerWidth + 20;
            this.y = Math.random() * window.innerHeight;
          } else {
            this.x = Math.random() * window.innerWidth;
            this.y = -20;
          }
        } else {
          // 風が弱いときはほぼ上から
          this.x = Math.random() * window.innerWidth;
          this.y = -20;
        }
      }

      // 花びらのサイズ (個体差を持たせる)
      this.size = Math.random() * 8 + 6;

      // 落下速度 (重さによって落下速度を変える)
      this.ySpeed = (Math.random() * 1.2 + 0.8) * config.baseSpeed;

      // 揺らぎ・スイング幅（ゆらゆら揺れる動き）
      this.swingSpeed = Math.random() * 0.02 + 0.01;
      this.swingAngle = Math.random() * Math.PI * 2;
      this.swingRange = Math.random() * 1.5 + 1.0;

      // 3D回転用のパラメータ（3次元的にひらひら舞う様子をシミュレート）
      this.rotX = Math.random() * Math.PI;
      this.rotY = Math.random() * Math.PI;
      this.rotZ = Math.random() * Math.PI;
      this.rotSpeedX = Math.random() * 0.03 + 0.01;
      this.rotSpeedY = Math.random() * 0.05 + 0.02;
      this.rotSpeedZ = Math.random() * 0.02 + 0.01;

      // 花びらの色。わずかにばらつきを持たせて自然にする
      const pinkHue = Math.floor(Math.random() * 15) + 340; // 340 ~ 355 (ピンク)
      const lightness = Math.floor(Math.random() * 10) + 80; // 80% ~ 90%
      this.color = `hsl(${pinkHue}, 90%, ${lightness}%)`;
      this.opacity = Math.random() * 0.3 + 0.7; // 0.7 ~ 1.0
    }

    update() {
      // 風の影響を計算 (基本の風 + マウスのインタラクションの風 + 突風)
      const windEffect =
        config.baseWind + interaction.currentWindX + interaction.gustStrength;

      // 物理演算的な移動
      this.y += this.ySpeed;
      this.x += windEffect + Math.sin(this.swingAngle) * this.swingRange;

      // 揺らぎの更新
      this.swingAngle += this.swingSpeed;

      // 3D回転の更新
      this.rotX += this.rotSpeedX;
      this.rotY += this.rotSpeedY;
      this.rotZ += this.rotSpeedZ;

      // 画面外に出た場合のループ処理
      if (
        this.y > window.innerHeight + 20 ||
        this.x < -40 ||
        this.x > window.innerWidth + 40
      ) {
        this.reset(false);
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);

      // 3D回転の擬似的な表現
      // 回転行列を用いて、花びらがひらひら裏返りながら舞うのを再現
      ctx.rotate(this.rotZ);
      ctx.scale(Math.sin(this.rotX), Math.cos(this.rotY));

      // 桜の花びらのパスを描画 (ハート型を少し細長くした形状)
      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;

      const w = this.size;
      const h = this.size * 1.5;

      ctx.moveTo(0, -h / 2);
      // 左半分
      ctx.bezierCurveTo(-w * 0.8, -h / 2, -w, h / 4, 0, h / 2);
      // 右半分
      ctx.bezierCurveTo(w, h / 4, w * 0.8, -h / 2, 0, -h / 2);

      ctx.closePath();
      ctx.fill();

      // 花びらの裏表をグラデーションで表現するため、わずかにハイライト/影を重ねる
      if (Math.sin(this.rotX) < 0) {
        ctx.fillStyle = "rgba(0,0,0,0.05)";
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // 花びらインスタンス配列の作成
  let petals = [];
  function initPetals() {
    petals = [];
    for (let i = 0; i < config.count; i++) {
      petals.push(new Petal());
    }
  }

  // 背景のグラデーション描画 (常時「春の朝」カラー)
  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    grad.addColorStop(0, themeColor.top);
    grad.addColorStop(1, themeColor.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  // メインループ
  function animate() {
    // 背景を描写
    drawBackground();

    // インタラクティブ風速のイージング(滑らかな変化)
    interaction.currentWindX +=
      (interaction.targetWindX - interaction.currentWindX) * 0.05;

    // 各花びらの更新 & 描画
    petals.forEach((petal) => {
      petal.update();
      petal.draw();
    });

    requestAnimationFrame(animate);
  }

  // マウス/タッチインタラクションのイベント登録
  function handlePointerMove(clientX) {
    // 画面中心からのオフセットで風向きを決定
    const normalizedX = clientX / window.innerWidth - 0.5; // -0.5 ~ 0.5
    interaction.targetWindX = normalizedX * 4.5; // 風の変動レンジ
  }

  window.addEventListener("mousemove", (e) => {
    handlePointerMove(e.clientX);
  });

  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX);
      }
    },
    { passive: true },
  );

  // マウスが画面から外れたら緩やかに戻す
  window.addEventListener("mouseleave", () => {
    interaction.targetWindX = 0;
  });

  // 読み込み時にスタート

  initPetals();
  animate();
});
