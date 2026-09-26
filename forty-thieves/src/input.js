/* Forty Thieves: keyboard and touch controls, read once per simulation tick. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

  const MOVE_KEYS = {
    ArrowUp: 'u', KeyW: 'u',
    ArrowDown: 'd', KeyS: 'd',
    ArrowLeft: 'l', KeyA: 'l',
    ArrowRight: 'r', KeyD: 'r',
  };
  const ACT_KEYS = { Space: true, KeyE: true, KeyJ: true, Enter: true };
  // Joystick sectors (atan2 / 45deg, rounded) to direction codes.
  const SECTOR_DIR = { 0: 3, 1: 4, 2: 5, 3: 6, 4: 7, '-4': 7, '-3': 8, '-2': 1, '-1': 2 };
  const STICK_RADIUS = 46;

  function createInput(els) {
    const held = { u: false, d: false, l: false, r: false };
    let enabled = false;
    let actQueued = false;
    let stickDir = 0;
    let pointer = null;
    let ox = 0;
    let oy = 0;

    function clearHeld() {
      held.u = held.d = held.l = held.r = false;
    }

    // Held keys are tracked all the time, so a direction held through the
    // countdown counts the moment the run starts. Only presses of Act need
    // the run to be live.
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const k = MOVE_KEYS[e.code];
      if (k) {
        held[k] = true;
        if (enabled) e.preventDefault();
      } else if (ACT_KEYS[e.code] && enabled) {
        if (!e.repeat) actQueued = true;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = MOVE_KEYS[e.code];
      if (k) held[k] = false;
    });
    window.addEventListener('blur', clearHeld);

    function placeKnob(dx, dy) {
      els.knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    }

    function track(e) {
      const dx = e.clientX - ox;
      const dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      const k = d > STICK_RADIUS ? STICK_RADIUS / d : 1;
      placeKnob(dx * k, dy * k);
      stickDir = d < STICK_RADIUS * 0.28 ? 0 : SECTOR_DIR[Math.round(Math.atan2(dy, dx) / (Math.PI / 4))];
    }

    els.zone.addEventListener('pointerdown', (e) => {
      if (pointer !== null) return;
      pointer = e.pointerId;
      try {
        els.zone.setPointerCapture(pointer);
      } catch (err) {
        // Capture is a nicety; tracking still works without it.
      }
      const r = els.zone.getBoundingClientRect();
      ox = e.clientX;
      oy = e.clientY;
      els.base.style.left = e.clientX - r.left + 'px';
      els.base.style.top = e.clientY - r.top + 'px';
      els.zone.classList.add('is-active');
      track(e);
      e.preventDefault();
    });
    els.zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointer) track(e);
    });
    function release(e) {
      if (e.pointerId !== pointer) return;
      pointer = null;
      stickDir = 0;
      placeKnob(0, 0);
      els.zone.classList.remove('is-active');
      els.base.style.left = '';
      els.base.style.top = '';
    }
    els.zone.addEventListener('pointerup', release);
    els.zone.addEventListener('pointercancel', release);

    els.act.addEventListener('pointerdown', (e) => {
      if (!enabled) return;
      actQueued = true;
      els.act.classList.add('is-pressed');
      e.preventDefault();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => els.act.addEventListener(t, () => els.act.classList.remove('is-pressed')));

    function keyDir() {
      const x = (held.r ? 1 : 0) - (held.l ? 1 : 0);
      const y = (held.d ? 1 : 0) - (held.u ? 1 : 0);
      return FT.sim.DIR_FROM_SIGNS[(y + 1) * 3 + (x + 1)];
    }

    return {
      // The input code for the next simulation tick. Consumes a queued action press.
      next() {
        const code = (stickDir || keyDir()) + (actQueued ? 9 : 0);
        actQueued = false;
        return code;
      },
      enable(on) {
        enabled = on;
        actQueued = false;
      },
    };
  }

  FT.createInput = createInput;
})(typeof globalThis !== 'undefined' ? globalThis : this);
