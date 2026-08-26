# Changelog

All notable changes to TabSpace are documented here.

## Unreleased

### Changed

- Keep newly opened tabs sidebar-only until explicitly collected by the user
- Hide the Ungrouped collection until it contains explicitly collected cards
- Delete bookmark cards without closing live browser tabs or moving them to Ungrouped
- Exclude sidebar-only runtime records from search, counts, backups, and exports

## [0.1.1] - 2026-08-26

### Added

- Automatic discovery of existing private TabSpace Gists after GitHub connection
- Cross-device restore readiness without manually copying a Gist ID
- Pagination across up to 1,000 recent Gists and validation of matching backup files

### Changed

- Prefer the official TabSpace synchronization Gist, then the newest valid matching backup
- Clear stale local Gist metadata when the connected account has no TabSpace backup
- Generalize the tag-triggered release workflow for version-matched packages and notes

## [0.1.0] - 2026-08-26

### Added

- Chrome Manifest V3 new-tab dashboard and toolbar open-or-focus behavior
- Current-window open-tab sidebar with pinned filtering
- Persistent bookmark spaces, groups, aliases, icons, and drag-and-drop organization
- Dense and Compact responsive card layouts
- Search, modifier selection, and single-pass bulk movement
- Toby, Tabme, and TabSpace imports with preview, Merge, and confirmed Replace
- TabSpace backup, Bookmarks HTML, OneTab text, and Markdown exports
- Private GitHub Gist push/pull synchronization with session-only PAT storage
- Accessible dialogs, focus management, feedback, and reduced-motion support
- GitHub Pages project website and automated release packaging

### Security and reliability

- Strict versioned runtime validation and safe invalid-storage recovery
- Backup exclusion of credentials, sync metadata, and Chrome runtime identifiers
- Gist history-version conflict checks
- Sanitized imported URLs and favicon metadata
- Unit, component, Chrome/GitHub boundary, production build, and Playwright coverage

[0.1.1]: https://github.com/nanasis/TabSpace/releases/tag/v0.1.1
[0.1.0]: https://github.com/nanasis/TabSpace/releases/tag/v0.1.0
