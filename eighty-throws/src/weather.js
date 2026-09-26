/* 80 Throws: the wind. Earth's real prevailing wind belts, plus a day's worth
 * of swirling weather systems placed by the date, so everyone flying on the
 * same day gets the same weather. Winds are in km of drift for a full-power
 * throw: u pushes east, v pushes north. */
(function (root) {
  'use strict';
  const ET = (root.ET = root.ET || {});
  const geo = ET.geo;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash() {
    let h = 2166136261;
    for (let i = 0; i < arguments.length; i++) {
      h ^= arguments[i] | 0;
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Trade winds near the equator blow west, the westerlies (the jet stream)
  // blow east through the mid-latitudes, and polar easterlies blow west again.
  function prevailing(lat) {
    const a = Math.abs(lat);
    const s = lat >= 0 ? 1 : -1;
    if (a < 30) {
      const k = Math.sin((Math.PI * a) / 30);
      return [-100 * k, -s * 35 * k];
    }
    if (a < 62) {
      const k = Math.sin((Math.PI * (a - 30)) / 32);
      return [170 * k, s * 25 * k];
    }
    const k = Math.sin(Math.PI * Math.min(1, (a - 62) / 28));
    return [-80 * k, -s * 20 * k];
  }

  const SYSTEMS = 14;
  const cache = new Map();

  // The day's highs and lows: each spins the air around its center.
  function systems(seed) {
    let list = cache.get(seed);
    if (list) return list;
    const rnd = mulberry32(hash(seed, 0x57ea7e));
    list = [];
    for (let i = 0; i < SYSTEMS; i++) {
      list.push({
        lat: -60 + rnd() * 135,
        lon: -180 + rnd() * 360,
        radius: 900 + rnd() * 1100,
        strength: (rnd() < 0.5 ? -1 : 1) * (80 + rnd() * 140),
      });
    }
    cache.set(seed, list);
    if (cache.size > 32) cache.delete(cache.keys().next().value);
    return list;
  }

  function windAt(lat, lon, seed) {
    const base = prevailing(lat);
    let u = base[0];
    let v = base[1];
    const list = systems(seed);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const dx = geo.wrapLon(lon - s.lon) * geo.KM_PER_DEG * Math.cos(((lat + s.lat) / 2) * geo.DEG);
      const dy = (lat - s.lat) * geo.KM_PER_DEG;
      const r2 = dx * dx + dy * dy;
      const R2 = s.radius * s.radius;
      if (r2 > 9 * R2) continue;
      // Spin speed peaks at the system's radius and fades away from it.
      const f = (s.strength * Math.exp(0.5 - r2 / (2 * R2))) / s.radius;
      u -= dy * f;
      v += dx * f;
    }
    return [u, v];
  }

  // "strong wind blowing east"
  function describe(w) {
    const speed = Math.hypot(w[0], w[1]);
    const word = speed < 40 ? 'Calm' : speed < 110 ? 'Light wind' : speed < 200 ? 'Breezy' : speed < 300 ? 'Strong wind' : 'Gale';
    if (speed < 40) return word;
    return word + ' blowing ' + geo.compass((Math.atan2(w[0], w[1]) * 180) / Math.PI);
  }

  ET.weather = { mulberry32, hash, prevailing, systems, windAt, describe };
})(typeof globalThis !== 'undefined' ? globalThis : this);
