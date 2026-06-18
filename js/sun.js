window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("motionCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // 画面サイズ調整
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generateStars(); // サイズ変更時に星を再配置
  });

  // 状態管理
  let timeValue = 200; // 時間軸: 0 (昼) ~ 1000 (深夜)
  const animationSpeed = 0.5; // 沈む速度

  // パララックス（視差）用のマウス座標
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener("mousemove", (e) => {
    targetX = e.clientX / width - 0.5;
    targetY = e.clientY / height - 0.5;
  });

  // スマホ用傾きセンサー（ジャイロ）対応
  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma) {
      targetX = e.gamma / 45;
      targetY = e.beta / 45;
    }
  });

  // 星データの生成
  const stars = [];
  function generateStars() {
    stars.length = 0;
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.6), // 空の部分のみ
        r: Math.random() * 1.5 + 0.5,
        baseOpacity: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.05 + 0.01,
      });
    }
  }
  generateStars();

  // 鳥データの生成
  const birds = [];
  const birdCount = 6;
  for (let i = 0; i < birdCount; i++) {
    birds.push({
      x: -100 - i * 120,
      y: 100 + i * 40 + Math.random() * 50,
      scale: 0.3 + Math.random() * 0.2,
      speed: 1.2 + Math.random() * 0.5,
      wingPhase: Math.random() * Math.PI * 2,
    });
  }

  // カラー補間ヘルパー (HEXをRGBに変換して線形補間)
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  function lerpColor(color1, color2, factor) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return `rgb(${r}, ${g}, ${b})`;
  }

  // 空の色の変化テーブル (0:昼, 250:夕暮れ前, 500:赤橙色の夕暮れ, 700:黄昏, 1000:深夜)
  const skyTimeline = [
    { t: 0, s1: "#4a90e2", s2: "#87ceeb", s3: "#b8e986" },
    { t: 250, s1: "#2c509a", s2: "#de6262", s3: "#ffb88c" },
    { t: 500, s1: "#1a2a6c", s2: "#b21f1f", s3: "#fdbb2d" },
    { t: 700, s1: "#0f2027", s2: "#203a43", s3: "#2c5364" },
    { t: 1000, s1: "#050508", s2: "#0b0f19", s3: "#0e111a" },
  ];

  function getSkyColors(t) {
    let lower = skyTimeline[0];
    let upper = skyTimeline[skyTimeline.length - 1];

    for (let i = 0; i < skyTimeline.length - 1; i++) {
      if (t >= skyTimeline[i].t && t <= skyTimeline[i + 1].t) {
        lower = skyTimeline[i];
        upper = skyTimeline[i + 1];
        break;
      }
    }

    const range = upper.t - lower.t;
    const factor = range === 0 ? 0 : (t - lower.t) / range;

    return {
      s1: lerpColor(lower.s1, upper.s1, factor),
      s2: lerpColor(lower.s2, upper.s2, factor),
      s3: lerpColor(lower.s3, upper.s3, factor),
    };
  }

  // 波（海面）の揺らぎ用ノイズ・フェーズ
  let wavePhase = 0;

  // メインループ
  function drawScene() {
    // 時間の自動進行（ループ処理）
    timeValue += animationSpeed;
    if (timeValue > 1000) {
      timeValue = 0;
    }

    // パララックスの滑らかな追従 (Lerp)
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;

    // 各種基準点
    const horizonY = height * 0.58; // 地平線（水面の開始位置）

    // 1. 背景の空（グラデーション描画）
    const skyColors = getSkyColors(timeValue);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, skyColors.s1);
    skyGrad.addColorStop(0.5, skyColors.s2);
    skyGrad.addColorStop(1, skyColors.s3);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    // 2. 星の描画 (夜間のみフェードイン)
    let starOpacity = 0;
    if (timeValue > 550) {
      starOpacity = Math.min(1, (timeValue - 550) / 250);
    }
    if (starOpacity > 0) {
      ctx.save();
      stars.forEach((star) => {
        // チカチカまたたく演出
        const alpha =
          star.baseOpacity *
          starOpacity *
          (0.4 + 0.6 * Math.sin(Date.now() * star.speed));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(
          star.x + mouseX * 15,
          star.y + mouseY * 5,
          star.r,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });
      ctx.restore();
    }

    // 3. 鳥の描画 (シルエット)
    ctx.save();
    ctx.fillStyle = lerpColor(
      "#2d1840",
      "#050508",
      Math.min(1, timeValue / 600),
    );
    birds.forEach((bird) => {
      bird.x += bird.speed;
      bird.wingPhase += 0.15;
      if (bird.x > width + 100) {
        bird.x = -100;
        bird.y = 100 + Math.random() * 150;
      }

      // 視差を考慮した現在位置
      const bx = bird.x + mouseX * 30;
      const by = bird.y + mouseY * 10;
      const scale = bird.scale * (width / 1440); // 画面サイズ比に合わせる

      // 羽の上下運動をsin波で表現
      const wingY = Math.sin(bird.wingPhase) * 12;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      // 左の羽
      ctx.quadraticCurveTo(
        bx - 20 * scale,
        by - (20 - wingY) * scale,
        bx - 40 * scale,
        by - wingY * scale,
      );
      ctx.quadraticCurveTo(bx - 20 * scale, by - (5 - wingY) * scale, bx, by);
      // 右の羽
      ctx.quadraticCurveTo(
        bx + 20 * scale,
        by - (20 - wingY) * scale,
        bx + 40 * scale,
        by - wingY * scale,
      );
      ctx.quadraticCurveTo(bx + 20 * scale, by - (5 - wingY) * scale, bx, by);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // 4. 太陽の描画
    // 太陽の位置を画面の右側（横幅の75%付近）に寄せるように変更
    const sunX = width * 0.75 + mouseX * -10;
    const sunY = height * 0.2 + (timeValue / 1000) * (height * 0.5);

    // 太陽の大きさを元のサイズから 2/3 (約0.67) に変更
    const sunR = Math.max(13, width * 0.08 * (2 / 3));

    // 太陽の不透明度計算（地平線に近づく or 沈むと消える）
    let sunOpacity = 1;
    const sunsetThreshold = horizonY - 15;
    if (sunY > sunsetThreshold) {
      sunOpacity = Math.max(0, 1 - (sunY - sunsetThreshold) / (sunR * 1.2));
    }

    if (sunOpacity > 0) {
      ctx.save();
      ctx.globalAlpha = sunOpacity;

      // 太陽の色温度グラデーション
      const sunFactor = Math.min(1, timeValue / 550);
      const sunColorCenter = lerpColor("#FFFFFF", "#FFA500", sunFactor);
      const sunColorEdge = lerpColor("#FF4500", "#FF0000", sunFactor);

      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
      sunGrad.addColorStop(0, sunColorCenter);
      sunGrad.addColorStop(0.4, lerpColor("#FFF3CC", "#FF4500", sunFactor));
      sunGrad.addColorStop(1, sunColorEdge);

      // 発光（Glow）エフェクトのシミュレート
      ctx.shadowColor = sunColorEdge;
      ctx.shadowBlur = 30 + Math.sin(Date.now() * 0.002) * 10;

      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. 山の描画（奥のレイヤー）
    ctx.save();
    const mountBackGrad = ctx.createLinearGradient(
      0,
      horizonY - 150,
      0,
      horizonY,
    );
    mountBackGrad.addColorStop(
      0,
      lerpColor("#4B2A63", "#12061C", Math.min(1, timeValue / 700)),
    );
    mountBackGrad.addColorStop(
      1,
      lerpColor("#1A0B2E", "#040108", Math.min(1, timeValue / 700)),
    );
    ctx.fillStyle = mountBackGrad;

    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    // 頂点をなだらかなカーブで繋ぐ
    const ox = mouseX * 15;
    const oy = mouseY * 5;
    ctx.lineTo(0, horizonY - 60 + oy);
    ctx.quadraticCurveTo(
      width * 0.2,
      horizonY - 100 + oy,
      width * 0.4,
      horizonY - 50 + oy,
    );
    ctx.quadraticCurveTo(
      width * 0.7,
      horizonY - 110 + oy,
      width * 0.85,
      horizonY - 40 + oy,
    );
    ctx.lineTo(width, horizonY - 70 + oy);
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 6. 山の描画（手前のレイヤー）
    ctx.save();
    const mountFrontGrad = ctx.createLinearGradient(
      0,
      horizonY - 80,
      0,
      horizonY,
    );
    mountFrontGrad.addColorStop(
      0,
      lerpColor("#311545", "#0C0412", Math.min(1, timeValue / 700)),
    );
    mountFrontGrad.addColorStop(
      1,
      lerpColor("#0A0214", "#020005", Math.min(1, timeValue / 700)),
    );
    ctx.fillStyle = mountFrontGrad;

    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    const fx = mouseX * 25;
    const fy = mouseY * 8;
    ctx.lineTo(0, horizonY - 30 + fy);
    ctx.quadraticCurveTo(
      width * 0.25,
      horizonY - 70 + fy,
      width * 0.5,
      horizonY - 25 + fy,
    );
    ctx.quadraticCurveTo(
      width * 0.75,
      horizonY - 80 + fy,
      width,
      horizonY - 30 + fy,
    );
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 7. 水面（海）の描画
    ctx.save();
    const waterColors = {
      top: lerpColor("#1E293B", "#080B11", Math.min(1, timeValue / 700)),
      bottom: lerpColor("#0F172A", "#030406", Math.min(1, timeValue / 700)),
    };
    const waterGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    waterGrad.addColorStop(0, waterColors.top);
    waterGrad.addColorStop(1, waterColors.bottom);
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);
    ctx.restore();

    // 8. 夕日の反射（水面の光の帯）
    if (sunOpacity > 0 && sunY < horizonY + sunR) {
      ctx.save();

      // 光の帯のグラデーション
      const reflectGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      const sunFactor = Math.min(1, timeValue / 550);
      const gold = lerpColor("#FFD700", "#FF4500", sunFactor);
      reflectGrad.addColorStop(
        0,
        `rgba(${hexToRgb(gold).r}, ${hexToRgb(gold).g}, ${hexToRgb(gold).b}, ${sunOpacity * 0.7})`,
      );
      reflectGrad.addColorStop(0.3, `rgba(255, 69, 0, ${sunOpacity * 0.4})`);
      reflectGrad.addColorStop(1, "rgba(255, 0, 0, 0)");

      // 台形を描画してパース（遠近感）を表現
      // 地平線近くは細く、手前に向かって広がる
      const topW = width * 0.1 * (1 - (sunY / horizonY) * 0.3); // 2/3サイズに縮小された太陽に合わせて幅を最適化
      const botW = width * 0.35;

      ctx.fillStyle = reflectGrad;
      ctx.beginPath();
      ctx.moveTo(sunX - topW / 2, horizonY);
      ctx.lineTo(sunX + topW / 2, horizonY);
      ctx.lineTo(sunX + botW / 2, height);
      ctx.lineTo(sunX - botW / 2, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 9. 水面の波しぶき・揺らぎ（テクスチャ）
    ctx.save();
    wavePhase += 0.02;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * Math.max(0.1, 1 - timeValue / 700)})`;
    ctx.lineWidth = 1.5;

    // ランダムではなく一定間隔の複数の波線をCanvasでレンダリング
    const waveLines = [
      { y: 0.05, len: 0.15 },
      { y: 0.12, len: 0.25 },
      { y: 0.22, len: 0.35 },
      { y: 0.38, len: 0.5 },
      { y: 0.55, len: 0.65 },
      { y: 0.75, len: 0.8 },
      { y: 0.92, len: 0.95 },
    ];

    waveLines.forEach((line, index) => {
      const drawY = horizonY + (height - horizonY) * line.y;
      const size = width * line.len;
      const offset = Math.sin(wavePhase + index) * 15;
      const startX = width / 2 - size / 2 + offset;

      ctx.beginPath();
      // 穏やかな波をサインカーブで表現
      ctx.moveTo(startX, drawY);
      for (let x = 0; x < size; x += 10) {
        const waveHeight =
          Math.sin(x * 0.05 + wavePhase * 2 + index) * (2 + line.y * 4);
        ctx.lineTo(startX + x, drawY + waveHeight);
      }
      ctx.stroke();
    });
    ctx.restore();

    // フレーム更新
    requestAnimationFrame(drawScene);
  }

  // 初期キックスタート
  drawScene();
});
