# Expense Tracker

A simple web app for tracking expenses and a monthly budget. Everything runs locally in your browser and is saved in Local Storage.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer (no other packages are needed)

## Run the app

```
npm start
```

Then open http://localhost:3000 in your browser. To use a different port, set the `PORT` environment variable.

## Run the tests

```
npm test
```

The tests use Node's built-in test runner. Each test name starts with the requirement ID (R1–R8) it checks.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | Page design |
| `expenses.js` | Expense logic and Local Storage saving (used by the page and the tests) |
| `app.js` | Connects the page to the logic |
| `server.js` | Small local server used by `npm start` |
| `tests/expenses.test.js` | Automated tests |
| `problem.md` | The problem and requirements |
| `spec.md` | The specification |
| `docs/decisions/` | Important technical decisions |
