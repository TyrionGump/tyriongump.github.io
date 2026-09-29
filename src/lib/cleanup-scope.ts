/**
 * Ownership of every timer, interval, listener and observer a mounted component
 * creates, so all of them can be released in one call.
 *
 * Several loops on this site run indefinitely (the panel clock, the caret, the
 * scroll ring), and animation sequences chain through many nested timeouts. A
 * scope gives them a single owner and — crucially — swallows callbacks that fire
 * after disposal, which is what stops a half-finished typing sequence from
 * writing into DOM that has already been torn down or replaced.
 *
 * The timer calls inside the methods below are the **globals**, despite two
 * methods here sharing their names — a bare call cannot reach an instance
 * method, which needs `this.`. They are unprefixed rather than `window.` so this
 * module, the most depended-upon in the repo, can be exercised in Node. Nothing
 * else here touches a browser global, so `cleanup-scope.test.ts` needs no DOM.
 */

export type CleanupFunction = () => void;

export class CleanupScope {
  #cleanups: CleanupFunction[] = [];
  #disposed = false;

  get isDisposed(): boolean {
    return this.#disposed;
  }

  /** Registers arbitrary teardown. Ignored (and run immediately) once disposed. */
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

  /**
   * Resolves after `delayMs`. Never resolves if the scope is disposed first,
   * which lets `async` sequences abandon themselves mid-flight simply by
   * awaiting — no `dead` flag check after every step.
   */
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
