# Contributing

Thank you for improving Developer Sprint Evaluation Calculator. This project is small on purpose: keep changes focused, explain business-rule changes clearly, and protect the scoring engine with tests.

## Local Setup

```bash
npm install
npm run dev
```

## Before You Open A PR

Run:

```bash
npm run check
```

This runs scoring tests and a production build.

## Development Guidelines

- Keep scoring logic in `src/scoring.js`.
- Keep scoring configuration in `src/constants.js`.
- Add or update tests when scoring behavior changes.
- Keep components focused on rendering and interaction.
- Keep visual changes in `src/App.css` unless a component needs markup changes.
- Document business-rule changes in `docs/SCORING.md`.

## Adding A New Scoring Parameter

1. Add the band or option constants in `src/constants.js`.
2. Update `WEIGHTS` so all weights sum to `1.0`.
3. Add default sprint fields in `createSprint()`.
4. Update `computeSprintResult()` in `src/scoring.js`.
5. Add input/display UI in `SprintCard.jsx`.
6. Add a row to `ScoreTable.jsx`.
7. Update the docs in `docs/SCORING.md`.
8. Add tests in `tests/scoring.test.mjs`.

## Documentation Standard

Docs should answer three questions:

1. What does this do?
2. Why does it behave this way?
3. Where should future maintainers change it?

Avoid documenting implementation details that are likely to drift unless they matter to future maintenance.
