/*
 * background.js - keeps playback going with the app in the background or
 * the screen locked.
 *
 * YouTube pauses when its page becomes hidden, so the page is told it is
 * always visible. WebKit can still pause the video itself when the app
 * leaves the screen; such a pause, while really hidden and not at the end,
 * is undone. (The app's "Playback" audio session and the "audio" background
 * mode in Info.plist let iOS keep the sound going.)
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
})();
