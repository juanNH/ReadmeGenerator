"use client";

import { useEffect, useRef } from "react";

/** Keep desktop scrollports inside the visible area below the editor toolbar. */
export function useEditorScroll() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let frame: number | null = null;

    function measure() {
      frame = null;
      if (!grid) return;
      const styles = getComputedStyle(grid);
      const toolbarOffset = Number.parseFloat(styles.getPropertyValue("--editor-toolbar-offset"));
      const top = Math.max(grid.getBoundingClientRect().top, toolbarOffset || 16);
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const height = Math.floor(viewportHeight - top - 16);
      // A short viewport, large toolbar or enlarged text must retain page scrolling.
      const minimumHeight = Number.parseFloat(styles.fontSize) * 20;
      const ready = height >= minimumHeight;
      const nextHeight = `${Math.max(0, height)}px`;
      if (grid.style.getPropertyValue("--editor-scroll-height") !== nextHeight)
        grid.style.setProperty("--editor-scroll-height", nextHeight);
      if (grid.dataset.editorScrollReady !== String(ready))
        grid.dataset.editorScrollReady = String(ready);
    }

    function scheduleMeasure() {
      if (frame === null) frame = window.requestAnimationFrame(measure);
    }

    measure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(grid);
    if (grid.parentElement) observer.observe(grid.parentElement);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleMeasure);
    window.visualViewport?.addEventListener("scroll", scheduleMeasure);
    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure);
      window.visualViewport?.removeEventListener("resize", scheduleMeasure);
      window.visualViewport?.removeEventListener("scroll", scheduleMeasure);
    };
  }, []);

  return gridRef;
}
