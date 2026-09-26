/* Forty Thieves: the heist map. Pure data plus a parser; no DOM. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

  const TILE = { FLOOR: 0, WALL: 1, COUNTER: 2, STREET: 3, VAN: 4, DOOR: 5 };

  // Legend
  //   #  wall            T  teller counter (blocks movement and sight)
  //   .  floor           _  street          V  getaway van (drop loot here)
  //   A B C  doors       a b c  pressure plates that open the matching door
  //   L  power lever     $ cash   m deposit box   % painting   & gold bar
  const MAP = [
    '####################',
    '#%..%##&....&##....#',
    '#....##&....&##..L.#',
    '#....##&....&##....#',
    '#%..%##......##....#',
    '#....####BB#####.###',
    '#....#........#....#',
    '#..................#',
    '#....#b......b#....#',
    '##..#####AA#####..##',
    '#.....a............#',
    '#..................#',
    '#..................#',
    '####..########..####',
    '#mm#c.$.$..$.$..####',
    '#..#..TTTTTTTT..####',
    '#..#............####',
    '#mmC............####',
    '#########..#########',
    '____________________',
    '________VVVV________',
    '________VVVV________',
  ];

  const LOOT_TYPES = {
    $: { kind: 'cash', name: 'Cash drawer', value: 500, speed: 1 },
    m: { kind: 'box', name: 'Deposit box', value: 750, speed: 0.9 },
    '%': { kind: 'painting', name: 'Painting', value: 2500, speed: 0.85 },
    '&': { kind: 'gold', name: 'Gold bar', value: 1500, speed: 0.6 },
    '*': { kind: 'diamond', name: 'Meridian Diamond', value: 12000, speed: 1 },
  };

  const DEF = {
    name: 'Grand Meridian Bank',
    map: MAP,
    spawn: { x: 10, y: 20.5 },
    doors: {
      A: { name: 'hall door', mode: 'any', latch: false },
      B: { name: 'vault door', mode: 'all', latch: true },
      C: { name: 'deposit room door', mode: 'any', latch: false },
    },
    // The diamond sits inside the laser cage, between tiles, so it is placed by hand.
    extraLoot: [{ type: '*', x: 10, y: 2.5 }],
    lasers: [
      { group: 'gallery lasers', x1: 1, y1: 3.5, x2: 5, y2: 3.5 },
      { group: 'gallery lasers', x1: 1, y1: 6.5, x2: 5, y2: 6.5 },
      { group: 'diamond cage', x1: 8.5, y1: 1.5, x2: 11.5, y2: 1.5 },
      { group: 'diamond cage', x1: 8.5, y1: 3.5, x2: 11.5, y2: 3.5 },
      { group: 'diamond cage', x1: 8.5, y1: 1.5, x2: 8.5, y2: 3.5 },
      { group: 'diamond cage', x1: 11.5, y1: 1.5, x2: 11.5, y2: 3.5 },
    ],
    guards: [
      {
        name: 'lobby guard',
        x: 10, y: 16.5,
        route: [
          { x: 5.5, y: 16.5, wait: 45, look: [1, 0] },
          { x: 14.5, y: 16.5, wait: 45, look: [-1, 0] },
        ],
      },
      {
        name: 'hall guard',
        x: 12, y: 11.5,
        route: [
          { x: 17.5, y: 11.5, wait: 60, look: [-1, 0] },
          { x: 2.5, y: 11.5, wait: 60, look: [1, 0] },
        ],
      },
      {
        name: 'vault guard',
        x: 10, y: 6.5,
        route: [
          { x: 10, y: 6.5, wait: 90, look: [-0.6, 1] },
          { x: 10, y: 6.5, wait: 90, look: [0, 1] },
          { x: 10, y: 6.5, wait: 90, look: [0.6, 1] },
          { x: 10, y: 6.5, wait: 90, look: [0, 1] },
        ],
      },
    ],
    cameras: [
      // Sweeps between facing north and facing west, watching the east corridor.
      { name: 'corridor camera', x: 18.75, y: 8.75, from: [0, -1], to: [-1, 0], period: 480, range: 6 },
    ],
    labels: [
      { text: 'GALLERY', x: 3, y: 8.45 },
      { text: 'VAULT', x: 10, y: 4.55 },
      { text: 'SECURITY', x: 16.9, y: 1.3 },
      { text: 'HALL', x: 10, y: 12.55 },
      { text: 'LOBBY', x: 7.6, y: 17.55 },
      { text: 'BOXES', x: 2, y: 15.6 },
    ],
  };

  function unit(v) {
    const d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return [v[0] / d, v[1] / d];
  }

  function parseLevel(def) {
    const rows = def.map.length;
    const cols = def.map[0].length;
    const tiles = new Uint8Array(cols * rows);
    const doorAt = new Int8Array(cols * rows).fill(-1);
    const doorIndex = {};
    const doors = [];
    const plates = [];
    const loot = [];
    const van = [];
    let lever = null;

    Object.keys(def.doors).forEach((letter) => {
      doorIndex[letter] = doors.length;
      doors.push(Object.assign({ letter, tiles: [], plates: [], plateIdx: [] }, def.doors[letter]));
    });

    for (let y = 0; y < rows; y++) {
      const line = def.map[y];
      if (line.length !== cols) throw new Error('Map row ' + y + ' has the wrong width');
      for (let x = 0; x < cols; x++) {
        const ch = line[x];
        const i = y * cols + x;
        let kind = TILE.FLOOR;
        if (ch === '#') kind = TILE.WALL;
        else if (ch === 'T') kind = TILE.COUNTER;
        else if (ch === '_') kind = TILE.STREET;
        else if (ch === 'V') {
          kind = TILE.VAN;
          van.push({ x, y });
        } else if (ch >= 'A' && ch <= 'C') {
          kind = TILE.DOOR;
          doorAt[i] = doorIndex[ch];
          doors[doorIndex[ch]].tiles.push({ x, y });
        } else if (ch >= 'a' && ch <= 'c') {
          const d = doorIndex[ch.toUpperCase()];
          const plate = { x, y, door: d };
          doors[d].plateIdx.push(plates.length);
          doors[d].plates.push(plate);
          plates.push(plate);
        } else if (ch === 'L') {
          lever = { x: x + 0.5, y: y + 0.5 };
        } else if (LOOT_TYPES[ch]) {
          loot.push(Object.assign({ type: ch, x: x + 0.5, y: y + 0.5 }, LOOT_TYPES[ch]));
        }
        tiles[i] = kind;
      }
    }

    (def.extraLoot || []).forEach((l) => {
      loot.push(Object.assign({ type: l.type, x: l.x, y: l.y }, LOOT_TYPES[l.type]));
    });

    const guards = def.guards.map((g) => ({
      name: g.name,
      x: g.x,
      y: g.y,
      route: g.route.map((p) => {
        const out = { x: p.x, y: p.y, wait: p.wait | 0 };
        if (p.look) {
          const u = unit(p.look);
          out.lx = u[0];
          out.ly = u[1];
        }
        return out;
      }),
    }));

    const cameras = def.cameras.map((c) => {
      const a = unit(c.from);
      const b = unit(c.to);
      return { name: c.name, x: c.x, y: c.y, ax: a[0], ay: a[1], bx: b[0], by: b[1], period: c.period, range: c.range };
    });

    const totalValue = loot.reduce((s, l) => s + l.value, 0);

    return {
      name: def.name,
      cols,
      rows,
      tiles,
      doorAt,
      doors,
      plates,
      lever,
      loot,
      van,
      spawn: { x: def.spawn.x, y: def.spawn.y },
      lasers: def.lasers.map((l) => Object.assign({}, l)),
      guards,
      cameras,
      labels: def.labels.slice(),
      totalValue,
    };
  }

  FT.TILE = TILE;
  FT.parseLevel = parseLevel;
  FT.level = parseLevel(DEF);
})(typeof globalThis !== 'undefined' ? globalThis : this);
