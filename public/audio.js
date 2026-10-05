/* ============================================================
   audio.js — generative "night by the fire" soundtrack.
   Warm pads + soft plucks + a crackling fire, all synthesized
   with Web Audio. No audio files, no licensing.
   ============================================================ */
(function () {
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // Am9 → Fmaj9 → Cmaj7 → Gmaj9, 8 seconds each (32 s loop)
  const CHORDS = [
    [57, 60, 64, 67, 71],
    [53, 57, 60, 64, 67],
    [48, 55, 60, 64, 71],
    [55, 59, 62, 66, 69],
  ];
  const BASS = [33, 29, 36, 31];
  const CHORD_LEN = 8;
  const STEP = 60 / 72 / 2; // eighth note @ 72 bpm
  const PLUCK_START = 5;    // let the pad bloom first

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function impulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function noiseBuffer(ctx, seconds, brown) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }

  function build(ctx, dest, opts) {
    opts = opts || {};
    const level = opts.level == null ? 0.85 : opts.level;
    const t0 = ctx.currentTime;
    const rng = mulberry32(opts.seed || 20260101);
    const pan = (v) => {
      if (!ctx.createStereoPanner) return null;
      const p = ctx.createStereoPanner(); p.pan.value = v; return p;
    };

    /* ── master chain ── */
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(level, t0 + 4);
    master.connect(dest);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    comp.connect(master);

    const dry = ctx.createGain(); dry.gain.value = 0.8; dry.connect(comp);

    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 3.4, 2.4);
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    reverb.connect(wet); wet.connect(comp);
    const send = ctx.createGain(); send.gain.value = 1; send.connect(reverb);

    const delay = ctx.createDelay(2); delay.delayTime.value = STEP * 3; // dotted eighth
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
    delay.connect(dlp); dlp.connect(fb); fb.connect(delay);
    const delayOut = ctx.createGain(); delayOut.gain.value = 0.5;
    dlp.connect(delayOut); delayOut.connect(comp); delayOut.connect(send);

    /* ── pad bus ── */
    const padBus = ctx.createGain(); padBus.gain.value = 1;
    const padLP = ctx.createBiquadFilter(); padLP.type = 'lowpass';
    padLP.frequency.value = 720; padLP.Q.value = 0.4;
    padBus.connect(padLP); padLP.connect(dry); padLP.connect(send);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 240;
    lfo.connect(lfoGain); lfoGain.connect(padLP.frequency); lfo.start(t0);

    /* ── pluck bus ── */
    const pluckBus = ctx.createGain(); pluckBus.gain.value = 0.9;
    pluckBus.connect(dry); pluckBus.connect(delay); pluckBus.connect(send);

    /* ── fire bus ── */
    const fireBus = ctx.createGain(); fireBus.gain.value = 0.55; fireBus.connect(comp);

    // low roar of the fire
    const roar = ctx.createBufferSource();
    roar.buffer = noiseBuffer(ctx, 4, true); roar.loop = true;
    const roarLP = ctx.createBiquadFilter(); roarLP.type = 'lowpass'; roarLP.frequency.value = 300;
    const roarGain = ctx.createGain(); roarGain.gain.value = 0.07;
    const roarLfo = ctx.createOscillator(); roarLfo.frequency.value = 0.23;
    const roarLfoG = ctx.createGain(); roarLfoG.gain.value = 0.025;
    roarLfo.connect(roarLfoG); roarLfoG.connect(roarGain.gain);
    roar.connect(roarLP); roarLP.connect(roarGain); roarGain.connect(fireBus);
    roar.start(t0); roarLfo.start(t0);

    const crackleBuf = noiseBuffer(ctx, 3, false);

    function padNote(t, freq, dur, vel) {
      [-7, 7].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vel, t + 2.6);
        g.gain.setValueAtTime(vel, t + dur);
        g.gain.setTargetAtTime(0, t + dur, 1.1);
        o.connect(g); g.connect(padBus);
        o.start(t); o.stop(t + dur + 6);
      });
    }

    function bassNote(t, freq, dur) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 1.8);
      g.gain.setValueAtTime(0.16, t + dur);
      g.gain.setTargetAtTime(0, t + dur, 0.9);
      o.connect(g); g.connect(dry);
      o.start(t); o.stop(t + dur + 5);
    }

    function pluck(t, freq, vel) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
      const g2 = ctx.createGain(); g2.gain.value = 0.25;
      o1.connect(g); o2.connect(g2); g2.connect(g);
      const p = pan(rng() * 0.8 - 0.4);
      if (p) { g.connect(p); p.connect(pluckBus); } else g.connect(pluckBus);
      o1.start(t); o2.start(t); o1.stop(t + 2.4); o2.stop(t + 2.4);
    }

    function pop(t, amp) {
      const src = ctx.createBufferSource(); src.buffer = crackleBuf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400 + rng() * 2400;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = 2200 + rng() * 3200; bp.Q.value = 0.8;
      const g = ctx.createGain();
      const dur = 0.012 + rng() * 0.05;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(hp); hp.connect(bp); bp.connect(g);
      const p = pan(rng() * 1.2 - 0.6);
      if (p) { g.connect(p); p.connect(fireBus); } else g.connect(fireBus);
      src.start(t, rng() * 2.5, dur + 0.02);
    }

    /* ── scheduler ── */
    let nextChord = t0, chordIdx = 0;
    let nextStep = t0, prev = 2;
    let nextPop = t0 + 0.3;

    function scheduleUntil(limit) {
      while (nextChord < limit) {
        const ch = CHORDS[chordIdx % CHORDS.length];
        ch.forEach((n, i) => padNote(nextChord + i * 0.15, midi(n), CHORD_LEN, 0.016));
        bassNote(nextChord, midi(BASS[chordIdx % BASS.length]), CHORD_LEN);
        chordIdx++; nextChord += CHORD_LEN;
      }
      while (nextStep < limit) {
        const t = nextStep;
        if (t - t0 > PLUCK_START && rng() < 0.5) {
          const ch = CHORDS[Math.floor((t - t0) / CHORD_LEN) % CHORDS.length];
          const pool = ch.slice(1).map((n) => n + 12).concat([ch[3] + 24, ch[1] + 24]);
          prev = Math.max(0, Math.min(pool.length - 1, prev + Math.floor(rng() * 5) - 2));
          pluck(t, midi(pool[prev]), 0.06 + rng() * 0.05);
        }
        nextStep += STEP;
      }
      while (nextPop < limit) {
        const big = rng() < 0.08;
        pop(nextPop, big ? 0.16 + rng() * 0.1 : 0.03 + rng() * 0.07);
        if (rng() < 0.22) pop(nextPop + 0.02 + rng() * 0.05, 0.03 + rng() * 0.05); // clusters
        nextPop += 0.05 + Math.pow(rng(), 2) * 0.7;
      }
    }

    return { master, level, scheduleUntil };
  }

  /* ── live player: owns the AudioContext, mute toggle, lifecycle ── */
  function createPlayer() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    let engine = null, timer = null, on = true;

    function tick() { engine.scheduleUntil(ctx.currentTime + 3); }

    function start() {
      // must run inside a user gesture (iOS / Chrome autoplay policy)
      const go = () => {
        if (engine) return;
        engine = build(ctx, ctx.destination);
        tick();
        timer = setInterval(tick, 400);
      };
      const r = ctx.resume();
      if (r && r.then) r.then(go).catch(go); else go();
      // iOS: unlock with a silent buffer inside the gesture
      try {
        const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
      } catch (e) { /* ignore */ }
    }

    function setOn(v) {
      on = v;
      if (!engine) return;
      if (v && ctx.state !== 'running') ctx.resume();
      const g = engine.master.gain, t = ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(v ? engine.level : 0, t + 0.6);
    }

    document.addEventListener('visibilitychange', () => {
      if (!engine) return;
      if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
    });

    return { ctx, start, setOn, isOn: () => on, isRunning: () => ctx.state === 'running' };
  }

  window.NightAudio = { build, createPlayer };
})();
