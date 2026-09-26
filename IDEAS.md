# Streak: idea book

Concepts for a streak-based app or game that people can't put down. Each one tries to be new, not just "Duolingo with a different mascot."

---

## The problem with streaks, and five fixes

Most streak products fail in the same five ways. Every idea below is built to avoid at least two of them.

| # | The usual failure | The fix |
|---|---|---|
| 1 | **The streak is just a number.** The only feeling it gives you is fear of losing it. | Make the streak a *thing* that grows and does something: a crew, a creature, a song, a map. |
| 2 | **The only motivator is guilt.** You're letting yourself down, and that gets old. | Make **other people** depend on it. Owing someone is stronger than guilt; that's what makes Snapchat streaks work. |
| 3 | **A broken streak is a funeral.** The moment the chain breaks is exactly when people quit (the "what-the-hell effect"). | Make the break *interesting*: it becomes content, it gets adopted, or a stand-in takes over. |
| 4 | **The daily action is a chore.** You tap a button to keep a number alive. | Make it something you **think about in the shower**, a puzzle or plan that follows you around all day. |
| 5 | **Unlimited play kills anticipation.** | **One shot a day.** Wordle's real lesson is that the game you *can't* keep playing is the one you think about most. |

Being unputdownable doesn't require long sessions. What matters is that the game stays on your mind between sessions.

---

## Top picks

### 1. FORTY THIEVES
> **One heist. Forty days. Every thief is you.**

**How a day works**
- Each season is one heist map: a museum, a casino, a moon-base vault.
- Open the app and watch your crew so far. Every previous day's run replays together on the map. You can watch it as often as you like, scrub back and forth, and plan.
- When you're ready, you get **one live, 60-second run. No retries.** It's recorded.
- Tomorrow, that run joins the crew and replays alongside everything before it.

**How a season plays out**
- **Day 1:** you're alone and can't do much. You slip past a guard and stand on a pressure plate that opens the east door at 0:14.
- **Day 2:** Day-1-you opens the door at 0:14, so you sprint through it and cut the cameras at 0:31.
- **Day 17:** nine of you keep the guards busy while four of you form a relay chain passing the diamond out through the air vent.
- **Day 40:** the whole heist plays out, forty of you moving together, following a plan you wrote one day at a time.

**The twist: the past is locked.** Past runs replay input for input. You can't change what your past selves *did*, but you can change *what happens to them*. Say Day-12-you walked into a laser at 0:47. The alarm goes off at 0:47 in every run from then on, unless a later you cuts the power to the lasers first. You spend the season building the plan and cleaning up after yourself.

**Why you can't put it down**
- One shot a day means you rehearse tomorrow's run in your head all day.
- Every run is permanent, so every run matters. There's no grind.
- Consistency compounds *visibly*. Your streak is your crew, and you can watch it work for you.
- It's funny. Day-6-you runs face-first into a wall every single day for the rest of the season.

**When you miss a day:** there's an empty chair, a thief who never showed up. Nothing resets. The plan has a hole and you route around it, which hurts enough to matter but not enough to make you quit. Maps need about 30 thieves for a perfect score, so there's slack for missed days and bad runs.

**The shareable:** the finale renders the whole heist as one 60-second replay with all forty of you. The clip explains the game without any words.

**Social modes**
- **Crew:** 3–4 friends share a map. The crew grows by four a day, and everyone's mistakes are everyone's problem.
- **Global map:** everyone plays the same heist each season, so you can compare plans the way people compare Wordle grids, only stretched over 40 days.

**Design notes and risks**
- The simulation must be deterministic: fixed timestep, seeded RNG, per-tick input recording, and every thief re-simulated together on each run. This is easy in a 2D web engine.
- Levels must survive missed days and chaotic early runs. Objectives need redundancy, meaning more than one way to open each door.
- Controls must suit mobile: top-down view, tap to move or drag a path.
- 40 days is a long first season. Start with 7-day "Jobs" and unlock 40-day "Heists."

