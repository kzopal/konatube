/*
 * noshorts.js - removes Shorts and Playables (games) from feeds, search and
 * the bottom bar, by filtering the data YouTube's page receives before it
 * draws anything. A Shorts link opened directly still plays.
 * Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
 */
(function () {
  'use strict';
  /* Always Shorts or a game, whatever they sit in. */
  const DROP = new Set([
    'reelShelfRenderer', 'reelItemRenderer', 'shortsLockupViewModel',
    'miniGameCardViewModel', 'gameCardRenderer', 'compactGameCardRenderer',
  ]);
  /* Single feed items: dropped when they open a Short or a game. */
  const ITEMS = new Set([
    'richItemRenderer', 'videoWithContextRenderer', 'videoRenderer', 'compactVideoRenderer',
    'lockupViewModel', 'gridVideoRenderer',
  ]);
  /* Shelves: dropped when nothing playable is left in them. */
  const SHELVES = new Set([
    'richSectionRenderer', 'richShelfRenderer', 'shelfRenderer', 'gridShelfViewModel',
    'horizontalCardListRenderer', 'horizontalListRenderer',
  ]);
  const SHORT_OR_GAME = /"reelWatchEndpoint"|"\/shorts\/|"\/playables|"miniGameCardViewModel"/;
  const PLAYABLE = /"(videoId|playlistId|contentId)"/;

  const keyOf = (o) => {
    const keys = Object.keys(o);
    return keys.length === 1 ? keys[0] : null;
  };

  function unwanted(el) {
    if (!el || typeof el !== 'object' || Array.isArray(el)) return false;
    const key = keyOf(el);
    if (!key) return false;
    if (DROP.has(key)) return true;
    if (key === 'pivotBarItemRenderer') return el[key] && el[key].pivotIdentifier === 'FEshorts';
    if (ITEMS.has(key)) return SHORT_OR_GAME.test(JSON.stringify(el));
    if (SHELVES.has(key)) return !PLAYABLE.test(JSON.stringify(el));
    return false;
  }

  /* Children first, so a shelf emptied of Shorts is then dropped as a whole. */
  function filter(node) {
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        filter(node[i]);
        if (unwanted(node[i])) node.splice(i, 1);
      }
    } else if (node && typeof node === 'object') {
      for (const k in node) filter(node[k]);
    }
    return node;
  }

  /* Only YouTube API data, and not inside the Shorts player itself. */
  function clean(obj) {
    if (obj && typeof obj === 'object' && obj.responseContext && !location.pathname.startsWith('/shorts'))
      filter(obj);
    return obj;
  }

  const parse = JSON.parse;
  /* Never let a mistake here break YouTube: on any error, pass the data through untouched. */
  const safeClean = (obj) => { try { return clean(obj); } catch (e) { return obj; } };

  JSON.parse = function () { return safeClean(parse.apply(this, arguments)); };

  const json = Response.prototype.json;
  Response.prototype.json = function () { return json.apply(this, arguments).then(safeClean); };

  let initial;
  Object.defineProperty(window, 'ytInitialData', {
    configurable: true,
    get: () => initial,
    set: (v) => { initial = safeClean(v); },
  });
})();
