"use client";

import { useEffect, useState } from "react";

/**
 * The floor in its sandbox. CSP cannot stop a frame navigating itself, so a second load means the
 * floor tried to leave: the frame is removed. No allow-same-origin, ever.
 *
 * The frame is created only after hydration. A frame in the server's HTML starts loading before
 * React can attach onLoad, so its first loads go uncounted and a floor that leaves stays on the page.
 */
export function FloorFrame({ src, title }: { src: string; title: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [loads, setLoads] = useState(0);
  useEffect(() => setHydrated(true), []);
  if (loads > 1) {
    return (
      <div className="stage">
        <div className="floor-frame__left">
          <p>This floor tried to leave its sandbox, so it was removed from the page.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="stage">
      {hydrated ? (
        <iframe className="floor-frame" title={title} src={src} sandbox="allow-scripts" allow="" referrerPolicy="no-referrer" onLoad={() => setLoads((count) => count + 1)} />
      ) : (
        <noscript>
          <div className="floor-frame__left">
            <p>This floor runs in your browser, so it needs JavaScript.</p>
          </div>
        </noscript>
      )}
    </div>
  );
}
