/* Forty Thieves: a few synthesized sound cues. Nothing plays until the player
 * has pressed something, and everything is optional. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

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

  function tone(freq, start, dur, type, gain, slideTo) {
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime + start;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.06, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  const CUES = {
    bank: () => {
      tone(1319, 0, 0.08, 'square', 0.05);
      tone(1760, 0.07, 0.16, 'square', 0.05);
    },
    pick: () => tone(660, 0, 0.06, 'triangle', 0.06),
    ko: () => tone(160, 0, 0.18, 'sawtooth', 0.08, 60),
    power: () => tone(440, 0, 0.35, 'sawtooth', 0.05, 70),
    vault: () => {
      tone(98, 0, 0.3, 'square', 0.07);
      tone(147, 0.12, 0.4, 'square', 0.05);
    },
    caught: () => tone(220, 0, 0.45, 'sawtooth', 0.07, 110),
    alarm: () => {
      for (let i = 0; i < 4; i++) tone(880, i * 0.5, 0.25, 'square', 0.04, 660);
    },
    go: () => tone(990, 0, 0.12, 'square', 0.05),
    tick: () => tone(520, 0, 0.05, 'square', 0.035),
  };

  FT.audio = {
    play(name) {
      const f = CUES[name];
      if (f && !muted) f();
    },
    unlock() {
      ctx();
    },
    setMuted(m) {
      muted = !!m;
    },
    get muted() {
      return muted;
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
