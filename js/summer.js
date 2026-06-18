window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("summerCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // 音声（Web Audio APIによる擬似「ひぐらし」・「ミンミンゼミ」風のシンセ鳴き声）
  let audioCtx = null;
  let isSoundPlaying = false;
  let soundTimer = null;

  // インタラクション設定
  let isWindEnabled = true;

  // 解像度合わせ
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // マウス/タッチ座標
  const mouse = { x: null, y: null, active: false, pulseRad: 0 };

  // 葉っぱパーティクル
  class LeafParticle {
    constructor() {
      this.reset();
      this.y = Math.random() * canvas.height; // 初回は画面内に散らす
    }

    reset() {
      this.x = -50;
      this.y = Math.random() * canvas.height * 0.8;
      this.size = Math.random() * 8 + 4;
      this.speedX = Math.random() * 2 + 1;
      this.speedY = Math.random() * 1 - 0.2;
      this.angle = Math.random() * Math.PI * 2;
      this.spin = (Math.random() - 0.5) * 0.02;
      this.color = `rgba(${Math.floor(Math.random() * 40 + 20)}, ${Math.floor(Math.random() * 80 + 100)}, ${Math.floor(Math.random() * 40 + 30)}, ${Math.random() * 0.3 + 0.1})`;
    }

    update(windStrength) {
      // 風の強さに基づき移動を計算
      const currentWind = isWindEnabled ? windStrength : 0;
      this.x += this.speedX * (1 + currentWind * 3);
      this.y += this.speedY + Math.sin(this.angle) * 0.5;
      this.angle += this.spin;

      if (this.x > canvas.width + 50) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      // 楕円葉っぱ
      ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 木漏れ日（背景光）パーティクル
  class LightRay {
    constructor() {
      this.reset();
      this.y = Math.random() * canvas.height;
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = -100;
      this.size = Math.random() * 150 + 100;
      this.speedY = Math.random() * 0.5 + 0.2;
      this.speedX = Math.random() * 0.3 - 0.15;
      this.alpha = Math.random() * 0.15 + 0.05;
      this.pulseSpeed = Math.random() * 0.01 + 0.005;
      this.pulseAngle = Math.random() * Math.PI;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.pulseAngle += this.pulseSpeed;

      if (this.y > canvas.height + 150) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      const currentAlpha = this.alpha * (0.7 + Math.sin(this.pulseAngle) * 0.3);
      const grad = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        this.size,
      );
      grad.addColorStop(0, `rgba(230, 245, 200, ${currentAlpha})`);
      grad.addColorStop(0.5, `rgba(180, 230, 160, ${currentAlpha * 0.4})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 初期化オブジェクト
  const leaves = Array.from({ length: 40 }, () => new LeafParticle());
  const lightRays = Array.from({ length: 12 }, () => new LightRay());
  let wind = 0; // タップされた時に強まる風

  // --- セミのクラス定義（深みのある「晩夏」バージョン） ---
  class Cicada {
    constructor(x, y, scale) {
      this.x = x;
      this.y = y;
      this.scale = scale;

      // アニメーション用の時間変数
      this.wingTime = 0;
      this.breathTime = 0;
      this.twitchTime = 0;

      // セミの状態
      this.wingAngle = 0;
      this.isSinging = false;
      this.singIntensity = 0; // 鳴き声に連動した振動

      // インタラクション
      this.targetX = x;
      this.targetY = y;
    }

    update() {
      this.breathTime += 0.03;
      this.wingTime += this.isSinging ? 0.8 : 0.05; // 鳴いている時は羽を細かく震わせる

      // 時々ピクッと動く演出
      this.twitchTime += 0.01;
      if (Math.sin(this.twitchTime * 3) > 0.98) {
        this.wingAngle = Math.sin(this.wingTime * 20) * 0.12;
      } else {
        this.wingAngle = Math.sin(this.wingTime) * 0.02;
      }

      // 鳴き声の揺らぎ
      if (this.isSinging) {
        this.singIntensity = Math.sin(this.wingTime * 40) * 1.5;
      } else {
        this.singIntensity = 0;
      }

      // 目標座標（木にしっかり掴まっている設定なので、若干の呼吸感のみ）
      this.x = this.targetX + Math.sin(this.breathTime) * 0.3;
      this.y =
        this.targetY +
        Math.cos(this.breathTime * 0.5) * 0.5 +
        this.singIntensity * 0.2;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.scale, this.scale);
      // セミの基本角度（木が右に傾いているため、セミの体はやや上向き、木に並行）
      ctx.rotate(-0.1);

      // --- 1. 脚（木にしがみつく細い足） ---
      ctx.strokeStyle = "#181b19";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 前脚左右
      ctx.beginPath();
      ctx.moveTo(-15, -20);
      ctx.quadraticCurveTo(-40, -35, -50, -25); // 左前
      ctx.moveTo(15, -20);
      ctx.quadraticCurveTo(40, -35, 50, -25); // 右前
      // 中脚左右
      ctx.moveTo(-20, 0);
      ctx.quadraticCurveTo(-45, -10, -52, 5); // 左中
      ctx.moveTo(20, 0);
      ctx.quadraticCurveTo(45, -10, 52, 5); // 右中
      // 後脚左右
      ctx.moveTo(-18, 30);
      ctx.quadraticCurveTo(-48, 40, -55, 60); // 左後
      ctx.moveTo(18, 30);
      ctx.quadraticCurveTo(48, 40, 55, 60); // 右後
      ctx.stroke();

      // --- 2. 羽（背面の透明な大羽：描画順序は体よりも下） ---
      this.drawWings();

      // --- 3. 腹部と胸部（メインボディ） ---
      // 腹部（下側段々）
      const abGrad = ctx.createLinearGradient(0, 0, 0, 90);
      abGrad.addColorStop(0, "#3a3423");
      abGrad.addColorStop(0.4, "#1c1c14");
      abGrad.addColorStop(1, "#0e0f0a");

      ctx.fillStyle = abGrad;
      ctx.beginPath();
      ctx.moveTo(-18, 10);
      ctx.quadraticCurveTo(-22, 50, -10, 85);
      ctx.lineTo(10, 85);
      ctx.quadraticCurveTo(22, 50, 18, 10);
      ctx.closePath();
      ctx.fill();

      // 腹部の縞模様
      ctx.strokeStyle = "#5a5438";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const py = 20 + i * 10;
        ctx.beginPath();
        ctx.arc(0, py - 10, 18 - i * 1.5, 0, Math.PI, false);
        ctx.stroke();
      }

      // 胸部（頑丈な殻のような部分）
      const thoraxGrad = ctx.createRadialGradient(-5, -15, 5, 0, -10, 30);
      thoraxGrad.addColorStop(0, "#564d36");
      thoraxGrad.addColorStop(0.5, "#2e2a1b");
      thoraxGrad.addColorStop(1, "#141410");

      ctx.fillStyle = thoraxGrad;
      ctx.beginPath();
      ctx.moveTo(-22, 10);
      ctx.bezierCurveTo(-24, -30, 24, -30, 22, 10);
      ctx.quadraticCurveTo(0, 18, -22, 10);
      ctx.fill();

      // 胸部の特徴的な模様
      ctx.strokeStyle = "#a49870";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-12, -15);
      ctx.quadraticCurveTo(0, -5, 12, -15);
      ctx.moveTo(-15, -5);
      ctx.quadraticCurveTo(0, 5, 15, -5);
      ctx.stroke();

      // 頭部
      const headGrad = ctx.createLinearGradient(-20, -32, 20, -32);
      headGrad.addColorStop(0, "#1c1a15");
      headGrad.addColorStop(0.5, "#3b382d");
      headGrad.addColorStop(1, "#1c1a15");
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.moveTo(-20, -22);
      ctx.quadraticCurveTo(0, -38, 20, -22);
      ctx.quadraticCurveTo(0, -16, -20, -22);
      ctx.fill();

      // 赤または暗色の複眼（左右に飛び出た目）
      const eyeColor = "#a82c16"; // ひぐらし等の赤っぽい目
      const eyeGloss = "#ff8873";

      // 左目
      ctx.save();
      ctx.translate(-21, -26);
      ctx.rotate(-0.3);
      const leftEyeGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, 5);
      leftEyeGrad.addColorStop(0, eyeGloss);
      leftEyeGrad.addColorStop(1, eyeColor);
      ctx.fillStyle = leftEyeGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 右目
      ctx.save();
      ctx.translate(21, -26);
      ctx.rotate(0.3);
      const rightEyeGrad = ctx.createRadialGradient(1, -1, 1, 0, 0, 5);
      rightEyeGrad.addColorStop(0, eyeGloss);
      rightEyeGrad.addColorStop(1, eyeColor);
      ctx.fillStyle = rightEyeGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 単眼（ひたいの3つの小さな光る点）
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(0, -27, 1.2, 0, Math.PI * 2);
      ctx.arc(-2.5, -25, 1, 0, Math.PI * 2);
      ctx.arc(2.5, -25, 1, 0, Math.PI * 2);
      ctx.fill();

      // 触角
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-12, -30);
      ctx.quadraticCurveTo(-16, -42, -18, -44);
      ctx.moveTo(12, -30);
      ctx.quadraticCurveTo(16, -42, 18, -44);
      ctx.stroke();

      ctx.restore();
    }

    drawWings() {
      // 左大羽
      ctx.save();
      ctx.translate(-15, -8);
      // 羽ばたき、および鳴き声のバイブレーションを回転角に加算
      ctx.rotate(
        -0.15 -
          this.wingAngle * 1.5 -
          (this.isSinging ? Math.sin(this.wingTime * 60) * 0.04 : 0),
      );
      this.renderWingShape(-1);
      ctx.restore();

      // 右大羽
      ctx.save();
      ctx.translate(15, -8);
      ctx.rotate(
        0.15 +
          this.wingAngle * 1.5 +
          (this.isSinging ? Math.sin(this.wingTime * 60) * 0.04 : 0),
      );
      this.renderWingShape(1);
      ctx.restore();
    }

    // 羽のディテール描画 (scaleX で左右反転可能)
    renderWingShape(scaleX) {
      ctx.scale(scaleX, 1);

      // 羽のグラデーション（透明だが、光の反射で少し虹色・白っぽく輝く質感）
      const wingGrad = ctx.createLinearGradient(0, 0, -45, 120);
      wingGrad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
      wingGrad.addColorStop(0.3, "rgba(210, 240, 230, 0.18)");
      wingGrad.addColorStop(0.8, "rgba(230, 210, 255, 0.22)");
      wingGrad.addColorStop(1, "rgba(255, 255, 255, 0.05)");

      // 翅脈（はみゃく）のベース色
      ctx.strokeStyle = "rgba(80, 110, 70, 0.6)";
      ctx.fillStyle = wingGrad;

      // 輪郭描画
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-20, 20, -52, 70, -42, 115);
      ctx.bezierCurveTo(-37, 130, -18, 120, -2, 60);
      ctx.quadraticCurveTo(2, 25, 0, 0);
      ctx.closePath();
      ctx.fill();

      // メインの太い翅脈（縁側）
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "rgba(45, 60, 35, 0.8)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-18, 18, -48, 65, -40, 113);
      ctx.stroke();

      // 内部の網状翅脈（細い線）
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(100, 120, 90, 0.45)";
      ctx.beginPath();

      // 脈構造のシミュレート
      ctx.moveTo(-10, 12);
      ctx.quadraticCurveTo(-28, 45, -28, 80);
      ctx.quadraticCurveTo(-25, 105, -34, 111);

      ctx.moveTo(-5, 25);
      ctx.quadraticCurveTo(-18, 55, -16, 95);

      ctx.moveTo(-20, 35);
      ctx.lineTo(-12, 45);

      ctx.moveTo(-25, 55);
      ctx.lineTo(-15, 68);
      ctx.lineTo(-5, 62);

      ctx.moveTo(-28, 78);
      ctx.lineTo(-17, 85);

      ctx.moveTo(-22, 95);
      ctx.lineTo(-10, 100);

      ctx.stroke();
    }
  }

  // --- 木の背景・幹のクラス定義 ---
  class Tree {
    constructor() {
      this.width = 160;
    }

    draw() {
      ctx.save();
      // 画面右側に大きく傾いた太い幹を描画
      const startX = canvas.width * 0.72;
      const endX = canvas.width * 0.64;

      // 木肌のグラデーション
      const treeGrad = ctx.createLinearGradient(
        startX - this.width,
        0,
        startX + this.width,
        0,
      );
      treeGrad.addColorStop(0, "#0c0a08");
      treeGrad.addColorStop(0.3, "#1f1914");
      treeGrad.addColorStop(0.6, "#31271f");
      treeGrad.addColorStop(0.8, "#1e1813");
      treeGrad.addColorStop(1, "#090806");

      ctx.fillStyle = treeGrad;
      ctx.beginPath();
      ctx.moveTo(startX - 90, -50);
      ctx.lineTo(startX + 140, -50);
      ctx.lineTo(endX + 220, canvas.height + 50);
      ctx.lineTo(endX - 70, canvas.height + 50);
      ctx.closePath();
      ctx.fill();

      // 木のテクスチャ（縦ライン、木の皮の裂け目）
      ctx.strokeStyle = "rgba(12, 10, 8, 0.45)";
      ctx.lineWidth = 4;
      for (let i = -60; i <= 120; i += 25) {
        ctx.beginPath();
        ctx.moveTo(startX + i + Math.sin(i) * 15, -50);
        ctx.quadraticCurveTo(
          startX + i + Math.cos(i) * 30 - 40,
          canvas.height * 0.5,
          endX + i + Math.sin(i) * 20 + 40,
          canvas.height + 50,
        );
        ctx.stroke();
      }

      // 苔や光の反射（ソフトハイライト）
      const mossGrad = ctx.createLinearGradient(startX - 50, 0, startX + 50, 0);
      mossGrad.addColorStop(0, "rgba(40, 65, 30, 0.15)");
      mossGrad.addColorStop(0.5, "rgba(85, 110, 60, 0.08)");
      mossGrad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = mossGrad;
      ctx.beginPath();
      ctx.moveTo(startX - 70, -50);
      ctx.lineTo(startX + 30, -50);
      ctx.lineTo(endX + 90, canvas.height + 50);
      ctx.lineTo(endX - 20, canvas.height + 50);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // 木が風でわずかに揺れる効果を適用するための座標取得
    getAnchorPoint(ratioY) {
      const startX = canvas.width * 0.72;
      const endX = canvas.width * 0.64;
      const currentX = startX + (endX - startX) * ratioY;
      return {
        x: currentX - 10, // セミが少し左側に留まるように調整
        y: canvas.height * ratioY,
      };
    }
  }

  const tree = new Tree();

  // セミのインスタンスを木の適切な位置に生成
  const anchor = tree.getAnchorPoint(0.48);
  const cicada = new Cicada(anchor.x, anchor.y, 1.25);

  // --- シンセサイザー音源（ひぐらし・夏の虫風） ---
  function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }

  // ひぐらしの鳴き声「カナカナカナ…」をシミュレート
  function playHigurashiSound() {
    if (!audioCtx || !isSoundPlaying) return;

    const now = audioCtx.currentTime;

    // 1回の鳴き声（カナカナカナ...）
    const duration = 4.5;

    // セミの動きをシンセと同期させる
    cicada.isSinging = true;

    // メインのオシレーター（金属的で透明感のある音）
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // 周周波数の設定（ひぐらしの基本周波数はやや高め：約4000Hz〜5000Hz）
    osc.type = "sine";
    osc.frequency.setValueAtTime(4200, now);

    // 金属感を増すためのサブ
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(4215, now);

    // 音量エンベロープ（徐々にフェードインして、最後に余韻を残して消える）
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.3); // 開始

    // ビブラート（うねり・震え）の作成「カナカナカナカナ...」という細かい震え
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.setValueAtTime(14, now); // 1秒間に14回のカナカナ
    lfoGain.gain.setValueAtTime(250, now); // 震えの強さ

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfoGain.connect(osc2.frequency);

    // 音量自体も震わせる
    const ampLfo = audioCtx.createOscillator();
    const ampLfoGain = audioCtx.createGain();
    ampLfo.frequency.setValueAtTime(14, now);
    ampLfoGain.gain.setValueAtTime(0.04, now);

    ampLfo.connect(ampLfoGain);
    ampLfoGain.connect(gainNode.gain);

    // バンドパスフィルターで周波数を絞り、よりリアルな質感に
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(4200, now);
    filter.Q.setValueAtTime(6, now);

    // 結線
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // スタート
    lfo.start(now);
    ampLfo.start(now);
    osc.start(now);
    osc2.start(now);

    // 徐々にフェードアウトする設定
    gainNode.gain.setValueAtTime(0.06, now + duration - 1.0);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // 終了
    lfo.stop(now + duration);
    ampLfo.stop(now + duration);
    osc.stop(now + duration);
    osc2.stop(now + duration);

    // タイマーで次の鳴き声をランダム（2秒〜5秒後）に予約
    setTimeout(() => {
      cicada.isSinging = false;
      if (isSoundPlaying) {
        soundTimer = setTimeout(
          playHigurashiSound,
          Math.random() * 3000 + 2000,
        );
      }
    }, duration * 1000);
  }

  // --- DOM要素の取得とイベントリスナーの設定 ---

  // 音声トグルのクリックイベント
  const soundBtn = document.getElementById("soundBtn");
  const soundOnIcon = document.getElementById("soundOnIcon");
  const soundOffIcon = document.getElementById("soundOffIcon");
  const soundText = document.getElementById("soundText");

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      initAudio();
      isSoundPlaying = !isSoundPlaying;

      if (isSoundPlaying) {
        soundOnIcon.classList.remove("hidden");
        soundOffIcon.classList.add("hidden");
        soundText.innerText = "環境音 ON";
        // オーディオ再開
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
        playHigurashiSound();
      } else {
        soundOnIcon.classList.add("hidden");
        soundOffIcon.classList.remove("hidden");
        soundText.innerText = "環境音 OFF";
        clearTimeout(soundTimer);
        cicada.isSinging = false;
      }
    });
  }

  // 風の演出トグルのクリックイベント
  const windToggleBtn = document.getElementById("windToggleBtn");
  const windOnIcon = document.getElementById("windOnIcon");
  const windOffIcon = document.getElementById("windOffIcon");
  const windToggleText = document.getElementById("windToggleText");

  if (windToggleBtn) {
    windToggleBtn.addEventListener("click", () => {
      isWindEnabled = !isWindEnabled;

      if (isWindEnabled) {
        windOnIcon.classList.remove("hidden");
        windOffIcon.classList.add("hidden");
        windToggleText.innerText = "風の演出 ON";
      } else {
        windOnIcon.classList.add("hidden");
        windOffIcon.classList.remove("hidden");
        windToggleText.innerText = "風の演出 OFF";
      }
    });
  }

  // --- インタラクティブ（タップ、マウス移動） ---
  window.addEventListener("pointerdown", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
    mouse.pulseRad = 1;
    wind = 1.0; // 風を一気に強める

    // セミが風で驚いて少し羽を動かす
    cicada.wingTime += 5;
    if (!cicada.isSinging && isSoundPlaying) {
      // 音がONならタップ時にすぐ鳴き始めるきっかけに
      playHigurashiSound();
    }
  });

  // 背景色のグラデーション
  function drawBackground() {
    // 深い夏の夕暮れ時、または森の奥の陰影を表現するシネマティックなグラデーション
    const bgGrad = ctx.createRadialGradient(
      canvas.width * 0.2,
      canvas.height * 0.2,
      50,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width,
    );
    bgGrad.addColorStop(0, "#102d24"); // 爽やかな深緑
    bgGrad.addColorStop(0.5, "#091b15"); // 陰影
    bgGrad.addColorStop(1, "#030a08"); // 最深部
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // クリックされた際の波紋演出
  function drawTouchWave() {
    if (mouse.active) {
      mouse.pulseRad += 4;
      const alpha = Math.max(0, 1 - mouse.pulseRad / 120);

      ctx.save();
      ctx.strokeStyle = `rgba(164, 250, 200, ${alpha * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, mouse.pulseRad, 0, Math.PI * 2);
      ctx.stroke();

      // 内側のソフトグロー
      ctx.fillStyle = `rgba(164, 250, 200, ${alpha * 0.1})`;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, mouse.pulseRad * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (alpha <= 0) {
        mouse.active = false;
      }
    }
  }

  // --- メインのアニメーションループ ---
  function animate() {
    // 1. 背景描画
    drawBackground();

    // 2. 木漏れ日の描画と更新
    lightRays.forEach((ray) => {
      ray.update();
      ray.draw();
    });

    // 風の減衰
    if (wind > 0) {
      wind -= 0.015;
    } else {
      wind = 0;
    }

    // 3. 葉っぱパーティクルの描画と更新
    leaves.forEach((leaf) => {
      leaf.update(wind);
      leaf.draw();
    });

    // 4. 木（幹）の描画
    tree.draw();

    // 5. セミの更新と描画
    // 画面サイズ変更時にセミの基準位置を更新
    const currentAnchor = tree.getAnchorPoint(0.48);
    cicada.targetX = currentAnchor.x;
    cicada.targetY = currentAnchor.y;

    cicada.update();
    cicada.draw();

    // 6. クリック波紋
    drawTouchWave();

    requestAnimationFrame(animate);
  }

  // アニメーションスタート
  animate();
});
