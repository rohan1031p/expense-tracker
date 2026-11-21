# 0001: Initial implementation choices

Date: 2026-11-20

## Context

problem.md and spec.md list requirements R1–R8 but leave some details open. These are the default choices made for the first version.

## Decisions

1. **Logic is separate from the page.** `expenses.js` holds all calculations and Local Storage code and has no DOM code. The browser loads it as a normal script, and Node's test runner loads it with `require`. This lets the tests check the real logic without a browser.

2. **Storage is passed in.** Save and load functions take a `storage` object (`localStorage` in the browser, a small fake in tests), so R8 can be tested without a browser.

3. **Fixed category list.** Categories are chosen from a set list: Food, Transport, Housing, Utilities, Entertainment, Health, Shopping, Other. This keeps the category totals (R5) tidy and avoids spelling differences.

4. **Total spent (R4) covers all expenses.** The page also shows "Spent this month" so the user can compare it with the budget.

5. **Remaining budget (R7) uses the current month only.** Remaining = monthly budget − expenses dated in the current calendar month. A negative value means the user is over budget, and it is shown in red.

6. **The budget is also saved in Local Storage.** R8 only mentions expenses, but without saving the budget the user would have to set it again every time they opened the page.

7. **Money is rounded to cents.** Amounts and totals are rounded to 2 decimal places to avoid floating point results like `0.30000000000000004`.

8. **`npm start` uses a tiny built-in server.** `server.js` uses only Node's built-in modules and serves just the app's files on `127.0.0.1`. No extra packages are installed.

9. **Expenses are listed newest date first.**
