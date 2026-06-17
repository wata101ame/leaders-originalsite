var canvas = document.getElementById("fluidCanvas");
var ctx = canvas.getContext("2d");

// デバイスピクセル比（DPI）に対応した高精細レンダリング設定
var dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  var w = window.innerWidth;
  var h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  ctx.scale(dpr, dpr);
}

window.addEventListener(
  "resize",
  function () {
    resizeCanvas();
    initBlobs();
  },
  false,
);

resizeCanvas();

// --- 流体シミュレーション（水玉データ設計） ---
var blobs = [];
var globalSpeedFactor = 0.8; // 漂う動きを少しゆったりに調整

// マウス位置保持用
var mouse = { x: null, y: null };

// 波（右上にある美しい曲線）の制御パラメータ
var waveTime = 0;

// 水滴（Blob）クラスの定義（結合しない美しい円）
function Blob(x, y, radius, color, type) {
  this.x = x;
  this.y = y;
  this.baseX = x;
  this.baseY = y;
  this.radius = radius;
  this.baseRadius = radius;
  this.color = color;
  this.type = type || "floating"; // 'floating', 'ambient'

  // ランダムな自律浮遊の動きパラメータ
  this.angleX = Math.random() * Math.PI * 2;
  this.angleY = Math.random() * Math.PI * 2;
  this.speedX = 0.003 + Math.random() * 0.006;
  this.speedY = 0.003 + Math.random() * 0.006;
  this.amplitudeX = 15 + Math.random() * 30;
  this.amplitudeY = 15 + Math.random() * 30;

  this.vx = 0;
  this.vy = 0;
}

Blob.prototype.update = function () {
  if (this.type === "floating") {
    this.angleX += this.speedX * globalSpeedFactor;
    this.angleY += this.speedY * globalSpeedFactor;

    this.x = this.baseX + Math.sin(this.angleX) * this.amplitudeX + this.vx;
    this.y = this.baseY + Math.cos(this.angleY) * this.amplitudeY + this.vy;

    // マウスから優しく逃げる物理演算の減衰
    this.vx *= 1;
    this.vy *= 1;

    if (mouse.x !== null) {
      var dx = mouse.x - this.x;
      var dy = mouse.y - this.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        var force = (200 - dist) / 200;
        // 優しく押し出す
        this.vx -= (dx / dist) * force * 2.0;
        this.vy -= (dy / dist) * force * 2.0;
      }
    }
  } else if (this.type === "ambient") {
    this.angleX += 0.003 * globalSpeedFactor;
    // メインの大きな円はゆったりと呼吸するように伸縮
    this.radius = this.baseRadius + Math.sin(this.angleX) * 8;

    if (mouse.x !== null) {
      var dx = mouse.x - this.x;
      var dy = mouse.y - this.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 250) {
        this.x += (mouse.x - this.x) * 0.02;
        this.y += (mouse.y - this.y) * 0.02;
      } else {
        this.x += (this.baseX - this.x) * 0.04;
        this.y += (this.baseY - this.y) * 0.04;
      }
    }
  }
};

Blob.prototype.draw = function () {
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
  ctx.fillStyle = this.color;
  ctx.fill();
};

