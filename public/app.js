/* ============================================================
   app.js — Level 0: Night
   ============================================================ */

/* The song: JVKE — her (feat. Annika Wells), played through the official
   YouTube player. If YouTube can't load, a generated fireside soundtrack
   plays instead. */
const YT_ID = 'ZxE0QzE2K9o';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- embers canvas ---------- */
const embers = (() => {
  const canvas = $('#embers');
  const ctx = canvas.getContext('2d');
  let W, H, dpr, parts = [], intensity = 0.35, last = performance.now();
  const max = () => Math.round((reduceMotion ? 18 : 60) * (W < 600 ? 1 : 1.6));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(initial) {
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 18 + Math.random() * 46,
      sway: 8 + Math.random() * 22,
      ph: Math.random() * 6.28,
      sp: 0.5 + Math.random() * 1.2,
      a: 0.35 + Math.random() * 0.65,
    };
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const target = Math.round(max() * intensity);
    while (parts.length < target) parts.push(spawn(parts.length < target * 0.6));
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.y -= p.vy * dt * (0.6 + intensity);
      p.ph += p.sp * dt;
      const x = p.x + Math.sin(p.ph) * p.sway;
      const fade = Math.max(0, Math.min(1, p.y / (H * 0.85)));
      const flick = 0.7 + Math.sin(p.ph * 5) * 0.3;
      if (p.y < -10 || parts.length > target + 6) { parts.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 5);
      g.addColorStop(0, `rgba(255, 190, 110, ${p.a * fade * flick})`);
      g.addColorStop(0.4, `rgba(255, 110, 40, ${p.a * fade * flick * 0.4})`);
      g.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, p.y, p.r * 5, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  resize();
  addEventListener('resize', resize);
  requestAnimationFrame(frame);
  return { set(v) { intensity = v; } };
})();

/* ---------- sound ---------- */
const sound = (() => {
  let yt = null, ytReady = false, ytPlaying = false, ytBroken = false;
  let synth = null, on = true, started = false, timer = null;
  const nudge = $('#nudge');
  const api = { onChange: () => {} };

  const setOn = (v) => { on = v; api.onChange(v); };
  const showNudge = () => { if (started && !ytPlaying && !ytBroken) nudge.hidden = false; };
  const hideNudge = () => { nudge.hidden = true; };

  function tryPlay() {
    try { yt.unMute(); yt.setVolume(90); yt.playVideo(); } catch (e) { /* not ready */ }
  }

  function ytFailed() {
    if (ytBroken) return;
    ytBroken = true; hideNudge();
    $('#songCard').hidden = true;
    // no YouTube → full generated soundtrack instead
    if (synth) synth.add({ fire: false }); else if (started) startSynth(true);
  }

  function startSynth(full) {
    if (synth) return;
    synth = NightAudio.createPlayer(full ? {} : { music: false, level: 0.5 });
    if (synth) { synth.start(); synth.setOn(on); }
  }

  // load the YouTube player early so the tap can start it instantly
  window.onYouTubeIframeAPIReady = () => {
    yt = new YT.Player('ytPlayer', {
      videoId: YT_ID, width: '100%', height: '100%',
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, loop: 1, playlist: YT_ID },
      events: {
        onReady: () => { ytReady = true; if (started && on) tryPlay(); },
        onStateChange: (e) => {
          const S = YT.PlayerState;
          if (e.data === S.PLAYING) { ytPlaying = true; hideNudge(); if (!on) setOn(true); if (synth) synth.setOn(true); }
          else if (e.data === S.PAUSED) { ytPlaying = false; if (on) { setOn(false); if (synth) synth.setOn(false); } }
          else if (e.data === S.ENDED) { yt.seekTo(0); yt.playVideo(); }
        },
        onError: ytFailed,
      },
    });
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = ytFailed;
  document.head.appendChild(tag);

  api.start = () => {
    started = true;
    if (ytBroken) return startSynth(true);
    startSynth(false);                 // quiet fire crackle under the song
    if (ytReady) tryPlay();            // else onReady starts it
    timer = setTimeout(() => {
      if (ytPlaying) return;
      if (!ytReady) ytFailed(); else showNudge();   // autoplay blocked → ask for one more tap
    }, 3500);
  };

  api.toggle = () => {
    setOn(!on);
    if (yt && ytReady && !ytBroken) { on ? tryPlay() : yt.pauseVideo(); }
    if (synth) synth.setOn(on);
    return on;
  };

  nudge.addEventListener('click', () => {
    if (yt && ytReady) tryPlay();
    // if the browser still refuses, bring the visible player into view to tap play there
    setTimeout(() => { if (!ytPlaying) $('#songCard').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 1200);
  });

  return api;
})();

/* ---------- gate: the tap that lights the fire (and the music) ---------- */
(function gate() {
  const btn = $('#lightBtn');
  const gateEl = $('#gate');
  let done = false;

  btn.addEventListener('click', () => {
    if (done) return; done = true;
    sound.start();                       // inside the user gesture → allowed to autoplay
    btn.classList.add('lit');
    embers.set(1);
    if (navigator.vibrate) navigator.vibrate(30);

    setTimeout(() => {
      gateEl.classList.add('leaving');
      $('#story').classList.remove('pre');
      document.body.classList.remove('is-gated');
      scrollTo(0, 0);
      startReveals();
      setTimeout(() => { gateEl.hidden = true; }, 1300);
    }, 1500);
  });
})();

/* ---------- reveal on scroll ---------- */
function startReveals() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  els.forEach((e) => io.observe(e));
}

/* ---------- hero parallax ---------- */
(function parallax() {
  if (reduceMotion) return;
  const bg = $('.hero-bg');
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      if (y < innerHeight * 1.2) bg.style.transform = `translate3d(0, ${y * 0.25}px, 0) scale(${1 + y * 0.0002})`;
      ticking = false;
    });
  }, { passive: true });
})();

/* ---------- sound button / replay ---------- */
const soundBtn = $('#soundBtn');
sound.onChange = (v) => soundBtn.setAttribute('aria-pressed', String(v));
soundBtn.addEventListener('click', () => sound.toggle());
$('#again').addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

/* ---------- lightbox ---------- */
(function lightbox() {
  const box = $('#lightbox'), img = $('#lbImg');
  const srcs = $$('#gallery img').map((i) => ({ src: i.src, alt: i.alt }));
  let idx = 0, x0 = null;

  const show = (i) => {
    idx = (i + srcs.length) % srcs.length;
    img.src = srcs[idx].src; img.alt = srcs[idx].alt;
  };
  const open = (i) => { show(i); box.hidden = false; document.body.style.overflow = 'hidden'; };
  const close = () => { box.hidden = true; document.body.style.overflow = ''; };

  $$('#gallery button').forEach((b) => b.addEventListener('click', () => open(+b.dataset.i)));
  $('.lb-close').addEventListener('click', close);
  $('.prev').addEventListener('click', () => show(idx - 1));
  $('.next').addEventListener('click', () => show(idx + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  });
})();
