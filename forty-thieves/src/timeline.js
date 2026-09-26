/* Forty Thieves: whole-heist replays, results, and the words we show about them. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});
  const sim = FT.sim;

  const CHECKPOINT_EVERY = 30;
  const PATH_EVERY = 6;

  function clone(v) {
    return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
  }

  // ---- Input tapes (run-length encoded per-tick codes) ----

  function encodeTape(codes, length) {
    const parts = [];
    let i = 0;
    while (i < length) {
      const c = codes[i];
      let n = 1;
      while (i + n < length && codes[i + n] === c) n++;
      parts.push(c.toString(36) + '.' + n.toString(36));
      i += n;
    }
    return parts.join(',');
  }

  function decodeTape(str) {
    const codes = new Uint8Array(sim.RUN_TICKS);
    if (!str) return codes;
    let i = 0;
    const parts = str.split(',');
    for (let p = 0; p < parts.length && i < codes.length; p++) {
      const dot = parts[p].indexOf('.');
      const c = parseInt(parts[p].slice(0, dot), 36);
      const n = parseInt(parts[p].slice(dot + 1), 36);
      if (!(c >= 0 && c <= 17) || !(n > 0)) continue;
      codes.fill(c, i, Math.min(codes.length, i + n));
      i += n;
    }
    return codes;
  }

  // ---- Simulating a whole crew ----

  // crew: [{ day, codes: Uint8Array(RUN_TICKS) }], sorted by day.
  function simulate(level, crew) {
    const world = sim.createWorld(level, crew.map((c) => c.day));
    const checkpoints = [];
    const paths = crew.map(() => []);
    const codes = new Uint8Array(crew.length);
    while (!world.over) {
      const t = world.tick;
      if (t % CHECKPOINT_EVERY === 0) checkpoints.push(clone(world));
      if (t % PATH_EVERY === 0) {
        for (let i = 0; i < crew.length; i++) {
          const th = world.thieves[i];
          if (!th.caught) paths[i].push(th.x, th.y);
        }
      }
      for (let i = 0; i < crew.length; i++) codes[i] = crew[i].codes[t];
      sim.step(world, level, codes);
    }
    return { crew, final: world, checkpoints, paths, endTick: world.tick };
  }

  // Scrubbable playback of a simulated heist.
  function Player(level, result) {
    this.level = level;
    this.result = result;
    this.codes = new Uint8Array(result.crew.length);
    this.world = clone(result.checkpoints[0]);
  }
  Player.prototype.seek = function (tick) {
    const r = this.result;
    const target = Math.max(0, Math.min(tick | 0, r.endTick));
    if (target < this.world.tick || target - this.world.tick > CHECKPOINT_EVERY * 2) {
      const idx = Math.min(Math.floor(target / CHECKPOINT_EVERY), r.checkpoints.length - 1);
      this.world = clone(r.checkpoints[idx]);
    }
    while (this.world.tick < target && !this.world.over) {
      for (let i = 0; i < r.crew.length; i++) this.codes[i] = r.crew[i].codes[this.world.tick];
      sim.step(this.world, this.level, this.codes);
    }
    return this.world;
  };

  // ---- Reading a finished heist ----

  function clock(t) {
    const s = Math.floor(t / sim.TICK_HZ);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function money(v) {
    return '$' + Math.round(v).toLocaleString('en-US');
  }

  function summarize(level, world) {
    const fates = world.thieves.map((th) => ({
      day: th.day,
      caught: th.caught,
      caughtAt: th.caughtAt,
      caughtBy: th.caughtBy,
      banked: th.banked,
      kos: th.kos,
      pulls: th.pulls,
      plateTicks: th.plateTicks,
    }));
    const left = [];
    world.loot.forEach((l, n) => {
      if (!l.banked) left.push(n);
    });
    const vault = level.doors.findIndex((d) => d.latch);
    return {
      haul: world.haul,
      total: level.totalValue,
      fates,
      alarm: world.alarmAt >= 0 ? { t: world.alarmAt, day: world.alarmBy.day, cause: world.alarmBy.cause } : null,
      endTick: world.tick,
      endReason: world.endReason,
      vaultOpen: vault >= 0 && world.doors[vault].latched,
      powerCut: world.events.some((e) => e.type === 'power'),
      left,
      events: world.events,
    };
  }

  function fateOf(summary, day) {
    return summary.fates.find((f) => f.day === day) || null;
  }

  // What changed between the heist without today's thief and with it.
  function compare(before, after, today) {
    const notes = [];
    const alarmGone = before.alarm && !after.alarm;
    after.fates.forEach((a) => {
      if (a.day === today) return;
      const b = fateOf(before, a.day);
      if (!b) return;
      if (b.caught && !a.caught && !(alarmGone && b.caughtBy === 'police')) {
        notes.push({ tone: 'good', text: 'You saved Day ' + a.day + ' from the ' + b.caughtBy + '.' });
      } else if (!b.caught && a.caught) {
        notes.push({ tone: 'bad', text: 'Day ' + a.day + ' got caught by the ' + a.caughtBy + ' at ' + clock(a.caughtAt) + ' because of something you did.' });
      }
    });
    if (alarmGone) {
      notes.unshift({ tone: 'good', text: 'You undid the alarm Day ' + before.alarm.day + ' set off at ' + clock(before.alarm.t) + '. The police never come.' });
    } else if (!before.alarm && after.alarm) {
      const who = after.alarm.day === today ? 'You' : 'Day ' + after.alarm.day;
      notes.unshift({ tone: 'bad', text: who + ' set off the alarm (' + after.alarm.cause + ') at ' + clock(after.alarm.t) + '. Police arrive 10 seconds later, in every heist from now on, until someone fixes it.' });
    } else if (before.alarm && after.alarm && after.alarm.t !== before.alarm.t) {
      const later = after.alarm.t > before.alarm.t;
      notes.unshift({ tone: later ? 'good' : 'bad', text: 'The alarm now goes off at ' + clock(after.alarm.t) + ' instead of ' + clock(before.alarm.t) + '.' });
    }
    if (!before.vaultOpen && after.vaultOpen) notes.push({ tone: 'good', text: 'The vault door is open.' });
    const delta = after.haul - before.haul;
    const mine = fateOf(after, today);
    if (mine && delta > mine.banked) {
      notes.push({ tone: 'good', text: 'The rest of the crew banks ' + money(delta - mine.banked) + ' more with you in the heist.' });
    }
    return notes;
  }

  // A few pointers about the current plan, shown before a run.
  function briefing(level, summary, day) {
    const tips = [];
    if (summary.alarm) {
      const fix = summary.alarm.cause.indexOf('camera') >= 0 || summary.alarm.cause.indexOf('laser') >= 0
        ? ' Pull the power lever before then to stop it.'
        : '';
      tips.push({ tone: 'bad', text: clock(summary.alarm.t) + ' Day ' + summary.alarm.day + ' sets off the alarm (' + summary.alarm.cause + '). Police arrive at ' + clock(summary.alarm.t + sim.POLICE_DELAY) + ' and the heist ends.' + fix });
    }
    summary.fates
      .filter((f) => f.caught && f.caughtBy !== 'police')
      .sort((a, b) => a.caughtAt - b.caughtAt)
      .slice(0, 2)
      .forEach((f) => {
        tips.push({ tone: 'bad', text: clock(f.caughtAt) + ' Day ' + f.day + ' is caught by the ' + f.caughtBy + '. Knock that guard out first to save them.' });
      });
    if (day >= 2 && !summary.vaultOpen) {
      tips.push({ tone: 'info', text: 'The vault opens when two thieves stand on its two plates at the same moment. It stays open after that.' });
    }
    if (!summary.powerCut) {
      tips.push({ tone: 'info', text: 'The lever in the security office cuts the power for 10 seconds: no cameras, no lasers.' });
    }
    if (day === 1) {
      tips.unshift({ tone: 'info', text: 'Grab what you can and bring it to the van. Tomorrow this run replays next to you.' });
    }
    const leftValue = summary.left.reduce((s, n) => s + level.loot[n].value, 0);
    if (leftValue > 0 && tips.length < 4) {
      tips.push({ tone: 'info', text: money(leftValue) + ' is still inside the bank.' });
    }
    return tips.slice(0, 4);
  }

  function fateLine(level, f) {
    const bits = [];
    if (f.banked) bits.push('banked ' + money(f.banked));
    if (f.kos) bits.push('knocked out ' + (f.kos === 1 ? 'a guard' : f.kos + ' guards'));
    if (f.pulls) bits.push('cut the power' + (f.pulls > 1 ? ' ×' + f.pulls : ''));
    if (f.plateTicks >= sim.TICK_HZ) bits.push('held a plate ' + Math.round(f.plateTicks / sim.TICK_HZ) + 's');
    if (f.caught) bits.push('caught at ' + clock(f.caughtAt) + (f.caughtBy === 'police' ? ' by the police' : ' by the ' + f.caughtBy));
    return bits.length ? bits.join(' · ') : 'kept out of trouble';
  }

  function fateMark(f) {
    if (!f) return 'empty';
    if (f.caught) return 'caught';
    if (f.banked > 0) return 'banked';
    return 'free';
  }

  function shareText(level, summary, day, seasonDays) {
    const marks = { banked: '🟩', free: '🟨', caught: '🟥', empty: '⬛' };
    let grid = '';
    for (let d = 1; d <= day; d++) grid += marks[fateMark(fateOf(summary, d))];
    return [
      'Forty Thieves · Day ' + day + '/' + seasonDays,
      'The take: ' + money(summary.haul) + ' of ' + money(level.totalValue),
      grid,
    ].join('\n');
  }

  FT.timeline = {
    CHECKPOINT_EVERY,
    PATH_EVERY,
    clone,
    encodeTape,
    decodeTape,
    simulate,
    Player,
    summarize,
    compare,
    briefing,
    fateLine,
    fateMark,
    fateOf,
    shareText,
    clock,
    money,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
