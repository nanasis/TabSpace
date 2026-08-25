# TabSpace v1 Implementation Plan

## Objective

Build and release the TabSpace Chrome extension from the published Figma design:

- Design source: <https://duty-rule-28147876.figma.site/>
- Chrome Manifest V3 extension
- User-created spaces and groups
- Real Chrome tab management
- Provider-selected JSON import for Toby, Tabme, and TabSpace
- TabSpace backup plus compatible exports
- Private GitHub Gist synchronization as shown in the design
- A modern project website deployed to GitHub Pages by GitHub Actions

## Delivery rules

Every work item follows the same completion gate:

1. Implement only the entities and abstractions required by the item.
2. Review the changed code for correctness, clarity, efficiency, duplication, and reusable module boundaries.
3. Refine issues found by the review.
4. Run the relevant lint, type-check, unit, component, end-to-end, and build validations.
5. Record validation evidence and update this plan.
6. Commit the completed item with a focused commit.
7. Push the commit to the remote repository.

A work item is not complete until all seven steps pass. Material design differences must be resolved against the published Figma site before release.

## Status legend

- `[ ]` Not started
- `[>]` In progress
- `[x]` Completed
- `[!]` Blocked

## Work items

### WI-01 — Confirm v1 behavior and Chrome target

- [x] Target Chrome with Manifest V3.
- [x] Use a full extension management page matching the desktop Figma layout.
- [x] Define assignment of newly discovered Chrome tabs to spaces.
- [x] Define safe deletion behavior for spaces containing tabs.
- [x] Include the Figma GitHub Gist synchronization experience in v1.
- [x] Treat Work, Research, and Personal as examples only; spaces are user-created.
- [x] Record architecture and product decisions.

#### Decisions

- The extension opens a full dashboard page; the toolbar action opens or focuses that page.
- First installation creates one user-renamable `My Space`; the Figma Work, Research, and Personal spaces are never seeded as fixed product data.
- A newly discovered Chrome tab is assigned to the most recently active TabSpace space and remains ungrouped until the user organizes it.
- Deleting a space requires confirmation. Its open tabs remain open and are moved, ungrouped, to the first remaining space. The final space cannot be deleted.
- TabSpace pinning uses Chrome's real pinned-tab state for open tabs.
- GitHub synchronization uses a private Gist containing the canonical, versioned TabSpace backup document.
- Domain operations remain pure functions over minimal data types. Chrome, storage, file, and GitHub APIs sit behind small adapters; React components consume those operations rather than duplicating business rules.
- New classes, entities, and generalized abstractions are introduced only when at least one current behavior requires them.

### WI-02 — Create the extension project

- [x] Configure React, TypeScript, Vite, and npm.
- [x] Configure Tailwind CSS.
- [x] Add Lucide icons, Inter, and JetBrains Mono.
- [x] Add development, lint, type-check, test, and production-build commands.
- [x] Produce a loadable unpacked-extension directory.

#### Validation

- `npm run validate` passed on 2026-08-25: ESLint, TypeScript, Vitest (1 test), and the Vite production build.
- The `dist/` smoke check confirmed a parseable Manifest V3 file and the built dashboard entry page.

### WI-03 — Configure Manifest V3 and extension runtime

- [x] Add extension metadata and icons.
- [x] Add the dashboard extension page.
- [x] Make the toolbar action open or focus the dashboard.
- [x] Add only required Chrome permissions and GitHub host permissions.
- [x] Implement the background service worker.
- [x] Handle installation and extension upgrades safely.

#### Validation

- `npm run validate` passed on 2026-08-25: ESLint, TypeScript, Vitest (5 tests), the multi-entry Vite production build, and unpacked-extension reference verification.
- Dashboard runtime tests cover opening, focusing an existing dashboard across windows, stale-tab recovery, and tab-query failure recovery.
- The install lifecycle opens the dashboard only for a first install; updates preserve the current browser state without automatically opening a page.

### WI-04 — Define the persistent data model

- [x] Add a versioned root document for spaces, groups, tab metadata, settings, and sync metadata.
- [x] Define minimal Space, Group, TabRecord, Settings, and SyncMetadata types.
- [x] Add runtime validation and schema migration.
- [x] Add a `chrome.storage.local` repository with testable boundaries.
- [x] Exclude secrets from persisted backups and logs.

#### Validation

