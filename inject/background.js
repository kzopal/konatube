/*
 * background.js - keeps videos playing with the app in the background or
 * the screen locked. (The app's "Playback" audio session and the "audio"
 * background mode in Info.plist let iOS keep the sound going.)
 *
 * YouTube pauses when its page becomes hidden, so the page is told it is
 * always visible. iOS can still pause the video itself, before or after the
 * page is hidden; such a pause is undone. A pause right after you touched
 * the screen, or from the lock screen or headphones, is yours and is kept.
 *
 * Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
 */
(function () {
  'use strict';
  const realHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden').get;
  const reallyHidden = () => realHidden.call(document);

  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  Object.defineProperty(document, 'webkitHidden', { configurable: true, get: () => false });

  /* ---- what the user wants ---- */

  let wantPlaying = false;   /* a video is meant to be playing */
  let lastInput = 0;         /* last touch, click or key press in the page */
  let remotePause = 0;       /* last pause from the lock screen / headphones */
  const recent = (t) => Date.now() - t < 1000;
  const video = () => document.querySelector('video');

  for (const type of ['touchend', 'click', 'keydown'])
    document.addEventListener(type, () => { lastInput = Date.now(); }, true);

  document.addEventListener('playing', (e) => {
    if (e.target instanceof HTMLVideoElement) wantPlaying = true;
  }, true);

  document.addEventListener('pause', (e) => {
    const v = e.target;
    if (!(v instanceof HTMLVideoElement)) return;
    if (v.ended || recent(lastInput) || recent(remotePause)) { wantPlaying = false; return; }
    if (reallyHidden()) setTimeout(resume, 100);   /* the system's pause: undo it */
  }, true);

  function resume() {
    const v = video();
    if (v && v.paused && !v.ended && wantPlaying && reallyHidden()) v.play().catch(() => {});
  }

  for (const type of ['visibilitychange', 'webkitvisibilitychange', 'pagehide', 'blur']) {
    window.addEventListener(type, (e) => {
      if (type === 'blur' && e.target !== window) return;   /* an input losing focus */
      if (type === 'visibilitychange' && reallyHidden()) {
        resume();
        setTimeout(resume, 500);    /* iOS may pause a moment after the page hides */
        setTimeout(resume, 1500);
      }
      e.stopImmediatePropagation();
    }, true);
  }

  /* Lock screen, Control Center and headphone buttons. */
  const session = navigator.mediaSession;
  if (session && session.setActionHandler) {
    const set = session.setActionHandler.bind(session);
    const remote = (playing, handler) => function () {
      if (playing) wantPlaying = true; else remotePause = Date.now();
      if (handler) return handler.apply(this, arguments);
      const v = video();
      if (v) playing ? v.play().catch(() => {}) : v.pause();
    };
    const wrap = (action, handler) =>
      action === 'play' ? remote(true, handler)
        : action === 'pause' || action === 'stop' ? remote(false, handler) : handler;
    session.setActionHandler = (action, handler) => set(action, wrap(action, handler));
    for (const action of ['play', 'pause']) try { set(action, wrap(action, null)); } catch (e) {}
  }

  /* ---- between videos ---- */

  /* YouTube's "are you still there?" check uses the time of your last touch (window._lact). */
  let lastActivity = 0;
  document.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastActivity > 10000) { lastActivity = now; window._lact = now; }
  }, true);

  /*
   * After a video YouTube shows a 10-second "up next" countdown. With the
   * screen locked nothing plays during it and iOS may suspend the page, so
   * the next video never starts: in the background, skip the countdown.
   * (Only when autoplay is on: the countdown is on screen.)
   */
  document.addEventListener('ended', (e) => {
    if (!(e.target instanceof HTMLVideoElement) || !reallyHidden()) return;
    wantPlaying = true;
    setTimeout(() => {
      const player = document.getElementById('movie_player');
      const countdown = document.querySelector('#player-endscreen[data-has-timer-countdown]');
      if (countdown && player && typeof player.nextVideo === 'function') player.nextVideo();
    }, 300);
  }, true);

  /* The next video may load paused while the app is hidden: start it. */
  document.addEventListener('canplay', (e) => {
    const v = e.target;
    if (!(v instanceof HTMLVideoElement) || !reallyHidden() || !wantPlaying) return;
    if (v.paused && !v.ended) v.play().catch(() => {});
  }, true);
})();
