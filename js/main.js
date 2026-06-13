const root = document.documentElement;
const hero = document.querySelector(".hero");

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function updateHeroMotion() {
  const heroRect = hero.getBoundingClientRect();
  const scrollable = hero.offsetHeight - window.innerHeight;
  const progress = scrollable > 0 ? clamp(-heroRect.top / scrollable) : 0;
  const zoom = Math.pow(progress, 2);
  const bgProgress = clamp((progress - 0.68) / 0.32);
  const scale = 1 + zoom * 6.2;

  root.style.setProperty("--zoom-progress", progress.toFixed(4));
  root.style.setProperty("--bg-progress", bgProgress.toFixed(4));
  root.style.setProperty("--fade-progress", clamp(progress * 1.25).toFixed(4));
  root.style.setProperty("--window-scale", scale.toFixed(4));
}

let ticking = false;

function requestMotionUpdate() {
  if (ticking) return;

  ticking = true;
  window.requestAnimationFrame(() => {
    updateHeroMotion();
    ticking = false;
  });
}

window.addEventListener("scroll", requestMotionUpdate, { passive: true });
window.addEventListener("resize", requestMotionUpdate);
window.addEventListener("load", updateHeroMotion);
updateHeroMotion();
