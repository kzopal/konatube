/*
 * adblock.js - removes ads from the data YouTube's page receives, the way
 * uBlock Origin's YouTube filters do (its json-prune and set-constant
 * scriptlets), and fast-forwards any ad that still reaches the player.
 * Runs at document start, before YouTube's own scripts.
 * Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
 */
(function () {
  'use strict';
  const AD_KEYS = ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams'];

  /*
   * Strip ad fields from a player response, wherever it is nested, and the
   * "Video paused. Continue watching?" check (youThereRenderer), which
   * otherwise pauses long listening sessions with the screen locked.
   */
  function prune(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    for (const target of [obj, obj.playerResponse, obj.response && obj.response.playerResponse]) {
      if (!target || typeof target !== 'object') continue;
      for (const k of AD_KEYS) if (k in target) delete target[k];
      if (Array.isArray(target.messages))
        target.messages = target.messages.filter((m) => !(m && m.youThereRenderer));
    }
    if (Array.isArray(obj)) for (const item of obj) prune(item);   /* batched responses */
    return obj;
  }

  /* Every JSON YouTube parses: API responses (fetch/XHR text) and inline data. */
  const parse = JSON.parse;
  JSON.parse = function () { return prune(parse.apply(this, arguments)); };

  const json = Response.prototype.json;
  Response.prototype.json = function () { return json.apply(this, arguments).then(prune); };

  /* A watch page embeds its player response as a global. */
  let initial;
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    configurable: true,
    get: () => initial,
    set: (v) => { initial = prune(v); },
  });

  /* Anything that still plays as an ad: mute it, jump to its end, press Skip. */
  function skipAd() {
    const player = document.querySelector('.ad-showing, .ad-interrupting');
    if (!player) return;
    const video = player.querySelector('video');
    if (video) {
      video.muted = true;
      if (isFinite(video.duration) && video.duration > 0) video.currentTime = video.duration;
    }
    const skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
    if (skip) skip.click();
  }
  setInterval(skipAd, 300);
})();
