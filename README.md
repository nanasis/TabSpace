# TabSpace

TabSpace is a Chrome extension for organizing open tabs into focused spaces and groups.

## Development

Requirements:

- Node.js 22.12 or newer
- npm 12

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Run all local quality checks:

```bash
npm run validate
```

Build the unpacked Chrome extension:

```bash
npm run build
```

The loadable extension is emitted to `dist/`.

## Test locally in Chrome

1. Run `npm install` and `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose this repository's `dist/` directory.
5. Pin TabSpace to the toolbar and select its icon. The extension opens or focuses the full dashboard.

After changing source code, run `npm run build` again and select **Reload** on the TabSpace card in `chrome://extensions`.

The current local-test build supports live Chrome tab discovery, activation, closing, pinning, spaces, groups, aliases, avatars, search, multi-selection, and bulk movement. Import/export and GitHub Gist synchronization are planned but are not yet available.

## Permissions in the local-test build

- `tabs`: discover tab titles and URLs and perform requested tab actions.
- `storage`: persist spaces, groups, tab organization, and settings locally.
- `https://api.github.com/*`: reserved for the planned private Gist synchronization workflow; no GitHub requests are made yet.

Tab organization stays in `chrome.storage.local`. Do not commit browser profile data or exported tab backups because titles and URLs may be sensitive.