// 右上にある「流れる有機的な波」を描画する関数（ベジェ曲線）
function drawBackgroundWaves() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  waveTime += 0.002;

  ctx.save();

  // 複数のレイヤーの波を重ねて奥行きを表現
  var waveLayers = [
    {
      color: "#4B7FC2", // 濃い青（最背面）
      offsetY: -50,
      amplitude: 40,
      speed: 1.0,
    },
    {
      color: "rgba(59, 130, 246, 0.25)", // 中間の青
      offsetY: 0,
      amplitude: 50,
      speed: 1.2,
    },
    {
      color: "rgba(147, 197, 253, 0.35)", // 淡い水色
      offsetY: 50,
      amplitude: 30,
      speed: 0.8,
    },
  ];

  for (var i = 0; i < waveLayers.length; i++) {
    var layer = waveLayers[i];
    ctx.fillStyle = layer.color;
    ctx.beginPath();

    // 右上からスタートして左下へ大きくカーブする波
    var startX = w * 0.4;
    var startY = 0;
    ctx.moveTo(startX, startY);

    // ベジェ曲線で画像のような有機的なたわみを表現
    var cp1x = w * 0.6 + Math.sin(waveTime * layer.speed) * layer.amplitude;
    var cp1y = h * 0.2 + Math.cos(waveTime * layer.speed) * layer.amplitude;
    var cp2x =
      w * 0.75 +
      Math.cos(waveTime * layer.speed * 0.8) * (layer.amplitude * 0.5);
    var cp2y =
      h * 0.45 +
      Math.sin(waveTime * layer.speed * 0.8) * (layer.amplitude * 0.5);

    var endX = w;
    var endY = h * 0.5 + layer.offsetY;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// 初期水滴の配置
function initBlobs() {
  blobs = [];

  var w = window.innerWidth;
  var h = window.innerHeight;

  // 各種ブルー＆ホワイトのソリッドカラー（半透明の重なりが最も美しく見えるアルファ値）
  var colDeepBlue = "rgba(37, 99, 235, 0.55)"; // 濃い青
  var colSkyBlue = "rgba(59, 130, 246, 0.6)"; // 中間の青
  var colLightBlue = "rgba(96, 165, 250, 0.5)"; // 水色
  var colIceBlue = "rgba(147, 197, 253, 0.65)"; // 淡い水色
  var colWhite = "rgba(255, 255, 255, 0.75)"; // 泡（白）

  // 1. 中央下の水色の巨大な球（メインのサークル）
  blobs.push(
    new Blob(w * 0.55, h * 0.85, 170, "rgba(147, 197, 253, 0.7)", "ambient"),
  );

  // 2. 画面左下の小さな青いアクセント円
  blobs.push(new Blob(w * 0.18, h * 0.82, 60, colDeepBlue, "floating"));

  // 3. 周囲を自由に漂う美しく澄んだ水滴たち（重なり合う位置にレイアウト）
  var floatingConfig = [
    { x: 0.52, y: 0.35, r: 45, col: colDeepBlue },
    { x: 0.58, y: 0.38, r: 40, col: colSkyBlue },
    { x: 0.64, y: 0.42, r: 55, col: colWhite },
    { x: 0.61, y: 0.24, r: 48, col: "rgba(255, 255, 255, 0.6)" },
    { x: 0.45, y: 0.25, r: 30, col: colLightBlue },
    { x: 0.75, y: 0.55, r: 85, col: colIceBlue },
  ];

  for (var j = 0; j < floatingConfig.length; j++) {
    var conf = floatingConfig[j];
    blobs.push(new Blob(w * conf.x, h * conf.y, conf.r, conf.col, "floating"));
  }
}

// マウス・タッチイベントリスナーの登録
window.addEventListener(
  "mousemove",
  function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  },
  false,
);

window.addEventListener(
  "mouseleave",
  function () {
    mouse.x = null;
    mouse.y = null;
  },
  false,
);

window.addEventListener(
  "touchmove",
  function (e) {
    if (e.touches.length > 0) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
  },
  false,
);

window.addEventListener(
  "touchend",
  function () {
    mouse.x = null;
    mouse.y = null;
  },
  false,
);

// 画面をクリック・タップすると新しく美しい半透明の水滴を追加生成
window.addEventListener(
  "click",
  function (e) {
    var r = 25 + Math.random() * 35;
    // ランダムで美しい水色が生まれる
    var randomColor =
      Math.random() > 0.5
        ? "rgba(59, 130, 246, 0.6)"
        : "rgba(147, 197, 253, 0.65)";
    var newBlob = new Blob(e.clientX, e.clientY, r, randomColor, "floating");

    newBlob.vx = (Math.random() - 0.5) * 8;
    newBlob.vy = (Math.random() - 0.5) * 8;
    blobs.push(newBlob);

    // 浮遊水滴の上限を管理
    var floatingBlobs = [];
    for (var i = 0; i < blobs.length; i++) {
      if (blobs[i].type === "floating") {
        floatingBlobs.push(blobs[i]);
      }
    }
    if (floatingBlobs.length > 25) {
      var targetToDestroy = floatingBlobs[0];
      var idx = blobs.indexOf(targetToDestroy);
      if (idx > -1) {
        blobs.splice(idx, 1);
      }
    }
  },
  false,
);

// --- メインアニメーションループ ---
function animate() {
  // 前フレームの描画をクリア
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // 1. 右上の有機的な流線型の波（ベジェ曲線レイヤー）を描画
  drawBackgroundWaves();

  // 2. すべての水滴オブジェクトの更新と描画（結合せず、半透明で美しく重なり合う）
  for (var i = 0; i < blobs.length; i++) {
    blobs[i].update();
    blobs[i].draw();
  }
  requestAnimationFrame(animate);
}

// 初期化と稼働
initBlobs();
animate();
