# 0002: Browser tests with playwright-core

Date: 2026-11-20

## Context

The logic tests (decision 0001) check `expenses.js` but not the page. Running the real page in a browser found a bug they could not catch: on a phone-sized screen the expense table was wider than its card. Bugs in `app.js`, such as forgetting to save after deleting, would also go unnoticed.

## Decision

Add `tests/browser.test.js`, which opens the real page in a hidden browser and checks each requirement through the forms and buttons.

- **playwright-core 1.48.2** is added as a development dependency, pinned to an exact version. It is only used by the tests; the app still needs no packages.
- **The installed Chrome or Edge is used** (`channel: "chrome"`, then `"msedge"`) instead of downloading a separate browser. If neither is installed, the browser tests fail with a message saying so, rather than being silently skipped.
- **`server.js` exports `startServer`** and only starts by itself when run directly. The tests start it on a free port (port 0), so they do not clash with an app already running on port 3000.
- **Each test uses a fresh browser context**, so Local Storage starts empty and tests do not affect each other.
- **Every browser test also fails if the page logs a JavaScript or loading error.**

## Consequences

- `npm install` is needed once before `npm test`.
- `npm test` takes a few seconds longer.
- Both test files run with `npm test`.
