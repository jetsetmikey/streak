import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/level.js';
import '../src/sim.js';
import '../src/timeline.js';
import '../src/autopilot.js';
import '../src/demo.js';

const { parseLevel, sim, timeline, autopilot, demo } = globalThis.FT;

function tinyLevel(map, extra = {}) {
  return parseLevel({
    name: 'test',
    map,
    spawn: extra.spawn || { x: 1.5, y: 1.5 },
    doors: extra.doors || {},
    extraLoot: [],
    lasers: extra.lasers || [],
    guards: extra.guards || [],
    cameras: extra.cameras || [],
    labels: [],
  });
}

function run(level, plans) {
  const crew = [];
  plans.forEach((plan, i) => crew.push(autopilot.record(level, crew, i + 1, plan)));
  return { crew, result: timeline.simulate(level, crew) };
}

test('input tapes survive encoding', () => {
  const codes = new Uint8Array(sim.RUN_TICKS);
  let seed = 7;
  for (let i = 0; i < 900; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    codes[i] = seed % 18;
    if (i % 5) codes[i] = codes[i - 1];
  }
  const back = timeline.decodeTape(timeline.encodeTape(codes, 900));
  assert.deepEqual(Array.from(back.slice(0, 900)), Array.from(codes.slice(0, 900)));
  assert.equal(back[900], 0);
});

test('a door only opens while a thief stands on its plate', () => {
  const level = tinyLevel([
    '#######',
    '#.a...#',
    '#.....#',
    '###A###',
    '#.$...#',
    '#VV...#',
    '#######',
  ], { doors: { A: { name: 'door', mode: 'any', latch: false } } });
  // Alone: stand on the plate, then try to walk through. The door shuts behind you.
  const solo = run(level, [[[2.5, 1.5], [3.5, 1.5], [3.5, 2.5], [3.5, 4.5]]]);
  assert.ok(solo.result.final.thieves[0].y < 3, 'a lone thief cannot get through');

  // Day 1 holds the plate; Day 2 walks through, grabs the cash, and banks it.
  const pair = run(level, [
    [[2.5, 1.5], { until: 3000 }],
    [[3.5, 1.5], [3.5, 4.5], [2.5, 4.5], 'act', [2.5, 5.5]],
  ]);
  const s = timeline.summarize(level, pair.result.final);
  assert.equal(s.haul, 500);
  assert.equal(timeline.fateOf(s, 2).banked, 500);
});

test('the vault needs both plates at once, then stays open', () => {
  const level = tinyLevel([
    '#########',
    '#b.....b#',
    '#.......#',
    '####B####',
    '#.......#',
    '#########',
  ], { spawn: { x: 4.5, y: 2.5 }, doors: { B: { name: 'vault door', mode: 'all', latch: true } } });
  const one = run(level, [[[1.5, 1.5], { until: 600 }]]);
  assert.equal(one.result.final.doors[0].latched, false);

  const both = run(level, [
    [[1.5, 1.5], { until: 300 }, [4.5, 2.5]],
    [[7.5, 1.5], { until: 300 }, [4.5, 2.5], [4.5, 4.5]],
  ]);
  assert.equal(both.result.final.doors[0].latched, true);
  assert.ok(both.result.final.events.some((e) => e.type === 'vault'));
  assert.ok(both.result.final.thieves[1].y > 4, 'Day 2 walked into the open vault');
});

test('lasers trip the alarm unless the power is cut, and the police end the heist', () => {
  const map = [
    '#########',
    '#.L.....#',
    '#.......#',
    '#.......#',
    '#VV.....#',
    '#########',
  ];
  const lasers = [{ group: 'lasers', x1: 1, y1: 2.5, x2: 8, y2: 2.5 }];
  const level = tinyLevel(map, { lasers, spawn: { x: 1.5, y: 1.5 } });

  const tripped = run(level, [[[1.5, 3.5]]]);
  const s1 = timeline.summarize(level, tripped.result.final);
  assert.ok(s1.alarm, 'crossing a live laser raises the alarm');
  assert.equal(s1.endReason, 'police');
  assert.equal(s1.endTick, s1.alarm.t + sim.POLICE_DELAY + 1);

  const cut = run(level, [[[2.5, 1.5], 'act', [2.5, 3.5]]]);
  const s2 = timeline.summarize(level, cut.result.final);
  assert.equal(s2.alarm, null);
  assert.equal(s2.endReason, 'time');
});

test('the power comes back after 10 seconds', () => {
  const level = tinyLevel([
    '#########',
    '#.L.....#',
    '#.......#',
    '#.......#',
    '#########',
  ], { lasers: [{ group: 'lasers', x1: 1, y1: 2.5, x2: 8, y2: 2.5 }] });
  const late = run(level, [[[2.5, 1.5], 'act', { wait: sim.POWER_CUT_TICKS + 30 }, [2.5, 3.5]]]);
  assert.ok(timeline.summarize(level, late.result.final).alarm);
});