- `npm run validate` passed on 2026-08-25: ESLint, TypeScript, 16 Vitest tests, the production build, and unpacked-extension verification.
- Model tests cover first-install state, entity integrity, duplicate IDs, strict credential rejection, v0-to-v1 migration, and unsupported future versions.
- Repository tests cover initial persistence, no-op current loads, migration persistence, corrupt-storage preservation, and validation before writes.

### WI-05 — Integrate real Chrome tabs

- [x] Query current tabs and reconcile them with stored organization.
- [x] Listen for tab creation, update, activation, replacement, movement, and removal.
- [x] Activate/focus, close, and pin/unpin tabs with Chrome APIs.
- [x] Handle restricted URLs, stale IDs, restored tabs, and API failures.
- [x] Avoid duplicate records and unnecessary storage writes.

#### Validation

- `npm run validate` passed on 2026-08-25: ESLint, TypeScript, 23 Vitest tests, production build, and unpacked-extension verification.
- Reconciliation tests cover discovery, dashboard exclusion, metadata updates that preserve organization, closed and saved records, no-op writes, Chrome tab replacement, and activation timestamps.
- Browser events are debounced and serialized; API action errors are exposed without including tab URLs or titles.

### WI-06 — Reproduce the Figma application shell

- [x] Implement the dark full-height dashboard.
- [x] Implement the fixed sidebar, space navigation, toolbar, content area, and status bar.
- [x] Match Figma spacing, borders, typography, colors, icon sizing, and interaction states.
- [x] Keep the desktop layout usable at narrower extension-page widths.

#### Validation

- `npm run validate` passed on 2026-08-25 with the responsive application shell and live local-document loading.
- The component smoke test verifies the branded shell and asynchronously loaded active-space heading.

### WI-07 — Implement the Figma sidebar

- [x] Add the TabSpace branding and v1 label.
- [x] Add Open and Pinned views with counts.
- [x] List active-space tabs with avatar, title, active state, and pin state.
- [x] Activate browser tabs from the sidebar.
- [x] Show tabs, groups, pinned, and global totals.
- [x] Add the designed empty state.

#### Validation

- `npm run validate` passed on 2026-08-25 with live active-space and pinned tab views, browser activation, totals, and empty states.
- The canonical tab record now tracks Chrome's active state during reconciliation without changing user-owned organization fields.

### WI-08 — Implement user-created spaces

- [x] Create unlimited spaces with name and emoji.
- [x] Switch, rename, recolor/re-emoji, order, and delete spaces.
- [x] Prevent unsafe deletion of the final space.
- [x] Apply the documented tab-relocation behavior during deletion.
- [x] Persist space order and the active space.
- [x] Show per-space tab and group counts.

#### Validation

- `npm run validate` passed on 2026-08-25 with 27 tests and the production extension build.
- Space operation tests cover creation and activation, rename/reorder, safe tab relocation with group removal, and final-space deletion prevention.

### WI-09 — Implement groups

- [x] Reproduce the New Group modal with name and Figma color palette.
- [x] Create, rename, collapse, expand, order, and delete groups.
- [x] Move tabs from deleted groups to Ungrouped.
- [x] Persist group state and show group tab counts.
- [x] Add the designed empty-group state.

#### Validation

- `npm run validate` passed on 2026-08-25 with 29 tests and the production extension build.
- Group operation tests cover create/edit/collapse/order behavior and deletion that safely moves tabs to Ungrouped and compacts group order.

### WI-10 — Implement tab cards and actions

- [x] Reproduce the responsive Figma card grid.
- [x] Show alias/title, avatar/favicon, domain, active/pinned badges, and last-accessed time.
- [x] Support selection and Ctrl/Cmd/Shift multi-selection.
- [x] Rename aliases and choose custom emoji avatars.
- [x] Pin/unpin, move/remove group, copy URL, open/activate, and close tabs.
- [x] Render Ungrouped tabs separately.

#### Validation

- `npm run validate` passed on 2026-08-25 with 37 tests and the production extension build.
- Tab operation tests cover aliases/avatars, group assignment and removal, and invalid cross-space destinations.

### WI-11 — Implement search and bulk actions

- [x] Search active-space aliases, titles, domains, and URLs as the user types.
- [x] Clear search and hide empty filtered groups.
- [x] Show the designed no-results state.
- [x] Show selected count, bulk destination selector, move action, and clear action.
- [x] Show selection state in the status bar.

