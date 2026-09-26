/* Forty Thieves: the app. Screens, the daily loop, and the live run. */
(function (root) {
  'use strict';
  const FT = root.FT;
  const sim = FT.sim;
  const timeline = FT.timeline;
  const storage = FT.storage;
  const audio = FT.audio;
  const level = FT.level;
  const SEASON = storage.SEASON_DAYS;
  const money = timeline.money;
  const clock = timeline.clock;

  const $ = (id) => document.getElementById(id);
  const el = {};
  [
    'dayNum', 'dayOf', 'chairs', 'board', 'map', 'hud', 'panel', 'hudClock', 'hudTake', 'hudPower', 'banner', 'bannerBig', 'bannerSmall',
    'viewIntro', 'viewHq', 'viewRun', 'viewResults', 'introBtn', 'introEyebrow',
    'playBtn', 'scrub', 'replayTime', 'speedBtn', 'pathsBtn',
    'hqTitle', 'hqStats', 'hqNotes', 'startBtn', 'skipBtn', 'hqFine',
    'runStatus', 'endBtn', 'stickZone', 'stickBase', 'stickKnob', 'actBtn',
    'resTitle', 'resTake', 'resDelta', 'resNotes', 'resCrew', 'shareBtn', 'doneBtn', 'shareOut',
    'menuBtn', 'menu', 'menuClose', 'soundBtn', 'exampleBtn', 'backupBtn', 'restoreText', 'restoreBtn', 'resetBtn', 'menuMsg',
  ].forEach((id) => {
    el[id] = $(id);
  });

  const renderer = FT.createRenderer(el.map, level);
  const input = FT.createInput({ zone: el.stickZone, base: el.stickBase, knob: el.stickKnob, act: el.actBtn });

  const state = {
    save: storage.load(),
    day: 1,
    mode: 'hq',
    result: null,
    summary: null,
    player: null,
    youDay: null,
    replay: { tick: 0, playing: true, speed: 1, paths: false, hold: 0 },
    baseline: null,
    live: null,
    paused: false,
    lastRun: null,
  };
  audio.setMuted(state.save.muted);

  // ---- Season bookkeeping ----

  function today() {
    return storage.currentDay(state.save, new Date());
  }

  function ranToday() {
    return !!state.save.runs[state.day];
  }

  function seasonDone() {
    return state.day > SEASON || (state.day === SEASON && ranToday());
  }

  function crewUpTo(lastDay) {
    const crew = [];
    for (let d = 1; d <= Math.min(lastDay, SEASON); d++) {
      const r = state.save.runs[d];
      if (r) crew.push({ day: d, codes: timeline.decodeTape(r.c) });
    }
    return crew;
  }

  function persist() {
    storage.save(state.save);
  }

  // ---- Replays ----

  function loadReplay(crew, youDay) {
    const result = timeline.simulate(level, crew);
    state.result = result;
    state.summary = timeline.summarize(level, result.final);
    state.player = new timeline.Player(level, result);
    state.youDay = youDay;
    state.replay.tick = 0;
    state.replay.hold = 0;
    state.replay.playing = true;
    el.scrub.max = String(result.endTick);
    syncReplayControls();
  }

  function syncReplayControls() {
    el.playBtn.textContent = state.replay.playing ? 'Pause' : 'Play';
    el.playBtn.setAttribute('aria-label', state.replay.playing ? 'Pause the replay' : 'Play the replay');
    el.speedBtn.textContent = state.replay.speed + '×';
    el.pathsBtn.setAttribute('aria-pressed', String(state.replay.paths));
  }

  // ---- Screens ----

  function setMode(mode) {
    if (mode !== state.mode) el.panel.scrollTop = 0;
    state.mode = mode;
    el.viewIntro.hidden = mode !== 'intro';
    el.viewHq.hidden = mode !== 'hq';
    el.viewRun.hidden = mode !== 'run' && mode !== 'countdown';
    el.viewResults.hidden = mode !== 'results';
    document.body.dataset.mode = mode;
  }

  function renderHeader() {
    if (state.mode === 'intro') {
      el.dayNum.textContent = 'Example';
      el.dayOf.textContent = '';
    } else {
      el.dayNum.textContent = 'Day ' + Math.min(state.day, SEASON);
      el.dayOf.textContent = '/' + SEASON;
    }
  }

  function renderChairs() {
    const s = state.summary;
    const frag = document.createDocumentFragment();
    for (let d = 1; d <= SEASON; d++) {
      const cell = document.createElement('span');
      let mark;
      let label;
      if (state.mode === 'intro') {
        mark = d <= FT.demo.days && s ? timeline.fateMark(timeline.fateOf(s, d)) : 'future';
      } else if (d < state.day || (d === state.day && ranToday())) {
        mark = s ? timeline.fateMark(timeline.fateOf(s, d)) : 'empty';
      } else if (d === state.day && !seasonDone()) {
        mark = 'today';
      } else {
        mark = 'future';
      }
      const f = s && timeline.fateOf(s, d);
      if (mark === 'future') label = 'Day ' + d + ': still to come';
      else if (mark === 'today') label = 'Day ' + d + ': today, not run yet';
      else if (mark === 'empty') label = 'Day ' + d + ': empty chair';
      else label = 'Day ' + d + ': ' + timeline.fateLine(level, f);
      cell.className = 'chair is-' + mark;
      cell.title = label;
      cell.setAttribute('role', 'listitem');
      cell.setAttribute('aria-label', label);
      frag.appendChild(cell);
    }
    el.chairs.replaceChildren(frag);
  }

  function notesInto(list, notes) {
    const frag = document.createDocumentFragment();
    notes.forEach((n) => {
      const li = document.createElement('li');
      li.className = 'note is-' + n.tone;
      li.textContent = n.text;
      frag.appendChild(li);
    });
    list.replaceChildren(frag);
  }

  function crewStats(s, upTo) {
    let crew = 0;
    for (let d = 1; d <= upTo; d++) if (timeline.fateOf(s, d)) crew++;
    return { crew, empty: upTo - crew };
  }

  function showIntro() {
    setMode('intro');
    el.introBtn.textContent = state.save.introSeen ? 'Back to my heist' : 'Case the joint';
    el.introEyebrow.textContent = 'Example crew · ' + FT.demo.days + ' days in';
    state.summary = null;
    renderHeader();
    renderChairs();
    // Building the example crew takes a moment; let the page paint first.
    root.setTimeout(() => {
      if (state.mode !== 'intro') return;
      loadReplay(FT.demo.build(level), null);
      renderChairs();
    }, 30);
  }

  function showHQ() {
    state.day = today();
    const done = seasonDone();
    const upTo = done || ranToday() ? Math.min(state.day, SEASON) : state.day - 1;
    loadReplay(crewUpTo(upTo), ranToday() ? state.day : null);
    setMode('hq');
    renderHeader();
    renderChairs();
    renderHQPanel();
  }

  function renderHQPanel() {
    const s = state.summary;
    const day = Math.min(state.day, SEASON);
    const done = seasonDone();
    const upTo = done || ranToday() ? day : day - 1;
    const st = crewStats(s, upTo);
    el.hqStats.textContent = 'The take: ' + money(s.haul) + ' of ' + money(level.totalValue) + ' · Crew: ' + st.crew + (st.empty ? ' · Empty chairs: ' + st.empty : '');
    disarm(el.skipBtn);
    el.startBtn.hidden = false;
    el.skipBtn.hidden = false;

    if (done) {
      el.hqTitle.textContent = 'The heist is done';
      notesInto(el.hqNotes, [
        { tone: 'good', text: 'Forty days, one heist. Your crew got away with ' + money(s.haul) + ' of ' + money(level.totalValue) + '.' },
        { tone: 'info', text: 'Watch the whole thing play out above, then start a new heist.' },
      ]);
      el.startBtn.textContent = 'Copy result';
      el.skipBtn.textContent = 'Plan a new heist';
      el.hqFine.textContent = 'A new heist erases this one.';
    } else if (ranToday()) {
      el.hqTitle.textContent = 'Day ' + day + ' is in the books';
      notesInto(el.hqNotes, [{ tone: 'info', text: 'Your next run unlocks tomorrow. Until then, watch your crew and plan what Day ' + (day + 1) + ' should do.' }]);
      el.startBtn.hidden = true;
      el.skipBtn.textContent = 'Skip to tomorrow';
      el.hqFine.textContent = 'Prototype shortcut: skip ahead to play the next day now.';
    } else {
      el.hqTitle.textContent = day === 1 ? 'Day 1: case the joint' : 'Day ' + day + ': plan your run';
      notesInto(el.hqNotes, timeline.briefing(level, s, day));
      el.startBtn.textContent = "Start today's run";
      el.skipBtn.textContent = 'Skip today';
      el.hqFine.textContent = 'One 60-second run a day. It is recorded and replays in every heist after this one.';
    }
  }

  // Buttons that need a second tap to confirm (the viewer can't show confirm dialogs).
  function arm(btn, confirmText, action) {
    if (btn.dataset.armed === '1') {
      disarm(btn);
      action();
      return;
    }
    btn.dataset.armed = '1';
    btn.dataset.label = btn.textContent;
    btn.textContent = confirmText;
    btn.classList.add('is-armed');
    btn._disarm = root.setTimeout(() => disarm(btn), 4000);
  }

  function disarm(btn) {
    if (btn.dataset.armed !== '1') return;
    root.clearTimeout(btn._disarm);
    btn.dataset.armed = '';
    btn.textContent = btn.dataset.label || btn.textContent;
    btn.classList.remove('is-armed');
  }

  // ---- The live run ----

  function startRun() {
    if (today() !== state.day) {
      // The page was left open past midnight: show the new day's plan first.
      showHQ();
      return;
    }
    if (ranToday() || seasonDone()) return;
    audio.unlock();
    if (!state.save.start) state.save.start = storage.dateKey(new Date());
    const past = crewUpTo(state.day - 1);
    state.baseline = state.summary;
    state.live = {
      past,
      me: past.length,
      world: sim.createWorld(level, past.map((c) => c.day).concat([state.day])),
      tape: new Uint8Array(sim.RUN_TICKS),
      length: 0,
      recording: true,
      ghost: null,
      codes: new Uint8Array(past.length + 1),
      countdown: 3 * sim.TICK_HZ,
      savedAt: 0,
      heard: 0,
      ended: false,
    };
    state.youDay = state.day;
    state.replay.paths = false;
    setMode('countdown');
    el.runStatus.textContent = 'Get ready';
    disarm(el.endBtn);
    el.endBtn.textContent = 'Stop';
    showBanner('3', coarse() ? 'Drag to move. ACT grabs, drops, pulls levers and knocks out guards.' : 'WASD or arrows to move. Space grabs, drops, pulls levers and knocks out guards.');
    audio.play('tick');
  }

  function commitTape(partial) {
    const L = state.live;
    state.save.runs[state.day] = { c: timeline.encodeTape(L.tape, L.length), p: partial };
    persist();
  }

  function tickCountdown() {
    const L = state.live;
    const before = Math.ceil(L.countdown / sim.TICK_HZ);
    L.countdown--;
    const after = Math.ceil(L.countdown / sim.TICK_HZ);
    if (L.countdown <= 0) {
      setMode('run');
      el.runStatus.textContent = 'Your run is live';
      input.enable(true);
      commitTape(true); // From here on, today's run counts.
      showBanner('Go', '', 'flash');
      audio.play('go');
    } else if (after !== before) {
      el.bannerBig.textContent = String(after);
      audio.play('tick');
    }
  }

  function tickLive() {
    const L = state.live;
    const w = L.world;
    if (w.over) return;
    const t = w.tick;
    const code = L.recording ? input.next() : 0;
    if (L.recording) {
      L.tape[t] = code;
      L.length = t + 1;
    }
    for (let i = 0; i < L.past.length; i++) L.codes[i] = L.past[i].codes[t];
    L.codes[L.me] = code;
    sim.step(w, level, L.codes);
    if (L.ghost) sim.moveGhost(w, level, L.ghost, code);

    const me = w.thieves[L.me];
    if (me.caught && !L.ghost && !w.over) {
      L.ghost = sim.createGhost(me);
      L.ghost.speed = me.caughtCarry;
      if (L.recording) {
        el.runStatus.textContent = 'Caught · ghost mode';
        showBanner('Caught', 'Keep moving as a ghost. If a future you saves this thief, they follow your ghost.', 'bad');
      }
    }
    playCues(w);
    if (L.recording && w.tick - L.savedAt >= sim.TICK_HZ) {
      commitTape(true);
      L.savedAt = w.tick;
    }
    if (w.over) finishRun();
  }

  function playCues(w) {
    const L = state.live;
    for (; L.heard < w.events.length; L.heard++) {
      const e = w.events[L.heard];
      const mine = e.day === state.day;
      if (e.type === 'bank' || e.type === 'vault' || e.type === 'alarm' || e.type === 'power' || e.type === 'ko') audio.play(e.type);
      else if (e.type === 'caught' && mine) audio.play('caught');
      else if (e.type === 'pick' && mine) audio.play('pick');
    }
  }

  function stopRun() {
    const L = state.live;
    if (!L || L.ended) return;
    L.recording = false;
    input.enable(false);
    commitTape(true);
    while (!L.world.over) tickLive();
  }

  function finishRun() {
    const L = state.live;
    if (L.ended) return;
    L.ended = true;
    input.enable(false);
    hideBanner();
    commitTape(false);
    const before = state.baseline;
    loadReplay(crewUpTo(state.day), state.day);
    const after = state.summary;
    if (after.haul !== L.world.haul || after.endTick !== L.world.tick) {
      console.warn('Forty Thieves: the replay drifted from the live run.', after.haul, L.world.haul, after.endTick, L.world.tick);
    }
    state.lastRun = { before, after };
    setMode('results');
    renderHeader();
    renderChairs();
    renderResults();
  }

  function renderResults() {
    const r = state.lastRun;
    const day = state.day;
    const delta = r.after.haul - r.before.haul;
    const mine = timeline.fateOf(r.after, day);
    el.resTitle.textContent = 'Day ' + day + ' is in the books';
    el.resTake.textContent = money(r.after.haul);
    el.resDelta.textContent = (delta >= 0 ? '+' : '−') + money(Math.abs(delta));
    el.resDelta.className = 'delta ' + (delta > 0 ? 'is-good' : delta < 0 ? 'is-bad' : '');
    const notes = [{ tone: mine && mine.caught ? 'bad' : 'info', text: 'Your run: ' + timeline.fateLine(level, mine) + '.' }]
      .concat(timeline.compare(r.before, r.after, day));
    notesInto(el.resNotes, notes);

    const frag = document.createDocumentFragment();
    for (let d = 1; d <= day; d++) {
      const f = timeline.fateOf(r.after, d);
      const li = document.createElement('li');
      li.className = 'crew-row is-' + timeline.fateMark(f);
      const b = document.createElement('b');
      b.textContent = 'Day ' + d;
      const span = document.createElement('span');
      span.textContent = f ? timeline.fateLine(level, f) : 'empty chair';
      li.append(b, span);
      frag.appendChild(li);
    }
    el.resCrew.replaceChildren(frag);
    el.shareOut.hidden = true;
  }

  // ---- Sharing ----

  function share(button) {
    const day = Math.min(state.day, SEASON);
    const text = timeline.shareText(level, state.summary, day, SEASON);
    const done = (ok) => {
      if (ok) {
        const label = button.textContent;
        button.textContent = 'Copied';
        root.setTimeout(() => {
          button.textContent = label;
        }, 1800);
      } else {
        el.shareOut.hidden = false;
        el.shareOut.value = text;
        el.shareOut.focus();
        el.shareOut.select();
      }
    };
    try {
      navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    } catch (e) {
      done(false);
    }
  }

  // ---- Banner and HUD ----

  function showBanner(big, small, tone) {
    el.bannerBig.textContent = big;
    el.bannerSmall.textContent = small || '';
    el.bannerSmall.hidden = !small;
    el.banner.className = 'banner' + (tone ? ' is-' + tone : '');
    el.banner.hidden = false;
    root.clearTimeout(showBanner.timer);
    if (tone === 'flash') showBanner.timer = root.setTimeout(hideBanner, 700);
    if (tone === 'bad') showBanner.timer = root.setTimeout(hideBanner, 3200);
  }

  function hideBanner() {
    el.banner.hidden = true;
  }

  function coarse() {
    return !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
  }

  function updateHud(w) {
    el.hudClock.textContent = clock(w.tick);
    el.hudTake.textContent = money(w.haul);
    let cls = 'hud-chip hud-power';
    if (w.alarmAt >= 0) {
      const left = Math.max(0, Math.ceil((w.alarmAt + sim.POLICE_DELAY - w.tick) / sim.TICK_HZ));
      el.hudPower.textContent = w.over && w.endReason === 'police' ? 'Police' : 'Alarm · police in ' + left + 's';
      cls += ' is-alarm';
    } else if (sim.isPowered(w)) {
      el.hudPower.textContent = 'Power on';
      cls += ' is-on';
    } else {
      el.hudPower.textContent = 'Power off · ' + Math.ceil((w.powerOffUntil - w.tick) / sim.TICK_HZ) + 's';
      cls += ' is-off';
    }
    if (el.hudPower.className !== cls) el.hudPower.className = cls;
  }

  // ---- Main loop ----

  let last = performance.now();
  let acc = 0;
  const STEP_MS = 1000 / sim.TICK_HZ;

  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    let world = null;

    if ((state.mode === 'run' || state.mode === 'countdown') && state.live) {
      if (!state.paused) {
        acc += dt;
        let n = 0;
        while (acc >= STEP_MS && n < 4) {
          if (state.mode === 'countdown') tickCountdown();
          else tickLive();
          acc -= STEP_MS;
          n++;
          if (state.mode !== 'run' && state.mode !== 'countdown') break;
        }
        if (n === 4) acc = 0;
      }
      if (state.live) world = state.live.world;
    }

    if (state.mode === 'intro' || state.mode === 'hq' || state.mode === 'results') {
      const r = state.replay;
      if (state.result) {
        if (r.playing) {
          if (r.tick >= state.result.endTick) {
            r.hold += dt;
            if (r.hold > 1600) {
              r.tick = 0;
              r.hold = 0;
            }
          } else {
            r.tick = Math.min(state.result.endTick, r.tick + (dt / STEP_MS) * r.speed);
          }
        }
        world = state.player.seek(r.tick);
        el.scrub.value = String(Math.floor(r.tick));
        el.replayTime.textContent = clock(world.tick);
      }
    }

    if (!world) world = idleWorld;
    const live = (state.mode === 'run' || state.mode === 'countdown') && state.live;
    renderer.draw(world, {
      time: now,
      youDay: state.youDay,
      ghost: live ? state.live.ghost : null,
      paths: state.replay.paths && !live && state.result ? state.result.paths : null,
    });
    updateHud(world);
    root.requestAnimationFrame(frame);
  }

  const idleWorld = sim.createWorld(level, []);

  // ---- Wiring ----

  function fit() {
    renderer.resize(el.board.clientWidth, el.board.clientHeight);
    el.hud.style.width = el.map.style.width;
  }

  function pause() {
    if (state.paused || !(state.mode === 'run' || state.mode === 'countdown')) return;
    state.paused = true;
    input.enable(false);
    showBanner('Paused', 'Tap the map or press any key to keep going.');
  }

  function resume() {
    if (!state.paused) return;
    state.paused = false;
    last = performance.now();
    acc = 0;
    hideBanner();
    if (state.mode === 'run') input.enable(true);
  }

  el.introBtn.addEventListener('click', () => {
    if (!state.save.introSeen) {
      state.save.introSeen = true;
      if (!state.save.start) state.save.start = storage.dateKey(new Date());
      persist();
    }
    showHQ();
  });

  el.startBtn.addEventListener('click', () => {
    if (seasonDone()) share(el.startBtn);
    else startRun();
  });

  el.skipBtn.addEventListener('click', () => {
    if (seasonDone()) {
      arm(el.skipBtn, 'Tap again to erase this heist', () => {
        state.save = Object.assign(storage.fresh(), { introSeen: true, muted: state.save.muted, start: storage.dateKey(new Date()) });
        persist();
        showHQ();
      });
    } else if (ranToday()) {
      state.save.offset++;
      if (!state.save.start) state.save.start = storage.dateKey(new Date());
      persist();
      showHQ();
    } else {
      arm(el.skipBtn, 'Tap again: Day ' + state.day + ' becomes an empty chair', () => {
        state.save.offset++;
        if (!state.save.start) state.save.start = storage.dateKey(new Date());
        persist();
        showHQ();
      });
    }
  });

  el.endBtn.addEventListener('click', () => {
    if (state.mode === 'countdown') return;
    arm(el.endBtn, 'Tap again to stop', stopRun);
  });

  el.doneBtn.addEventListener('click', showHQ);
  el.shareBtn.addEventListener('click', () => share(el.shareBtn));

  el.playBtn.addEventListener('click', () => {
    state.replay.playing = !state.replay.playing;
    if (state.replay.playing && state.result && state.replay.tick >= state.result.endTick) state.replay.tick = 0;
    syncReplayControls();
  });
  el.scrub.addEventListener('input', () => {
    state.replay.tick = Number(el.scrub.value);
    state.replay.hold = 0;
    state.replay.playing = false;
    syncReplayControls();
  });
  el.speedBtn.addEventListener('click', () => {
    state.replay.speed = state.replay.speed === 1 ? 2 : state.replay.speed === 2 ? 4 : 1;
    syncReplayControls();
  });
  el.pathsBtn.addEventListener('click', () => {
    state.replay.paths = !state.replay.paths;
    syncReplayControls();
  });

  el.banner.addEventListener('pointerdown', resume);
  el.board.addEventListener('pointerdown', resume);
  root.addEventListener('keydown', (e) => {
    if (state.paused) {
      resume();
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      if (!el.menu.hidden) closeMenu();
      else if (state.mode === 'run') arm(el.endBtn, 'Tap again to stop', stopRun);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });

  // Menu
  function openMenu() {
    pause();
    el.menu.hidden = false;
    el.soundBtn.textContent = state.save.muted ? 'Sound: off' : 'Sound: on';
    el.menuMsg.textContent = '';
    el.restoreText.value = '';
    disarm(el.resetBtn);
    el.menuClose.focus();
  }
  function closeMenu() {
    el.menu.hidden = true;
    el.menuBtn.focus();
  }
  el.menuBtn.addEventListener('click', openMenu);
  el.menuClose.addEventListener('click', closeMenu);
  el.menu.addEventListener('pointerdown', (e) => {
    if (e.target === el.menu) closeMenu();
  });
  el.soundBtn.addEventListener('click', () => {
    state.save.muted = !state.save.muted;
    audio.setMuted(state.save.muted);
    persist();
    el.soundBtn.textContent = state.save.muted ? 'Sound: off' : 'Sound: on';
  });
  el.exampleBtn.addEventListener('click', () => {
    if (state.mode === 'run' || state.mode === 'countdown') {
      el.menuMsg.textContent = 'Finish or stop your run first.';
      return;
    }
    closeMenu();
    showIntro();
  });
  el.backupBtn.addEventListener('click', () => {
    const code = storage.exportCode(state.save);
    const ok = () => {
      el.menuMsg.textContent = 'Backup code copied. Paste it somewhere safe.';
    };
    const fail = () => {
      el.restoreText.value = code;
      el.restoreText.select();
      el.menuMsg.textContent = 'Copy the code in the box and keep it somewhere safe.';
    };
    try {
      navigator.clipboard.writeText(code).then(ok, fail);
    } catch (e) {
      fail();
    }
  });
  el.restoreBtn.addEventListener('click', () => {
    if (state.mode === 'run' || state.mode === 'countdown') {
      el.menuMsg.textContent = 'Finish or stop your run first.';
      return;
    }
    const data = storage.importCode(el.restoreText.value);
    if (!data) {
      el.menuMsg.textContent = "That code didn't work. Paste the whole thing, starting with FT1:";
      return;
    }
    state.save = data;
    state.save.introSeen = true;
    audio.setMuted(state.save.muted);
    persist();
    closeMenu();
    showHQ();
  });
  el.resetBtn.addEventListener('click', () => {
    if (state.mode === 'run' || state.mode === 'countdown') {
      el.menuMsg.textContent = 'Finish or stop your run first.';
      return;
    }
    arm(el.resetBtn, 'Tap again to erase every run', () => {
      state.save = Object.assign(storage.fresh(), { introSeen: true, muted: state.save.muted, start: storage.dateKey(new Date()) });
      persist();
      closeMenu();
      showHQ();
    });
  });

  if (root.ResizeObserver) new ResizeObserver(fit).observe(el.board);
  root.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderer.invalidate());

  fit();
  if (state.save.introSeen) showHQ();
  else showIntro();
  root.requestAnimationFrame(frame);
})(typeof globalThis !== 'undefined' ? globalThis : this);
