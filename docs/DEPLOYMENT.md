# Deployment

## GitHub Pages

The app is configured for GitHub Pages deployment from the organization repository:

```text
Pactap/dev-eval-calculator
```

Because this is a Vite app deployed as a project page, `vite.config.js` sets the production base path to:

```text
/dev-eval-calculator/
```

Local development still uses `/`.

## Workflow

Deployment is handled by `.github/workflows/deploy-pages.yml`.

The workflow:

1. Checks out the repository.
2. Installs dependencies with `npm ci`.
3. Runs `npm run check`.
4. Uploads `dist/` as a GitHub Pages artifact.
5. Deploys the artifact to the `github-pages` environment.

## Triggering Deployment

The workflow runs on pushes to:

- `master`

It can also be started manually from GitHub Actions through `workflow_dispatch`.

## Expected URL

The default Pages URL for the organization project is:

```text
https://pactap.github.io/dev-eval-calculator/
```

If the organization has private/internal Pages access controls enabled, GitHub may restrict the site to authorized organization users.

## Release Gate

Before deployment, the workflow runs:

```bash
npm run check
```

This verifies scoring tests and the production Vite build.
