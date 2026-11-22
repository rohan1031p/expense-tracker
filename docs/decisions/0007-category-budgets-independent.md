# 0007: Category budgets are independent of the overall budget

Date: 2026-11-21

Status: Accepted (chosen by the project owner before implementation)

## Decision (Y-statement)

In the context of **R17, where the user can set a separate monthly budget for each category, while the overall monthly budget from R6 and R7 already exists**,
facing **the question of whether the two kinds of budget should be linked (must the category budgets add up to the overall budget, or replace it?)**,
we decided for **keeping them independent: the overall budget and "Budget remaining" work exactly as before, and each category budget is saved and checked on its own**
and neglected **showing a warning when the category budgets add up to more than the overall budget, and replacing the overall budget with the sum of the category budgets**,
to achieve **no change to R6, R7 or their tests, simple code with no rules between the two kinds of budget, and the freedom to budget only the categories the user cares about**,
accepting that **the category budgets can add up to more (or less) than the overall budget without any warning, so the user has to keep them sensible themselves**.

## Alternatives considered

1. **Warn if the sum is larger.** Helpful, but it adds a new message and a new rule that no requirement asks for.
2. **Replace the overall budget.** Removes a field and makes the numbers always agree, but it changes R6 and R7 and would break a user's saved overall budget.
3. **Independent (chosen).**

## Related choices

- Category budgets are saved in Local Storage under their own key, `categoryBudgets`, as an object such as `{ "Food": 100 }`. The overall budget keeps its key, `monthlyBudget`.
- They are set with one form (a Category drop-down, an amount, "Set budget" and "Remove budget"), not an input on every row, so the box stays short on a phone screen.
- The amount uses the same check and message as R6 ("Budget must be zero or more."), through the same `parseBudget` function.
- When loading, entries for unknown categories or with invalid amounts are ignored, so broken saved data cannot break the page.