---

### 2. THE UNDERSTUDY
> **Miss a day and an AI version of you plays instead. Your friends vote on who's funnier.**

**How a day works**
- Once a day, at a random time, your friend group gets the same prompt: *"Worst name for a boat." "Caption this photo." "Explain Titanic badly." "Draw a horse in 10 seconds."*
- Everyone answers. The answers are revealed together, everyone votes, and there's a daily winner and a group leaderboard.

**The twist: no seat is ever empty.** If you don't answer in time, your **Understudy** answers for you. It's an AI that has studied every answer you've ever given and does its best impression of you. Its answer appears under your name with a small 🎭 mask.

The pressure isn't "don't lose your streak." It's **"don't let the robot be funnier than you."**
- If your Understudy wins the vote, the trophy goes on *your* profile.
- If it wins three times in a row, it gets promoted. It answers alongside you every day until you beat it in a head-to-head vote and win your seat back.
- **Masquerade Fridays:** all answers are posted without masks, some human and some Understudy. You score points for spotting who's real. It's a Turing test run on your friends' sense of humor.

**Why you can't put it down**
- Voting and social comparison give a small unpredictable reward every day.
- The threat to your identity beats any number. Losing your spot to a bot that's better at being you is unbearable, and hilarious.
- It fixes what kills every group-chat game: when one person drops out, the game usually dies. Here the table is always full.

**When you miss a day:** there's no reset. Your record shows human days next to Understudy days. The shame is funny, not punishing, so missing a day doesn't make people quit.

**The shareable:** screenshots of Understudy answers that are *too* accurate. "My Understudy just roasted me better than anyone ever has."

**Design notes and risks**
- The mimicry has to be good quickly: give the model a few of your past answers plus group context. Tune it to be slightly worse than you on average, so humans usually win, but occasionally brilliant.
- Consent and privacy: an Understudy learns only from your answers inside that group, and you can opt out.
- Prompts and answers need moderation.

---

### 3. FIRST LIGHT
> **One streak for the whole planet. Keep the sunrise caught.**

Every 15 minutes, somewhere on Earth, the sun is coming up. The world's shared job is to have someone there to catch it, every 15 minutes, forever, with no gaps.

**How a day works**
- Within about 15 minutes of your local sunrise, open the app and **catch the light**: point your camera at the sky. The app checks the time, your location, and that the photo shows a dawn sky. Cloudy mornings count; it's the light that matters, not the sun.
- Your catch lights up a dot on the globe. The home screen shows the planet with the day/night line sweeping west, a trail of today's catches behind it, and a counter: **"The sun has been caught 412 days in a row."**

**The twist: one streak owned by everyone, with a map.** The day is split into 96 fifteen-minute slots, and each needs at least one catch. Slots over Western Europe, India and the US East Coast are easy. Slots over the mid-Pacific, the Azores and the Aleutians are where legends are made. Expect the community to recruit sailors, adopt remote islanders, and fly someone out to Pitcairn Island. "Pacific Watch" becomes a job title.

You keep three streaks at once: **yours, your slot's, and the world's.** Your personal streak survives a global break, but everyone will know which slot broke it.

**Why you can't put it down**
- Being personally and visibly responsible for a slice of something global, *the reason it didn't break*, is intoxicating.
- Being the slot that broke it is unthinkable: the whole group has something to lose.
- It's a habit people are proud of: morning light, getting up early, stepping outside.
- Every global break becomes a story: *"The Great Azores Gap of '27."*

**The shareable:** every day, the app stitches the day's catches into one time-lapse, the sunrise traveling around the planet as filmed by thousands of strangers. There's a new reel every day.

**Variant:** **Last Light**, a sunset relay for night owls, chasing the dawn around the world twelve hours behind it.

