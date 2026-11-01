/*
 * background.js - keeps playback going with the app in the background or
 * the screen locked.
 *
 * YouTube pauses when its page becomes hidden, so the page is told it is
 * always visible. WebKit can still pause the video itself when the app
 * leaves the screen; such a pause, while really hidden and not at the end,
 * is undone. In the background the "up next" countdown between songs is
 * skipped, so there is no silent gap for iOS to suspend the page in. (The
 * app's "Playback" audio session and the "audio" background mode in
 * Info.plist let iOS keep the sound going.)
 * Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
 */
(function () {
  'use strict';
  const realHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden').get;
  const reallyHidden = () => realHidden.call(document);

  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  Object.defineProperty(document, 'webkitHidden', { configurable: true, get: () => false });

  /* Was a video playing at the moment the app went away? */
  let playingWhenHidden = false;
  const playingVideo = () => Array.from(document.querySelectorAll('video')).find((v) => !v.paused && !v.ended);

  for (const type of ['visibilitychange', 'webkitvisibilitychange', 'pagehide', 'blur']) {
    window.addEventListener(type, (e) => {
      if (type === 'blur' && e.target !== window) return;   /* an input losing focus */
      if (type === 'visibilitychange') playingWhenHidden = reallyHidden() && !!playingVideo();
      e.stopImmediatePropagation();
    }, true);
  }

  /* Pause from the lock screen, Control Center or headphones: the user's, keep it. */
  const session = navigator.mediaSession;
  if (session && session.setActionHandler) {
    const set = session.setActionHandler.bind(session);
    /* Remote play/pause: remember what the user wants while the app is hidden. */
    const remote = (wantPlaying, handler) => function () {
      playingWhenHidden = wantPlaying;
      if (handler) return handler.apply(this, arguments);
      const v = wantPlaying ? document.querySelector('video') : playingVideo();
      if (v) wantPlaying ? v.play().catch(() => {}) : v.pause();
    };
    const wrap = (action, handler) =>
      action === 'play' ? remote(true, handler)
        : action === 'pause' || action === 'stop' ? remote(false, handler) : handler;
    session.setActionHandler = (action, handler) => set(action, wrap(action, handler));
    for (const action of ['play', 'pause']) try { set(action, wrap(action, null)); } catch (e) {}
  }

  /* Any other pause while hidden is the system's, not the user's: resume. */
  document.addEventListener('pause', (e) => {
    const video = e.target;
    if (!(video instanceof HTMLVideoElement) || video.ended) return;
    if (!reallyHidden() || !playingWhenHidden) return;
    setTimeout(() => { if (video.paused && reallyHidden()) video.play().catch(() => {}); }, 100);
  }, true);

  /*
   * YouTube decides "are you still there?" from the time of your last touch
   * (window._lact). While something plays, count that as activity.
   */
  let lastActivity = 0;
  document.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastActivity > 10000) { lastActivity = now; window._lact = now; }
  }, true);

  /*
   * Between songs YouTube shows a 10-second "up next" countdown. With the
   * screen locked nothing plays during it, and iOS may suspend the page, so
   * the next song never starts. In the background, skip the countdown.
   * (Only when autoplay is on: the countdown is on screen.)
   */
  document.addEventListener('ended', (e) => {
    if (!(e.target instanceof HTMLVideoElement) || !reallyHidden() || !playingWhenHidden) return;
    setTimeout(() => {
      const player = document.getElementById('movie_player');
      const countdown = document.querySelector('#player-endscreen[data-has-timer-countdown]');
      if (countdown && player && typeof player.nextVideo === 'function') player.nextVideo();
    }, 300);
  }, true);

  /* The next video may load paused while the app is hidden: start it. */
  document.addEventListener('canplay', (e) => {
    const video = e.target;
    if (!(video instanceof HTMLVideoElement) || !reallyHidden() || !playingWhenHidden) return;
    if (video.paused && !video.ended) video.play().catch(() => {});
  }, true);
})();
