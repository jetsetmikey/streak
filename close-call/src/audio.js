/* Close Call: the thump of the verdict stamp. Nothing plays until the
 * player has pressed something, and it can be switched off. */
(function (root) {
  'use strict';
  const CC = (root.CC = root.CC || {});

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

  // A rubber stamp hitting a desk: a low knock with a slap of noise on top.
  // Death lands lower and rings a little longer.
  function thud(survived) {
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime + 0.01;

    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(survived ? 150 : 96, t0);
    o.frequency.exponentialRampToValueAtTime(survived ? 72 : 40, t0 + 0.28);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (survived ? 0.3 : 0.55));
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + 0.6);

    const len = Math.floor(a.sampleRate * 0.08);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = survived ? 1800 : 900;
    const ng = a.createGain();
    ng.gain.value = 0.35;
    src.connect(f).connect(ng).connect(a.destination);
    src.start(t0);
  }

  CC.audio = {
    unlock: () => void ctx(), // call from a click so later sounds may play
    thud,
    setMuted(m) {
      muted = !!m;
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
