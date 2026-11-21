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