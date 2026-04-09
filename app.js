/* =============================================
   app.js — Romantic Landing Page for Disha 💖
   ============================================= */

/* ─── CONFIG ─── */
const EMOJIS          = ['❤️','💖','💗','💓','💝','🍓','🌹','💕','💞','✨','🌸','🍎','💋','🫶'];
const FLOAT_INTERVAL  = 600;   // ms between new floaters
const FLOAT_DURATION  = [7000, 13000]; // random range ms
const BURST_COUNT     = 28;
const STAR_COUNT      = 80;

/* ─── STATE ─── */
let gateOpen = false;

/* ─── CANVAS PARTICLE BACKGROUND ─── */
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); initParticles(); });

  function Particle() {
    this.reset = function() {
      this.x    = Math.random() * W;
      this.y    = Math.random() * H;
      this.r    = Math.random() * 2.5 + 0.5;
      this.vx   = (Math.random() - 0.5) * 0.3;
      this.vy   = (Math.random() - 0.5) * 0.3;
      this.alpha = Math.random() * 0.6 + 0.2;
      this.color = Math.random() < 0.6
        ? `rgba(255, ${Math.floor(Math.random()*80+60)}, ${Math.floor(Math.random()*80+80)}, ${this.alpha})`
        : `rgba(255, 255, 255, ${this.alpha * 0.4})`;
    };
    this.reset();
  }

  function initParticles() {
    particles = Array.from({ length: 90 }, () => new Particle());
  }
  initParticles();

  function drawGradientBg() {
    const t = Date.now() * 0.0003;
    const grad = ctx.createRadialGradient(
      W * (0.5 + 0.15 * Math.sin(t)),
      H * (0.5 + 0.12 * Math.cos(t * 0.7)),
      0,
      W / 2, H / 2, Math.max(W, H) * 0.9
    );
    grad.addColorStop(0,   '#1a0020');
    grad.addColorStop(0.35,'#280010');
    grad.addColorStop(0.65,'#100018');
    grad.addColorStop(1,   '#050008');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft vignette hearts in bg
    const t2 = Date.now() * 0.0005;
    const cx = W * 0.5 + Math.sin(t2) * W * 0.1;
    const cy = H * 0.5 + Math.cos(t2 * 0.7) * H * 0.08;
    const radialGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);
    radialGlow.addColorStop(0,   'rgba(180, 0, 60, 0.18)');
    radialGlow.addColorStop(0.5, 'rgba(100, 0, 40, 0.1)');
    radialGlow.addColorStop(1,   'transparent');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, W, H);
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawGradientBg();

    // Draw particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) p.reset();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    requestAnimationFrame(loop);
  }
  loop();
})();


/* ─── FLOATING EMOJIS ─── */
(function initFloaters() {
  const layer = document.getElementById('floatingLayer');

  function spawnFloater() {
    const el     = document.createElement('span');
    const emoji  = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const size   = Math.random() * 1.2 + 0.8;
    const left   = Math.random() * 90 + 2;
    const dur    = Math.random() * (FLOAT_DURATION[1] - FLOAT_DURATION[0]) + FLOAT_DURATION[0];
    const delay  = Math.random() * 1200;

    el.className   = 'float-emoji';
    el.textContent = emoji;
    el.style.left  = left + '%';
    el.style.fontSize = size + 'rem';
    el.style.animationDuration = dur + 'ms';
    el.style.animationDelay   = delay + 'ms';
    el.style.filter = `drop-shadow(0 0 ${6 + Math.random()*8}px rgba(255, 80, 120, 0.7))`;

    layer.appendChild(el);
    setTimeout(() => el.remove(), dur + delay + 200);
  }

  // Initial burst
  for (let i = 0; i < 10; i++) spawnFloater();
  setInterval(spawnFloater, FLOAT_INTERVAL);
})();


