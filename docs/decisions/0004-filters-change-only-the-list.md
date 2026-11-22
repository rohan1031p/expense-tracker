# 0004: Filters change only the expense list

Date: 2026-11-21

Status: Accepted (chosen by the project owner before implementation)

## Decision (Y-statement)

In the context of **Round 3 (R14–R16), where the user can filter expenses by category and by month**,
facing **the question of whether a filter should also change the summary numbers (total spent, spent this month, spending by category, budget remaining) or only the list of expenses**,
we decided for **filters that change only the expense list, while every total and the budget always use all expenses**
and neglected **filtering the list and the "Spending by category" box, and filtering everything on the page**,
to achieve **budget and total numbers that never change just because a filter is on, so the user can't mistake a filtered total for their real spending, and simpler code where the totals stay exactly as in R4–R7 and R12**,
accepting that **the page does not show "how much did I spend on Food in October" as one number; the user has to read it from the filtered rows**.

## Alternatives considered

1. **Filter the list and the category box.** The category box would then show only one category, or only one month's categories. This mixes filtered and unfiltered numbers on the same page.
2. **Filter everything.** "Total spent" would become "total of the filtered rows", but "Budget remaining" must still use the current month (R7). Some numbers would follow the filter and some would not, which is confusing.
3. **Only the list (chosen).**

## Related choices

- When both filters are set, an expense must match both (category **and** month).
- Filters are not saved in Local Storage; after a reload the user sees every expense again.
- `filterExpenses` in `expenses.js` returns a new list and is used only by the list drawing code in `app.js`.
