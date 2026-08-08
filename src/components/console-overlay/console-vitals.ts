/**
 * The console status bar's live numbers.
 *
 * Every one of these is measured rather than scripted — that is the whole point
 * of putting them there. A fake frame counter on a page about being an engineer
 * would be the wrong kind of joke.
 *
 * They only run while the console is open. An idle `requestAnimationFrame` loop
 * on a portfolio page is a battery cost with nobody watching the output.
 */

import type { CleanupScope } from "../../animation/cleanup-scope";

/**
 * `performance.memory` is a non-standard Chrome extension to the spec, so it is
 * feature-detected rather than typed. Everywhere else shows "n/a", which is
 * honest — the alternative is inventing a number.
 */
interface ChromeMemoryInfo {
  readonly usedJSHeapSize: number;
}

function readHeapMegabytes(): string {
  const memory = (performance as Performance & { memory?: ChromeMemoryInfo }).memory;
  if (!memory) return "n/a";
  return `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`;
}

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

export interface ConsoleVitalsElements {
  readonly fps: HTMLElement | null;
  readonly heap: HTMLElement | null;
  readonly uptime: HTMLElement | null;
}

export interface ConsoleVitals {
  /** Begins sampling. Safe to call repeatedly; restarts the frame counter. */
  start(): void;
  stop(): void;
}

const SLOW_SAMPLE_INTERVAL_MS = 1000;

export function createConsoleVitals(
  elements: ConsoleVitalsElements,
  scope: CleanupScope,
): ConsoleVitals {
  const pageOpenedAt = performance.now();
  let isRunning = false;
  let frameHandle: number | null = null;
  let framesSinceMark = 0;
  let markedAt = 0;

  const countFrame = (now: number): void => {
    if (!isRunning || scope.isDisposed) return;
    framesSinceMark += 1;
    const elapsed = now - markedAt;
    if (elapsed >= 1000) {
      if (elements.fps)
        elements.fps.textContent = String(Math.round((framesSinceMark * 1000) / elapsed));
      framesSinceMark = 0;
      markedAt = now;
    }
    frameHandle = requestAnimationFrame(countFrame);
  };

  const sampleSlowVitals = (): void => {
    if (!isRunning) return;
    if (elements.heap) elements.heap.textContent = readHeapMegabytes();
    if (elements.uptime) {
      const seconds = Math.floor((performance.now() - pageOpenedAt) / 1000);
      elements.uptime.textContent = `${padTwo(Math.floor(seconds / 60))}:${padTwo(seconds % 60)}`;
    }
  };

  scope.setInterval(sampleSlowVitals, SLOW_SAMPLE_INTERVAL_MS);

  const stop = (): void => {
    isRunning = false;
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    frameHandle = null;
  };

  scope.onDispose(stop);

  return {
    start() {
      stop();
      isRunning = true;
      framesSinceMark = 0;
      markedAt = performance.now();
      sampleSlowVitals();
      frameHandle = requestAnimationFrame(countFrame);
    },
    stop,
  };
}
