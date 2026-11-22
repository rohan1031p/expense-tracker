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
The app displays a list of saved expenses with their name, amount, category, and date. Expenses are listed newest date first. On wide screens they are shown as a table; on narrow screens (560px or less) each expense is shown as a small card with labels, so everything, including the Edit and Delete buttons, fits without scrolling sideways.

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

### R9: Edit an expense
Each expense in the list has an Edit button next to Delete. Clicking Edit puts the "Add an expense" form into edit mode:

- The heading changes to "Edit expense".
- The form is filled with that expense's current values.
- The submit button reads "Save changes".
- A Cancel button appears.
- The form scrolls into view and the Name field gets focus.

Only one expense can be edited at a time. Clicking Edit on another expense switches to that one, and any unsaved changes are dropped.

Cancel leaves edit mode without saving anything. Deleting the expense being edited also leaves edit mode.

When the user leaves edit mode (by saving or cancelling), the form goes back to adding expenses: the heading and button return to "Add an expense" and "Add expense", Name and Amount are cleared, and Date is set back to today.

### R10: Change name, amount, category, and date
All four fields can be changed while editing. The expense keeps its id, so it stays the same expense and is not added as a new one.

### R11: Save and show the edited expense
When the user clicks "Save changes", the updated expense replaces the old one, the list is saved to Local Storage, and the list shows the new values. The list is still sorted newest date first, so an expense whose date changed moves to its new place. The change is still there after a reload.

### R12: Totals update after an edit
After an edit, the total spent, spent this month, spending by category, and budget remaining are all worked out again from the updated list. For example, an expense can move from one category to another, or move into or out of the current month.

### R13: Invalid edits are not saved
Edited values are checked with the same rules as a new expense (R1): the name is required, the amount must be greater than zero, the category must be from the list, and the date is required. If any value is invalid, nothing is changed or saved, the error is shown under the form (the same messages as R1), and the form stays in edit mode so the user can fix it.

### Filters (R14-R16)
The Expenses section has a row of filters above the list: a Category drop-down, a Month drop-down, and a "Clear filters" button.

- Filters change **only the expense list**. Total spent, spent this month, spending by category, and budget remaining always use all expenses (see decision 0004).
- When both filters are set, an expense is shown only if it matches both (for example, Food **and** November 2026).
- The list stays sorted newest date first.
- If expenses exist but none match the filters, the list is hidden and the message "No expenses match the filters." is shown. If there are no expenses at all, the message is "No expenses yet." as before.
- Filters are not saved. After a reload both drop-downs are back to "All" and every expense is shown.
- Filters stay set when the user adds, edits, or deletes an expense, and the list is filtered again straight away. An expense that no longer matches (for example, after its category was edited) disappears from the filtered list but is not deleted.

### R14: Filter by category
The Category filter has "All categories" (the default) followed by the fixed category list from R1. Choosing a category shows only expenses in that category.

### R15: Filter by month
The Month filter has "All months" (the default) followed by every month that has at least one expense, newest first, shown like "November 2026". Choosing a month shows only expenses dated in that calendar month (see decision 0005). The list of months is updated whenever expenses are added, edited, or deleted. If the chosen month no longer has any expenses, the filter goes back to "All months".

### R16: Clear the filters
The "Clear filters" button sets both filters back to "All categories" and "All months", so every expense is shown again.

## Running the app

The app should run locally with:

`npm start`

This starts a small local server (`server.js`) at http://localhost:3000.

## Running tests

Automated tests should run with:

`npm test`

Tests should check the expense logic, including adding, editing, deleting, filtering, totals, category spending, and budget calculations.

Browser tests also open the real page and check every requirement through the forms and buttons, including that data is still there after a reload (R8) and that the page does not scroll sideways on a phone-sized screen.

## Implementation

- `expenses.js`: expense logic (adding, editing, deleting, filtering, totals) and Local Storage saving, with no page code, so it can be tested in Node. Adding and editing share one set of checks (`checkExpenseValues`). Filtering uses `filterExpenses`, `getMonthsWithExpenses`, and `formatMonth`.
- `app.js`: connects the page to the logic. Editing reuses the add form; `editingId` remembers which expense is being edited (see decision 0003). The filters are read from the two drop-downs each time the list is drawn, so there is no separate filter state to keep in sync.
- `server.js`: local server for `npm start`, using only built-in Node modules.
- `tests/expenses.test.js`: logic tests; each test names the requirement it checks.
- `tests/browser.test.js`: browser tests of the real page; each test names the requirement it checks.

See `docs/decisions/` for the reasons behind these choices.
