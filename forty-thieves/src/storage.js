/* Forty Thieves: the season save, calendar days, and backup codes. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

  const KEY = 'forty-thieves/v1';
  const SEASON_DAYS = 40;
  const CODE_PREFIX = 'FT1:';
  let memory = null; // used when browser storage is unavailable

  function fresh() {
    return { v: 1, start: null, offset: 0, runs: {}, introSeen: false, muted: false };
  }

  function normalize(d) {
    const out = fresh();
    if (!d || typeof d !== 'object') return out;
    if (typeof d.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.start)) out.start = d.start;
    if (Number.isFinite(d.offset) && d.offset > 0) out.offset = Math.floor(d.offset);
    if (d.runs && typeof d.runs === 'object') {
      Object.keys(d.runs).forEach((k) => {
        const day = parseInt(k, 10);
        const r = d.runs[k];
        if (day >= 1 && day <= SEASON_DAYS && r && typeof r.c === 'string') out.runs[day] = { c: r.c, p: !!r.p };
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

  function daysBetween(a, b) {
    const pa = a.split('-').map(Number);
    const pb = b.split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }

  // Day 1 is the calendar day the season started. Skipped days count too.
  function currentDay(d, now) {
    if (!d.start) return 1 + d.offset;
    return Math.max(1, daysBetween(d.start, dateKey(now)) + 1 + d.offset);
  }

  function exportCode(d) {
    return CODE_PREFIX + btoa(JSON.stringify(normalize(d)));
  }

  function importCode(text) {
    const s = String(text || '').trim();
    if (s.indexOf(CODE_PREFIX) !== 0) return null;
    try {
      return normalize(JSON.parse(atob(s.slice(CODE_PREFIX.length))));
    } catch (e) {
      return null;
    }
  }

  FT.storage = { SEASON_DAYS, fresh, load, save, dateKey, daysBetween, currentDay, exportCode, importCode };
})(typeof globalThis !== 'undefined' ? globalThis : this);
