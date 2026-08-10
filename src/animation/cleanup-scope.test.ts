/**
 * Guards the cleanup mechanism the rest of the site is built on.
 *
 * Nineteen files own their timers, intervals and listeners through a scope, so a
 * regression here does not fail loudly — it leaks an interval, or lets a torn
 * down sequence write into replaced DOM one frame later. Both look fine in a
 * screenshot.
 *
 * The two properties worth pinning are *release* (disposal really does clear
 * what it registered) and *swallowing* (a callback that fires anyway does
 * nothing). They are separate: clearing a timer cannot help a listener that has
 * already been dispatched, and the guard inside each closure is what covers it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CleanupScope } from "./cleanup-scope";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("disposal", () => {
  it("runs every registered cleanup", () => {
    const scope = new CleanupScope();
    const order: string[] = [];
    scope.onDispose(() => order.push("first"));
    scope.onDispose(() => order.push("second"));

    scope.dispose();

    expect(order).toEqual(["first", "second"]);
    expect(scope.isDisposed).toBe(true);
  });

  it("is idempotent — a second dispose does not re-run cleanups", () => {
    const scope = new CleanupScope();
    const cleanup = vi.fn();
    scope.onDispose(cleanup);

    scope.dispose();
    scope.dispose();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("runs a late registration immediately rather than storing it forever", () => {
    const scope = new CleanupScope();
    scope.dispose();

    const cleanup = vi.fn();
    scope.onDispose(cleanup);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("keeps releasing after one cleanup throws", () => {
    const scope = new CleanupScope();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const survivor = vi.fn();
    scope.onDispose(() => {
      throw new Error("cleanup exploded");
    });
    scope.onDispose(survivor);

    expect(() => scope.dispose()).not.toThrow();
    expect(survivor).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("timers", () => {
  it("runs a timeout that outlives nothing", () => {
    const scope = new CleanupScope();
    const callback = vi.fn();
    scope.setTimeout(callback, 10);

    vi.advanceTimersByTime(10);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  // Asserting the timer is *gone*, not merely that its callback was swallowed.
  // The guard alone would satisfy `not.toHaveBeenCalled()` while the handle
  // stayed live, which for an interval means it fires forever.
  it("clears a pending timeout on dispose rather than only swallowing it", () => {
    const scope = new CleanupScope();
    const callback = vi.fn();
    scope.setTimeout(callback, 10);
    expect(vi.getTimerCount()).toBe(1);

    scope.dispose();

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("stops an interval on dispose rather than leaking it", () => {
    const scope = new CleanupScope();
    const callback = vi.fn();
    scope.setInterval(callback, 10);

    vi.advanceTimersByTime(30);
    const beforeDispose = callback.mock.calls.length;
    scope.dispose();
    vi.advanceTimersByTime(1000);

    expect(beforeDispose).toBeGreaterThan(0);
    expect(callback).toHaveBeenCalledTimes(beforeDispose);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores scheduling on an already disposed scope", () => {
    const scope = new CleanupScope();
    scope.dispose();

    const timeout = vi.fn();
    const interval = vi.fn();
    scope.setTimeout(timeout, 10);
    scope.setInterval(interval, 10);
    vi.advanceTimersByTime(1000);

    expect(timeout).not.toHaveBeenCalled();
    expect(interval).not.toHaveBeenCalled();
  });
});

describe("listeners", () => {
  it("attaches a listener and removes it on dispose", () => {
    const scope = new CleanupScope();
    const target = new EventTarget();
    const listener = vi.fn();
    scope.addEventListener(target, "ping", listener);

    target.dispatchEvent(new Event("ping"));
    expect(listener).toHaveBeenCalledTimes(1);

    scope.dispose();
    target.dispatchEvent(new Event("ping"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  /**
   * Pins the observable contract: nothing runs after disposal, even mid-dispatch.
   *
   * It does **not** isolate the `#disposed` check inside the wrapper. Removing
   * that check leaves this green, because the DOM spec already stops a listener
   * removed during dispatch from running — just as `clearTimeout` always beats
   * the guard on the timer paths. Those inner checks are redundant defence that
   * no test here can distinguish; do not expect one to catch their removal.
   */
  it("does not run a listener for an event dispatched as the scope was disposed", () => {
    const scope = new CleanupScope();
    const target = new EventTarget();
    const second = vi.fn();
    scope.addEventListener(target, "ping", () => scope.dispose());
    scope.addEventListener(target, "ping", second);

    target.dispatchEvent(new Event("ping"));

    expect(second).not.toHaveBeenCalled();
  });

  it("ignores an attach on an already disposed scope", () => {
    const scope = new CleanupScope();
    const target = new EventTarget();
    const listener = vi.fn();

    scope.dispose();
    scope.addEventListener(target, "ping", listener);
    target.dispatchEvent(new Event("ping"));

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("delay", () => {
  it("resolves on a live scope", async () => {
    const scope = new CleanupScope();
    let resolved = false;
    void scope.delay(10).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(10);

    expect(resolved).toBe(true);
  });

  /**
   * The load-bearing case. An `async` sequence abandons itself mid-flight just
   * by awaiting a disposed scope's `delay`, which is what replaces an
   * `if (dead) return` check after every step — so this promise must stay
   * pending forever rather than resolving late.
   */
  it("never resolves once the scope is disposed", async () => {
    const scope = new CleanupScope();
    const pending = Symbol("pending");
    // Racing against an already-resolved value distinguishes *pending* from
    // *settled*. A flag set in `.then()` cannot: it would look identical if
    // `delay` rejected on disposal, and a rejecting delay runs every `catch`
    // and `finally` in the sequence that was supposed to be abandoned.
    const outcome = scope
      .delay(10)
      .then(() => "resolved" as const)
      .catch(() => "rejected" as const);

    scope.dispose();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await Promise.race([outcome, Promise.resolve(pending)])).toBe(pending);
  });

  it("abandons the rest of an async sequence at the first await", async () => {
    const scope = new CleanupScope();
    const steps: string[] = [];

    const sequence = (async () => {
      steps.push("start");
      await scope.delay(10);
      steps.push("after first delay");
      await scope.delay(10);
      steps.push("after second delay");
    })();

    await vi.advanceTimersByTimeAsync(10);
    expect(steps).toEqual(["start", "after first delay"]);

    scope.dispose();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(steps).toEqual(["start", "after first delay"]);
    void sequence;
  });
});
