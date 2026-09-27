/* Close Call: the page. */
(function (root) {
  'use strict';
  const { game, storage, narrator, audio } = root.CC;
  const doc = root.document;
  const reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const CPS = 40; // how fast the narrator's story types out, in characters a second

  const el = {};
  [
    'graveBtn', 'graveCount', 'menuBtn', 'news', 'newsText', 'newsBtn',
    'whoLabel', 'whoName', 'whoJob', 'marks', 'survivedText', 'luck', 'pips', 'luckWord',
    'call', 'callNo', 'callDate', 'callTitle', 'callText', 'items',
    'actForm', 'action', 'counter', 'doBtn', 'formNote', 'consent', 'offline',
    'tale', 'said', 'thinking', 'story', 'stamp', 'pendingBox', 'hearBtn', 'problem', 'problemText', 'retryBtn',
    'after', 'catchText', 'lives', 'livesHead', 'livesSub', 'stoneSlot', 'copyBtn', 'nextText', 'shareOut', 'skipBtn',
    'announce', 'intro', 'graveyard', 'bestLine', 'standing', 'graves', 'menu', 'soundBtn', 'menuSkipBtn', 'resetBtn',
  ].forEach((id) => (el[id] = doc.getElementById(id)));

  let save = storage.load();
  let n = 0; // today's close call number
  let mode = 'ready'; // ready | pending | thinking | telling | problem | done
  let run = null; // the narration in progress
  let lost = null; // a character who died of neglect since the last visit
  let offline = ''; // why the narrator can't be reached on this visit
  let retryFresh = false;

  audio.setMuted(save.muted);

  const persist = () => storage.save(save);
  const wait = (ms) => new Promise((resolve) => root.setTimeout(resolve, ms));
  const busy = () => mode === 'thinking' || mode === 'telling';

  // ---- The day ----

  function refresh() {
    if (busy()) return;
    const day = game.dayNumber(new Date(), save.offset);
    if (day !== n) {
      el.action.value = '';
      el.shareOut.hidden = true;
      note('');
    }
    n = day;
    const grave = game.settle(save, n);
    if (grave) lost = grave;
    game.ensureCharacter(save, n, Math.random);
    persist();
    mode = !save.today ? 'ready' : save.today.status === 'done' ? 'done' : 'pending';
    render();
  }

  function render() {
    renderNews();
    renderWho();
    renderCall();
    renderTale();
    renderAfter();
    el.graveCount.textContent = String(save.graves.length);
  }

  function renderNews() {
    el.news.hidden = !lost;
    if (lost) el.newsText.textContent = `While you were away, ${lost.name} faced close call #${lost.died} alone, and didn't make it.`;
  }

  function renderWho() {
    const c = save.alive;
    const t = save.today;
    const who = c || (t && t.status === 'done' && !t.survived ? { name: t.name, job: t.job, survived: t.count } : null);
    if (!who) return;
    el.whoLabel.textContent = !c ? 'Died today' : c.calls.length || (t && t.status === 'done') ? 'Your character' : 'Meet your character';
    el.whoName.textContent = who.name;
    el.whoName.classList.toggle('is-dead', !c);
    el.whoJob.textContent = who.job;
    const marks = [];
    for (let i = 0; i < Math.min(who.survived, 30); i++) marks.push(doc.createElement('i'));
    if (!c) {
      const skull = doc.createElement('i');
      skull.className = 'is-dead';
      marks.push(skull);
    }
    el.marks.replaceChildren(...marks);
    el.survivedText.textContent =
      c && !who.survived ? 'No close calls yet' : `${game.plural(who.survived, 'close call')} survived`;
    el.luck.hidden = !c;
    if (c) {
      const luck = game.luckFor(c.survived);
      [...el.pips.children].forEach((pip, i) => pip.classList.toggle('is-on', i < luck.pips));
      el.luckWord.textContent = luck.word;
    }
  }

  function dateLabel() {
    const d = new Date();
    d.setDate(d.getDate() + save.offset);
    try {
      return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    } catch (e) {
      return d.toDateString();
    }
  }

  function renderCall() {
    const sc = game.scenarioFor(n);
    el.callNo.textContent = `Close call #${n}`;
    el.callDate.textContent = dateLabel();
    el.callTitle.textContent = sc.title;
    el.callText.textContent = sc.text;
    el.items.replaceChildren(
      ...sc.items.map((item) => {
        const li = doc.createElement('li');
        li.textContent = item;
        return li;
      })
    );
  }

  function renderTale() {
    const ready = mode === 'ready';
    el.actForm.hidden = !ready;
    el.tale.hidden = ready;
    if (ready) {
      el.consent.hidden = save.narratorOk || !!offline;
      el.offline.hidden = !offline;
      el.offline.textContent = offline;
      el.doBtn.disabled = !!offline;
      updateCounter();
      return;
    }
    const t = save.today;
    el.said.textContent = t ? t.action : '';
    el.thinking.hidden = mode !== 'thinking';
    el.pendingBox.hidden = mode !== 'pending';
    el.hearBtn.disabled = !!offline;
    const stopped = mode === 'pending' && offline;
    el.problem.hidden = mode !== 'problem' && !stopped;
    if (stopped) {
      el.problemText.textContent = offline;
      el.retryBtn.hidden = true;
    }
    if (mode === 'done') {
      el.story.textContent = t.story;
      showStamp(t.survived, false);
    } else {
      if (mode !== 'telling') el.story.textContent = '';
      el.stamp.hidden = true;
    }
  }

  function renderAfter() {
    const t = save.today;
    const show = mode === 'done' && !!t && t.status === 'done';
    el.after.hidden = !show;
    if (!show) return;
    el.catchText.textContent = game.scenarioFor(n).catch;
    el.lives.hidden = !t.survived;
    el.stoneSlot.hidden = t.survived;
    if (t.survived) {
      el.livesHead.textContent = `${t.name} lives.`;
      el.livesSub.textContent = `${game.plural(t.count, 'close call')} survived. Luck: ${game.luckFor(t.count).word}.`;
    } else {
      const grave = save.graves.find((g) => g.died === n && g.name === t.name) || {
        name: t.name, job: t.job, born: n, died: n, survived: t.count, epitaph: t.epitaph,
      };
      el.stoneSlot.replaceChildren(stone(grave));
    }
    el.copyBtn.textContent = copyLabel();
    updateNext();
  }

  const copyLabel = () => (save.today && save.today.survived ? 'Copy result' : 'Copy obituary');

  function updateNext() {
    const ms = game.msUntilTomorrow(new Date());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const left = h ? `${h} h ${m} min` : m ? `${m} min` : 'less than a minute';
    const t = save.today;
    el.nextText.textContent = t && !t.survived ? `A new character arrives in ${left}.` : `Next close call in ${left}.`;
  }

  function stone(g) {
    const box = doc.createElement('div');
    box.className = 'stone';
    const add = (cls, text) => {
      const span = doc.createElement('span');
      span.className = cls;
      span.textContent = text;
      box.append(span);
    };
    add('stone-rip', 'Here lies');
    add('stone-name', g.name);
    add('stone-job', g.job);
    add('stone-epitaph', `“${g.epitaph}”`);
    add('stone-life', g.survived ? `Survived ${game.plural(g.survived, 'close call')} · #${g.born}–#${g.died}` : `Died on close call #${g.died}`);
    return box;
  }

  function setMode(m) {
    mode = m;
    renderTale();
  }

  function note(text) {
    el.formNote.hidden = !text;
    el.formNote.textContent = text;
  }

  function updateCounter() {
    el.counter.textContent = `${el.action.value.length} / ${game.MAX_ACTION}`;
  }

  // ---- Asking the narrator ----

  function submit() {
    if (mode !== 'ready' || offline) return;
    const text = game.cleanAction(el.action.value);
    if (text.length < 3) {
      note('Write what you do first.');
      el.action.focus();
      return;
    }
    note('');
    el.action.blur();
    game.startAttempt(save, n, text);
    persist();
    perform(false);
  }

  async function perform(fresh) {
    const day = n;
    const t = save.today;
    const c = save.alive;
    if (!t || t.status !== 'pending' || !c || busy()) return;
    const prompt = game.buildPrompt(game.scenarioFor(day), c, t.action);
    audio.unlock();
    const current = { ctl: new AbortController(), target: '', shown: 0, done: false, skip: false, onTyped: null, raf: 0 };
    run = current;
    el.story.textContent = '';
    setMode('thinking');
    startTyping(current);
    try {
      const res = await narrator.tell(prompt, {
        signal: current.ctl.signal,
        fresh,
        onText: ({ text }) => {
          const story = game.partialStory(text);
          if (!story || run !== current) return;
          current.target = story;
          if (mode === 'thinking') setMode('telling');
        },
      });
      const verdict = game.parseReply(res.text);
      if (!verdict) throw { code: 'garbled' };
      // Saved straight away: closing the page now can't change the outcome.
      game.applyVerdict(save, day, verdict);
      save.narratorOk = true;
      persist();
      current.target = verdict.story;
      current.done = true;
      if (mode === 'thinking') setMode('telling');
      await typed(current);
      await wait(reduced ? 150 : 700);
      stopTyping(current);
      showStamp(verdict.survived, true);
      el.announce.textContent = `${verdict.survived ? 'Survived' : 'Dead'}. ${verdict.story}`;
      await wait(reduced ? 250 : 1000);
      run = null;
      mode = 'done';
      render();
      el.after.classList.toggle('is-new', !reduced);
      el.after.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    } catch (e) {
      stopTyping(current);
      if (run === current) run = null;
      if (e && e.code === 'cancelled') return;
      problem(narrator.trouble(e));
    }
  }

  function problem(tr) {
    el.story.textContent = '';
    if (tr.stop) offline = tr.text;
    if (tr.rewrite) {
      const draft = save.today ? save.today.action : '';
      save.today = null;
      persist();
      setMode('ready');
      el.action.value = draft;
      updateCounter();
      note(tr.text);
      return;
    }
    retryFresh = !!tr.fresh;
    el.problemText.textContent = tr.text;
    el.retryBtn.hidden = !tr.retry;
    setMode('problem');
  }

  // The story arrives faster than anyone reads, so it types out at a steady
  // pace. Tapping the story skips to the end.
  function startTyping(r) {
    let last = 0;
    el.story.classList.add('is-typing');
    const frame = (now) => {
      if (run !== r) return;
      const dt = last ? Math.min(now - last, 1000) : 0;
      last = now;
      r.shown = reduced || r.skip ? r.target.length : Math.min(r.target.length, r.shown + (dt * CPS) / 1000);
      const text = r.target.slice(0, Math.floor(r.shown));
      if (el.story.textContent !== text) el.story.textContent = text;
      if (r.done && r.shown >= r.target.length && r.onTyped) {
        const resolve = r.onTyped;
        r.onTyped = null;
        resolve();
      }
      r.raf = root.requestAnimationFrame(frame);
    };
    r.raf = root.requestAnimationFrame(frame);
  }

  function typed(r) {
    return new Promise((resolve) => {
      if (r.shown >= r.target.length) resolve();
      else r.onTyped = resolve;
    });
  }

  function stopTyping(r) {
    if (r.raf) root.cancelAnimationFrame(r.raf);
    r.raf = 0;
    el.story.classList.remove('is-typing');
  }

  function showStamp(survived, fresh) {
    el.stamp.textContent = survived ? 'Survived' : 'Dead';
    el.stamp.className = 'stamp ' + (survived ? 'is-good' : 'is-bad');
    el.stamp.hidden = false;
    if (!fresh) return;
    audio.thud(survived);
    if (reduced) return;
    void el.stamp.offsetWidth;
    el.stamp.classList.add('is-in');
    if (!survived) {
      el.call.classList.remove('is-shaken');
      void el.call.offsetWidth;
      el.call.classList.add('is-shaken');
    }
  }

  // ---- Sharing ----

  function copyResult() {
    const t = save.today;
    if (!t || t.status !== 'done') return;
    const text = game.shareText(n, game.scenarioFor(n), t);
    const done = (ok) => {
      if (ok) {
        el.shareOut.hidden = true;
        el.copyBtn.textContent = 'Copied';
        root.setTimeout(() => (el.copyBtn.textContent = copyLabel()), 1600);
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

  // ---- Sheets ----

  let lastFocus = null;
  const sheets = [el.intro, el.graveyard, el.menu];

  function openSheet(sheet) {
    lastFocus = doc.activeElement;
    sheet.hidden = false;
    const first = sheet.querySelector('[data-close]');
    if (first) first.focus();
  }

  function closeSheet(sheet) {
    if (sheet.hidden) return;
    sheet.hidden = true;
    if (sheet === el.intro && !save.introSeen) {
      save.introSeen = true;
      persist();
    }
    if (lastFocus && typeof lastFocus.focus === 'function' && lastFocus !== doc.body) lastFocus.focus();
  }

  sheets.forEach((sheet) => {
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) closeSheet(sheet);
    });
    sheet.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => closeSheet(sheet)));
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') sheets.forEach(closeSheet);
  });

  function renderGraveyard() {
    const b = save.best;
    el.bestLine.textContent = b
      ? `Longest life: ${b.name}, ${b.job}, with ${game.plural(b.survived, 'close call')} survived.`
      : 'Nobody has survived a close call yet.';
    const c = save.alive;
    el.standing.hidden = !c;
    if (c) {
      el.standing.textContent = c.survived
        ? `Still standing: ${c.name}, with ${game.plural(c.survived, 'close call')} survived so far.`
        : `Still standing: ${c.name}, who hasn't faced a close call yet.`;
    }
    if (!save.graves.length) {
      const li = doc.createElement('li');
      li.className = 'graves-empty';
      li.textContent = 'Nobody here yet. Keep it that way.';
      el.graves.replaceChildren(li);
      return;
    }
    el.graves.replaceChildren(
      ...save.graves.map((g) => {
        const li = doc.createElement('li');
        li.append(stone(g));
        return li;
      })
    );
  }

  function showGraveyard() {
    renderGraveyard();
    openSheet(el.graveyard);
  }

  // ---- Prototype tools ----

  function skipDay() {
    if (busy()) return;
    save.offset += 1;
    lost = null;
    persist();
    closeSheet(el.menu);
    refresh();
    root.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  function arm(btn, confirmText, action) {
    if (btn.dataset.armed === '1') {
      root.clearTimeout(btn._t);
      btn.dataset.armed = '';
      btn.classList.remove('is-armed');
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

  function reset() {
    if (run) run.ctl.abort();
    run = null;
    save = Object.assign(storage.fresh(), { introSeen: true, muted: save.muted, narratorOk: save.narratorOk });
    lost = null;
    mode = 'ready';
    n = 0;
    persist();
    closeSheet(el.menu);
    refresh();
    root.scrollTo({ top: 0 });
  }

  // ---- Wiring ----

  el.action.addEventListener('input', () => {
    updateCounter();
    if (!el.formNote.hidden) note('');
  });
  el.action.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  });
  el.actForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submit();
  });
  el.hearBtn.addEventListener('click', () => {
    if (mode === 'pending' && !offline) perform(false);
  });
  el.retryBtn.addEventListener('click', () => {
    if (mode === 'problem') perform(retryFresh);
  });
  el.tale.addEventListener('click', () => {
    if (run && mode === 'telling') run.skip = true;
  });
  el.copyBtn.addEventListener('click', copyResult);
  el.skipBtn.addEventListener('click', skipDay);
  el.menuSkipBtn.addEventListener('click', skipDay);
  el.graveBtn.addEventListener('click', showGraveyard);
  el.newsBtn.addEventListener('click', showGraveyard);
  el.menuBtn.addEventListener('click', () => {
    el.soundBtn.textContent = save.muted ? 'Sound: off' : 'Sound: on';
    openSheet(el.menu);
  });
  el.soundBtn.addEventListener('click', () => {
    save.muted = !save.muted;
    audio.setMuted(save.muted);
    persist();
    el.soundBtn.textContent = save.muted ? 'Sound: off' : 'Sound: on';
  });
  el.resetBtn.addEventListener('click', () => arm(el.resetBtn, 'Tap again to bury everyone', reset));

  // A new close call arrives at midnight, even with the page left open.
  root.setInterval(() => {
    if (mode === 'done') updateNext();
    if (game.dayNumber(new Date(), save.offset) !== n) refresh();
  }, 15000);
  doc.addEventListener('visibilitychange', () => {
    if (!doc.hidden) refresh();
  });

  refresh();
  if (!save.introSeen) openSheet(el.intro);

  narrator.connect().then((sample) => {
    if (sample || offline) return;
    offline = narrator.trouble({ code: 'unavailable' }).text;
    if (mode === 'ready' || mode === 'pending') renderTale();
  });
})(window);
