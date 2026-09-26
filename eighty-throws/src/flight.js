/* 80 Throws: one throw. The plane flies out along your bearing while the day's
 * wind pushes it the whole way. Throwing harder goes farther but can stall,
 * and a plane that landed in the sea is soggy and flies shorter. */
(function (root) {
  'use strict';
  const ET = (root.ET = root.ET || {});
  const geo = ET.geo;
  const weather = ET.weather;

  const MAX_THROW_KM = 300;
  const STEPS = 90;
  const SOGGY = 0.7;
  const STALL_FROM = 0.82;
  const STALL_CUT = 0.35;
  const LAT_MIN = -62;
  const LAT_MAX = 75;

  function stallChance(power) {
    if (power <= STALL_FROM) return 0;
    const k = (power - STALL_FROM) / (1 - STALL_FROM);
    return 0.5 * k * k;
  }

  function reachKm(power, soggy) {
    return MAX_THROW_KM * power * (soggy ? SOGGY : 1);
  }

  // How far from the plotted spot the plane may actually come down.
  function spreadKm(power, soggy) {
    return 12 + 0.12 * reachKm(power, soggy);
  }

  // The flight with no surprises: [lat, lon] points, lon unwrapped (it keeps
  // counting past 180 so a trip around the world adds up to 360 degrees).
  function plot(from, bearing, power, seed, soggy) {
    const pts = [[from.lat, from.lon]];
    let lat = from.lat;
    let lon = from.lon;
    const air = reachKm(power, soggy) / STEPS;
    const airtime = power / STEPS;
    const east = Math.sin(bearing * geo.DEG);
    const north = Math.cos(bearing * geo.DEG);
    for (let i = 0; i < STEPS; i++) {
      const w = weather.windAt(lat, lon, seed);
      const next = geo.offset(lat, lon, east * air + w[0] * airtime, north * air + w[1] * airtime);
      lat = Math.max(LAT_MIN, Math.min(LAT_MAX, next[0]));
      lon = next[1];
      pts.push([lat, lon]);
    }
    return pts;
  }

  function lengthKm(path) {
    let km = 0;
    for (let i = 1; i < path.length; i++) km += geo.distanceKm(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
    return km;
  }

  // The real flight: the plotted one, nudged somewhere inside the landing
  // zone, or cut short by a stall. Same inputs on the same day, same result.
  function fly(from, bearing, power, seed, soggy) {
    const plotted = plot(from, bearing, power, seed, soggy);
    const rnd = weather.mulberry32(weather.hash(seed, Math.round(bearing * 10), Math.round(power * 1000), soggy ? 1 : 0));
    const stalled = rnd() < stallChance(power);
    const angle = rnd() * Math.PI * 2;
    const radius = spreadKm(power, soggy) * Math.sqrt(rnd()) * (stalled ? 0.3 : 1);
    const offEast = Math.sin(angle) * radius;
    const offNorth = Math.cos(angle) * radius;
    const end = stalled ? Math.round(STEPS * STALL_CUT) : STEPS;
    const path = [];
    for (let i = 0; i <= end; i++) {
      const f = (i / end) * (i / end);
      const p = geo.offset(plotted[i][0], plotted[i][1], offEast * f, offNorth * f);
      path.push([Math.max(LAT_MIN, Math.min(LAT_MAX, p[0])), p[1]]);
    }
    const last = path[path.length - 1];
    return { path, lat: last[0], lon: last[1], km: lengthKm(path), stalled };
  }

  // Keep a handful of points to redraw the route later.
  function thin(path, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = path[Math.round((i * (path.length - 1)) / (n - 1))];
      out.push([Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
    }
    return out;
  }

  ET.flight = { MAX_THROW_KM, STEPS, SOGGY, STALL_FROM, LAT_MIN, LAT_MAX, stallChance, reachKm, spreadKm, plot, fly, lengthKm, thin };
})(typeof globalThis !== 'undefined' ? globalThis : this);
