/* Close Call: the save, kept in this browser. */
(function (root) {
  'use strict';
  const CC = (root.CC = root.CC || {});

  const KEY = 'close-call/v1';
  let memory = null; // used when browser storage is unavailable

  function fresh() {
    return { v: 1, offset: 0, introSeen: false, muted: false, narratorOk: false, alive: null, graves: [], best: null, today: null };
  }

  const int = (v, min) => (typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.floor(v) : null);
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const days = (list) => (Array.isArray(list) ? list.map((n) => int(n, 1)).filter((n) => n !== null) : []);

  function character(c) {
    if (!c || typeof c !== 'object' || !str(c.name, 80)) return null;
    return {
      name: str(c.name, 80),
      job: str(c.job, 80),
      born: int(c.born, 1) || 1,
      survived: int(c.survived, 0) || 0,
      lastDay: int(c.lastDay, 0) || 0,
      calls: days(c.calls),
    };
  }

  function grave(g) {
    const c = character(g);
    if (!c) return null;
    return {
      name: c.name,
      job: c.job,
      born: c.born,
      died: int(g.died, 1) || c.born,
      survived: c.survived,
      calls: c.calls,
      cause: g.cause === 'missed' ? 'missed' : 'call',
      epitaph: str(g.epitaph, 120),
    };
  }

  function today(t) {
    const n = t && int(t.n, 1);
    if (!n || typeof t.action !== 'string') return null;
    const out = { n, action: str(t.action, 200), status: t.status === 'done' ? 'done' : 'pending' };
    if (out.status === 'done') {
      Object.assign(out, {
        story: str(t.story, 2000),
        survived: !!t.survived,
        name: str(t.name, 80),
        job: str(t.job, 80),
        count: int(t.count, 0) || 0,
        epitaph: str(t.epitaph, 120),
      });
    }
    return out;
  }

  function normalize(d) {
    const out = fresh();
    if (!d || typeof d !== 'object') return out;
    out.offset = int(d.offset, 0) || 0;
    out.introSeen = !!d.introSeen;
    out.muted = !!d.muted;
    out.narratorOk = !!d.narratorOk;
    out.alive = character(d.alive);
    out.graves = Array.isArray(d.graves) ? d.graves.map(grave).filter(Boolean).slice(0, 500) : [];
    if (d.best && str(d.best.name, 80)) out.best = { name: str(d.best.name, 80), job: str(d.best.job, 80), survived: int(d.best.survived, 0) || 0 };
    out.today = today(d.today);
    return out;
  }

  function load() {
    try {
      const raw = root.localStorage.getItem(KEY);
      if (raw) memory = normalize(JSON.parse(raw));
    } catch (e) {
      // Private mode or blocked storage: keep playing from memory.
    }
    return memory ? JSON.parse(JSON.stringify(memory)) : fresh();
  }

  function save(d) {
    memory = normalize(d);
    try {
      root.localStorage.setItem(KEY, JSON.stringify(memory));
      return true;
    } catch (e) {
      return false;
    }
  }

  CC.storage = { KEY, fresh, normalize, load, save };
})(typeof globalThis !== 'undefined' ? globalThis : this);
