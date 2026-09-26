/* 80 Throws: the app. One throw a day, the race against Fogg, and stamps. */
(function (root) {
  'use strict';
  const ET = root.ET;
  const geo = ET.geo;
  const weather = ET.weather;
  const flight = ET.flight;
  const race = ET.race;
  const storage = ET.storage;
  const audio = ET.audio;
  const world = geo.buildWorld(ET.WORLD_DATA);

  const $ = (id) => document.getElementById(id);
  const el = {};
  [
    'map', 'mapWrap', 'zoomBtn', 'stampPop', 'stampPopFlag', 'stampPopName', 'stampPopDay',
    'dayLabel', 'raceText', 'trackFill', 'youMarker', 'foggMarker',
    'stampsBtn', 'stampCount', 'menuBtn',
    'card', 'cardTitle', 'cardLines', 'cardActions', 'cardNote', 'shareOut',
    'intro', 'introBtn', 'stamps', 'stampsTitle', 'stampsGrid', 'stampsClose',
    'menu', 'menuClose', 'soundBtn', 'backupBtn', 'restoreText', 'restoreBtn', 'resetBtn', 'menuMsg',
  ].forEach((id) => {
    el[id] = $(id);
  });

  const map = ET.createMap(el.map, world);
  const state = {
    save: storage.load(),
    day: 1,
    mode: 'ready', // ready | aiming | flying | landed | finished
    aim: null,
    anim: null,
    current: null,
    plane: { lat: race.START.lat, lon: race.START.lon, heading: 90, alt: 0 },
    zoom: 0,
  };
  audio.setMuted(state.save.muted);

  // ---- The journey so far ----

  const last = () => state.save.throws[state.save.throws.length - 1] || null;
  const position = () => (last() ? { lat: last().lat, lon: last().lon } : { lat: race.START.lat, lon: race.START.lon });
  const soggy = () => !!last() && last().ci < 0;
  const thrownToday = () => !!last() && last().d === state.day;
  const finished = () => !!last() && race.progress(last().lon) >= 1;
  const seed = () => storage.seedFor(state.save, state.day, new Date());
  // Compare with Fogg at the end of the last day you've had a chance to throw.
  const raceDay = () => (thrownToday() || finished() ? state.day : state.day - 1);

  function stamps() {
    const seen = new Map();
    state.save.throws.forEach((t) => {
      if (t.ci >= 0 && !seen.has(t.ci)) seen.set(t.ci, t.d);
    });
    return Array.from(seen, ([ci, d]) => ({ ci, day: d, name: world.countries[ci].name, a2: world.countries[ci].a2 }));
  }

  function flag(a2) {
    if (!a2 || a2.length !== 2) return '';
    return String.fromCodePoint(0x1f1e6 + a2.charCodeAt(0) - 65, 0x1f1e6 + a2.charCodeAt(1) - 65);
  }

  function totalKm() {
    return state.save.throws.reduce((s, t) => s + t.km, 0);
  }

  function describePlace(lat, lon) {
    const ci = geo.countryAt(world, lat, lon);
    if (ci >= 0) {
      const name = world.countries[ci].name;
      const city = geo.nearestCity(world, lat, lon, 260, ci);
      return { ci, text: city ? 'near ' + city.name + ', ' + name : 'in ' + name };
    }
    const sea = geo.seaName(lat, lon);
    const city = geo.nearestCity(world, lat, lon, 220);
    return { ci: -1, text: 'in the ' + sea + (city ? ', off ' + city.name : '') };
  }

  const km = (v) => Math.round(v).toLocaleString('en-US') + ' km';
  const pct = (v) => (v < 0.1 ? (Math.floor(v * 1000) / 10).toFixed(1) : String(Math.floor(v * 100))) + '%';
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function persist() {
    storage.save(state.save);
  }

  // ---- Throwing ----

  function maxDrag() {
    return Math.max(110, Math.min(map.width, map.height) * 0.4);
  }

  function aimAt(dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len < 10) {
      state.aim = null;
      return;
    }
    const bearing = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const power = Math.min(1, len / maxDrag());
    const wet = soggy();
    state.aim = {
      bearing,
      power,
      path: flight.plot(position(), bearing, power, seed(), wet),
      spreadKm: flight.spreadKm(power, wet),
      risk: flight.stallChance(power),
      reach: flight.reachKm(power, wet),
    };
    state.plane.heading = bearing;
  }

  function throwPlane(bearing, power) {
    if (thrownToday() || finished()) return;
    audio.unlock();
    const from = position();
    const r = flight.fly(from, bearing, power, seed(), soggy());
    const place = describePlace(r.lat, r.lon);
    const isNew = place.ci >= 0 && !stamps().some((s) => s.ci === place.ci);
    if (!state.save.start) state.save.start = storage.dateKey(new Date());
    // Saved before the flight is shown: today's throw counts from the moment you let go.
    state.save.throws.push({
      d: state.day,
      b: Math.round(bearing * 10) / 10,
      p: Math.round(power * 100) / 100,
      lat: r.lat,
      lon: r.lon,
      km: Math.round(r.km),
      stall: r.stalled,
      ci: place.ci,
      place: place.text,
      path: flight.thin(r.path, 16),
    });
    persist();
    state.aim = null;
    state.anim = { r, t0: performance.now(), duration: 2400 + Math.min(1400, r.km * 3), isNew, place };
    state.mode = 'flying';
    audio.play('whoosh');
    renderCard();
  }

  function stepFlight(now) {
    const a = state.anim;
    const t = Math.min(1, (now - a.t0) / a.duration);
    const e = 1 - Math.pow(1 - t, 2.2);
    const path = a.r.path;
    const x = e * (path.length - 1);
    const i = Math.min(path.length - 2, Math.floor(x));
    const u = x - i;
    const lat = path[i][0] + (path[i + 1][0] - path[i][0]) * u;
    const lon = path[i][1] + (path[i + 1][1] - path[i][1]) * u;
    const p0 = map.project(path[i][0], path[i][1]);
    const p1 = map.project(path[i + 1][0], path[i + 1][1]);
    if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.01) state.plane.heading = (Math.atan2(p1[0] - p0[0], -(p1[1] - p0[1])) * 180) / Math.PI;
    state.plane.lat = lat;
    state.plane.lon = lon;
    state.plane.alt = Math.sin(Math.PI * t) * (a.r.stalled ? 0.5 : 1);
    state.current = path.slice(0, i + 1).concat([[lat, lon]]);
    if (t >= 1) land();
  }

  function land() {
    const a = state.anim;
    state.anim = null;
    state.current = null;
    state.plane.alt = 0;
    if (a.r.stalled) audio.play('stall');
    audio.play(a.place.ci < 0 ? 'splash' : 'thunk');
    if (a.isNew) popStamp(a.place.ci);
    state.mode = finished() ? 'finished' : 'landed';
    renderAll();
  }

  function popStamp(ci) {
    const c = world.countries[ci];
    el.stampPopFlag.textContent = flag(c.a2) || '✉';
    el.stampPopName.textContent = c.name;
    el.stampPopDay.textContent = 'Day ' + state.day + ' · Par avion';
    el.stampPop.hidden = false;
    el.stampPop.classList.remove('is-in');
    void el.stampPop.offsetWidth;
    el.stampPop.classList.add('is-in');
    root.clearTimeout(popStamp.timer);
    popStamp.timer = root.setTimeout(() => {
      el.stampPop.hidden = true;
    }, 2600);
  }

  // ---- Rendering the page ----

  function renderRace() {
    const me = race.progress(position().lon);
    const day = raceDay();
    const fogg = race.fogg(day);
    el.youMarker.style.left = (me * 100).toFixed(2) + '%';
    el.foggMarker.style.left = (fogg.progress * 100).toFixed(2) + '%';
    el.trackFill.style.width = (me * 100).toFixed(2) + '%';
    el.dayLabel.textContent = 'Day ' + state.day + ' · ' + pct(me) + ' around';
    let text;
    let tone;
    if (finished()) {
      text = 'Home';
      tone = 'good';
    } else if (state.save.throws.length === 0 && day <= 0) {
      text = 'Fogg leaves today too';
      tone = '';
    } else {
      const ahead = race.daysAhead(me, day);
      const n = Math.round(Math.abs(ahead));
      text = n === 0 ? 'Level with Fogg' : n + (n === 1 ? ' day ' : ' days ') + (ahead > 0 ? 'ahead of Fogg' : 'behind Fogg');
      tone = n === 0 ? '' : ahead > 0 ? 'good' : 'bad';
    }
    el.raceText.textContent = text;
    el.raceText.className = 'race-text' + (tone ? ' is-' + tone : '');
    el.stampCount.textContent = String(stamps().length);
  }

  function line(text, tone) {
    return { text, tone: tone || '' };
  }

  function setCard(title, lines, actions, note) {
    el.cardTitle.textContent = title;
    const frag = document.createDocumentFragment();
    lines.forEach((l) => {
      const p = document.createElement('p');
      p.className = 'card-line' + (l.tone ? ' is-' + l.tone : '');
      p.textContent = l.text;
      frag.appendChild(p);
    });
    el.cardLines.replaceChildren(frag);
    const acts = document.createDocumentFragment();
    (actions || []).forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn' + (a.primary ? ' primary' : '') + (a.quiet ? ' quiet' : '');
      b.textContent = a.label;
      b.addEventListener('click', () => a.onClick(b));
      acts.appendChild(b);
    });
    el.cardActions.replaceChildren(acts);
    el.cardNote.textContent = note || '';
    el.cardNote.hidden = !note;
    el.shareOut.hidden = true;
  }

  function foggLine(me) {
    const day = raceDay();
    const fogg = race.fogg(day);
    const ahead = race.daysAhead(me, day);
    const n = Math.round(Math.abs(ahead));
    const where = fogg.place === 'London' && day > 0 ? 'back in London' : fogg.place === 'London' ? 'in London' : fogg.place.indexOf('between') === 0 ? fogg.place : 'in ' + fogg.place;
    if (n === 0) return line('Level with Phileas Fogg, who is ' + where + '.');
    return line(
      n + (n === 1 ? ' day ' : ' days ') + (ahead > 0 ? 'ahead of' : 'behind') + ' Phileas Fogg, who is ' + where + '.',
      ahead > 0 ? 'good' : 'bad'
    );
  }

  function renderCard() {
    const lt = last();
    const me = race.progress(position().lon);
    const mode = state.mode;

    if (mode === 'flying') {
      setCard('In the air…', [line('Wheee.')]);
      return;
    }

    if (mode === 'aiming' && state.aim) {
      const a = state.aim;
      const risk = Math.round(a.risk * 100);
      setCard('Throw ' + km(a.reach) + ' ' + geo.compass(a.bearing), [
        risk > 0 ? line('Stall risk ' + risk + '%. Ease off to be safe.', risk > 15 ? 'bad' : 'warn') : line('No stall risk.'),
        line('The wind bends the flight. The circle shows roughly where you will land.'),
      ]);
      return;
    }

    if (mode === 'finished' || finished()) {
      const days = lt.d;
      const diff = race.DAYS - days;
      setCard(
        'Around the world in ' + days + ' days',
        [
          line(diff > 0 ? 'Phileas Fogg took 80. You beat him by ' + diff + (diff === 1 ? ' day.' : ' days.') : diff === 0 ? 'Phileas Fogg took 80 too. A dead heat.' : 'Phileas Fogg took 80. He beat you by ' + -diff + (diff === -1 ? ' day.' : ' days.'), diff >= 0 ? 'good' : 'bad'),
          line(stamps().length + ' stamps · ' + km(totalKm()) + ' flown.'),
        ],
        [
          { label: 'Share', primary: true, onClick: share },
          { label: 'Fly again', onClick: (b) => arm(b, 'Tap again to start over', reset) },
        ]
      );
      return;
    }

    if (thrownToday()) {
      const isSea = lt.ci < 0;
      const title = lt.stall ? 'Stalled' : isSea ? 'Splashdown' : 'Landed';
      const lines = [line(cap(lt.place) + '.'), line('+' + km(lt.km) + ' today · ' + pct(me) + ' of the way around.')];
      if (lt.stall) lines.unshift(line('You threw too hard and the plane nosedived.', 'bad'));
      const firstVisit = lt.ci >= 0 && stamps().some((s) => s.ci === lt.ci && s.day === lt.d);
      if (firstVisit) lines.push(line('New stamp: ' + world.countries[lt.ci].name + ' ' + flag(world.countries[lt.ci].a2), 'good'));
      if (isSea) lines.push(line('Your plane is soggy. Tomorrow it flies 30% shorter.', 'bad'));
      lines.push(foggLine(me));
      setCard(title, lines, [
        { label: 'Share', onClick: share },
        { label: 'Skip to tomorrow', quiet: true, onClick: skipDay },
      ], 'Your next throw unlocks tomorrow. "Skip to tomorrow" is a prototype shortcut.');
      return;
    }

    // Ready to throw.
    const pos = position();
    const lines = [];
    const missed = lt ? state.day - lt.d - 1 : state.day - 1;
    if (missed > 0) lines.push(line('You missed ' + missed + (missed === 1 ? ' day' : ' days') + '. Fogg didn’t.', 'bad'));
    lines.push(line((lt ? (lt.ci < 0 ? 'Your plane is floating ' : 'Your plane is ') + lt.place : 'Your plane is in London') + '. ' + weather.describe(weather.windAt(pos.lat, pos.lon, seed())) + '.'));
    if (soggy()) lines.push(line('It’s soggy from the sea, so today’s throw flies 30% shorter.', 'bad'));
    lines.push(line('Drag on the map toward where you want to go. Let go to throw.', 'hint'));
    setCard(state.day === 1 && !lt ? 'Day 1: leave London' : 'Day ' + state.day + ': your throw', lines, [
      { label: 'Skip today', quiet: true, onClick: (b) => arm(b, 'Tap again: Fogg keeps going', skipDay) },
    ]);
  }

  function renderStamps() {
    const list = stamps();
    el.stampsTitle.textContent = list.length ? 'Passport · ' + list.length + (list.length === 1 ? ' stamp' : ' stamps') : 'Passport';
    const frag = document.createDocumentFragment();
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'No stamps yet. Land on solid ground in a new country to collect one.';
      frag.appendChild(p);
    }
    list.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'stamp tone-' + (i % 4);
      const f = document.createElement('span');
      f.className = 'stamp-flag';
      f.textContent = flag(s.a2) || '✉';
      const n = document.createElement('span');
      n.className = 'stamp-name';
      n.textContent = s.name;
      const day = document.createElement('span');
      day.className = 'stamp-day';
      day.textContent = 'Day ' + s.day;
      d.append(f, n, day);
      frag.appendChild(d);
    });
    el.stampsGrid.replaceChildren(frag);
  }

  function renderAll() {
    renderRace();
    renderCard();
  }

  // ---- Buttons ----

  function arm(btn, confirmText, action) {
    if (btn.dataset.armed === '1') {
      root.clearTimeout(btn._t);
      action();
      return;
    }
    const label = btn.textContent;
    btn.dataset.armed = '1';
    btn.textContent = confirmText;
    btn.classList.add('is-armed');
    btn._t = root.setTimeout(() => {
      btn.dataset.armed = '';
      btn.textContent = label;
      btn.classList.remove('is-armed');
    }, 4000);
  }

  function refreshDay() {
    state.day = storage.currentDay(state.save, new Date());
    if (state.mode !== 'flying') state.mode = finished() ? 'finished' : thrownToday() ? 'landed' : 'ready';
    const p = position();
    state.plane.lat = p.lat;
    state.plane.lon = p.lon;
    state.plane.alt = 0;
    renderAll();
  }

  function skipDay() {
    if (!state.save.start) state.save.start = storage.dateKey(new Date());
    state.save.offset++;
    persist();
    refreshDay();
  }

  function reset() {
    state.save = Object.assign(storage.fresh(), { introSeen: true, muted: state.save.muted, start: storage.dateKey(new Date()) });
    persist();
    state.plane.heading = 90;
    refreshDay();
  }

  function shareText() {
    const me = race.progress(position().lon);
    const flags = stamps().map((s) => flag(s.a2)).join('');
    const lines = ['80 Throws · Day ' + state.day];
    if (finished()) lines.push('✈️ Around the world in ' + last().d + ' days · ' + km(totalKm()));
    else lines.push('✈️ ' + pct(me) + ' around the world · ' + km(totalKm()));
    const ahead = race.daysAhead(me, raceDay());
    const n = Math.round(Math.abs(ahead));
    if (!finished()) lines.push('🎩 ' + (n === 0 ? 'Level with Phileas Fogg' : n + (n === 1 ? ' day ' : ' days ') + (ahead > 0 ? 'ahead of' : 'behind') + ' Phileas Fogg'));
    else lines.push('🎩 Phileas Fogg took 80');
    if (flags) lines.push(flags);
    return lines.join('\n');
  }

  function share(btn) {
    const text = shareText();
    const done = (ok) => {
      if (ok) {
        const label = btn.textContent;
        btn.textContent = 'Copied';
        root.setTimeout(() => {
          btn.textContent = label;
        }, 1600);
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

  // ---- Aiming with a drag ----

  let pointer = null;
  let sx = 0;
  let sy = 0;
  el.map.addEventListener('pointerdown', (e) => {
    if (state.zoom > 0.5) {
      state.zoom = 0;
      syncZoom();
      return;
    }
    if (state.mode !== 'ready' || pointer !== null) return;
    pointer = e.pointerId;
    try {
      el.map.setPointerCapture(pointer);
    } catch (err) {
      // Capture is a nicety; tracking still works without it.
    }
    sx = e.clientX;
    sy = e.clientY;
    state.mode = 'aiming';
    state.aim = null;
    e.preventDefault();
  });
  el.map.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointer) return;
    aimAt(e.clientX - sx, e.clientY - sy);
    renderCard();
  });
  el.map.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    const a = state.aim;
    if (a && a.power >= 0.12) {
      throwPlane(a.bearing, a.power);
    } else {
      state.aim = null;
      state.mode = 'ready';
      renderCard();
    }
  });
  el.map.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    state.aim = null;
    state.mode = 'ready';
    renderCard();
  });

  function syncZoom() {
    el.zoomBtn.textContent = state.zoom > 0.5 ? 'Close up' : 'Whole world';
    el.zoomBtn.setAttribute('aria-pressed', String(state.zoom > 0.5));
  }
  el.zoomBtn.addEventListener('click', () => {
    if (state.mode === 'flying' || state.mode === 'aiming') return;
    state.zoom = state.zoom > 0.5 ? 0 : 1;
    syncZoom();
  });

  // ---- Sheets ----

  function openSheet(sheet) {
    sheet.hidden = false;
    const close = sheet.querySelector('[data-close]');
    if (close) close.focus();
  }
  function closeSheet(sheet) {
    sheet.hidden = true;
  }
  [el.stamps, el.menu].forEach((sheet) => {
    sheet.addEventListener('pointerdown', (e) => {
      if (e.target === sheet) closeSheet(sheet);
    });
  });
  el.stampsBtn.addEventListener('click', () => {
    renderStamps();
    openSheet(el.stamps);
  });
  el.stampsClose.addEventListener('click', () => closeSheet(el.stamps));
  el.menuBtn.addEventListener('click', () => {
    el.soundBtn.textContent = state.save.muted ? 'Sound: off' : 'Sound: on';
    el.menuMsg.textContent = '';
    el.restoreText.value = '';
    openSheet(el.menu);
  });
  el.menuClose.addEventListener('click', () => closeSheet(el.menu));
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    [el.stamps, el.menu].forEach(closeSheet);
  });
  el.soundBtn.addEventListener('click', () => {
    state.save.muted = !state.save.muted;
    audio.setMuted(state.save.muted);
    persist();
    el.soundBtn.textContent = state.save.muted ? 'Sound: off' : 'Sound: on';
  });
  el.backupBtn.addEventListener('click', () => {
    const code = storage.exportCode(state.save);
    const fail = () => {
      el.restoreText.value = code;
      el.restoreText.select();
      el.menuMsg.textContent = 'Copy the code in the box and keep it somewhere safe.';
    };
    try {
      navigator.clipboard.writeText(code).then(() => {
        el.menuMsg.textContent = 'Backup code copied. Paste it somewhere safe.';
      }, fail);
    } catch (e) {
      fail();
    }
  });
  el.restoreBtn.addEventListener('click', () => {
    if (state.mode === 'flying') return;
    const data = storage.importCode(el.restoreText.value);
    if (!data) {
      el.menuMsg.textContent = "That code didn't work. Paste the whole thing, starting with 80T1:";
      return;
    }
    state.save = Object.assign(data, { introSeen: true });
    audio.setMuted(state.save.muted);
    persist();
    closeSheet(el.menu);
    refreshDay();
  });
  el.resetBtn.addEventListener('click', () =>
    arm(el.resetBtn, 'Tap again to erase your journey', () => {
      closeSheet(el.menu);
      reset();
    })
  );
  el.introBtn.addEventListener('click', () => {
    state.save.introSeen = true;
    if (!state.save.start) state.save.start = storage.dateKey(new Date());
    persist();
    el.intro.hidden = true;
    audio.unlock();
    refreshDay();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.mode !== 'flying' && state.mode !== 'aiming') refreshDay();
  });

  // ---- Main loop ----

  function fit() {
    const r = el.mapWrap.getBoundingClientRect();
    map.resize(r.width, r.height);
  }

  function frame(now) {
    if (state.anim) stepFlight(now);
    const v = map.view;
    const target = state.plane;
    v.lon += (target.lon - v.lon) * 0.12;
    v.lat += (Math.max(-50, Math.min(68, target.lat)) - v.lat) * 0.12;
    v.zoom += (state.zoom - v.zoom) * 0.14;
    const lt = last();
    const fogg = race.fogg(raceDay());
    map.draw({
      time: now,
      seed: seed(),
      showWind: state.mode !== 'finished',
      visited: new Set(stamps().map((s) => s.ci)),
      start: race.START,
      fogg: { lat: fogg.lat, lon: fogg.lon },
      route: state.save.throws.filter((t) => !state.anim || t !== lt).map((t) => t.path),
      landings: state.save.throws.filter((t) => !state.anim || t !== lt).map((t) => [t.lat, t.lon]),
      current: state.current,
      aim: state.mode === 'aiming' ? state.aim : null,
      plane: Object.assign({}, state.plane, { idle: state.mode === 'ready', soggy: soggy() && !state.anim }),
    });
    root.requestAnimationFrame(frame);
  }

  if (root.ResizeObserver) new ResizeObserver(fit).observe(el.mapWrap);
  root.addEventListener('resize', fit);
  fit();
  refreshDay();
  const p = position();
  map.view.lon = p.lon;
  map.view.lat = p.lat;
  syncZoom();
  if (!state.save.introSeen) el.intro.hidden = false;
  root.requestAnimationFrame(frame);
})(typeof globalThis !== 'undefined' ? globalThis : this);
