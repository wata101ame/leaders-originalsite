window.addEventListener("DOMContentLoaded", () => {
  const state = {
    windBase: 0.6,
    flowerCount: 5,
    colorType: "mixed", // より自然で美しい表現にするため、デフォルトをバリエーション豊かなミックスに設定
    flowerSizeMultiplier: 0.95,
    particleDensity: 80,
    fogEnabled: true,
    mouseX: null,
    mouseY: null,
    mouseTargetX: null,
    mouseTargetY: null,
    windStrengthTarget: 0,
    windStrengthCurrent: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // --- Canvas初期セットアップ ---
  const canvas = document.getElementById("suisenCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width * window.devicePixelRatio;
    canvas.height = state.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // リサイズに合わせて花を再配置
    if (flowers.length > 0) {
      repositionFlowers();
    }
  }

  // --- 数学的補助関数 ---
  const PI = Math.PI;
  const HALF_PI = PI / 2;
  const TWO_PI = PI * 2;

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  // --- 水仙クラス (Daffodil Class) ---
  class Daffodil {
    constructor(index) {
      this.index = index;
      this.init();
    }

    init() {
      // 地面からの位置を算出 (画面横に分散して配置)
      this.x = this.getGridX();
      this.y = state.height + randomRange(10, 40); // 画面下部から生やす

      // 茎の長さを元の2/3程度（画面高の 0.33〜0.5 倍）に調整
      this.height = state.height * randomRange(0.33, 0.5);

      // 生き生きとした個性を与えるための乱数
      this.angleOffset = randomRange(0, TWO_PI);
      this.speedMultiplier = randomRange(0.8, 1.3);
      this.flexibility = randomRange(0.6, 1.2); // 茎のしなりやすさ
      this.scale = randomRange(0.85, 1.15); // 個体差のサイズ

      // 向き (少し左や右に傾きを持たせる)
      this.baseAngle = randomRange(-0.08, 0.08);

      // 各茎のノード（しなやかな動きを出すために分割）
      this.segmentCount = 6;
      this.segments = [];
      this.updateSegments(0);

      // 花の色調を個体ごとに微調整
      this.determineColors();
    }

    getGridX() {
      // 等間隔にしつつ少しランダムにずらす
      const step = state.width / (state.flowerCount + 1);
      const base = step * (this.index + 1.5);
      return base + randomRange(-step * 0.15, step * 0.15);
    }

    determineColors() {
      let type = state.colorType;
      if (type === "mixed") {
        const rand = Math.random();
        type = rand < 0.4 ? "white" : rand < 0.8 ? "yellow" : "pale";
      }

      if (type === "white") {
        // クラシックな白い外側の花びら、中央が濃い黄色・オレンジ
        this.petalColor = "rgba(255, 255, 255, 0.95)";
        this.petalShadow = "rgba(160, 180, 150, 0.2)";
        this.coronaColor = "rgba(255, 195, 10, 0.95)";
        this.coronaRimColor = "rgba(255, 110, 0, 0.9)";
        this.centerColor = "rgba(120, 170, 30, 0.9)";
      } else if (type === "yellow") {
        // 全体的に黄色い黄水仙
        this.petalColor = "rgba(255, 235, 90, 0.95)";
        this.petalShadow = "rgba(180, 160, 50, 0.2)";
        this.coronaColor = "rgba(255, 165, 0, 0.95)";
        this.coronaRimColor = "rgba(245, 80, 0, 0.9)";
        this.centerColor = "rgba(130, 150, 15, 0.9)";
      } else {
        // 淡い黄色のハイブリッド系
        this.petalColor = "rgba(255, 255, 190, 0.95)";
        this.petalShadow = "rgba(190, 190, 130, 0.2)";
        this.coronaColor = "rgba(255, 220, 10, 0.95)";
        this.coronaRimColor = "rgba(255, 140, 0, 0.85)";
        this.centerColor = "rgba(120, 175, 40, 0.9)";
      }

      // 茎と葉の色 (明るい背景に映えるように少し彩度を高めに調整)
      const greenHue = randomRange(135, 155);
      const greenSat = randomRange(35, 55);
      const greenLight = randomRange(30, 42);
      this.stemColor = `hsl(${greenHue}, ${greenSat}%, ${greenLight}%)`;
      this.stemHighlight = `hsl(${greenHue}, ${greenSat + 15}%, ${greenLight + 10}%)`;
    }

    // 物理演算：茎の各ノードの位置を更新
    updateSegments(time) {
      this.segments = [];
      let curX = this.x;
      let curY = this.y;

      // 風の力を計算（ベースのサイン波 ＋ マウスによる影響 ＋ 突風）
      const windCycle = Math.sin(
        time * 0.001 * this.speedMultiplier + this.angleOffset,
      );
      const noiseWind =
        Math.cos(
          time * 0.0023 * this.speedMultiplier + this.angleOffset * 2.5,
        ) * 0.4;

      // 全体にかかる現在の風のエネルギー
      const totalWindPower = state.windBase + state.windStrengthCurrent;

      // 角度への風の干渉 (※風のみに追従)
      let windAngle =
        (windCycle + noiseWind) * 0.08 * totalWindPower * this.flexibility;

      const segLength = this.height / this.segmentCount;
      this.segments.push({ x: curX, y: curY, angle: 0 });

      for (let i = 1; i <= this.segmentCount; i++) {
        const ratio = i / this.segmentCount;
        // 上に行くほどしなりやすくなる
        const segAngle = this.baseAngle + windAngle * Math.pow(ratio, 1.8);

        curX += Math.sin(segAngle) * segLength;
        curY -= Math.cos(segAngle) * segLength;

        this.segments.push({
          x: curX,
          y: curY,
          angle: segAngle,
        });
      }
    }

    drawStem(ctx) {
      // 茎を描く (グラデーションとテーパーをつけて有機的に)
      ctx.beginPath();
      ctx.moveTo(this.segments[0].x, this.segments[0].y);

      for (let i = 1; i <= this.segmentCount; i++) {
        ctx.lineTo(this.segments[i].x, this.segments[i].y);
      }

      const baseWidth = 8 * this.scale;
      ctx.strokeStyle = this.stemColor;
      ctx.lineWidth = baseWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // 茎のハイライトを描き、立体感を出す
      ctx.beginPath();
      ctx.moveTo(this.segments[0].x + 1, this.segments[0].y);
      for (let i = 1; i <= this.segmentCount; i++) {
        ctx.lineTo(this.segments[i].x + 1, this.segments[i].y);
      }
      ctx.strokeStyle = this.stemHighlight;
      ctx.lineWidth = baseWidth * 0.45;
      ctx.stroke();

      // 葉っぱを横から生やす (各個体に1~2枚)
      this.drawLeaves(ctx);
    }

    drawLeaves(ctx) {
      // 茎の2番目や3番目のノードから立ち上がる細長い葉
      const leafNodes = [1, 2];
      ctx.fillStyle = this.stemColor;

      leafNodes.forEach((nodeIdx, i) => {
        const node = this.segments[nodeIdx];
        if (!node) return;

        const side = i % 2 === 0 ? 1 : -1;
        const leafAngle =
          node.angle +
          0.5 * side +
          Math.sin(Date.now() * 0.001 + this.angleOffset) * 0.05;
        const leafLen = this.height * 0.45;

        const ctrlX =
          node.x + Math.sin(leafAngle - 0.2 * side) * (leafLen * 0.5);
        const ctrlY =
          node.y - Math.cos(leafAngle - 0.2 * side) * (leafLen * 0.5);

        const tipX = node.x + Math.sin(leafAngle) * leafLen;
        const tipY = node.y - Math.cos(leafAngle) * leafLen;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        // 葉の膨らみ
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        ctx.quadraticCurveTo(ctrlX - 10 * side, ctrlY + 10, node.x, node.y);

        ctx.fill();
      });
    }

    drawFlower(ctx, time) {
      const head = this.segments[this.segmentCount];
      const angle = head.angle;

      ctx.save();
      ctx.translate(head.x, head.y);
      // 水仙の花は少しうつむき加減に咲く特徴があるため、角度をオフセット
      ctx.rotate(angle + 0.35);

      const finalScale = this.scale * state.flowerSizeMultiplier;
      ctx.scale(finalScale, finalScale);

      // 1. 茎と花の結合部 (子房: ぷっくりとした緑色の部分)
      ctx.beginPath();
      ctx.arc(0, 10, 8, 0, TWO_PI);
      ctx.fillStyle = "rgba(110, 160, 30, 0.9)";
      ctx.fill();

      // 2. 苞(ほう): 茶色い薄皮パーツ
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(-12, 18);
      ctx.lineTo(-3, 3);
      ctx.closePath();
      ctx.fillStyle = "rgba(180, 150, 100, 0.7)";
      ctx.fill();

      // --- 花びら（6枚）の描画 ---
      const petalCount = 6;
      const petalRadiusX = 35; // 花びらの長さ
      const petalRadiusY = 18; // 花びらの幅

      for (let i = 0; i < petalCount; i++) {
        const petalAngle = (i * TWO_PI) / petalCount;
        ctx.save();
        ctx.rotate(petalAngle);

        // わずかに波打つアニメーションを個別に追加
        const wave = Math.sin(time * 0.002 + this.angleOffset + i) * 0.03;
        ctx.rotate(wave);

        // 花びらの陰影グラデーション
        const grad = ctx.createRadialGradient(0, 0, 5, 20, 0, petalRadiusX);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, this.petalColor);
        grad.addColorStop(1, "rgba(225, 240, 220, 0.85)");

        ctx.beginPath();
        // 美しいアーモンド形（水仙の典型的な花びらの形）を描画
        ctx.ellipse(22, 0, petalRadiusX - 4, petalRadiusY, 0, 0, TWO_PI);

        // 影の描画
        ctx.shadowColor = this.petalShadow;
        ctx.shadowBlur = 6;
        ctx.fillStyle = grad;
        ctx.fill();

        // 花びらの中心脈の繊細なライン
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(petalRadiusX + 10, 0);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      // 3. 副花冠 (Corona / Trumpet) - 水仙の最大の特徴である中央のラッパ状部分
      const coronaRadius = 14;

      // ラッパの基部(筒状の陰影)
      const baseGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coronaRadius);
      baseGrad.addColorStop(0, this.centerColor);
      baseGrad.addColorStop(0.7, this.coronaColor);
      baseGrad.addColorStop(1, this.coronaRimColor);

      ctx.beginPath();
      ctx.arc(0, 0, coronaRadius, 0, TWO_PI);
      ctx.fillStyle = baseGrad;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(180, 90, 0, 0.25)";
      ctx.fill();

      // ギザギザしたラッパの縁(フリル)を描画
      ctx.beginPath();
      const rufflePoints = 18;
      for (let j = 0; j <= rufflePoints; j++) {
        const rAngle = (j * TWO_PI) / rufflePoints;
        // サイン波でフリルの高低を表現
        const rAmp = 2.5 * Math.sin(rAngle * 6 + time * 0.005);
        const curRad = coronaRadius + rAmp;
        const rx = Math.cos(rAngle) * curRad;
        const ry = Math.sin(rAngle) * curRad;

        if (j === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = this.coronaRimColor;
      ctx.stroke();

      // 4. おしべとめしべ (中心部のディテール)
      const centerCount = 3;
      ctx.fillStyle = "#f3cb10";
      for (let k = 0; k < centerCount; k++) {
        const cAngle = (k * TWO_PI) / centerCount + time * 0.001;
        const cx = Math.cos(cAngle) * 4;
        const cy = Math.sin(cAngle) * 4;

        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, TWO_PI);
        ctx.fill();

        // 花粉の輝き
        ctx.beginPath();
        ctx.arc(cx, cy, 1, 0, TWO_PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      ctx.restore();
    }

    render(ctx, time) {
      this.updateSegments(time);
      this.drawStem(ctx);
      this.drawFlower(ctx, time);
    }
  }

  // --- パーティクルクラス (光の粒子/花粉) ---
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initFullY = false) {
      this.x = Math.random() * state.width;
      this.y = initFullY ? Math.random() * state.height : -20;

      this.size = randomRange(1.5, 4.5);
      this.speedX = randomRange(-0.5, 1.5);
      this.speedY = randomRange(0.6, 2.0);
      this.opacity = randomRange(0.3, 0.9);
      this.hue = randomRange(40, 60); // 暖かみのある黄・金色の光
      this.pulseSpeed = randomRange(0.01, 0.03);
      this.angle = Math.random() * TWO_PI;
    }

    update(time) {
      const totalWind = state.windBase + state.windStrengthCurrent;

      // 風の力を受けて右方向に流される
      this.x +=
        (this.speedX + totalWind * 1.8) *
        (1 + Math.sin(time * 0.002 + this.x * 0.005) * 0.3);
      this.y += this.speedY;

      // マウス位置に向かって緩やかに引き寄せられる重力効果
      if (state.mouseX !== null) {
        const dx = state.mouseX - this.x;
        const dy = state.mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 250) {
          const pull = (1 - dist / 250) * 0.12;
          this.x += dx * pull;
          this.y += dy * pull;
        }
      }

      this.angle += this.pulseSpeed;

      // 画面外に出たらリセット
      if (
        this.y > state.height + 10 ||
        this.x > state.width + 10 ||
        this.x < -10
      ) {
        this.reset(false);
      }
    }

    draw(ctx) {
      ctx.save();
      const activeOpacity = this.opacity * (0.6 + Math.sin(this.angle) * 0.4);

      const grad = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        this.size * 2,
      );
      grad.addColorStop(0, `hsla(${this.hue}, 100%, 70%, ${activeOpacity})`);
      grad.addColorStop(
        0.5,
        `hsla(${this.hue}, 90%, 55%, ${activeOpacity * 0.4})`,
      );
      grad.addColorStop(1, `hsla(${this.hue}, 90%, 45%, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 2, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- グローバルリスト ---
  let flowers = [];
  let particles = [];

  function initApp() {
    // 花の初期配置
    flowers = [];
    for (let i = 0; i < state.flowerCount; i++) {
      flowers.push(new Daffodil(i));
    }

    // パーティクル初期生成
    particles = [];
    for (let i = 0; i < state.particleDensity; i++) {
      particles.push(new Particle());
    }
  }

  function repositionFlowers() {
    flowers.forEach((flower, index) => {
      flower.x = flower.getGridX();
      flower.y = state.height + randomRange(10, 40);
      // 画面高リサイズ時も適切な高さを維持
      flower.height = state.height * randomRange(0.33, 0.5);
      flower.updateSegments(0);
    });
  }

  // --- 背景の空気感 (グラデーションと朝霧効果) ---
  function drawAtmosphere(ctx, time) {
    const phase = Math.sin(time * 0.00015);

    // 明るい黄緑への補間
    const colorG = Math.floor(lerp(240, 252, (phase + 1) / 2));
    const colorB = Math.floor(lerp(155, 185, (phase + 1) / 2));

    const bgGrad = ctx.createLinearGradient(0, 0, 0, state.height);
    bgGrad.addColorStop(0, "#ffffff");
    bgGrad.addColorStop(1, `rgb(236, ${colorG}, ${colorB})`);

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, state.width, state.height);

    // 朝霧のエフェクト (明るい白緑系の霧)
    if (state.fogEnabled) {
      ctx.save();
      const fogGrad = ctx.createLinearGradient(
        0,
        state.height * 0.3,
        0,
        state.height,
      );
      const fogPulse = 0.06 + Math.sin(time * 0.0008) * 0.02;
      fogGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      fogGrad.addColorStop(0.7, `rgba(240, 252, 210, ${fogPulse})`);
      fogGrad.addColorStop(1, `rgba(220, 245, 190, ${fogPulse * 1.8})`);

      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, state.width, state.height);
      ctx.restore();
    }

    // 陽の光をシミュレートする上部からの温かいグロー効果
    const lightGrad = ctx.createRadialGradient(
      state.width * 0.5,
      -100,
      100,
      state.width * 0.5,
      -100,
      state.height * 0.95,
    );
    lightGrad.addColorStop(0, "rgba(255, 253, 230, 0.35)");
    lightGrad.addColorStop(0.5, "rgba(255, 245, 200, 0.1)");
    lightGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  // --- メインループ ---
  function animate(time) {
    state.windStrengthCurrent = lerp(
      state.windStrengthCurrent,
      state.windStrengthTarget,
      0.04,
    );

    if (state.mouseTargetX !== null) {
      state.mouseX = lerp(
        state.mouseX || state.mouseTargetX,
        state.mouseTargetX,
        0.1,
      );
      state.mouseY = lerp(
        state.mouseY || state.mouseTargetY,
        state.mouseTargetY,
        0.1,
      );
    }

    drawAtmosphere(ctx, time);

    // パーティクル描画 (花の後ろ)
    particles.forEach((p) => {
      p.update(time);
      p.draw(ctx);
    });

    // 水仙の描画
    flowers.forEach((flower) => {
      flower.render(ctx, time);
    });

    requestAnimationFrame(animate);
  }

  // --- イベントリスナー & インタラクション ---
  function handlePointerMove(e) {
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);

    if (x !== undefined && y !== undefined) {
      state.mouseTargetX = x;
      state.mouseTargetY = y;
      // タップ、ドラッグで一時的に風圧を強める
      state.windStrengthTarget = 1.0;
    }
  }

  function handlePointerLeave() {
    state.mouseTargetX = null;
    state.mouseTargetY = null;
    state.mouseX = null;
    state.mouseY = null;
    state.windStrengthTarget = 0;
  }

  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener("touchstart", handlePointerMove);
  window.addEventListener("touchmove", handlePointerMove);

  window.addEventListener("mouseleave", handlePointerLeave);
  window.addEventListener("touchend", handlePointerLeave);

  window.addEventListener("resize", resizeCanvas);

  // --- アプリケーション起動 ---
  window.onload = function () {
    resizeCanvas();
    initApp();
    requestAnimationFrame(animate);
  };
});
