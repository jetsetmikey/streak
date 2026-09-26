import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/world-data.js';
import '../src/geo.js';
import '../src/weather.js';
import '../src/flight.js';
import '../src/race.js';
import '../src/storage.js';

const { geo, weather, flight, race, storage } = globalThis.ET;
const world = geo.buildWorld(globalThis.ET.WORLD_DATA);
const nameAt = (lat, lon) => {
  const i = geo.countryAt(world, lat, lon);
  return i < 0 ? null : world.countries[i].name;
};

test('distances and small moves on the globe', () => {
  assert.ok(Math.abs(geo.distanceKm(51.507, -0.128, 48.857, 2.352) - 344) < 5, 'London to Paris is about 344 km');
  const [lat, lon] = geo.offset(10, 20, 0, geo.KM_PER_DEG);
  assert.ok(Math.abs(lat - 11) < 1e-9 && lon === 20, 'one degree of latitude north');
  assert.equal(geo.wrapLon(190), -170);
  assert.equal(geo.compass(90), 'east');
  assert.equal(geo.compass(225), 'south-west');
});

test('the map knows where the land is', () => {
  assert.equal(nameAt(48.86, 2.35), 'France');
  assert.equal(nameAt(40.71, -74.0), 'United States');
  assert.equal(nameAt(35.68, 139.69), 'Japan');
  assert.equal(nameAt(55.76, 37.62), 'Russia');
  assert.equal(nameAt(-33.87, 151.21), 'Australia');
  assert.equal(nameAt(64.0, 177.0), 'Russia', 'Chukotka, west of the date line');
  assert.equal(nameAt(66.0, -172.0), 'Russia', 'Chukotka, east of the date line');
  assert.equal(nameAt(-17.8, 178.0), 'Fiji');
  assert.equal(nameAt(45, -35), null);
  assert.equal(geo.seaName(45, -35), 'North Atlantic Ocean');
  assert.equal(geo.seaName(40, 5), 'Mediterranean Sea');
  assert.equal(geo.seaName(-40, 80), 'Indian Ocean');
  assert.equal(geo.seaName(30, -150), 'North Pacific Ocean');
  const city = geo.nearestCity(world, 52.3, 21.2, 260, geo.countryAt(world, 52.3, 21.2));
  assert.equal(city.name, 'Warsaw');
});

test('no outline jumps across the date line on the flat map', () => {
  const rings = [];
  world.countries.forEach((c) => c.polys.forEach((poly) => poly.forEach((r) => rings.push(r))));
  world.land.forEach((poly) => poly.forEach((r) => rings.push(r)));
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const alongPole = Math.abs(ring[i][1]) === 90 && Math.abs(ring[i - 1][1]) === 90;
      assert.ok(alongPole || Math.abs(ring[i][0] - ring[i - 1][0]) < 180);
    }
  }
});

test('every country has a name, and most have a flag code', () => {
  assert.ok(world.countries.every((c) => c.name && c.name.length > 1));
  assert.ok(world.countries.filter((c) => /^[A-Z]{2}$/.test(c.a2)).length > 170);
});

test('the wind follows the real belts and is the same for everyone on a day', () => {
  assert.deepEqual(weather.windAt(47, 10, 20000), weather.windAt(47, 10, 20000));
  assert.ok(weather.prevailing(45)[0] > 0, 'westerlies blow east');
  assert.ok(weather.prevailing(15)[0] < 0, 'trade winds blow west');
  assert.ok(weather.prevailing(-45)[0] > 0, 'the roaring forties blow east too');
  let sum = 0;
  for (let d = 0; d < 200; d++) sum += weather.windAt(47, (d * 37) % 360 - 180, 20000 + d)[0];
  assert.ok(sum / 200 > 60, 'on average the mid-latitudes push planes east');
});

test('a throw is the same every time for the same day and aim', () => {
  const from = { lat: race.START.lat, lon: race.START.lon };
  const a = flight.fly(from, 80, 0.7, 20700, false);
  const b = flight.fly(from, 80, 0.7, 20700, false);
  assert.deepEqual(a, b);
  assert.equal(a.path.length, flight.STEPS + 1);
  assert.ok(a.km > 100 && a.km < 700);
});

test('throwing too hard can stall, and soggy planes fly shorter', () => {
  assert.equal(flight.stallChance(0.8), 0);
  assert.equal(flight.stallChance(1), 0.5);
  assert.ok(flight.reachKm(1, true) < flight.reachKm(1, false));
  let stalls = 0;
  for (let s = 0; s < 400; s++) if (flight.fly({ lat: 45, lon: 0 }, 90, 1, s, false).stalled) stalls++;
  assert.ok(stalls > 140 && stalls < 260, 'about half of full-power throws stall');
});

test('longitude keeps counting past the date line', () => {
  const r = flight.fly({ lat: 45, lon: 179.5 }, 90, 0.8, 20001, false);
  assert.ok(r.lon > 180, 'no jump back to -180');
  assert.ok(race.progress(race.START.lon + 180) === 0.5);
});

test("Fogg keeps to his timetable", () => {
  assert.equal(race.fogg(0).place, 'London');
  assert.equal(race.fogg(0).progress, 0);
  assert.equal(race.fogg(7).place, 'Suez');
  assert.ok(race.fogg(80).progress > 0.999);
  assert.ok(race.fogg(30).place.startsWith('between Calcutta'));
  const bombay = race.progress(72.84);
  assert.ok(Math.abs(race.daysAhead(bombay, 15) - 5) < 1e-6, 'reaching Bombay on day 15 is 5 days ahead');
});

test('days, weather seeds and backup codes', () => {
  const save = Object.assign(storage.fresh(), { start: '2026-09-26', offset: 2 });
  assert.equal(storage.currentDay(save, new Date(2026, 8, 28)), 5);
  assert.equal(storage.seedFor(save, 1), storage.epochDay('2026-09-26'));
  save.throws.push({ d: 1, b: 90, p: 0.8, lat: 47, lon: 28.9, km: 420, stall: false, ci: 3, place: 'near Chișinău, Moldova', path: [[51.5, -0.1], [47, 28.9]] });
  const back = storage.importCode(storage.exportCode(save));
  assert.deepEqual(back, storage.normalize(save));
  assert.equal(storage.importCode('nonsense'), null);
});

test('throwing east every day gets around the world in roughly Fogg’s time', () => {
  let pos = { lat: race.START.lat, lon: race.START.lon };
  let soggy = false;
  let day = 0;
  while (race.progress(pos.lon) < 1 && day < 200) {
    day++;
    const r = flight.fly(pos, 90, 0.8, 20720 + day, soggy);
    pos = { lat: r.lat, lon: r.lon };
    soggy = geo.countryAt(world, r.lat, r.lon) < 0;
  }
  assert.ok(day >= 60 && day <= 100, 'took ' + day + ' days');
});
