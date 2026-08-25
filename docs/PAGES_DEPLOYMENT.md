# GitHub Pages deployment

The `Validate and deploy Pages` workflow builds and deploys the TabSpace website whenever `main` changes or the workflow is manually dispatched.

## Repository configuration

1. Open **Settings → Pages** in the GitHub repository.
2. Set **Source** to **GitHub Actions**.
3. Keep the default `github-pages` environment protection rules, or require approval if desired.
4. Ensure Actions are allowed to use the repository's declared actions.

The workflow receives only `contents: read`, `pages: write`, and `id-token: write`. It does not use repository secrets.

## Build behavior

The build job performs a clean npm install, lint, type-check, unit/component tests, the production extension build, and the static website build. It uploads `site-dist/` as the Pages artifact. Deployment runs only after that job succeeds.

The Vite site base is `/TabSpace/`, producing the expected project URL:

<https://nanasis.github.io/TabSpace/>

A failed validation or build leaves the previously deployed site unchanged. The Pages environment and workflow summary expose the final deployment URL and status.
