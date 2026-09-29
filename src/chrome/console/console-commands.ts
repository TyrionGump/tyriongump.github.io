import { nowEntries } from "../../content/personal-page-content";
import { projectIds, projects, type ProjectId } from "../../content/projects";
import { siteIdentity, technologies } from "../../content/site-identity";
import { html, type HtmlFragment } from "../../lib/html-template";
import { routeNames, type RouteName } from "../../site-pages";

export interface ConsoleCommandContext {
  clearOutput(): void;
  closeConsole(): void;
  navigateTo(route: RouteName): void;
  openExternalUrl(url: string): void;
}

type HelpGroup = "about" | "work" | "go" | "shell";

interface ConsoleCommand {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly group: HelpGroup;
  readonly usage?: string;
  readonly run: (argument: string, context: ConsoleCommandContext) => readonly HtmlFragment[];
}

const helpGroupOrder: readonly HelpGroup[] = ["about", "work", "go", "shell"];

const separator = html`<span class="console-separator">·</span>`;

function plain(content: HtmlFragment): HtmlFragment {
  return html`<div class="console-line">${content}</div>`;
}

function highlighted(content: HtmlFragment): HtmlFragment {
  return html`<div class="console-line is-highlighted">${content}</div>`;
}

function warning(content: HtmlFragment): HtmlFragment {
  return html`<div class="console-line is-warning">${content}</div>`;
}

function joinWithSeparators(items: readonly (string | HtmlFragment)[]): HtmlFragment {
  return html`${items.map((item, index) => (index === 0 ? html`${item}` : html` ${separator} ${item}`))}`;
}

function labelledPair(label: string, value: HtmlFragment, isStatus = false): HtmlFragment {
  return plain(html`
    <span class="console-pair">
      <span class="console-pair-label">${label}</span>
      <span class="console-pair-value ${isStatus ? "is-status" : ""}">${value}</span>
    </span>
  `);
}

function projectRow(id: ProjectId): HtmlFragment {
  const project = projects[id];
  return plain(html`
    <span class="console-project">
      <span class="console-project-name">${project.id}</span>
      <span class="console-project-description">${project.shortDescription}</span>
      <span class="console-project-year">${project.year}</span>
    </span>
  `);
}

function openProject(argument: string): readonly HtmlFragment[] {
  const id = projectIds.find((candidate) => candidate === argument);
  if (!id) return [warning(html`open: no such project: ${argument || "(none given)"}`)];
  const project = projects[id];
  return [
    plain(html`
      <span class="console-accent">${project.id}</span>
      <span class="console-dim">— ${project.shortDescription} ${separator} ${project.year}</span>
    `),
    html`<div class="console-line console-prose">${project.shellDescription}</div>`,
  ];
}

const routeCommands: readonly ConsoleCommand[] = routeNames.map((route) => ({
  name: route,
  group: "go",
  run: (_argument, context) => {
    context.navigateTo(route);
    return [];
  },
}));

const consoleCommands: readonly ConsoleCommand[] = [
  {
    name: "whoami",
    group: "about",
    run: () => [
      highlighted(
        joinWithSeparators([
          siteIdentity.handle,
          siteIdentity.role,
          siteIdentity.location.toLowerCase(),
        ]),
      ),
    ],
  },
  {
    name: "stack",
    group: "about",
    run: () => [highlighted(joinWithSeparators(technologies))],
  },
  {
    name: "config",
    group: "about",
    run: () =>
      nowEntries.map((entry) =>
        labelledPair(entry.label, html`${entry.value}`, entry.isStatus === true),
      ),
  },
  {
    name: "contact",
    group: "about",
    run: () => [
      labelledPair(
        "github",
        html`<a
          class="console-accent"
          href="${siteIdentity.githubUrl}"
          target="_blank"
          rel="noreferrer noopener"
          >${siteIdentity.githubLabel}</a
        >`,
      ),
      labelledPair(
        "email",
        html`<a class="console-accent" href="mailto:${siteIdentity.emailAddress}"
          >${siteIdentity.emailAddress}</a
        >`,
      ),
    ],
  },
  { name: "ls", group: "work", run: () => projectIds.map(projectRow) },
  {
    name: "open",
    group: "work",
    usage: "open <project>",
    run: (argument) => openProject(argument),
  },
  ...routeCommands,
  {
    name: "gh",
    group: "go",
    run: (_argument, context) => {
      context.openExternalUrl(siteIdentity.githubUrl);
      return [plain(html`<span class="console-dim">opening ${siteIdentity.githubLabel}</span>`)];
    },
  },
  { name: "help", group: "shell", run: () => helpLines() },
  {
    name: "clear",
    group: "shell",
    run: (_argument, context) => {
      context.clearOutput();
      return [];
    },
  },
  {
    name: "exit",
    aliases: ["close", "q"],
    group: "shell",
    run: (_argument, context) => {
      context.closeConsole();
      return [];
    },
  },
];

function helpLines(): readonly HtmlFragment[] {
  return helpGroupOrder.map((group) => {
    const usages = consoleCommands
      .filter((command) => command.group === group)
      .map((command) => command.usage ?? command.name);
    return plain(
      html`<span class="console-help-group">${group}</span>${joinWithSeparators(usages)}`,
    );
  });
}

function findCommand(name: string): ConsoleCommand | undefined {
  return consoleCommands.find(
    (command) => command.name === name || command.aliases?.includes(name) === true,
  );
}

export function runConsoleCommand(
  rawInput: string,
  context: ConsoleCommandContext,
): readonly HtmlFragment[] {
  const [rawName = "", ...rest] = rawInput.trim().split(/\s+/);
  if (!rawName) return [];

  const name = rawName.toLowerCase();
  const command = findCommand(name);
  if (!command) {
    return [
      warning(html`zsh: command not found: ${name} <span class="console-dim">(try help)</span>`),
    ];
  }
  return command.run(rest.join(" ").toLowerCase(), context);
}
