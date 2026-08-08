/**
 * Work: the project list, told as repository history.
 *
 * `main` is the trunk; every project is a branch still alive. As with Home, this
 * renders the **finished** state — the graph fully drawn, every commit expanded
 * — which is what ships in the HTML, what a crawler reads, and what someone
 * with JavaScript off sees. Script collapses the rows and animates the draw on
 * top of it.
 *
 * Positions here are computed from `graph-geometry.ts` rather than typed in, so
 * a rail and the node it must land on can never drift apart. They are the only
 * inline styles in the file; everything else is a class.
 *
 * Runs in Node at build time, so nothing here — or anything it imports — may touch the DOM.
 */

import { projects, workGraphProjectIds, type Project } from "../../content/projects";
import { siteIdentity } from "../../content/site-identity";
import { renderSiteFooter } from "../site-footer/render-site-footer";
import { html, type HtmlFragment } from "../../shared/html-template";
import { buildStatBars, formatLineCount, formatMetricValue } from "./commit-formatting";
import { buildBranchCurvePath, buildTrunkPath, graphGeometry as geometry } from "./graph-geometry";
import { highlightTypeScriptLine } from "./typescript-highlighter";

export const workCommandText = `git log --graph --stat --author=${siteIdentity.handle}`;

/** Top-left corner of a node whose centre should sit at (`centreX`, `centreY`). */
function nodeOffsetStyle(centreX: number, centreY: number): string {
  const half = geometry.nodeSize / 2;
  return `left:${centreX - half}px; top:${centreY - half}px;`;
}

const NODE_CENTRE_X_TRUNK = geometry.trunkX + 1;
const NODE_CENTRE_X_BRANCH = geometry.branchX + 1;

function renderHeadRow(): HtmlFragment {
  return html`
    <div class="graph-row graph-row-head">
      <div class="graph-rail-column">
        <div
          class="graph-trunk"
          data-graph-trunk
          style="left:${geometry.trunkX}px; width:${geometry.railWidth}px; top:${geometry.headNodeY}px; bottom:0;"
        ></div>
        <div
          class="graph-node graph-node-head"
          data-graph-node
          style="${nodeOffsetStyle(NODE_CENTRE_X_TRUNK, geometry.headNodeY)}"
        ></div>
      </div>
      <div class="graph-row-content graph-head-content" data-graph-text>
        <p class="graph-head-ref">HEAD → main</p>
        <h1 class="graph-head-headline">Two systems.<br />Both still running.</h1>
        <p class="graph-head-intro">
          Payments infrastructure and fleet orchestration. Open a branch to read the problem, what
          it took, and the file itself.
        </p>
      </div>
    </div>
  `;
}

function renderRootRow(): HtmlFragment {
  return html`
    <div class="graph-row graph-row-root">
      <div class="graph-rail-column">
        <div
          class="graph-trunk"
          data-graph-trunk
          style="left:${geometry.trunkX}px; width:${geometry.railWidth}px; top:0; height:${geometry.rootNodeY}px;"
        ></div>
        <div
          class="graph-node"
          data-graph-node
          style="${nodeOffsetStyle(NODE_CENTRE_X_TRUNK, geometry.rootNodeY)}"
        ></div>
      </div>
      <div
        class="graph-row-content graph-root-content"
        data-graph-text
        style="padding-top:${geometry.rootNodeY - geometry.headNodeY}px;"
      >
        <span>0f21a8c</span><span class="graph-root-separator">·</span
        ><span class="graph-root-subject">hello world</span
        ><span class="graph-root-separator">·</span><span>Jan 2025</span>
      </div>
    </div>
  `;
}

function renderMetricsBand(project: Project): HtmlFragment {
  return html`
    <div class="commit-metrics">
      ${project.metrics.map(
        (metric) => html`
          <div class="commit-metric">
            <div class="commit-metric-value" data-commit-metric-value>
              ${formatMetricValue(metric.value, metric.suffix)}
            </div>
            <div class="commit-metric-label">${metric.label}</div>
          </div>
        `,
      )}
    </div>
  `;
}

/** The console block colours its lines by what they are, the way a terminal does. */
function consoleLineModifier(line: string): string {
  if (line.startsWith("›")) return "commit-console-line-command";
  if (line.includes("✓")) return "commit-console-line-success";
  return "commit-console-line-body";
}

