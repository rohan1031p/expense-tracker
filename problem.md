# Problem

Many people have trouble keeping track of how much money they spend each month. They may forget small purchases and have difficulty knowing how much money they have left in their budget.

# Initial requirements

- R1: The user can add an expense with a name, amount, category, and date.
- R2: The user can view a list of their expenses.
- R3: The user can delete an expense.
- R4: The app shows the total amount spent.
- R5: The app shows spending by category.
- R6: The user can set a monthly budget.
- R7: The app shows how much of the monthly budget is remaining.
- R8: The app saves expenses in the browser so they remain after the page is closed.


## Round 2 requirements

- R9: The user can edit an existing expense.
- R10: The user can change the expense name, amount, category, and date.
- R11: The updated expense is saved and shown in the expense list.
- R12: The total spent, spending by category, and budget remaining update correctly after an edit.
- R13: If the edited values are invalid (empty name, amount 0 or less), the change is not saved and an error is shown.


## Round 3 requirements

- R14: The user can filter expenses by category.
- R15: The user can filter expenses by month.
- R16: The user can clear the filters and see all expenses again.

## Round 4 requirements

- R5 (changed): The app shows spending in each category compared to that category's budget.
- R17: The user can set a separate monthly budget for each expense category.
- R18: The user can see when spending in a category goes over its budget.


## Round 5 requirements

- R19: When a filter is on, the expense list shows how many expenses are shown out of the total (for example, "Showing 2 of 5 expenses").
- R20: While an expense is being edited, its row in the list is highlighted so the user can see which one they are changing.