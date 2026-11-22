# Claude Code Instructions

## Project

This is an Expense Tracker web app for tracking expenses and monthly budgets.

## Rules

- Read problem.md and spec.md before making changes.
- Follow the requirements in problem.md.
- Do not change or remove requirement IDs.
- Use simple HTML, CSS, and JavaScript.
- Keep the app local. Do not use API keys, logins, or paid services.
- Use Local Storage to save expenses.
- Keep the code simple and easy for a beginner to understand.
- Do not add features that are not requested without asking first.

## Testing

- Write automated tests for every requirement.
- Each test should mention the requirement ID it checks.
- Tests must check real behavior and should fail if the behavior is incorrect.
- Every requirement needs a browser test in `tests/browser.test.js` that uses the real page (forms, buttons, reload). Add a logic test in `tests/expenses.test.js` too when the requirement has logic in `expenses.js`.
- Run all tests after making changes.
- Do not say tests passed unless they actually passed.

### Notes on the test setup

- Every browser test also fails if the page logs any JavaScript or loading error (see `afterEach` in `tests/browser.test.js`). A console error in new code makes unrelated tests fail.
- Tests of invalid input must turn off the browser's own form checks first (`form.noValidate = true`), so the app's checks are tested.
- Get "today" from the page (`todayString()`), not from Node, so tests do not break around midnight or at the start of a month.
- Any new control near the list must fit at phone width (375px); add it to a "Layout (browser)" test.
- A browser test that clicks or selects something that does not exist waits 30 seconds before failing. When tests are expected to fail (tests written before the code), run `npm test` in the background or with a long timeout. For quick checks, run only `node --test tests/expenses.test.js`.
- The test server reads the app files on every request, so do not edit `index.html`, `app.js`, `expenses.js` or `style.css` while a browser test run is still going.

## Code notes

- `server.js` serves only the files listed in `FILES`. A new `.js` or `.css` file must be added there, or the page cannot load it.
- The browser tests find elements by id and class. If you rename an id or class in `index.html` or `app.js`, update the tests too.

## Working with the user

- If a requirement is unclear, ask and wait for the answer before writing code.
- At the end of a round, list every decision you made that the user did not ask for.

## Git

- Make small commits for separate changes.
- Use commit messages that explain what changed and why.
- Never amend or undo a commit.
- Do not commit secrets, passwords, or personal information.

## Project documentation

- Update spec.md when requirements or implementation decisions change.
- Record important technical decisions in docs/decisions/. Name each file with a four-digit number and a short title, e.g. `0004-short-title.md`, using the next number after the highest one there.
- Every decision record must be a Y-statement in this form: "In the context of <use case>, facing <concern>, we decided for <option> and neglected <alternatives>, to achieve <benefit>, accepting that <drawback>."
- Handoff files (`handoff-round-N.md`) are written only when the user asks, and are not committed until the user has read them.
- Keep the README.md updated with the commands to run the app and tests.