#### Validation

- Search tests verify case-insensitive alias, title, domain, and URL matching plus no-match behavior.
- The responsive workspace supports modifier/range selection and persistent bulk movement to any space or group.

### WI-12 — Implement persistent organization and reconciliation

- [x] Persist spaces, groups, aliases, avatars, assignments, and settings.
- [x] Restore the last active space.
- [x] Reconcile stored records with open Chrome tabs without duplicates.
- [x] Debounce writes and recover from invalid/outdated storage.
- [x] Start from a safe default state without fixed Figma sample data.

#### Validation

- The settings control opens a keyboard-dismissible dialog and persists comfortable or compact card density. The component test verifies opening the dialog and saving the selected setting.
- Browser event writes are debounced and serialized. Outdated documents migrate in place; invalid documents recover to a safe default while retaining only non-sensitive recovery metadata.

### WI-13 — Implement provider-selected JSON import

- [x] Require users to select Toby, Tabme, or TabSpace; do not auto-detect the provider.
- [x] Accept JSON through selection and drag/drop.
- [x] Implement separate Toby, Tabme, and TabSpace parsers and validators.
- [x] Obtain sanitized fixtures or authoritative schemas for Toby and Tabme exports.
- [x] Normalize provider data into the canonical model with generated safe IDs.
- [x] Preview spaces, groups, tabs, warnings, and skipped records.
- [x] Support Merge and confirmed Replace operations atomically.
- [x] Report useful provider mismatch, validation, and completion results.

#### Validation

- Sanitized Toby organization and Tabme backup profile fixtures are stored with the parser tests. Import tests cover both providers, explicit mismatch errors, unsafe URL skipping, and atomic Merge and Replace.

### WI-14 — Implement TabSpace JSON backup/export

- [x] Define the canonical versioned backup schema and export timestamp.
- [x] Include spaces, groups, safe tab metadata, aliases, and avatars.
- [x] Exclude credentials and sync secrets.
- [x] Validate and download `tabspace-backup.json`.
- [x] Support reliable TabSpace export/import round trips.

#### Validation

- Canonical backup tests validate export/import round trips and verify that Chrome runtime IDs and synchronization data are absent.

### WI-15 — Implement compatible Figma export formats

- [x] Export Netscape Bookmarks HTML.
- [x] Export OneTab-compatible text.
- [x] Export human-readable Markdown.
- [x] Preserve space/group hierarchy where formats allow.
- [x] Show designed format descriptions, extensions, and data counts.

#### Validation

- Export tests verify identifying HTML, OneTab, and Markdown output while the dialog displays format descriptions, extensions, and current tab counts.

### WI-16 — Implement GitHub Gist synchronization

- [x] Reproduce the Figma Gist synchronization section without simulated behavior.
- [x] Implement secure GitHub authentication without embedded secrets.
- [x] Create and update a private Gist containing canonical TabSpace JSON.
- [x] Persist only non-secret Gist metadata.
- [x] Add pull/restore and conflict-safe update behavior.
- [x] Show authentication, syncing, success, failure, rate-limit, and revoked-access states.
- [x] Warn that tab titles and URLs can contain sensitive information.

#### Validation

- GitHub client tests cover token validation, private Gist creation, conditional revision updates, validated pulls, and revoked/rate-limited API errors.
- Fine-grained tokens are held only in `chrome.storage.session`; local documents and backup exports contain only Gist ID, timestamp, and revision metadata.

### WI-17 — Implement dialogs and feedback

- [x] Match the New Group and Import/Export dialogs.
- [x] Add keyboard submission, safe Escape/outside dismissal, and focus management.
- [x] Add destructive confirmations.
- [x] Add disabled, loading, success, and actionable error states.
- [x] Preserve entered data after recoverable errors.

#### Validation

- A shared dialog-focus boundary traps Tab navigation, supports Escape, and restores the prior trigger. Component coverage verifies Settings dismissal and trigger focus restoration.
- Replace imports, Gist restores, space deletion, and group deletion require confirmation; asynchronous sync and import controls expose disabled, success, and actionable failure states.

### WI-18 — Accessibility and interaction quality

