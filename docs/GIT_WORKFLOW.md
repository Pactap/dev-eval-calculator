# Git Workflow

## Branching

Use short, task-focused branches.

Recommended naming:

```text
task/<short-task-name>
feature/<short-feature-name>
fix/<short-bug-name>
docs/<short-doc-name>
```

Examples:

```text
task/professional-repo-docs
feature/scoring-audit-log
fix/locked-sprint-recalculation
docs/scoring-framework
```

## Commit Style

Use concise, imperative commit messages.

Good examples:

```text
Redesign dashboard shell
Add scoring engine tests
Document sprint lock behavior
Fix locked sprint recalculation
```

Prefer one coherent change per commit. Avoid mixing unrelated formatting, documentation, and behavior changes unless the task is explicitly a repo polish pass.

## Pull Request Expectations

Every PR should include:

- What changed.
- Why it changed.
- How it was verified.
- Screenshots for UI changes.
- Any known limitations or follow-up work.

Use the PR template in `.github/pull_request_template.md`.

## Review Checklist

Reviewers should check:

- Scoring rules remain deterministic.
- Business documentation matches behavior.
- UI remains usable in light and dark mode.
- New scoring behavior has tests.
- No unrelated generated files are committed.
- `npm run check` passes.

## Local Quality Gate

Run this before handing off a branch:

```bash
npm run check
```

This runs the Node tests and the production build.

## Files Not To Commit

The `.gitignore` excludes:

- `node_modules/`
- `dist/`
- local logs
- local assistant/tooling metadata
- OS-generated files

If a generated artifact is needed for release, document why it should be committed before adding it.
