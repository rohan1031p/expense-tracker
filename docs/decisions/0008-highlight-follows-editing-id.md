# 0008: The edit highlight is drawn from `editingId`

Date: 2026-11-22

Status: Accepted (the colour-only look was chosen by the project owner; the way it is built was chosen during implementation)

## Decision (Y-statement)

In the context of **R20, where the row of the expense being edited is highlighted in the list**,
facing **the question of how to keep the highlight correct when the list is redrawn (after a filter change, a delete, or a save) and when the user switches to another expense**,
we decided for **giving the row whose id equals `editingId` the class `editing` every time the list is drawn, and drawing the list again when editing starts or stops**
and neglected **adding and removing the class on the clicked row directly, and keeping a second variable that remembers the highlighted row**,
to achieve **one source of truth (`editingId`, which R9 already has), so the highlight cannot get out of step with edit mode, and it comes back by itself when a filtered-out row is shown again**,
accepting that **the whole list is rebuilt when Edit or Cancel is clicked, which is a little more work for the browser than changing one row (not noticeable for a personal expense list)**.

## Alternatives considered

1. **Toggle the class on the clicked row.** Less redrawing, but every redraw (filters, delete, save) throws the rows away, so the class would be lost and has to be added again anyway; it also needs code to remove it from the previous row.
2. **A separate "highlighted row" variable.** Two variables that must always agree with each other.
3. **Draw from `editingId` (chosen).**

## Related choices

- The highlight is colour only: a light blue background (`#e3f2fd`) and a blue bar (`#1565c0`) on the left. In the table the bar is an inset shadow on the first cell; on narrow screens it is the card's left border. The row's text and buttons do not change (chosen by the project owner).
- R19's count line is drawn in the same function (`renderExpenseList`) from the same two drop-downs, so it always matches the rows on screen. Its total is the number of all expenses, in line with decision 0004.
