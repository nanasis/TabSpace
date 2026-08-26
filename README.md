# TabSpace

TabSpace is a privacy-conscious Chrome extension for organizing open and saved tabs into persistent spaces and groups. It provides a full-page dashboard, real Chrome tab controls, portable backups, compatible exports, and optional private GitHub Gist synchronization.

**[Project website](https://nanasis.github.io/TabSpace/)** · **[Latest GitHub release](https://github.com/nanasis/TabSpace/releases/latest)** · **[Release notes](CHANGELOG.md)**

![TabSpace dashboard](docs/screenshots/dashboard.png)

## Features

- Replace Chrome's default new-tab page with the TabSpace dashboard
- Discover and reconcile open Chrome tabs without duplicates
- Activate, close, pin, search, alias, and add emoji avatars to tabs
- Create, rename, recolor, reorder, and safely delete spaces and groups
- Use Ctrl/Cmd/Shift selection and move multiple tabs at once
- Import explicitly selected Toby, Tabme, or TabSpace JSON
- Merge imports or atomically replace organization after confirmation
- Export a canonical TabSpace backup, Netscape Bookmarks HTML, OneTab text, or Markdown
- Synchronize the canonical backup through a private GitHub Gist
- Keep organization local by default in `chrome.storage.local`

## Install the GitHub release

1. Open the [latest GitHub release](https://github.com/nanasis/TabSpace/releases/latest).
2. Download `tabspace-v0.1.1.zip` from **Assets**.
3. Extract the ZIP to a permanent folder. The selected folder must directly contain `manifest.json`.
4. Open `chrome://extensions` in Chrome.
5. Enable **Developer mode**.
6. Select **Load unpacked** and choose the extracted folder.
7. Open a new tab. TabSpace now provides Chrome's default new-tab page.

Chrome does not automatically update unpacked extensions. For a future release, download and extract the new ZIP over the existing folder, then select **Reload** on the TabSpace card in `chrome://extensions`.

The release also provides `tabspace-v0.1.1.zip.sha256`. Verify it with:

```powershell
Get-FileHash .\tabspace-v0.1.1.zip -Algorithm SHA256
```

or:

```bash
sha256sum tabspace-v0.1.1.zip
```

Compare the output with the checksum file before loading the extension.

## Project website and documentation

The GitHub Pages site is available at **<https://nanasis.github.io/TabSpace/>**. It provides the product overview, privacy model, installation summary, and links back to the repository and latest release.

## Development requirements

- Chrome with Manifest V3 support
- Node.js 22.12 or newer
- npm 12
- Microsoft Edge is used by the configured local Playwright test; adjust `playwright.config.ts` if another Chromium channel is required

## Development

```bash
npm install
npm run dev
```

Available commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm test` | Run Vitest unit and component tests |
| `npm run test:e2e` | Run the production-dashboard Playwright workflow |
| `npm run build` | Build and verify the unpacked extension in `dist/` |
| `npm run package` | Build and create `release/tabspace-v0.1.1.zip` |
| `npm run validate` | Run lint, types, tests, build verification, and E2E |

## Install a source build locally in Chrome

1. Run `npm install` and `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose this repository's `dist/` directory.
6. Open a new Chrome tab to use TabSpace as the default new-tab page. The toolbar icon also opens or focuses an existing TabSpace dashboard.

After changing source code, rebuild and select **Reload** on the TabSpace extension card. Chrome allows only one extension to control the new-tab page; if another extension already does so, Chrome may ask which override to keep.

## Usage

### Spaces and groups

New tabs enter the most recently active space as Ungrouped. Groups are persistent bookmark collections: closing a Chrome tab removes it only from the sidebar and keeps its card, group, alias, and icon. Reopening the same URL reconnects the live tab to that existing card. The sidebar lists every currently open tab in the dashboard's Chrome window, regardless of which TabSpace space or group owns it. Drag an open sidebar tab onto a group, or onto **New group** to create a default group automatically. Tab cards can also be dragged between groups or back to Ungrouped. Use the space toolbar to create or switch spaces. Deleting a group moves its tabs to Ungrouped. Deleting a space keeps its Chrome tabs open and moves their records ungrouped to the first remaining space. The final space cannot be deleted.

### Search, layout, and tab actions

Search matches aliases, titles, domains, and URLs. Select a card title to activate/open the tab. **Edit** opens a dashboard-styled editor for the alias and card icon: keep the default site icon, choose an emoji, or upload a local image up to 192 KB. Custom images remain in local storage and TabSpace backups. The card footer provides Edit and Pin actions with hover descriptions; the top X on a grouped card removes it from that group and moves it to Ungrouped without closing the browser tab. Change the avatar from its icon, drag cards between groups, or use Ctrl/Cmd/Shift selection for bulk movement.

Under **Settings → Tab card density**, choose **Dense** to use the full GroupSpace width and dynamically fit more cards per row while preserving Compact card width, padding, and gaps. Choose **Compact** to retain the original bounded responsive layout. Existing `comfortable` settings are migrated to Compact automatically.

### Import and export

Open **Settings → Import data**. Choose TabSpace, Toby, or Tabme from the styled provider bar before selecting or dropping a JSON file; TabSpace intentionally does not guess the provider. Use the separate **Settings → Export data** action when downloading backups or compatible formats.

- **Toby:** organization, account, and list-array JSON exports using collections (`lists`) and links (`cards`)
- **Tabme:** backup profile using spaces, folders/collections, and `items`; direct links and nested `groupItems` are flattened into their containing TabSpace group. See the sanitized fixture at `src/transfer/fixtures/tabme-backup.json`
- **TabSpace:** canonical `tabspace-backup.json`

Review the preview and warnings, then choose **Merge** or confirmed **Replace**. After a successful import, the dialog closes and the imported workspace appears immediately. Imported favicon URLs are sanitized and retained, with a conventional site favicon fallback. Unsupported or unsafe non-HTTP(S) tab URLs are skipped and reported. The sanitized Toby fixture is at `src/transfer/fixtures/toby-export.json`.

Exports preserve space/group hierarchy where the target format permits it. Backup and export files contain tab titles and URLs and should be treated as sensitive.

### Private GitHub Gist synchronization

1. Open [GitHub token creation](https://github.com/settings/tokens/new?scopes=gist&description=TabSpace), or navigate to **GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Choose **Generate new token (classic)**, enter a descriptive note such as `TabSpace`, and choose an expiration.
3. Select only the **`gist`** scope. No repository scope is required.
4. Generate and copy the token; GitHub displays it only once.
5. Open TabSpace **Settings** and paste it into **Private GitHub Gist sync**, then select **Connect**.
6. TabSpace searches that GitHub account for the newest valid private Gist containing `tabspace-backup.json`. If one exists—such as a backup created on another device—the existing Gist ID and history version are linked automatically and **Pull** becomes available immediately.
7. If no backup exists, choose **Create private Gist**. Use **Push update** to save later changes and confirmed **Pull** to restore the remote backup on another device.

Never post, commit, or send a token in chat. If one is exposed, revoke it immediately under **GitHub Settings → Developer settings → Personal access tokens** and create a replacement.

The token is held only in `chrome.storage.session`, is cleared when disconnected or the browser session ends, and is never stored in the canonical document or export. TabSpace persists only the Gist ID, last-sync time, and Gist history version. A remote version check prevents silently overwriting a changed Gist.

Private Gists are not end-to-end encrypted. GitHub can process their contents, including sensitive tab titles and URLs.

## Permissions

- `tabs`: discover tab metadata and perform requested activation, close, and pin actions
- `storage`: persist organization locally and hold a GitHub token for the current browser session
- `https://api.github.com/*`: create, update, and retrieve a private Gist when the user enables synchronization

TabSpace does not inject scripts into websites and does not request browsing-history permission.

## Data safety

- Runtime validation rejects malformed documents and undeclared secret fields.
- Outdated documents migrate in place.
- Invalid local documents recover to a safe `My Space` state while retaining only non-sensitive recovery metadata.
- Backups omit Chrome runtime IDs, credentials, and synchronization metadata.
- No sample Work, Research, or Personal spaces are seeded.

## Known v1 limitations

- Chrome is the only supported browser target.
- A Tabme export that differs from the documented fixture profile may require a parser update because Tabme does not publish a stable public JSON schema.
- Imported saved tabs are represented in the dashboard and open when selected; imports do not automatically open every URL.
- GitHub authentication uses a user-provided classic token with only the `gist` scope rather than an OAuth application.
- Cross-device synchronization occurs only when the user explicitly pushes or pulls.

## Packaging

```bash
npm run package
```

The ZIP places `manifest.json` at its root and can be inspected or submitted as a release artifact. Never commit browser profiles, tokens, exported backups, or other files containing private tab data.

## License

MIT