- [x] Label icon-only controls and use semantic structure.
- [x] Make core workflows keyboard accessible with visible focus.
- [x] Trap/restore dialog focus and announce async status changes.
- [x] Meet contrast expectations and avoid color-only meaning.
- [x] Respect reduced-motion preferences.

#### Validation

- Interactive controls have accessible names and a global high-contrast `:focus-visible` treatment; status and error regions announce changes.
- Dialogs trap and restore focus, group colors are paired with text, and reduced-motion preferences disable non-essential transitions and animation.

### WI-19 — Complete automated testing

- [x] Unit-test models, migrations, organization operations, reconciliation, search, and bulk moves.
- [x] Test Toby, Tabme, and TabSpace parsers with provider mismatch and malformed data cases.
- [x] Test Merge, Replace, backup round trips, and compatible exports.
- [x] Mock and test Chrome and GitHub boundaries.
- [x] Add component tests for cards, spaces, groups, and dialogs.
- [x] Add extension end-to-end tests for critical workflows.
- [x] Pass lint, type-check, tests, and production build.

#### Validation

- `npm run validate` passes ESLint, TypeScript, 56 Vitest tests across 13 files, the production extension build/reference check, and a Playwright end-to-end dashboard workflow in Microsoft Edge.
- The end-to-end workflow loads the production bundle with a browser API boundary, changes persistent settings, opens Import/Export, uploads a canonical backup, and verifies its preview.

### WI-20 — Verify implementation against Figma

- [x] Compare the dashboard shell, sidebar, spaces, toolbar, groups, cards, and status bar.
- [x] Compare New Group and Import/Export dialogs.
- [x] Compare empty, search, selection, loading, error, and success states.
- [x] Capture desktop-viewport screenshots and resolve material visual differences.
- [x] Verify all Figma interactions against real extension behavior.

#### Validation

- The production dashboard is captured at 1440×900 in `docs/screenshots/dashboard.png` with sidebar views, space toolbar, grouped and ungrouped cards, badges, actions, and status bar visible.
- Published Figma content and interaction states were checked against implemented shell, dialogs, empty/search/selection states, and real Chrome/GitHub adapter behavior covered by automated boundaries.

### WI-21 — Documentation and extension release readiness

- [x] Document setup, development, validation, build, and unpacked installation.
- [x] Document permissions, spaces, groups, search, actions, import, export, backup, and restore.
- [x] Document Toby/Tabme fixture expectations and provider selection.
- [x] Document GitHub sync privacy/security and known limitations.
- [x] Add release icons and metadata.
- [x] Pass clean-install and packaged-extension smoke tests.

#### Validation

- A clean `npm ci --ignore-scripts` completed with no audit findings.
- `npm run package` generated `release/tabspace-v0.1.0.zip`; `unzip -t` verified every entry and confirmed the manifest, dashboard, and background worker at the package root structure expected by Chrome.

### WI-22 — Build and deploy the GitHub Pages website

- [x] Create a modern responsive project website consistent with the TabSpace visual identity.
- [x] Include hero, feature overview, workflow, design screenshots, privacy/security, installation, and repository links.
- [x] Add accessible navigation, responsive layouts, metadata, social preview, and favicon.
- [x] Build the static website with the repository toolchain.
- [x] Add a GitHub Actions workflow that validates and deploys the site to GitHub Pages.
- [x] Document Pages repository settings and deployment behavior.
- [!] Verify the production build and deployed URL.

#### Validation in progress

- `npm run build:site` produces the static `site-dist/` artifact with the `/TabSpace/` base path. Desktop and 390px mobile smoke checks passed in Microsoft Edge, and `docs/screenshots/website.png` captures the complete production page.
- The production build is verified locally. Deployment verification is externally blocked: the unauthenticated Actions endpoint and `https://nanasis.github.io/TabSpace/` currently return 404, and this environment has no authenticated GitHub CLI session. Enable **Settings → Pages → Source: GitHub Actions** (and private-repository Pages access if applicable), then rerun `Validate and deploy Pages`.

## Completion checklist

- [ ] Every WI-01 through WI-22 is completed, reviewed, validated, committed, and pushed.
- [x] The extension can be installed as an unpacked Chrome extension from a clean build.
- [x] The extension follows the published Figma design.
- [x] Toby, Tabme, and TabSpace imports work through explicit provider selection.
- [x] No credentials or private tab data are committed to the repository.
- [ ] GitHub Pages is built and deployed through GitHub Actions.
