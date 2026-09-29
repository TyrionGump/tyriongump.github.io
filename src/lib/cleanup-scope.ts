// The bare `setTimeout`/`setInterval` calls below are the globals, not these methods.
// They skip `window.` so the tests run in Node without a DOM.

export type CleanupFunction = () => void;

export class CleanupScope {
  #cleanups: CleanupFunction[] = [];
  #disposed = false;

  get isDisposed(): boolean {
    return this.#disposed;
  }

  /** Runs `cleanup` at once if the scope is already disposed. */
  onDispose(cleanup: CleanupFunction): void {
    if (this.#disposed) {
      cleanup();
      return;
    }
    this.#cleanups.push(cleanup);
  }

  setTimeout(callback: () => void, delayMs: number): void {
    if (this.#disposed) return;
    const handle = setTimeout(() => {
      if (!this.#disposed) callback();
    }, delayMs);
    this.onDispose(() => clearTimeout(handle));
  }

  setInterval(callback: () => void, intervalMs: number): void {
    if (this.#disposed) return;
    const handle = setInterval(() => {
      if (!this.#disposed) callback();
    }, intervalMs);
    this.onDispose(() => clearInterval(handle));
  }

  addEventListener<TEvent extends Event = Event>(
    target: EventTarget,
    type: string,
    listener: (event: TEvent) => void,
    options?: AddEventListenerOptions,
  ): void {
    if (this.#disposed) return;
    const guarded = (event: Event): void => {
      if (!this.#disposed) listener(event as TEvent);
    };
    target.addEventListener(type, guarded, options);
    this.onDispose(() => target.removeEventListener(type, guarded, options));
  }

  /** Never resolves if the scope is disposed first, so an awaiting sequence just stops. */
  delay(delayMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.setTimeout(resolve, delayMs);
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    const cleanups = this.#cleanups;
    this.#cleanups = [];
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (error) {
        console.error("Cleanup threw while disposing a scope:", error);
      }
    }
  }
}
