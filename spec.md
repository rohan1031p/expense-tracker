# Expense Tracker Specification

## Purpose

The Expense Tracker is a web app that helps users keep track of their expenses and monthly budget.

## Technology

- HTML for the page structure.
- CSS for the design.
- JavaScript for the app logic.
- Browser Local Storage to save expenses.
- Node.js built-in test runner for automated tests.
- playwright-core (development only) so tests can drive the page in an installed Chrome or Edge.

## Requirements

### R1: Add an expense
The user can add an expense with a name, amount, category, and date. The amount must be greater than zero. The name and date are required, and the category is chosen from a fixed list: Food, Transport, Housing, Utilities, Entertainment, Health, Shopping, Other.

### R2: View expenses
The app displays a list of saved expenses with their name, amount, category, and date. Expenses are listed newest date first. On wide screens they are shown as a table; on narrow screens (560px or less) each expense is shown as a small card with labels, so everything, including the Delete button, fits without scrolling sideways.

### R3: Delete an expense
The user can delete an expense from the list.

### R4: Total spending
The app displays the total amount spent across all expenses. It also displays the amount spent in the current month.

### R5: Spending by category
The app displays how much money was spent in each category.

### R6: Monthly budget
The user can set a monthly budget of zero or more. The budget is saved in Local Storage.

### R7: Remaining budget
The app displays how much of the monthly budget is remaining for the current month: the budget minus expenses dated in the current calendar month. A negative value means over budget and is shown in red.

### R8: Save expenses
The app saves expenses in Local Storage so they remain after the browser is closed and reopened.

## Running the app

The app should run locally with:

`npm start`

This starts a small local server (`server.js`) at http://localhost:3000.

## Running tests

Automated tests should run with:

`npm test`

Tests should check the expense logic, including adding, deleting, totals, category spending, and budget calculations.

Browser tests also open the real page and check every requirement through the forms and buttons, including that data is still there after a reload (R8) and that the page does not scroll sideways on a phone-sized screen.

## Implementation

- `expenses.js`: expense logic and Local Storage saving, with no page code, so it can be tested in Node.
- `app.js`: connects the page to the logic.
- `server.js`: local server for `npm start`, using only built-in Node modules.
- `tests/expenses.test.js`: logic tests; each test names the requirement it checks.
- `tests/browser.test.js`: browser tests of the real page; each test names the requirement it checks.

See `docs/decisions/` for the reasons behind these choices.
