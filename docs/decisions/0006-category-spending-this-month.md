# 0006: Category budgets are compared with this month's spending

Date: 2026-11-21

Status: Accepted (chosen by the project owner before implementation). Changes how R5 was built in Round 1.

## Decision (Y-statement)

In the context of **Round 4, where R5 changed to "the app shows spending in each category compared to that category's budget" and R17 adds a monthly budget for each category**,
facing **the fact that until now the "Spending by category" box added up every expense ever entered, while the new budgets are monthly, so the two numbers on each row would cover different periods**,
we decided for **showing only the current calendar month's spending in each category, next to its budget, and renaming the box "Spending by category (this month)"**
and neglected **showing this month's spending plus the old all-time total on each row, and comparing the monthly budget with all-time spending**,
to achieve **rows where both numbers cover the same month, so "Over by" (R18) means something real, and a box that works the same way as "Budget remaining" (R7), which already uses the current month**,
accepting that **the page no longer shows an all-time total per category, and a category with spending only in earlier months disappears from the box (unless it has a budget)**.

## Alternatives considered

1. **This month, plus all-time.** Keeps the old number, but each row would have three amounts, which is harder to read and to fit on a phone screen.
2. **All time.** The smallest code change, but a monthly budget would be "used up" for good after the first month, so R18 would soon show every category as over budget.
3. **This month only (chosen).**

## Related choices

- A category is listed if it has spending this month **or** a budget, so a budget with nothing spent yet is still visible ("$0.00 of $100.00").
- "Over budget" means spending is **more than** the budget. Spending exactly equal to it is not over.
- The box still ignores the list filters (decision 0004). Choosing an old month in the Month filter does not change it.
- `getTotalsByCategory` is kept; `getCategorySummary` uses it on this month's expenses.
