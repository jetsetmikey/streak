/* 80 Throws: the saved journey, calendar days, and backup codes. */
(function (root) {
  'use strict';
  const ET = (root.ET = root.ET || {});

  const KEY = 'eighty-throws/v1';
  const CODE_PREFIX = '80T1:';
  let memory = null; // used when browser storage is unavailable

  function fresh() {
    return { v: 1, start: null, offset: 0, throws: [], introSeen: false, muted: false };
  }

  const num = (v) => typeof v === 'number' && Number.isFinite(v);

  function normalize(d) {
    const out = fresh();
    if (!d || typeof d !== 'object') return out;
    if (typeof d.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.start)) out.start = d.start;
    if (num(d.offset) && d.offset > 0) out.offset = Math.floor(d.offset);
    if (Array.isArray(d.throws)) {
      d.throws.forEach((t) => {
        if (!t || !num(t.d) || !num(t.lat) || !num(t.lon) || !num(t.km)) return;
        if (out.throws.length && t.d <= out.throws[out.throws.length - 1].d) return;
        out.throws.push({
          d: Math.floor(t.d),
          b: num(t.b) ? t.b : 0,
          p: num(t.p) ? t.p : 0,
          lat: t.lat,
          lon: t.lon,
          km: t.km,
          stall: !!t.stall,
          ci: num(t.ci) ? t.ci : -1,
          place: typeof t.place === 'string' ? t.place : '',
          path: Array.isArray(t.path) ? t.path.filter((p) => Array.isArray(p) && num(p[0]) && num(p[1])) : [],
        });
      });
    }
    out.introSeen = !!d.introSeen;
    out.muted = !!d.muted;
    return out;
  }

  function copy(d) {
    return JSON.parse(JSON.stringify(d));
  }

  function load() {
    try {
      const raw = root.localStorage.getItem(KEY);
      if (raw) memory = normalize(JSON.parse(raw));
    } catch (e) {
      // Private mode or blocked storage: keep playing from memory.
    }
    return memory ? copy(memory) : fresh();
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

  function dateKey(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function epochDay(key) {
    const p = key.split('-').map(Number);
    return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
  }

  function daysBetween(a, b) {
    return epochDay(b) - epochDay(a);
  }

  // Day 1 is the calendar day the journey started. Missed days still count.
  function currentDay(d, now) {
    if (!d.start) return 1 + d.offset;
    return Math.max(1, daysBetween(d.start, dateKey(now)) + 1 + d.offset);
  }

  // The weather seed for a day of the journey: the calendar date it falls on.
  function seedFor(d, day, now) {
    const start = d.start || dateKey(now);
    return epochDay(start) + day - 1;
  }

  function exportCode(d) {
    return CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(normalize(d)))));
  }

  function importCode(text) {
    const s = String(text || '').trim();
    if (s.indexOf(CODE_PREFIX) !== 0) return null;
    try {
      return normalize(JSON.parse(decodeURIComponent(escape(atob(s.slice(CODE_PREFIX.length))))));
    } catch (e) {
      return null;
    }
  }

  ET.storage = { fresh, normalize, load, save, dateKey, epochDay, daysBetween, currentDay, seedFor, exportCode, importCode };
})(typeof globalThis !== 'undefined' ? globalThis : this);
