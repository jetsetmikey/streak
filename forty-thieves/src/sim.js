/* Forty Thieves: the deterministic heist simulation. No DOM, no randomness,
 * no trig: only + - * / and sqrt, so a recorded run replays identically. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});
  const TILE = FT.TILE;

  const TICK_HZ = 60;
  const RUN_TICKS = 60 * TICK_HZ;
  const HALF = 0.28; // thieves are 0.56 tiles wide
  const THIEF_SPEED = 4.2 / TICK_HZ;
  const GUARD_SPEED = 2 / TICK_HZ;
  const GUARD_RANGE = 4.5;
  const GUARD_COS = 0.766; // 40 degree half-angle
  const GUARD_NOTICE = 18; // ticks in view before a guard grabs you
  const CAM_COS = 0.927; // 22 degree half-angle
  const CAM_NOTICE = 15;
  const REACH = 0.85; // loot and lever
  const KO_REACH = 1.1;
  const KO_TICKS = 12 * TICK_HZ;
  const POWER_CUT_TICKS = 10 * TICK_HZ;
  const POLICE_DELAY = 10 * TICK_HZ;
  const ASSIST = 0.42; // how far we nudge a thief round a corner
  const EPS = 1e-6;

  const S = Math.SQRT1_2;
  // Input codes: direction 0-8 (none, N, NE, E, SE, S, SW, W, NW) plus 9 if action was pressed.
  const DIRS = [[0, 0], [0, -1], [S, -S], [1, 0], [S, S], [0, 1], [-S, S], [-1, 0], [-S, -S]];

  function createWorld(level, days) {
    const g = level.guards.length;
    const c = level.cameras.length;
    return {
      tick: 0,
      over: false,
      endReason: null,
      powerOffUntil: 0,
      alarmAt: -1,
      alarmBy: null,
      haul: 0,
      doors: level.doors.map(() => ({ open: false, latched: false })),
      plates: level.plates.map(() => false),
      thieves: days.map((day) => ({
        day,
        x: level.spawn.x,
        y: level.spawn.y,
        fx: 0,
        fy: -1,
        caught: false,
        caughtAt: -1,
        caughtBy: '',
        caughtCarry: 1,
        carry: -1,
        banked: 0,
        kos: 0,
        pulls: 0,
        plateTicks: 0,
        sus: new Array(g).fill(0),
        cam: new Array(c).fill(0),
      })),
      guards: level.guards.map((gd) => ({ x: gd.x, y: gd.y, fx: 0, fy: 1, wp: 0, wait: 0, down: 0 })),
      cams: level.cameras.map((cd) => ({ fx: cd.ax, fy: cd.ay })),
      loot: level.loot.map((l) => ({ x: l.x, y: l.y, holder: -1, banked: false })),
      events: [],
    };
  }

  function tileAt(level, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return TILE.WALL;
    return level.tiles[ty * level.cols + tx];
  }

  function blocked(world, level, tx, ty) {
    const k = tileAt(level, tx, ty);
    if (k === TILE.WALL || k === TILE.COUNTER) return true;
    if (k === TILE.DOOR) return !world.doors[level.doorAt[ty * level.cols + tx]].open;
    return false;
  }

  function boxHits(world, level, x, y) {
    const x0 = Math.floor(x - HALF);
    const x1 = Math.floor(x + HALF - EPS);
    const y0 = Math.floor(y - HALF);
    const y1 = Math.floor(y + HALF - EPS);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) if (blocked(world, level, tx, ty)) return true;
    }
    return false;
  }

  // Outside the bank (street, van) nobody can see you or catch you.
  function outside(level, th) {
    const k = tileAt(level, Math.floor(th.x), Math.floor(th.y));
    return k === TILE.STREET || k === TILE.VAN;
  }

  function moveAxis(world, level, th, dx, dy) {
    const nx = th.x + dx;
    const ny = th.y + dy;
    if (!boxHits(world, level, nx, ny)) {
      th.x = nx;
      th.y = ny;
      return true;
    }
    // Slide flush against whatever we hit.
    if (dx > 0) th.x = Math.max(th.x, Math.floor(nx + HALF - EPS) - HALF - EPS);
    else if (dx < 0) th.x = Math.min(th.x, Math.floor(nx - HALF) + 1 + HALF + EPS);
    else if (dy > 0) th.y = Math.max(th.y, Math.floor(ny + HALF - EPS) - HALF - EPS);
    else if (dy < 0) th.y = Math.min(th.y, Math.floor(ny - HALF) + 1 + HALF + EPS);
    return false;
  }

  // When a straight move is blocked by a corner, ease the thief toward the
  // middle of a nearby lane so doorways don't need pixel-perfect aim.
  function cornerAssist(world, level, th, dx, dy, sp) {
    const alongX = dx !== 0;
    const pos = alongX ? th.y : th.x;
    const base = Math.floor(pos) + 0.5;
    const lanes = [base, base - 1, base + 1];
    lanes.sort((a, b) => Math.abs(a - pos) - Math.abs(b - pos));
    for (let i = 0; i < lanes.length; i++) {
      const off = lanes[i] - pos;
      if (Math.abs(off) > ASSIST || Math.abs(off) < EPS) continue;
      const clear = alongX ? !boxHits(world, level, th.x + dx, lanes[i]) : !boxHits(world, level, lanes[i], th.y + dy);
      if (!clear) continue;
      const step = Math.min(Math.abs(off), sp) * (off > 0 ? 1 : -1);
      if (alongX) moveAxis(world, level, th, 0, step);
      else moveAxis(world, level, th, step, 0);
      return;
    }
  }

  function moveThief(world, level, th, dir, sp) {
    const v = DIRS[dir];
    const dx = v[0] * sp;
    const dy = v[1] * sp;
    if (dx !== 0 && dy !== 0) {
      moveAxis(world, level, th, dx, 0);
      moveAxis(world, level, th, 0, dy);
    } else if (!moveAxis(world, level, th, dx, dy)) {
      cornerAssist(world, level, th, dx, dy, sp);
    }
    th.fx = v[0];
    th.fy = v[1];
  }

  function clearLine(world, level, x0, y0, x1, y1, dist) {
    const n = Math.ceil(dist / 0.2);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (blocked(world, level, Math.floor(x0 + (x1 - x0) * t), Math.floor(y0 + (y1 - y0) * t))) return false;
    }
    return true;
  }

  function sees(world, level, ox, oy, fx, fy, range, cosHalf, tx, ty) {
    const dx = tx - ox;
    const dy = ty - oy;
    const d2 = dx * dx + dy * dy;
    if (d2 > range * range) return false;
    const d = Math.sqrt(d2);
    if (d > EPS && dx * fx + dy * fy < cosHalf * d) return false;
    return clearLine(world, level, ox, oy, tx, ty, d);
  }

  function guardSees(world, level, k, th) {
    const g = world.guards[k];
    return sees(world, level, g.x, g.y, g.fx, g.fy, GUARD_RANGE, GUARD_COS, th.x, th.y);
  }

  function event(world, type, props) {
    world.events.push(Object.assign({ t: world.tick, type }, props));
  }

  function dropLoot(world, th) {
    if (th.carry < 0) return;
    const l = world.loot[th.carry];
    l.holder = -1;
    l.x = th.x;
    l.y = th.y;
    th.carry = -1;
  }

  function catchThief(world, level, i, by) {
    const th = world.thieves[i];
    th.caughtCarry = th.carry >= 0 ? level.loot[th.carry].speed : 1;
    th.caught = true;
    th.caughtAt = world.tick;
    th.caughtBy = by;
    dropLoot(world, th);
    event(world, 'caught', { day: th.day, x: th.x, y: th.y, by });
  }

  function raiseAlarm(world, cause, th) {
    if (world.alarmAt >= 0) return;
    world.alarmAt = world.tick;
    world.alarmBy = { cause, day: th.day };
    event(world, 'alarm', { day: th.day, x: th.x, y: th.y, cause });
  }

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function act(world, level, i) {
    const th = world.thieves[i];
    const t = world.tick;

    // 1. Knock out a guard, if you can reach one that isn't looking at you.
    let best = -1;
    let bestD = KO_REACH * KO_REACH;
    for (let k = 0; k < world.guards.length; k++) {
      const g = world.guards[k];
      if (g.down > t) continue;
      const d = dist2(g.x, g.y, th.x, th.y);
      if (d <= bestD && !guardSees(world, level, k, th)) {
        best = k;
        bestD = d;
      }
    }
    if (best >= 0) {
      world.guards[best].down = t + KO_TICKS;
      th.kos++;
      for (let j = 0; j < world.thieves.length; j++) world.thieves[j].sus[best] = 0;
      event(world, 'ko', { day: th.day, x: world.guards[best].x, y: world.guards[best].y, guard: best });
      return;
    }

    // 2. Pull the power lever.
    if (level.lever && dist2(level.lever.x, level.lever.y, th.x, th.y) <= REACH * REACH) {
      world.powerOffUntil = Math.max(world.powerOffUntil, t + POWER_CUT_TICKS);
      th.pulls++;
      event(world, 'power', { day: th.day, x: level.lever.x, y: level.lever.y });
      return;
    }

    // 3. Drop what you're carrying, or 4. pick up the nearest loot.
    if (th.carry >= 0) {
      const l = th.carry;
      dropLoot(world, th);
      event(world, 'drop', { day: th.day, x: th.x, y: th.y, loot: l });
      return;
    }
    let pick = -1;
    let pickD = REACH * REACH;
    for (let n = 0; n < world.loot.length; n++) {
      const l = world.loot[n];
      if (l.banked || l.holder >= 0) continue;
      const d = dist2(l.x, l.y, th.x, th.y);
      if (d <= pickD) {
        pick = n;
        pickD = d;
      }
    }
    if (pick >= 0) {
      world.loot[pick].holder = i;
      th.carry = pick;
      event(world, 'pick', { day: th.day, x: th.x, y: th.y, loot: pick });
    }
  }

  function thiefOnTile(th, tx, ty) {
    return th.x >= tx && th.x < tx + 1 && th.y >= ty && th.y < ty + 1;
  }

  function boxOnTile(th, tx, ty) {
    return th.x + HALF > tx && th.x - HALF < tx + 1 && th.y + HALF > ty && th.y - HALF < ty + 1;
  }

  function updateDoors(world, level) {
    const thieves = world.thieves;
    for (let p = 0; p < level.plates.length; p++) {
      const pl = level.plates[p];
      let on = false;
      for (let i = 0; i < thieves.length; i++) {
        const th = thieves[i];
        if (!th.caught && thiefOnTile(th, pl.x, pl.y)) {
          on = true;
          th.plateTicks++;
        }
      }
      world.plates[p] = on;
    }
    for (let d = 0; d < level.doors.length; d++) {
      const def = level.doors[d];
      const st = world.doors[d];
      let n = 0;
      for (let p = 0; p < def.plateIdx.length; p++) if (world.plates[def.plateIdx[p]]) n++;
      const cond = def.mode === 'all' ? n === def.plateIdx.length && n > 0 : n > 0;
      if (cond && def.latch && !st.latched) {
        st.latched = true;
        const tl = def.tiles[0];
        event(world, 'vault', { x: tl.x + 1, y: tl.y + 0.5, door: d });
      }
      // A door never closes on someone standing in it.
      let occupied = false;
      if (st.open && !cond && !st.latched) {
        for (let i = 0; i < thieves.length && !occupied; i++) {
          if (thieves[i].caught) continue;
          for (let q = 0; q < def.tiles.length; q++) {
            if (boxOnTile(thieves[i], def.tiles[q].x, def.tiles[q].y)) {
              occupied = true;
              break;
            }
          }
        }
      }
      st.open = cond || st.latched || occupied;
    }
  }

  function bankLoot(world, level) {
    for (let i = 0; i < world.thieves.length; i++) {
      const th = world.thieves[i];
      if (th.caught || th.carry < 0) continue;
      if (tileAt(level, Math.floor(th.x), Math.floor(th.y)) !== TILE.VAN) continue;
      const n = th.carry;
      const l = world.loot[n];
      l.banked = true;
      l.holder = -1;
      th.carry = -1;
      th.banked += level.loot[n].value;
      world.haul += level.loot[n].value;
      event(world, 'bank', { day: th.day, x: th.x, y: th.y, loot: n, value: level.loot[n].value });
    }
  }

  function stepGuard(world, level, k) {
    const g = world.guards[k];
    if (g.down > world.tick) return;
    if (g.wait > 0) {
      g.wait--;
      return;
    }
    const route = level.guards[k].route;
    const wp = route[g.wp];
    const dx = wp.x - g.x;
    const dy = wp.y - g.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= GUARD_SPEED) {
      g.x = wp.x;
      g.y = wp.y;
      if (wp.lx !== undefined) {
        g.fx = wp.lx;
        g.fy = wp.ly;
      }
      g.wait = wp.wait;
      g.wp = (g.wp + 1) % route.length;
    } else {
      g.x += (dx / d) * GUARD_SPEED;
      g.y += (dy / d) * GUARD_SPEED;
      g.fx = dx / d;
      g.fy = dy / d;
    }
  }

  function cameraFacing(cam, t) {
    const phase = (t % cam.period) / cam.period;
    const w = phase < 0.5 ? phase * 2 : 2 - phase * 2;
    const vx = cam.ax + (cam.bx - cam.ax) * w;
    const vy = cam.ay + (cam.by - cam.ay) * w;
    const d = Math.sqrt(vx * vx + vy * vy);
    return [vx / d, vy / d];
  }

  function touchesLaser(th, l) {
    if (l.y1 === l.y2) {
      return th.y - HALF <= l.y1 && th.y + HALF >= l.y1 && th.x + HALF > Math.min(l.x1, l.x2) && th.x - HALF < Math.max(l.x1, l.x2);
    }
    return th.x - HALF <= l.x1 && th.x + HALF >= l.x1 && th.y + HALF > Math.min(l.y1, l.y2) && th.y - HALF < Math.max(l.y1, l.y2);
  }

  function isPowered(world) {
    return world.tick >= world.powerOffUntil;
  }

  function step(world, level, codes) {
    if (world.over) return;
    const t = world.tick;
    const thieves = world.thieves;

    // Move everyone, then resolve actions in crew order (earliest day first).
    for (let i = 0; i < thieves.length; i++) {
      const th = thieves[i];
      if (th.caught) continue;
      const dir = (codes[i] | 0) % 9;
      if (dir) {
        const sp = THIEF_SPEED * (th.carry >= 0 ? level.loot[th.carry].speed : 1);
        moveThief(world, level, th, dir, sp);
      }
    }
    for (let i = 0; i < thieves.length; i++) {
      if (!thieves[i].caught && (codes[i] | 0) >= 9) act(world, level, i);
    }
    for (let i = 0; i < thieves.length; i++) {
      const th = thieves[i];
      if (th.carry >= 0) {
        const l = world.loot[th.carry];
        l.x = th.x;
        l.y = th.y;
      }
    }

    updateDoors(world, level);
    bankLoot(world, level);

    // Guards walk their beat and grab anyone they watch for long enough.
    for (let k = 0; k < world.guards.length; k++) {
      stepGuard(world, level, k);
      const down = world.guards[k].down > t;
      for (let i = 0; i < thieves.length; i++) {
        const th = thieves[i];
        if (th.caught) continue;
        if (!down && !outside(level, th) && guardSees(world, level, k, th)) {
          if (++th.sus[k] >= GUARD_NOTICE) catchThief(world, level, i, level.guards[k].name);
        } else {
          th.sus[k] = 0;
        }
      }
    }

    // Cameras and lasers only matter while the power is on.
    const powered = isPowered(world);
    for (let k = 0; k < level.cameras.length; k++) {
      const cam = level.cameras[k];
      const f = cameraFacing(cam, t);
      world.cams[k].fx = f[0];
      world.cams[k].fy = f[1];
      for (let i = 0; i < thieves.length; i++) {
        const th = thieves[i];
        if (th.caught) continue;
        if (powered && !outside(level, th) && sees(world, level, cam.x, cam.y, f[0], f[1], cam.range, CAM_COS, th.x, th.y)) {
          if (++th.cam[k] >= CAM_NOTICE) raiseAlarm(world, cam.name, th);
        } else {
          th.cam[k] = 0;
        }
      }
    }
    if (powered) {
      for (let n = 0; n < level.lasers.length; n++) {
        for (let i = 0; i < thieves.length; i++) {
          const th = thieves[i];
          if (!th.caught && touchesLaser(th, level.lasers[n])) raiseAlarm(world, level.lasers[n].group, th);
        }
      }
    }

    if (world.alarmAt >= 0 && t >= world.alarmAt + POLICE_DELAY) {
      for (let i = 0; i < thieves.length; i++) {
        if (!thieves[i].caught && !outside(level, thieves[i])) catchThief(world, level, i, 'police');
      }
      event(world, 'police', { x: level.spawn.x, y: level.spawn.y - 3 });
      world.over = true;
      world.endReason = 'police';
    }

    world.tick = t + 1;
    if (!world.over && world.tick >= RUN_TICKS) {
      world.over = true;
      world.endReason = 'time';
    }
  }

  // After you're caught you keep playing as a ghost. Your moves are still
  // recorded, and if a later day saves this thief, they follow the ghost's route.
  // The ghost walks like a thief but touches nothing and nobody sees it.
  function createGhost(th) {
    return { x: th.x, y: th.y, fx: th.fx, fy: th.fy, speed: 1 };
  }

  function moveGhost(world, level, ghost, code) {
    const dir = (code | 0) % 9;
    if (dir) moveThief(world, level, ghost, dir, THIEF_SPEED * ghost.speed);
  }

  // Direction code that heads toward (dx, dy): diagonal until one axis lines up.
  function dirToward(dx, dy, slack) {
    const s = slack === undefined ? 0.04 : slack;
    const sx = dx > s ? 1 : dx < -s ? -1 : 0;
    const sy = dy > s ? 1 : dy < -s ? -1 : 0;
    return DIR_FROM_SIGNS[(sy + 1) * 3 + (sx + 1)];
  }
  // Indexed by (sy+1)*3 + (sx+1).
  const DIR_FROM_SIGNS = [8, 1, 2, 7, 0, 3, 6, 5, 4];

  FT.sim = {
    TICK_HZ,
    RUN_TICKS,
    HALF,
    GUARD_RANGE,
    GUARD_COS,
    CAM_COS,
    KO_TICKS,
    POWER_CUT_TICKS,
    POLICE_DELAY,
    DIRS,
    DIR_FROM_SIGNS,
    createWorld,
    step,
    createGhost,
    moveGhost,
    blocked,
    tileAt,
    outside,
    isPowered,
    cameraFacing,
    dirToward,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
