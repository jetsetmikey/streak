/* Forty Thieves: records a run from a written plan instead of a player.
 * Used by the tests and to build the example crew on the title screen. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});
  const sim = FT.sim;

  // A caught thief keeps following the plan as a ghost, exactly like a player would.
  // Plan steps:
  //   [x, y]          walk to a point (straight or diagonal legs, so pick points in open lanes)
  //   'act'           press the action button once
  //   { until: t }    stand still until tick t
  //   { wait: n }     stand still for n ticks
  //   { every: n, times: k }  press action k times, n ticks apart (e.g. keep the power off)
  //   { near: fn, within: d } walk toward fn(world) -> [x, y] until within d (e.g. follow a guard)
  //   { when: fn }    stand still until fn(world) is true
  function record(level, crew, day, plan) {
    const all = crew.concat([{ day, codes: new Uint8Array(sim.RUN_TICKS) }]);
    const me = all.length - 1;
    const tape = all[me].codes;
    const world = sim.createWorld(level, all.map((c) => c.day));
    const codes = new Uint8Array(all.length);
    let s = 0;
    let waitUntil = -1;
    let repeats = 0;
    let length = 0;
    let ghost = null;

    while (!world.over) {
      const t = world.tick;
      const real = world.thieves[me];
      if (real.caught && !ghost) {
        ghost = sim.createGhost(real);
        ghost.speed = real.caughtCarry;
      }
      const th = ghost || real;
      let code = 0;
      while (s < plan.length) {
        const step = plan[s];
        if (Array.isArray(step)) {
          const dx = step[0] - th.x;
          const dy = step[1] - th.y;
          if (Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08) {
            s++;
            continue;
          }
          code = sim.dirToward(dx, dy);
        } else if (step === 'act') {
          code = 9;
          s++;
        } else if (step.until !== undefined) {
          if (t >= step.until) {
            s++;
            continue;
          }
        } else if (step.wait !== undefined) {
          if (waitUntil < 0) waitUntil = t + step.wait;
          if (t >= waitUntil) {
            waitUntil = -1;
            s++;
            continue;
          }
        } else if (step.near) {
          const p = step.near(world);
          const dx = p[0] - th.x;
          const dy = p[1] - th.y;
          if (dx * dx + dy * dy <= step.within * step.within) {
            s++;
            continue;
          }
          code = sim.dirToward(dx, dy);
        } else if (step.when) {
          if (step.when(world)) {
            s++;
            continue;
          }
        } else if (step.every !== undefined) {
          if (waitUntil < 0 || t >= waitUntil) {
            code = 9;
            repeats++;
            waitUntil = t + step.every;
            if (repeats >= step.times) {
              repeats = 0;
              waitUntil = -1;
              s++;
            }
          }
        }
        break;
      }
      tape[t] = code;
      if (s < plan.length || code) length = t + 1;
      for (let i = 0; i < all.length; i++) codes[i] = all[i].codes[t];
      sim.step(world, level, codes);
      if (ghost) sim.moveGhost(world, level, ghost, code);
    }
    return { day, codes: tape, length };
  }

  FT.autopilot = { record };
})(typeof globalThis !== 'undefined' ? globalThis : this);
