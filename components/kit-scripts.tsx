"use client";

import { useEffect } from "react";

const KIT_SCRIPTS = ["/taste/system.js", "/taste/motion/motion.js", "/taste/layout/layout.js", "/taste/diagrams/mount.js"];

/**
 * The kit's scripts change the page's DOM (effect canvases, pause buttons, nav sheets), so they load
 * after React has hydrated. Loaded earlier, they race hydration and cause mismatch errors.
 */
export function KitScripts() {
  useEffect(() => {
    for (const src of KIT_SCRIPTS) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = src;
      document.body.appendChild(script);
    }
  }, []);
  return null;
}
