import { describe, expect, it, vi } from "vitest";

import { projectIds } from "../../content/projects";
import { renderFragmentToMarkup } from "../../lib/html-template";
import { routeNames } from "../../site-pages";
import { runConsoleCommand, type ConsoleCommandContext } from "./console-commands";

function run(input: string) {
  const context: ConsoleCommandContext = {
    clearOutput: vi.fn(),
    closeConsole: vi.fn(),
    navigateTo: vi.fn(),
    openExternalUrl: vi.fn(),
  };
  const lines = runConsoleCommand(input, context);
  return { context, output: lines.map(renderFragmentToMarkup).join("\n") };
}

describe("runConsoleCommand", () => {
  it("has a command for every page", () => {
    for (const route of routeNames) {
      const { context } = run(route);
      expect(context.navigateTo).toHaveBeenCalledWith(route);
    }
  });

  it("lists every page in help", () => {
    const { output } = run("help");
    for (const route of routeNames) expect(output).toContain(route);
  });

  it("lists every project with ls, and describes one with open", () => {
    const { output: list } = run("ls");
    for (const id of projectIds) expect(list).toContain(id);

    expect(run("open sift").output).toContain("forty terabytes");
    expect(run("open nothing").output).toContain("no such project: nothing");
    expect(run("open").output).toContain("(none given)");
  });

  it("closes the console for exit and each of its aliases", () => {
    for (const name of ["exit", "close", "q"]) {
      expect(run(name).context.closeConsole).toHaveBeenCalledOnce();
    }
  });

  it("ignores case and surrounding space", () => {
    expect(run("  WORK  ").context.navigateTo).toHaveBeenCalledWith("work");
    expect(run("Open LEDGER").output).toContain("ledger");
  });

  it("prints nothing for empty input", () => {
    expect(run("   ").output).toBe("");
  });

  it("answers an unknown command in the shell's voice, escaped", () => {
    expect(run("<b>").output).toContain("command not found: &lt;b&gt;");
  });
});
