import React, { useEffect, useRef, useState } from 'react';

// Full-screen looping video behind a screen. Renders nothing when the viewer
// prefers reduced motion or has switched on "Reduced visual effects", in
// which case the CSS image background beneath it stays visible.
//
// `sources` has two tiers, each with an AV1 and an H.264 file:
//   { hd: { av1, h264 }, sd: { av1, h264 } }
// The browser picks AV1 when it can decode it (about half the bytes) and
// falls back to H.264 otherwise. The sd tier is used on narrow viewports,
// Save-Data connections and slow links. Playback is paused while the tab is
// hidden and while the element is scrolled out of view.

const AV1_TYPE = 'video/mp4; codecs="av01.0.08M.08"';
const H264_TYPE = 'video/mp4; codecs="avc1.640028"';

function motionAllowed() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return document.documentElement.dataset.effects !== 'reduced';
}

function pickTier(sources) {
  const connection = navigator.connection;
  const slow = connection?.saveData || /(^|\D)2g$/.test(connection?.effectiveType || '') || connection?.effectiveType === '3g';
  const narrow = Math.max(window.innerWidth, window.innerHeight) <= 1100;
  return slow || narrow ? sources.sd : sources.hd;
}

export default function SceneVideo({ sources, poster, posterSmall }) {
  const [allowed, setAllowed] = useState(motionAllowed);
  const [tier, setTier] = useState(() => pickTier(sources));
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new MutationObserver(() => setAllowed(motionAllowed()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-effects'] });
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMedia = () => setAllowed(motionAllowed());
    media?.addEventListener?.('change', onMedia);
    return () => { observer.disconnect(); media?.removeEventListener?.('change', onMedia); };
  }, []);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setTier(pickTier(sources)));
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(frame); };
  }, [sources]);

  // Don't decode frames nobody can see.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const sync = () => {
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [allowed, tier]);

  if (!allowed || !sources) return null;

  const usePosterSmall = tier === sources.sd && posterSmall;

  return (
    <div className="scene-video" aria-hidden="true">
      <video
        key={tier === sources.sd ? 'sd' : 'hd'}
        ref={videoRef}
        poster={usePosterSmall ? posterSmall : poster}
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
      >
        {tier.av1 && <source src={tier.av1} type={AV1_TYPE} />}
        {tier.h264 && <source src={tier.h264} type={H264_TYPE} />}
      </video>
      <span className="scene-video-scrim" />
    </div>
  );
}