**Design notes and risks**
- **Cold start is the big one.** With few players, the world streak breaks constantly. The fix is to launch with automated "beacon buoys" covering every slot and switch them off one by one as real people take over. The falling buoy count becomes the launch story.
- Near the poles, where the sun doesn't rise for weeks, players become "Watchers" with support roles.
- Stopping fake photos takes time, location, a sky classifier and reputation, plus a culture where the honor system means something.

---

## More strong contenders

### 4. ANTIPODE
> **A creature that never sleeps, raised by you and a stranger on the other side of the world.**

- You're paired with someone about 12 time zones away. Together you raise a creature that needs someone awake with it at all times. It lives with you during your day and with them during theirs. Twice a day there's a handoff, because your evening is their morning.
- **You can't message each other.** The creature is the only channel. You feed it by photographing your meals. You show it your sky, your street, your music. It carries all of that to the other side of the world. It picks up words from both your languages and speaks a strange mix of the two.
- Over the weeks it becomes a **blend of two lives**: its colors, diet, vocabulary and habits drift toward both of yours.
- **Why it hooks:** owing something to a real person is the strongest streak fuel there is. Every handoff is a small gift: what did it bring back this time? And there's a slow-building closeness with someone you'll probably never meet.
- **When you miss a handoff:** the creature waits by the door, and your partner can see it waiting. Miss three and it goes looking for a new home, and your partner gets re-paired.
- **Unlock:** on day 100 you can send your partner exactly one real sentence.
- **Safety:** no free text, moderated photos, and locations shown only at city level.

### 5. DON'T LOOK
> **A garden that only grows when you're not watching.**

- Your garden grows only while nobody is looking at it. Look, and it freezes. Growth speeds up the longer you stay away: one day grows moss, a week grows a forest full of creatures you've never seen, a month grows something with its own weather.
- The streak is inverted. It counts days you **didn't** look.
- **The cruel part:** your friends *can* see your garden. You can't, unless you look and freeze it. So they tell you about it: *"Oh my god. You need to see what's in your garden." "Actually, don't look yet. It's about to hatch."*
- You still open the app every day, to visit friends' gardens, tease them, and **plant surprises in them that they can't see yet**. Gifts pile up unseen.
- **Why it hooks:** anticipation is the strongest part of any reward, and this app is nothing but anticipation. Your friends use your curiosity against you. When you finally look, the payoff is huge, and you picked the moment.
- **The shareable:** the reveal. "I didn't look for 30 days. This is what grew."
- As a bonus, it's accidentally a digital-wellbeing app: the one addictive app that wants you to look *less*.

### 6. FOSSIL RECORD
> **Every broken streak becomes a fossil. Digging them up is the game.**

- You raise a creature that grows with your streak. When the streak breaks, the creature dies and is **buried in a shared world**. Its size and rarity depend on how long you kept it alive.
- Everyone gets **one dig a day**, a small excavation puzzle: brush, chisel, don't crack it. You dig up *other people's* dead streaks. A 3-day streak is a trilobite. A 500-day streak is a Tyrannosaurus. Each fossil carries its keeper's name and dates.
- Your museum fills with other people's failures, and your failure becomes someone else's treasure: *"Your 212-day Ankylosaur was excavated in Mumbai."*
- **Why it hooks:** two loops feed each other (keep your creature alive, and dig every day), every dig is a surprise, and there's a collection to fill. A long streak dying is now the best thing you can give the world.
- The creature can stand for any habit you track: workouts, a language, anything.

### 7. JINX
> **A streak you can only keep by doing it at exactly the same moment as a friend.**

- Once a day, you and a friend each tap. It only counts if you tap at the same moment, and "the same moment" gets tighter as the streak grows: **10 seconds on day 1, 1 second by day 30, a tenth of a second by day 100.**
- You'll end up on FaceTime counting "3… 2… 1…" together. That's the point: this streak forces one real moment of contact a day.
- **Groups:** everyone has to land inside the window. Each day you sync adds a chord to your group's song, which you can play back.
- **Why it hooks:** most streaks get *easier* as the habit forms, which is exactly when they get boring. This one gets harder. Near misses are their own hook: "we missed by 0.04 seconds."
- **When you miss:** the window loosens a little instead of resetting. Long streaks are legendary because they're genuinely hard to keep.

