/* 80 Throws: a few synthesized sounds. Nothing plays until the player has
 * touched something, and all of it can be switched off. */
(function (root) {
  'use strict';
  const ET = (root.ET = root.ET || {});

  let ac = null;
  let muted = false;

  function ctx() {
    if (muted) return null;
    if (!ac) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try {
        ac = new AC();
      } catch (e) {
        return null;
      }
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  function noise(dur, from, to, gain) {
    const a = ctx();
    if (!a) return;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    const t0 = a.currentTime;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(a.destination);
    src.start(t0);
  }

  function tone(freq, dur, type, gain) {
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  const CUES = {
    whoosh: () => noise(1.1, 600, 2400, 0.12),
    thunk: () => tone(110, 0.25, 'sine', 0.35),
    splash: () => noise(0.7, 1800, 300, 0.1),
    stall: () => tone(520, 0.5, 'triangle', 0.08),
  };

  ET.audio = {
    play(name) {
      if (!muted && CUES[name]) CUES[name]();
    },
    unlock() {
      ctx();
    },
    setMuted(m) {
      muted = !!m;
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
