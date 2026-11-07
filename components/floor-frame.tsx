"use client";

import { useState } from "react";

/**
 * The floor in its sandbox. CSP cannot stop a frame navigating itself, so a second load means the
 * floor tried to leave: the frame is removed. No allow-same-origin, ever.
 */
export function FloorFrame({ src, title }: { src: string; title: string }) {
  const [loads, setLoads] = useState(0);
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
      <iframe className="floor-frame" title={title} src={src} sandbox="allow-scripts" allow="" referrerPolicy="no-referrer" onLoad={() => setLoads((count) => count + 1)} />
    </div>
  );
}
