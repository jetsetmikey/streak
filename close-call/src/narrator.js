/* Close Call: the narrator is Claude, reached through the page's `sample`
 * capability. Every verdict runs on the player's own Claude account. */
(function (root) {
  'use strict';
  const CC = (root.CC = root.CC || {});

  const DAY_MS = 86400000;
  let ready = null;

  // Resolves Claude's sample function, or null where this page can't reach
  // Claude (opened as a plain file, or outside a Claude viewer).
  function connect() {
    if (!ready) {
      const claude = root.claude;
      ready =
        claude && typeof claude.use === 'function'
          ? Promise.resolve()
              .then(() => claude.use('sample'))
              .then((s) => (typeof s === 'function' ? s : null), () => null)
          : Promise.resolve(null);
    }
    return ready;
  }

  // Ask for today's verdict. An identical prompt replays the same answer for
  // a day, so reloading the page can't re-roll a death. `fresh` asks again,
  // for when the last answer came back garbled.
  async function tell(prompt, opts) {
    const sample = await connect();
    if (!sample) throw { code: 'unavailable', message: 'This page cannot reach Claude.' };
    return sample(prompt, {
      modelTier: 'quick',
      onText: opts.onText,
      signal: opts.signal,
      cache: opts.fresh ? { gcTime: DAY_MS, refresh: true } : { gcTime: DAY_MS },
    });
  }

  // What to tell the player when something goes wrong, and what they can do:
  // retry the same sentence, rewrite it, or stop (no narrator on this visit).
  function trouble(e) {
    switch (e && e.code) {
      case 'unavailable':
        return { stop: true, text: "Close Call's narrator is Claude, so it only works inside Claude. Open this page from its claude.ai link while signed in." };
      case 'not_granted':
        return { stop: true, text: "Close Call can't narrate without permission to use Claude. Reload the page to be asked again." };
      case 'sampling_disabled':
      case 'not_declared':
      case 'capability_disabled':
      case 'capability_removed':
        return { stop: true, text: "Claude isn't available to this page right now, so there's nobody to narrate." };
      case 'refused':
        return { rewrite: true, text: "The narrator won't tell that story. Write something else." };
      case 'rate_limited':
        return { retry: true, text: "Claude is busy, or you've reached your usage limit. Your close call isn't used up, so try again in a little while." };
      case 'session_expired':
        return { retry: true, text: "You've been signed out of Claude. Sign in again, then try again. Your close call isn't used up." };
      case 'garbled':
      case 'empty_completion':
        return { retry: true, fresh: true, text: "The narrator lost the thread. Your close call isn't used up." };
      default:
        return { retry: true, text: "The line to the narrator dropped. Your close call isn't used up." };
    }
  }

  CC.narrator = { connect, tell, trouble };
})(typeof globalThis !== 'undefined' ? globalThis : this);
