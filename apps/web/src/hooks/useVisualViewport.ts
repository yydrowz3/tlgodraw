import { useEffect } from "react";

/** Keeps the composer inside the visible viewport when a mobile keyboard opens. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      const height = viewport && viewport.scale === 1 ? viewport.height : window.innerHeight;
      document.documentElement.style.setProperty("--workbench-height", `${height}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
      document.documentElement.style.removeProperty("--workbench-height");
    };
  }, []);
}
