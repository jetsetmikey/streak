/* Forty Thieves: the example crew on the title screen, nine days into a heist.
 * Each day is a written plan recorded through the real simulation, so it
 * stays in step with the map. */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

  const LOBBY = 0;
  const HALL = 1;
  const VAULT = 2;

  // Wait for guard k to wake up, then knock him straight back out. n times.
  function keepDown(k, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ when: (w) => w.guards[k].down <= w.tick }, 'act');
    return out;
  }
  function behind(k) {
    return { near: (w) => [w.guards[k].x + 0.95, w.guards[k].y + (k === LOBBY ? 0.3 : 0)], within: 0.12 };
  }
  function beside(k, dy) {
    return { near: (w) => [w.guards[k].x, w.guards[k].y + dy], within: 0.08 };
  }
  const toVan = [[5, 12.5], [5, 17.5], [10, 17.5], [10, 20.5]];

  const PLANS = [
    // Day 1: sneak past the corridor camera and keep the power off.
    [[10, 17.5], [15, 17.5], [15, 14.5], { until: 288 }, [15, 12.5], [17, 10.5], [17, 8.5], [16.5, 7.5], [16.5, 4.5], [16.5, 3.5], [17.5, 3], { every: 540, times: 7 }],
    // Day 2: follow the lobby guard and keep him down.
    [[10, 17.5], behind(LOBBY), 'act', beside(LOBBY, 1)].concat(keepDown(LOBBY, 5)),
    // Day 3: the hall guard gets the same treatment.
    [[10, 17.5], [15, 17.5], [15, 14.5], { until: 228 }, [15, 12.5], behind(HALL), 'act', beside(HALL, -1)].concat(keepDown(HALL, 5)),
    // Day 4: hold the hall door open for everyone else.
    [[10, 17.5], [15, 17.5], [15, 14.5], { until: 240 }, [15, 12.5], [7, 12.5], [6.5, 10.5], { until: 3600 }],
    // Day 5: slip in through the gallery and sit on the vault guard.
    [[10, 17.5], [5, 17.5], [5, 12.5], [3, 10.5], [3, 7.5], [6.5, 7.5], [6.5, 6.5], [9, 6.5], 'act'].concat(keepDown(VAULT, 4)),
    // Day 6: west vault plate, then a painting while the lasers are off.
    [[10, 17.5], [5, 17.5], [5, 12.5], [10, 12.5], [10, 10.5], { until: 300 }, [10, 8.5], [6.5, 8.5], { until: 1200 },
      [6.5, 7.5], [4.5, 7.5], [4.5, 5.2], 'act', [4.5, 7.5], [3, 7.5], [3, 10.5], [5, 12.5], [5, 17.5], [10, 17.5], [10, 20.5]],
    // Day 7: east vault plate at the same moment. The vault opens. Gold.
    [[10, 17.5], [15, 17.5], [15, 14.5], { until: 480 }, [15, 12.5], [17, 10.5], [17, 7.5], [13.5, 7.5], [13.5, 8.5], { wait: 10 },
      [13.5, 7.5], [10, 6.5], [10, 4.5], [12.5, 4.5], [12.5, 3.5], 'act', [12.5, 4.5], [10, 4.5], [10, 12.5]].concat(toVan),
    // Day 8: the Meridian Diamond.
    [[10, 17.5], [5, 17.5], [5, 12.5], [10, 12.5], [10, 10.5], { until: 300 }, [10, 8.5], [10, 4.5], [10, 3.2], 'act', [10, 4.5], [10, 12.5]].concat(toVan),
    // Day 9: more gold.
    [[10, 17.5], [5, 17.5], [5, 12.5], [10, 12.5], [10, 10.5], { until: 300 }, [10, 8.5], [10, 4.5], [7.5, 4.5], [7.5, 3.5], 'act', [7.5, 4.5], [10, 4.5], [10, 12.5]].concat(toVan),
  ];

  let cached = null;

  function build(level) {
    if (cached) return cached;
    const crew = [];
    PLANS.forEach((plan, i) => {
      const rec = FT.autopilot.record(level, crew, i + 1, plan);
      crew.push({ day: rec.day, codes: rec.codes });
    });
    cached = crew;
    return crew;
  }

  FT.demo = { build, days: PLANS.length };
})(typeof globalThis !== 'undefined' ? globalThis : this);
