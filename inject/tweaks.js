/*
 * tweaks.js - small changes to how m.youtube.com behaves.
 *
 *  - The bottom bar (Home, Subscriptions, You) stays on every page, the
 *    watch page included, using YouTube's own "persistent_floaty_pivot_bar"
 *    option.
 *  - Feeds load their next batch about two videos earlier than YouTube's
 *    own trigger (10% of the screen before the end), so scrolling rarely
 *    reaches the bottom before more videos are there.
 *
 * Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
 */
(function () {
  'use strict';

  /* ---- bottom bar on every page ---- */

  /* The page's inline `var ytcfg = {...}` lands in this setter. */
  const FLAGS = { persistent_floaty_pivot_bar: true };
  function forceFlags(cfg) {
    const data = cfg && typeof cfg.d === 'function' ? cfg.d() : null;
    if (data && data.EXPERIMENT_FLAGS) Object.assign(data.EXPERIMENT_FLAGS, FLAGS);
  }
  let ytcfg;
  Object.defineProperty(window, 'ytcfg', {
    configurable: true,
    get: () => ytcfg,
    set: (cfg) => {
      ytcfg = cfg;
      if (cfg && typeof cfg.set === 'function' && !cfg.set.ltWrapped) {
        const set = cfg.set;
        cfg.set = function () {
          const r = set.apply(this, arguments);
          forceFlags(cfg);
          return r;
        };
        cfg.set.ltWrapped = true;
      }
      forceFlags(cfg);
    },
  });

  /* ---- load the next batch earlier ---- */

  /* About two feed videos: a full-width 16:9 thumbnail plus its title lines, twice. */
  const lookahead = () => Math.round(2 * (window.innerWidth * 9 / 16 + 110));

  const IO = window.IntersectionObserver;
  if (!IO) return;
  const callbacks = new WeakMap();   /* YouTube's observer -> its callback */
  const early = new WeakMap();       /* continuation element -> our observer for it */
  const observe = IO.prototype.observe;
  const unobserve = IO.prototype.unobserve;

  function Observer(callback, options) {
    const o = new IO(callback, options);
    callbacks.set(o, callback);
    return o;
  }
  Observer.prototype = IO.prototype;
  window.IntersectionObserver = Observer;

  /* The feed's "load more" marker gets watched with a larger bottom margin instead. */
  IO.prototype.observe = function (el) {
    if (el && el.localName === 'ytm-continuation-item-renderer' && callbacks.has(this)) {
      const owner = this, callback = callbacks.get(this);
      const ahead = new IO((entries) => callback(entries, owner),
                           { rootMargin: '10% 0px ' + lookahead() + 'px 0px', threshold: 0.01 });
      const old = early.get(el);
      if (old) old.disconnect();
      early.set(el, ahead);
      return observe.call(ahead, el);
    }
    return observe.apply(this, arguments);
  };
  IO.prototype.unobserve = function (el) {
    const ahead = el && callbacks.has(this) ? early.get(el) : null;
    if (ahead) {
      ahead.disconnect();
      early.delete(el);
      return;
    }
    return unobserve.apply(this, arguments);
  };
})();