---

## Quick hits

- **ONE NOTE.** Add one note a day to a melody, then play the whole thing back from memory. A year in, you've written and memorized a 365-note song. The streak lives in your head, so it can't be faked. In duet mode, you and a friend alternate notes.
- **MOSAIC.** A friend secretly uploads a photo. The group gets a few pieces a day to place, and the first to guess the picture wins. It works well as a 30-day birthday reveal. Global mode: a year-long mystery image with a million pieces, one per player per day.
- **TELEPHONE.** Each day you copy a 3-second gesture, hum or doodle from a stranger, and your version goes to the next person. Check back to watch last week's thumbs-up turn into a chicken dance by the time it reaches Brazil.
- **STREAK ROYALE.** 100 players, and a daily puzzle that gets harder every day. Miss a day or fail and you're out. Knocked-out players become sponsors who can send hints to survivors, so nobody stops watching.
- **SIGNAL.** A stranded AI character radios you once a day from a real place with that place's real weather. Their journey takes real days. Miss a day and they decide without you. Death is permanent.

---

## Mechanics you can bolt onto anything

- **Orphanage.** Broken streaks go up for adoption. The count keeps going, with a line of past keepers and a logbook where each keeper leaves one line for the next. The longest streaks become heirlooms: *"3,412 days, 27 keepers, 11 countries."*
- **Fossilize.** A broken streak becomes something for another player to find or collect.
- **Shrinking window.** Make the streak harder to keep as it grows, not easier.
- **Understudy.** An AI covers the days you miss, and it might do better than you.
- **Permanent past.** What you did yesterday is locked in and shapes today.
- **Wager.** Let players bet streak days on a harder challenge, double or nothing.

---

## How they compare (rough, subjective)

| Idea | Novelty | Stickiness | Build effort | Needs lots of players to work? |
|---|---|---|---|---|
| Forty Thieves | ★★★ | ★★★ | Medium | No, single player |
| The Understudy | ★★★ | ★★★ | Low | No, one friend group |
| First Light | ★★★ | ★★☆ | Medium | **Yes**, needs global coverage |
| Antipode | ★★★ | ★★☆ | Medium | Somewhat, needs matching |
| Don't Look | ★★★ | ★★☆ | Low | No |
| Fossil Record | ★★☆ | ★★☆ | Medium | Yes, needs fossils to dig |
| Jinx | ★★☆ | ★★☆ | Low | No, two people |

---

## What I'd build first

**Forty Thieves**, if the goal is a game. It's the most original idea here and the most likely to follow you around all day, and it needs no player base to be fun on day one.

MVP (web / PWA):
1. One hand-built map, top-down 2D, 60-second runs.
2. A deterministic simulation: fixed timestep, seeded RNG, per-tick input recording, all thieves re-simulated together.
3. Core pieces: doors and pressure plates, guards with vision cones and fixed patrols, cameras and a power switch, and loot that one thief carries and can hand to another.
4. A daily lock (one run per calendar day), plus a replay viewer with scrubbing.
5. A debug "skip to tomorrow" button for playtesting.
6. A finale renderer that exports the full heist as a GIF or MP4.

**The Understudy**, if the goal is the fastest path to real users. The MVP could be a Discord or Telegram bot built in a weekend:
1. A daily prompt at a random time for each group, with a two-hour window to answer.
2. For anyone who misses the window, an LLM writes an answer in their voice, primed with their last ~30 answers and how people voted on them.
3. Reveal the answers, vote, pick a daily winner, award Understudy trophies, and run Masquerade Fridays.
4. Watch group retention at day 7 and day 30, the share of days covered by Understudies, and how often people share screenshots.

**First Light** is the most beautiful idea and has the best shareable, but it needs a crowd to work. It's a later bet, or a one-off launch event.
