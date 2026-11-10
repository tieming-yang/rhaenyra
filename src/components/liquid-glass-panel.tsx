import { createElement } from "react";

export function LiquidGlassPanel() {
  // The upstream element owns its descendants. Keep React controls as siblings.
  return createElement("lg-panel", {
    className: "glass-refraction",
    "aria-hidden": true,
    tone: "light",
    radius: "36",
    refraction: "16",
    chroma: "0.04",
    blur: "1.5",
  });
}
