# Forty Thieves

**One heist. Forty days. Every thief is you.**

A playable prototype of the top idea in [`../IDEAS.md`](../IDEAS.md). You get one 60-second run on the Grand Meridian Bank each day. Every earlier day's run replays next to you, move for move, so by day 40 you're pulling off a heist with forty past versions of yourself, planned one day at a time.

## Play

Open `index.html` in a browser. There is no build step and nothing to install.

- **Move:** WASD or the arrow keys, or drag the joystick on a touch screen.
- **Act:** Space, or the Act button. Act picks up and drops loot, pulls the power lever, and knocks out a guard if you reach him from behind.
- **Stop:** Esc, or Stop pressed twice. You stop moving and the rest of the heist fast-forwards.

## The rules

- **One run a day, no retries.** A run counts from the moment it starts, and it's saved as you play.
- **Your past selves repeat exactly what you did.** You can't change their moves, but you can change what happens to them. Knock out the guard who caught Day 3 and Day 3 walks free.
- **Ghost mode.** If you're caught, keep moving. Your moves are still recorded. If a later day saves that thief, they carry on along your ghost's route.
- **Empty chairs.** Skip a day and your crew is one thief short for the rest of the heist.
- **Guards** grab anyone who stays in their cone for about a third of a second. A knockout lasts 12 seconds, and a crew can chain them to keep a guard down.
- **The camera and the lasers** raise the alarm when the power is on. Police arrive 10 seconds later and the heist ends for everyone.
- **The lever** cuts the power for 10 seconds, and pulling it again extends the cut.
- **Plates** open the door with their letter while someone stands on one. The vault needs both of its plates held at the same moment, then stays open.
- **Loot** only counts once it's in the van. Gold is heavy and slows you down.

The title screen plays an example crew, nine days in, that pulls off the diamond job.

## Prototype shortcuts

- **Skip to tomorrow** appears after your run, so you can play several days in one sitting. Before a run, **Skip today** leaves an empty chair.
- The menu has **backup codes** for copying a season to another browser or device, and **Start over**.
- Progress lives in `localStorage` for this browser. The daily lock runs on the device, so it works on the honor system.

## Develop

```sh
npm test          # node --test: the simulation, replays, and the example crew
npm run build     # dist/forty-thieves.html: one self-contained file with no external scripts
```

Requires Node 18 or later for the tests and the build. The game itself is plain browser JavaScript.

| File | What it does |
|---|---|
| `src/level.js` | The bank map (ASCII) plus guards, the camera, lasers, doors and loot |
| `src/sim.js` | The deterministic simulation: fixed 60 Hz steps, and no randomness or trig, so a run replays identically |
| `src/timeline.js` | Input tapes (run-length encoded), whole-heist replays with scrubbing, results, briefings, share text |
| `src/autopilot.js` | Records a run from a written plan. Used by the tests and the example crew |
| `src/demo.js` | The example crew's nine plans |
| `src/main.js` | Screens, the daily loop, the live run and ghost mode |
| `src/render.js` | The blueprint renderer (canvas) |
| `src/input.js`, `src/audio.js`, `src/storage.js` | Controls, sound cues, saves and backup codes |

A run is stored as one input code per tick (a direction plus an optional Act press), run-length encoded, which comes to a few hundred bytes per day. Replaying a heist re-simulates every thief together from their tapes, so a change made by a later day spreads to earlier days on its own.

## Next ideas

- A shared global map each season so friends can compare heists, like Wordle grids.
- Crew mode: 3–4 friends share a map and the crew grows by four a day.
- A finale video export: the whole heist, all forty of you, as one clip.
- A server-side daily lock and saves, plus more maps and tuning.