const guardMap = [
  '###########',
  '#.........#',
  '#.........#',
  '#.........#',
  '###########',
];
const guard = { name: 'test guard', x: 8.5, y: 2.5, route: [{ x: 8.5, y: 2.5, wait: 10000, look: [-1, 0] }] };

test('a guard catches a thief who stays in view', () => {
  const level = tinyLevel(guardMap, { guards: [guard] });
  const r = run(level, [[[5.5, 2.5], { until: 600 }]]);
  const th = r.result.final.thieves[0];
  assert.equal(th.caught, true);
  assert.equal(th.caughtBy, 'test guard');
});

test('a knocked-out guard sees nothing, then wakes up', () => {
  const level = tinyLevel(guardMap, { guards: [guard], spawn: { x: 9.5, y: 1.5 } });
  // Sneak up from behind (east of a west-facing guard) and knock him out.
  const r = run(level, [[[9.5, 2.5], 'act', [3.5, 2.5], [3.5, 1.5], [9.5, 1.5], [9.5, 2.5], { until: 3000 }]]);
  const w = r.result.final;
  assert.ok(w.events.some((e) => e.type === 'ko'));
  assert.equal(w.thieves[0].caught, false, 'walking past a downed guard is safe');

  const late = run(level, [[[9.5, 2.5], 'act', { wait: sim.KO_TICKS + 30 }, [5.5, 2.5], { until: 3000 }]]);
  assert.equal(late.result.final.thieves[0].caught, true, 'the guard is back on duty');
});

test('a later day can save an earlier one', () => {
  const level = tinyLevel(guardMap, { guards: [guard], spawn: { x: 9.5, y: 1.5 } });
  const day1 = [[9.5, 3.5], { until: 240 }, [3.5, 3.5], { until: 3000 }];
  const before = run(level, [day1]);
  const b = timeline.summarize(level, before.result.final);
  assert.equal(timeline.fateOf(b, 1).caught, true, 'on its own, Day 1 walks into the guard');

  const after = run(level, [day1, [[9.5, 2.5], 'act', { until: 3000 }]]);
  const a = timeline.summarize(level, after.result.final);
  assert.equal(timeline.fateOf(a, 1).caught, false, 'Day 2 knocked the guard out first');
  const notes = timeline.compare(b, a, 2);
  assert.ok(notes.some((n) => /saved Day 1/.test(n.text)));
});

test('the corner assist lets a slightly off-center thief through a doorway', () => {
  const level = tinyLevel([
    '#######',
    '#.....#',
    '###.###',
    '#.....#',
    '#######',
  ], { spawn: { x: 3.2, y: 1.5 } });
  const world = sim.createWorld(level, [1]);
  for (let t = 0; t < 120; t++) sim.step(world, level, [5]); // hold "south"
  assert.ok(world.thieves[0].y > 3, 'slid into the doorway and through');
});

test('replays are deterministic and scrubbing matches straight playback', () => {
  const level = FT.level;
  const crew = [];
  let seed = 42;
  for (let d = 1; d <= 6; d++) {
    const codes = new Uint8Array(sim.RUN_TICKS);
    for (let t = 0; t < sim.RUN_TICKS; t++) {
      if (t % 20 === 0) seed = (seed * 1103515245 + 12345) % 2147483648;
      codes[t] = (seed >> 8) % 18;
    }
    crew.push({ day: d, codes });
  }
  const a = timeline.simulate(level, crew);
  const b = timeline.simulate(level, crew);
  assert.deepEqual(a.final, b.final);

  const player = new timeline.Player(level, a);
  const target = Math.min(1234, a.endTick);
  const direct = sim.createWorld(level, crew.map((c) => c.day));
  const codes = new Uint8Array(crew.length);
  while (direct.tick < target) {
    for (let i = 0; i < crew.length; i++) codes[i] = crew[i].codes[direct.tick];
    sim.step(direct, level, codes);
  }
  player.seek(a.endTick);
  assert.deepEqual(JSON.parse(JSON.stringify(player.seek(target))), JSON.parse(JSON.stringify(direct)));
});

test('the example crew pulls off the heist the title screen promises', () => {
  const level = FT.level;
  const crew = demo.build(level);
  const s = timeline.summarize(level, timeline.simulate(level, crew).final);
  assert.equal(crew.length, 9);
  assert.equal(s.alarm, null);
  assert.equal(s.vaultOpen, true);
  assert.ok(s.fates.every((f) => !f.caught), 'nobody gets caught');
  assert.ok(s.haul >= 17500, 'the diamond, gold and a painting reach the van');
});
