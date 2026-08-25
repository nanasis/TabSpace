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

The loadable extension is emitted to `dist/`. Chrome runtime behavior and installation documentation will be added in subsequent work items.
