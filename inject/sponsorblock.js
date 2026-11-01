/*
 * sponsorblock.js - skips sponsor segments, using SponsorBlock's public
 * database (sponsor.ajay.app, https://sponsor.ajay.app).
 * Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
 */
(function () {
  'use strict';
  const CATEGORIES = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview'];

  let current = null;     /* video id the segments belong to */
  let segments = [];      /* [[start, end], ...] in seconds */

  function videoId() {
    const v = new URLSearchParams(location.search).get('v');
    if (v) return v;
    const m = /^\/shorts\/([\w-]{11})/.exec(location.pathname);
    return m ? m[1] : null;
  }

  async function load(id) {
    try {
      const res = await fetch('https://sponsor.ajay.app/api/skipSegments?videoID=' + id +
                              '&categories=' + encodeURIComponent(JSON.stringify(CATEGORIES)));
      if (!res.ok) return;   /* 404 = no segments for this video */
      const list = await res.json();
      if (id !== current) return;
      segments = list
        .filter((s) => Array.isArray(s.segment) && (!s.actionType || s.actionType === 'skip'))
        .map((s) => s.segment);
    } catch (e) {
      /* offline or SponsorBlock down: just play normally */
    }
  }

  setInterval(() => {
    const id = videoId();
    if (id !== current) {
      current = id;
      segments = [];
      if (id) load(id);
    }
    if (!segments.length || document.querySelector('.ad-showing')) return;
    const video = document.querySelector('video');
    if (!video) return;
    const t = video.currentTime;
    for (const [start, end] of segments) {
      if (t >= start && t < end - 0.5) {
        video.currentTime = end;
        break;
      }
    }
  }, 250);
})();
