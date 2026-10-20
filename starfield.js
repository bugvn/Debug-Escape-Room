// twinkling pixel stars drawn on #starfield-canvas
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('starfield-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const COLORS = ['#ffffff', '#5ce1e6', '#b8c0ff', '#8ea7e9', '#ffd166'];
  const stars = [];
  let w, h;

  function fit() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function scatter() {
    stars.length = 0;
    for (let i = 0; i < 140; i++) {
      const r = Math.random();
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: r > 0.85 ? 3 : r > 0.5 ? 2 : 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.9 + 0.1,
        speed: Math.random() * 0.02 + 0.005,
        dir: Math.random() > 0.5 ? 1 : -1
      });
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.alpha += s.speed * s.dir;
      if (s.alpha > 0.95 || s.alpha < 0.15) s.dir *= -1;
      ctx.globalAlpha = Math.max(0.1, Math.min(1, s.alpha));
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => { fit(); scatter(); });
  fit();
  scatter();
  frame();
});