function renderSourceViewer(project: Project): HtmlFragment {
  const codeLines = project.sourceCode.split("\n");
  const stats = buildStatBars(project.commit.linesAdded, project.commit.linesRemoved);
  const filePath = `src/${project.id}.ts`;

  return html`
    <div class="commit-source">
      <div class="commit-source-command">
        <span class="commit-source-command-text">
          <span class="terminal-prompt-glyph">❯</span> git show ${project.commit.hash}:${filePath}
        </span>
        <span class="commit-source-rule" aria-hidden="true"></span>
        <span class="commit-source-stat">
          <span class="commit-source-bars" aria-hidden="true">
            <span class="commit-source-bars-added">${stats.added}</span
            ><span class="commit-source-bars-removed">${stats.removed}</span>
          </span>
          <span>
            <span class="commit-source-added">+${formatLineCount(project.commit.linesAdded)}</span>
            <span class="commit-source-removed"
              >−${formatLineCount(project.commit.linesRemoved)}</span
            >
            · ${project.commit.filesChanged} files
          </span>
        </span>
      </div>

      <div class="source-viewer">
        <div class="source-viewer-title-bar">
          <span class="source-viewer-filename">
            <span class="source-viewer-dot" aria-hidden="true"></span>${filePath}
          </span>
          <span class="source-viewer-language">typescript</span>
        </div>

        <div class="source-viewer-body">
          <div class="source-viewer-line-numbers" aria-hidden="true">
            ${codeLines.map((_, index) => html`<div>${index + 1}</div>`)}
          </div>
          <div class="source-viewer-code-column">
            <div
              class="source-viewer-line-highlight"
              data-source-line-highlight
              aria-hidden="true"
            ></div>
            <div class="source-viewer-code" data-source-code>
              ${codeLines.map(
                (line) =>
                  html`<div class="source-viewer-line">${highlightTypeScriptLine(line)}</div>`,
              )}
            </div>
          </div>
        </div>

        <div class="source-viewer-output">
          <div class="source-viewer-output-label">output</div>
          <div class="commit-console" data-commit-console>
            ${project.consoleOutput.map(
              (line) =>
                html`<div class="commit-console-line ${consoleLineModifier(line)}">${line}</div>`,
            )}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCommitRow(project: Project): HtmlFragment {
  const bodyId = `commit-body-${project.id}`;
  return html`
    <article class="graph-row commit-row" data-commit="${project.id}">
      <div class="graph-rail-column">
        <svg
          class="graph-branch"
          width="${geometry.gutterWidth}"
          height="100%"
          aria-hidden="true"
          focusable="false"
        >
          <!-- One group at one opacity, so nothing brightens where the branch meets the trunk. -->
          <g
            class="graph-branch-strokes"
            fill="none"
            stroke-width="${geometry.railWidth}"
            stroke-linecap="butt"
          >
            <path
              class="graph-branch-trunk"
              data-graph-trunk-path
              d="${buildTrunkPath()}"
              stroke-dasharray="${geometry.trunkPathLength}"
            ></path>
            <path
              class="graph-branch-curve"
              data-graph-curve-path
              d="${buildBranchCurvePath()}"
              stroke-dasharray="${geometry.curvePathLength}"
            ></path>
          </g>
        </svg>
        <div
          class="graph-node"
          data-graph-node
          style="${nodeOffsetStyle(NODE_CENTRE_X_BRANCH, geometry.branchPeelY)}"
        ></div>
      </div>

      <div
        class="graph-row-content"
        data-graph-text
        style="padding-top:${geometry.branchPeelY - geometry.headNodeY}px; padding-bottom:${geometry.rowBottomPadding}px;"
      >
        <div class="commit-head" data-commit-head>
          <div class="commit-meta">
            <span class="commit-hash" data-commit-hash>${project.commit.hash}</span>
            <span class="commit-meta-separator" aria-hidden="true">·</span>
            <span class="commit-ref">${project.id}</span>
            <span class="commit-year">${project.year}</span>
          </div>
          <p class="commit-category">${project.category}</p>
          <h2 class="commit-subject" data-commit-subject>${project.name}</h2>
          <p class="commit-one-liner">${project.oneLiner}</p>
          <p class="commit-role">${project.role.join(" · ")}</p>
          <p class="commit-stack">${project.stack.join(" · ")}</p>
          <p class="commit-cue-row">
            <button
              class="commit-cue"
              data-commit-toggle
              type="button"
              aria-expanded="true"
              aria-controls="${bodyId}"
            >
              open file
            </button>
          </p>
        </div>

        <div class="commit-body" data-commit-body id="${bodyId}">
          <div class="commit-body-inner" data-commit-body-inner>
            <div class="commit-story">
              ${project.story.map(
                (section) => html`
                  <div class="commit-story-section">
                    <div class="commit-story-label">${section.label}</div>
                    <p class="commit-story-body">${section.body}</p>
                  </div>
                `,
              )}
            </div>
            ${renderMetricsBand(project)} ${renderSourceViewer(project)}
          </div>
        </div>
      </div>
    </article>
  `;
}

export function renderWorkPage(): HtmlFragment {
  return html`
    <div class="work-page-frame site-column site-viewport-fill">
      <div class="work-command terminal-gutter-row">
        <div class="terminal-prompt-glyph">❯</div>
        <div class="work-command-line">
          <span class="work-command-text" data-work-command>${workCommandText}</span
          ><span class="caret" aria-hidden="true"></span>
        </div>
      </div>

      <div class="work-git-graph" data-work-graph>
        ${renderHeadRow()} ${workGraphProjectIds.map((id) => renderCommitRow(projects[id]))}
        ${renderRootRow()}
      </div>

      <div class="work-footer">${renderSiteFooter("personal")}</div>
    </div>
  `;
}
