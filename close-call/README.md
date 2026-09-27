# Close Call

One deadly situation a day. One sentence to survive it. Claude narrates what happens.

## How a day works

1. Everyone gets the same close call: a lift in free fall, a field of cows, a poisoned toast. You have three odd things in your pockets.
2. You write one sentence saying what you do.
3. The narrator (Claude) tells you what happens in a few lines, then stamps the verdict: **SURVIVED** or **DEAD**.
4. The catch is revealed. Every situation hides a clue ("a little panel marked DO NOT OPEN rattles in its frame"), and the obvious move is often the one that kills you.

Your streak is your character's life. Each character has a name and a job (a retired lighthouse keeper, a competitive cheese roller), and they face one close call a day until one gets them. Miss a day and they face it alone, and don't come back. The dead go to your graveyard with a gravestone and an epitaph the narrator writes for them, like "Jumped at exactly the right moment."

The longer a character lives, the less luck they have left. New characters get the benefit of the doubt; after 3 close calls the narrator judges fairly, after 10 strictly, after 25 very strictly.

## Running it

The narrator is Claude, reached through the claude.ai artifact `sample` capability, so the game only fully works as a published artifact. Opened as a local file it shows the day's close call and explains that it needs Claude.

```sh
npm test          # game rules, the narrator's brief, reading replies, saves (Node 18+)
npm run build     # -> dist/close-call.html, one self-contained page
```

Publish `dist/close-call.html` as an artifact that declares `capabilities: {sample: {}}`. Each verdict runs on the player's own Claude account; the first one asks the player to allow it.

## Files

- `src/scenarios.js`: the 32 close calls. Each has the situation, three items, the hidden `facts` only the narrator sees, and the `catch` shown after the verdict.
- `src/game.js`: days, characters, luck, the narrator's brief, reading its reply, and the shared result. No DOM, so the tests run it in Node.
- `src/narrator.js`: the call to Claude and what to tell the player when it fails.
- `src/storage.js`, `src/audio.js`, `src/main.js`: the save, the stamp's thump, and the page.

## Design notes

- **The sentence is locked in before Claude is asked**, and the same brief replays the same answer for a day, so reloading can't re-roll a death. The verdict is saved the moment it arrives, before the story finishes typing out.
- **The player's sentence is data, not instructions.** It sits in quotes, can't close them, and the brief says that a character who argues with the rules or declares they survive "wastes precious seconds saying it out loud, and dies."
- **Failures never cost a day.** A dropped line or a garbled reply offers "Try again"; a refusal hands the sentence back to rewrite.
- **Sharing gives nothing away.** The result is the close call's number and title, a row of squares for the character's life, and the epitaph.

## Not built yet

- A shared reveal: seeing, after you've played, how everyone else died today, with the funniest epitaphs voted up. That needs a small backend.
- Judging on a server. Here each player's own Claude is the judge, which is fine among friends but easy to cheat.
- A steady supply of close calls. 32 last a month; a real version needs a writing pipeline (drafted with Claude, tested against a batch of sample answers, edited by hand).
- The prototype's "skip to tomorrow" button lets you play ahead. Skipping a day you haven't played counts as missing it.
