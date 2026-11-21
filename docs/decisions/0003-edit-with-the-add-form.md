# 0003: Edit expenses with the existing add form

Date: 2026-11-21

Status: Accepted (chosen by the project owner before implementation)

## Decision (Y-statement)

In the context of **Round 2 (R9–R13), where the user must be able to change the name, amount, category and date of an existing expense**,
facing **the need for an editing screen that works on wide and phone-sized screens, uses the same checks as adding, and stays simple for a beginner to read**,
we decided for **reusing the "Add an expense" form in an "edit mode" (filled with the expense's values, with "Save changes" and Cancel buttons)**
and neglected **editing inline in the table row, and a separate "Edit expense" form**,
to achieve **one set of fields and one submit handler for both adding and editing, the same error messages and error area as R1 (R13), and a layout that already fits phone screens**,
accepting that **the user cannot add a new expense while editing, the form must keep track of which expense is being edited (`editingId`), and on a long list the page scrolls up to the form when Edit is clicked**.

## Alternatives considered

1. **Inline editing in the row.** Edit turns the row's cells into inputs. It is easy to see what is being changed, but each row would need its own inputs, error message and Save/Cancel buttons. It also would not fit the phone card layout (R2) without more CSS.
2. **A separate "Edit expense" form.** It is clear, but it repeats the four fields and the checks in the HTML and in `app.js`, so the two forms could drift apart.
3. **Reuse the add form (chosen).**

## Related choices

- The checks move into `checkExpenseValues` in `expenses.js`, which both `createExpense` and `updateExpense` use. Edits are therefore checked against all R1 rules (including category and date), not only the two that R13 lists.
- `updateExpense` keeps the expense's id and returns a new list, like `addExpense` and `deleteExpense`. It throws before changing anything if a value is invalid, so an invalid edit can never be saved.
- Deleting the expense being edited leaves edit mode, so the form cannot save to an expense that no longer exists.
