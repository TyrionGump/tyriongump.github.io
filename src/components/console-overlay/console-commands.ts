/**
 * The console's command set.
 *
 * Commands are pure apart from a small `ConsoleCommandContext` for the things
 * that necessarily reach outside — clearing the log, closing the overlay,
 * routing. That keeps the vocabulary in one readable table and means adding a
 * command never involves touching the overlay's plumbing.
 *
 * Unknown input answers in the same voice rather than erroring harshly: this is
 * a portfolio pretending to be a shell, and a stack trace would break the spell.
 */

import { nowEntries } from "../../content/personal-page-content";
import { projectIds, projects, type ProjectId } from "../../content/projects";
import { siteIdentity, technologies } from "../../content/site-identity";
import { isRouteName, type RouteName } from "../../routing/route-names";
import { html, type HtmlFragment } from "../../shared/html-template";

export interface ConsoleCommandContext {
  clearOutput(): void;
  closeConsole(): void;
  navigateTo(route: RouteName): void;
  openExternalUrl(url: string): void;
}

const separator = html`<span class="console-separator">·</span>`;

function plain(content: HtmlFragment): HtmlFragment {
  return html`<div class="console-line">${content}</div>`;
}

function highlighted(content: HtmlFragment): HtmlFragment {
  return html`<div class="console-line is-highlighted">${content}</div>`;
}

/** Amber marks anything the shell is unhappy about. */
function warning(content: HtmlFragment): HtmlFragment {
  return html`<div class="console-line is-warning">${content}</div>`;
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

function helpLines(): readonly HtmlFragment[] {
  const group = (name: string, commands: HtmlFragment): HtmlFragment =>
    plain(html`<span class="console-help-group">${name}</span>${commands}`);
  return [
    group("about", html`whoami ${separator} stack ${separator} config ${separator} contact`),
    group("work", html`ls ${separator} open &lt;project&gt;`),
    group("go", html`home ${separator} work ${separator} personal ${separator} gh`),
    group("shell", html`clear ${separator} exit`),
  ];
}

function openProject(argument: string): readonly HtmlFragment[] {
  const id = argument as ProjectId;
  if (!projectIds.includes(id)) {
    return [warning(html`open: no such project: ${argument || "(none given)"}`)];
  }
  const project = projects[id];
  return [
    plain(html`
      <span class="console-accent">${project.id}</span>
      <span class="console-dim">— ${project.shortDescription} ${separator} ${project.year}</span>
    `),
    html`<div class="console-line console-prose">${project.shellDescription}</div>`,
  ];
}

export function runConsoleCommand(
  rawInput: string,
  context: ConsoleCommandContext,
): readonly HtmlFragment[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  const [rawName = "", ...rest] = trimmed.split(/\s+/);
  const name = rawName.toLowerCase();
  const argument = rest.join(" ").toLowerCase();

  switch (name) {
    case "help":
      return helpLines();

    case "clear":
      context.clearOutput();
      return [];

    case "exit":
    case "close":
    case "q":
      context.closeConsole();
      return [];

    case "home":
    case "work":
    case "personal":
      if (isRouteName(name)) context.navigateTo(name);
      return [];

    case "gh":
      context.openExternalUrl(siteIdentity.githubUrl);
      return [plain(html`<span class="console-dim">opening ${siteIdentity.githubLabel}</span>`)];

    case "whoami":
      return [
        highlighted(
          html`${siteIdentity.handle} ${separator} ${siteIdentity.role} ${separator} melbourne, au`,
        ),
      ];

    case "ls":
      return projectIds.map(projectRow);

    case "stack":
      return [
        highlighted(
          html`${technologies.map((technology, index) =>
            index === 0 ? html`${technology}` : html` ${separator} ${technology}`,
          )}`,
        ),
      ];

    case "config":
      return nowEntries.map((entry) =>
        labelledPair(entry.label, html`${entry.value}`, entry.isStatus === true),
      );

    case "contact":
      return [
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
      ];

    case "open":
      return openProject(argument);

    default:
      return [
        warning(html`zsh: command not found: ${name} <span class="console-dim">(try help)</span>`),
      ];
  }
}