/* ─── BURST HEARTS ON OPEN ─── */
function spawnBurst() {
  const container = document.getElementById('burstContainer');
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;

  for (let i = 0; i < BURST_COUNT; i++) {
    setTimeout(() => {
      const el    = document.createElement('span');
      const angle = Math.random() * Math.PI * 2;
      const dist  = 80 + Math.random() * 200;
      const tx    = Math.cos(angle) * dist;
      const ty    = Math.sin(angle) * dist;
      const rot   = (Math.random() - 0.5) * 360 + 'deg';
      const emoji = Math.random() < 0.6 ? '❤️' : (Math.random() < 0.5 ? '💖' : '🍓');

      el.className   = 'burst-heart';
      el.textContent = emoji;
      el.style.left  = cx + 'px';
      el.style.top   = cy + 'px';
      el.style.setProperty('--tx', `translate(${tx}px, ${ty}px)`);
      el.style.setProperty('--rot', rot);
      el.style.fontSize = (Math.random() * 1.2 + 0.8) + 'rem';

      container.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    }, i * 40);
  }
}


/* ─── STARS IN MESSAGE SCREEN ─── */
function initStars() {
  const layer = document.getElementById('starsLayer');
  for (let i = 0; i < STAR_COUNT; i++) {
    const star = document.createElement('div');
    star.className  = 'star-dot';
    const size = Math.random() * 2.5 + 0.5;
    star.style.width  = size + 'px';
    star.style.height = size + 'px';
    star.style.left   = Math.random() * 100 + '%';
    star.style.top    = Math.random() * 100 + '%';
    star.style.animationDuration  = (Math.random() * 3 + 1.5) + 's';
    star.style.animationDelay     = (Math.random() * 3) + 's';
    layer.appendChild(star);
  }
}


/* ─── AUDIO REACTION (vibrate on tap) ─── */
function vibrateDevice() {
  if (navigator.vibrate) {
    navigator.vibrate([80, 40, 80, 40, 120]);
  }
}


/* ─── OPEN GATE ─── */
function openGate() {
  if (gateOpen) return;
  gateOpen = true;

  vibrateDevice();
  spawnBurst();

  // Extra immediate floaters
  const layer = document.getElementById('floatingLayer');
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const el = document.createElement('span');
      el.className   = 'float-emoji';
      el.textContent = ['❤️','💖','💗','💝','🍓'][Math.floor(Math.random()*5)];
      el.style.left  = (Math.random() * 90 + 2) + '%';
      el.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
      el.style.animationDuration = '6000ms';
      el.style.animationDelay   = '0ms';
      layer.appendChild(el);
      setTimeout(() => el.remove(), 6200);
    }, i * 60);
  }

  // Fade gate out
  const gate = document.getElementById('gateScreen');
  gate.classList.add('fade-out');

  // Show message after transition
  setTimeout(() => {
    gate.style.display = 'none';
    initStars();
    const msg = document.getElementById('msgScreen');
    msg.classList.remove('hidden');
    // Trigger reflow for transition
    msg.offsetHeight;
    msg.classList.add('visible');
  }, 800);
}


/* ─── PREVENT SCROLL BOUNCE (iOS) ─── */
document.addEventListener('touchmove', e => {
  const msgScreen = document.getElementById('msgScreen');
  if (!msgScreen.classList.contains('hidden')) return;
  e.preventDefault();
}, { passive: false });


/* ─── RIPPLE ON HEART TAP ─── */
document.getElementById('heartWrapper').addEventListener('touchstart', function(e) {
  const touch = e.touches[0];
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position: fixed;
    left: ${touch.clientX - 30}px;
    top:  ${touch.clientY - 30}px;
    width: 60px; height: 60px;
    border-radius: 50%;
    background: rgba(255, 80, 120, 0.4);
    pointer-events: none;
    z-index: 100;
    animation: rippleOut 0.6s ease-out forwards;
  `;
  document.body.appendChild(ripple);

  // Inject keyframe once
  if (!document.getElementById('rippleStyle')) {
    const s = document.createElement('style');
    s.id = 'rippleStyle';
    s.textContent = `@keyframes rippleOut {
      0%   { transform: scale(0); opacity: 0.8; }
      100% { transform: scale(4); opacity: 0;   }
    }`;
    document.head.appendChild(s);
  }
  setTimeout(() => ripple.remove(), 700);
}, { passive: true });
