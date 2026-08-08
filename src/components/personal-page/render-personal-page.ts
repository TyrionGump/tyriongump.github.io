/**
 * Personal — the human half, in prose.
 *
 * This page is entirely static: no typing, no drawing, nothing to mount. That
 * is deliberate rather than a shortcut. Work is the machine telling you about
 * the work; Personal is a person talking, and a page that performs would be
 * saying the opposite of what it says.
 *
 * The design also specifies a "session" mode replaying this content as a shell
 * transcript; prose is the one built.
 *
 * Runs in Node at build time, so nothing here — or anything it imports — may touch the DOM.
 */

import {
  contactStatement,
  nowEntries,
  personalBioLead,
  personalBioParagraphs,
  personalByline,
  personalHero,
  type ProseRun,
} from "../../content/personal-page-content";
import { projectsNewestFirst } from "../../content/projects";
import { siteIdentity } from "../../content/site-identity";
import { html, type HtmlFragment } from "../../shared/html-template";
import { renderSiteFooter } from "../site-footer/render-site-footer";

function renderProseRun(run: ProseRun): HtmlFragment {
  if (!run.opensConsole) return html`${run.text}`;
  return html`<button class="personal-console-trigger" type="button" data-console-trigger>
    ${run.text}
  </button>`;
}

function renderNowBlock(): HtmlFragment {
  return html`
    <div class="personal-band-column">
      <h2 class="personal-eyebrow">Now</h2>
      <dl class="personal-now">
        ${nowEntries.map(
          (entry) => html`
            <dt class="personal-now-label">${entry.label}</dt>
            <dd class="personal-now-value ${entry.isStatus ? "is-status" : ""}">${entry.value}</dd>
          `,
        )}
      </dl>
    </div>
  `;
}

function renderProjectsBlock(): HtmlFragment {
  return html`
    <div class="personal-band-column">
      <h2 class="personal-eyebrow">Projects</h2>
      <ul class="personal-projects">
        ${projectsNewestFirst.map(
          (project) => html`
            <li class="personal-project">
              <span class="personal-project-name">${project.id}</span>
              <span class="personal-project-description">${project.shortDescription}</span>
              <span class="personal-project-year">${project.year}</span>
            </li>
          `,
        )}
      </ul>
      <p class="personal-projects-note">
        the full log lives on <a class="personal-inline-link" href="#work">work</a>
      </p>
    </div>
  `;
}

export function renderPersonalPage(): HtmlFragment {
  return html`
    <div class="personal-page-frame site-column site-viewport-fill">
      <h1 class="personal-hero">${personalHero}</h1>
      <p class="personal-byline">${personalByline}</p>

      <div class="personal-bio">
        <p class="personal-bio-lead">${personalBioLead}</p>
        ${personalBioParagraphs.map(
          (runs) => html`<p class="personal-bio-paragraph">${runs.map(renderProseRun)}</p>`,
        )}
      </div>

      <div class="personal-band">${renderNowBlock()} ${renderProjectsBlock()}</div>

      <div class="personal-contact">
        <p class="personal-contact-statement">${contactStatement}</p>
        <div class="personal-contact-links">
          <a
            class="personal-contact-link"
            href="${siteIdentity.githubUrl}"
            target="_blank"
            rel="noreferrer noopener"
            >${siteIdentity.githubLabel}</a
          >
          <a class="personal-contact-link" href="mailto:${siteIdentity.emailAddress}"
            >${siteIdentity.emailAddress}</a
          >
        </div>
      </div>

      <div class="personal-footer">${renderSiteFooter("work")}</div>
    </div>
  `;
}
