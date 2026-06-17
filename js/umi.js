window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("waveCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // パラメータ管理（テキストやUIなしの純粋なアニメーション用）
  const params = {
    speed: 1.0,
    amplitude: 1.0,
    complexity: 2,
    // 初期カラーテーマ：「昼（青海）」
    currentTheme: "day",
  };

  // カラーテーマ設定（昼の美しい青とベージュ砂浜）
  const themes = {
    day: {
      sea: "#4B7FC2", // 深い青
      seaAlt: "#456BB2", // 重なる波の青#3A5C9B
      sand: "#FAF1DC", // 砂浜の白ベージュ
      sandWave: "#D7C29E", // 砂浜のうねり（濃いベージュ）
    },
  };

  // 初期サイズ設定
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // アニメーション用の変数
  let time = 0;

  // メイン描画ループ
  function animate() {
    time += 0.009 * params.speed;

    const width = canvas.width;
    const height = canvas.height;
    const activeTheme = themes[params.currentTheme];

    // 1. 全体を「海」の色で塗りつぶす
    ctx.fillStyle = activeTheme.sea;
    ctx.fillRect(0, 0, width, height);

    // 2. 「重なる奥の波」を描画 (海に深みを与える)
    ctx.fillStyle = activeTheme.seaAlt;
    ctx.beginPath();
    ctx.moveTo(0, 0);

    // 縦方向にスライスして波のカーブを作る
    const sliceCount = 100;
    const step = height / sliceCount;
    const basePercent = 0.2; // 画面幅に対する基準位置
    const baseOffset = width * basePercent;

    for (let i = 0; i <= sliceCount; i++) {
      const y = i * step;

      // 複数のサイン波を合成してオーガニックな動きを作る
      let waveX = Math.sin(y * 0.003 + time * 0.8) * 45;
      waveX += Math.cos(y * 0.008 - time * 1.2) * 20;

      if (params.complexity >= 3) {
        waveX += Math.sin(y * 0.015 + time * 2.1) * 8;
      }
      if (params.complexity >= 4) {
        waveX += Math.cos(y * 0.03 + time * 3.0) * 3;
      }

      const finalX = baseOffset + waveX * params.amplitude + 30; // 少し右にずらす
      ctx.lineTo(finalX, y);
    }
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // 3. 境界部分の「うねりのある濃い砂のレイヤー」を描画
    ctx.fillStyle = activeTheme.sandWave;
    ctx.beginPath();
    ctx.moveTo(0, 0);

    for (let i = 0; i <= sliceCount; i++) {
      const y = i * step;

      let waveX = Math.sin(y * 0.004 + time * 0.9 + 1.5) * 40;
      waveX += Math.cos(y * 0.007 - time * 1.0) * 25;

      if (params.complexity >= 3) {
        waveX += Math.sin(y * 0.018 + time * 1.8) * 10;
      }

      // 基準位置より少し広めに設定して奥のレイヤーをのぞかせる
      const finalX = baseOffset + waveX * params.amplitude + 15;
      ctx.lineTo(finalX, y);
    }
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // 4. メインの「砂浜」レイヤーを描画
    ctx.fillStyle = activeTheme.sand;
    ctx.beginPath();
    ctx.moveTo(0, 0);

    for (let i = 0; i <= sliceCount; i++) {
      const y = i * step;

      // 本物の波に近い合成波
      let waveX = Math.sin(y * 0.0035 + time * 1.0) * 40;
      waveX += Math.cos(y * 0.006 - time * 0.7 + 0.5) * 22;

      if (params.complexity >= 2) {
        waveX += Math.sin(y * 0.012 + time * 1.5) * 12;
      }
      if (params.complexity >= 4) {
        waveX += Math.cos(y * 0.025 + time * 2.5) * 4;
      }

      const finalX = baseOffset + waveX * params.amplitude;
      ctx.lineTo(finalX, y);
    }
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    requestAnimationFrame(animate);
  }

  // アニメーションループ開始
  animate();
});
