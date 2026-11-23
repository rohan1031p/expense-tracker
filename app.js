// Page code for the Expense Tracker.
// The calculations live in expenses.js; this file connects them to the page.

let expenses = loadExpenses(localStorage);
let budget = loadBudget(localStorage);
// R17: Monthly budget for each category, e.g. { Food: 100 }.
let categoryBudgets = loadCategoryBudgets(localStorage);

// R9: The id of the expense being edited, or null when the form adds new expenses.
let editingId = null;

// Show money like $12.50 (or -$20.00).
function formatMoney(value) {
  const sign = value < 0 ? "-" : "";
  return sign + "$" + Math.abs(value).toFixed(2);
}

// Today's date as "YYYY-MM-DD" in the user's local time.
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Add an <option> to a drop-down.
function addOption(select, value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  select.appendChild(option);
}

// Fill the category drop-downs: the expense form, the category filter (R14),
// and the category budget form (R17).
function setupCategories() {
  const select = document.getElementById("category");
  const filter = document.getElementById("filter-category");
  const budgetSelect = document.getElementById("category-budget-category");
  for (const category of CATEGORIES) {
    addOption(select, category, category);
    addOption(filter, category, category);
    addOption(budgetSelect, category, category);
  }
}

// R17: Show the chosen category's current budget in the Budget box (empty if none).
function showChosenCategoryBudget() {
  const category = document.getElementById("category-budget-category").value;
  const value = categoryBudgets[category];
  document.getElementById("category-budget").value = value === undefined ? "" : value;
}

// R15: Rebuild the month filter from the months that have expenses.
// The chosen month stays chosen if it still has expenses; otherwise
// the filter goes back to "All months".
function renderMonthFilter() {
  const select = document.getElementById("filter-month");
  const chosen = select.value;
  const months = getMonthsWithExpenses(expenses);

  select.innerHTML = "";
  addOption(select, "", "All months");
  for (const month of months) {
    addOption(select, month, formatMonth(month));
  }
  select.value = months.includes(chosen) ? chosen : "";
}

// R9: Put the form into edit mode, filled with this expense's values.
function startEditing(expense) {
  editingId = expense.id;
  document.getElementById("name").value = expense.name;
  document.getElementById("amount").value = expense.amount;
  document.getElementById("category").value = expense.category;
  document.getElementById("date").value = expense.date;
  document.getElementById("form-title").textContent = "Edit expense";
  document.querySelector("#expense-form button[type=submit]").textContent = "Save changes";
  document.getElementById("cancel-edit").hidden = false;
  document.getElementById("expense-error").textContent = "";
  // R20: Draw the list again so this expense's row is highlighted.
  renderExpenseList();
  document.getElementById("expense-form-card").scrollIntoView();
  document.getElementById("name").focus();
}

// R9: Go back to adding new expenses, with an empty form.
function stopEditing() {
  editingId = null;
  document.getElementById("name").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("date").value = todayString();
  document.getElementById("form-title").textContent = "Add an expense";
  document.querySelector("#expense-form button[type=submit]").textContent = "Add expense";
  document.getElementById("cancel-edit").hidden = true;
  document.getElementById("expense-error").textContent = "";
  // R20: Draw the list again so no row is highlighted.
  renderExpenseList();
}

// R2, R3, R9: Draw the list of expenses with Edit and Delete buttons on each row.
// R14, R15: Only the expenses that match the filters are drawn.
function renderExpenseList() {
  const list = document.getElementById("expense-list");
  list.innerHTML = "";

  const category = document.getElementById("filter-category").value;
  const month = document.getElementById("filter-month").value;
  const shown = filterExpenses(expenses, category, month);

  for (const expense of sortByDateNewestFirst(shown)) {
    const row = document.createElement("tr");
    // R20: Highlight the expense that is being edited.
    if (expense.id === editingId) {
      row.className = "editing";
    }

    // textContent is used so names are shown as plain text, never as HTML.
    const cells = [expense.date, expense.name, expense.category, formatMoney(expense.amount)];
    const labels = ["Date", "Name", "Category", "Amount"];
    cells.forEach((text, index) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      // The label is shown next to the value on small screens (see style.css).
      cell.dataset.label = labels[index];
      if (index === 3) {
        cell.className = "number";
      }
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    actionCell.className = "actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className = "edit";
    editButton.addEventListener("click", () => startEditing(expense));
    actionCell.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete";
    deleteButton.addEventListener("click", () => {
      // Stop editing an expense that no longer exists.
      if (expense.id === editingId) {
        stopEditing();
      }
      expenses = deleteExpense(expenses, expense.id);
      saveExpenses(localStorage, expenses);
      render();
    });
    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);

    list.appendChild(row);
  }

  const emptyMessage = document.getElementById("empty-message");
  if (expenses.length === 0) {
    emptyMessage.textContent = "No expenses yet.";
  } else {
    emptyMessage.textContent = "No expenses match the filters.";
  }
  const isEmpty = shown.length === 0;
  emptyMessage.hidden = !isEmpty;
  document.getElementById("expense-table").hidden = isEmpty;

  // R19: While a filter is on, show how many expenses are shown out of all of them.
  // With no expenses at all, "No expenses yet." is enough on its own.
  const count = document.getElementById("filter-count");
  count.textContent = formatShownCount(shown.length, expenses.length);
  count.hidden = !isFilterOn(category, month) || expenses.length === 0;
}

// R5, R18: Draw this month's spending in each category next to its budget.
// A category over its budget gets the "over" class (red) and an "Over by" amount.
function renderCategoryTotals() {
  const list = document.getElementById("category-list");
  list.innerHTML = "";
  const thisMonth = getMonth(todayString());

  for (const row of getCategorySummary(expenses, categoryBudgets, thisMonth)) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = row.category;

    const amount = document.createElement("span");
    amount.className = "category-amount";
    if (row.budget === null) {
      amount.textContent = formatMoney(row.spent) + " (no budget)";
    } else {
      amount.textContent = formatMoney(row.spent) + " of " + formatMoney(row.budget);
    }

    item.appendChild(name);
    item.appendChild(amount);

    if (row.over) {
      item.classList.add("over");
      const overBy = document.createElement("span");
      overBy.className = "over-by";
      overBy.textContent = "Over by " + formatMoney(row.overBy);
      amount.appendChild(document.createTextNode(" "));
      amount.appendChild(overBy);
    }

    // R22: A category with a budget that it is not over shows how much is left.
    if (row.left !== null) {
      const left = document.createElement("span");
      left.className = "budget-left";
      left.textContent = formatMoney(row.left) + " left";
      amount.appendChild(document.createTextNode(" "));
      amount.appendChild(left);
    }
    list.appendChild(item);
  }

  if (list.children.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Nothing spent this month.";
    list.appendChild(item);
  }
}

// R4, R7: Draw the totals and remaining budget.
function renderSummary() {
  const thisMonth = getMonth(todayString());
  document.getElementById("total").textContent = formatMoney(getTotal(expenses));
  document.getElementById("month-total").textContent = formatMoney(getMonthTotal(expenses, thisMonth));

  const remainingElement = document.getElementById("remaining");
  if (budget === null) {
    remainingElement.textContent = "No budget set";
    remainingElement.classList.remove("over");
  } else {
    const remaining = getRemainingBudget(budget, expenses, thisMonth);
    remainingElement.textContent = formatMoney(remaining) + " of " + formatMoney(budget);
    remainingElement.classList.toggle("over", remaining < 0);
  }
}

function render() {
  renderSummary();
  renderCategoryTotals();
  renderMonthFilter();
  renderExpenseList();
}

// R14, R15: Draw the list again when a filter changes.
document.getElementById("filter-category").addEventListener("change", renderExpenseList);
document.getElementById("filter-month").addEventListener("change", renderExpenseList);

// R16: Clear both filters and show every expense again.
document.getElementById("clear-filters").addEventListener("click", () => {
  document.getElementById("filter-category").value = "";
  document.getElementById("filter-month").value = "";
  renderExpenseList();
});

// R1: Add an expense when the form is submitted.
// R9-R13: While editing, save the changes to that expense instead.
document.getElementById("expense-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const errorElement = document.getElementById("expense-error");
  const name = document.getElementById("name").value;
  const amount = document.getElementById("amount").value;
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;
  try {
    if (editingId === null) {
      const expense = createExpense(name, amount, category, date);
      expenses = addExpense(expenses, expense);
    } else {
      // R13: updateExpense throws if a value is invalid, so nothing below runs
      // and the old values are kept.
      expenses = updateExpense(expenses, editingId, name, amount, category, date);
    }
    saveExpenses(localStorage, expenses);
    errorElement.textContent = "";
    if (editingId !== null) {
      stopEditing();
    }
    document.getElementById("name").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("name").focus();
    render();
  } catch (error) {
    errorElement.textContent = error.message;
  }
});

// R9: Cancel editing without saving.
document.getElementById("cancel-edit").addEventListener("click", () => {
  stopEditing();
});

// R6: Set the monthly budget when the budget form is submitted.
document.getElementById("budget-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const errorElement = document.getElementById("budget-error");
  try {
    budget = parseBudget(document.getElementById("budget").value);
    saveBudget(localStorage, budget);
    errorElement.textContent = "";
    render();
  } catch (error) {
    errorElement.textContent = error.message;
  }
});

// R17: Set the chosen category's monthly budget.
document.getElementById("category-budget-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const errorElement = document.getElementById("category-budget-error");
  const category = document.getElementById("category-budget-category").value;
  const value = document.getElementById("category-budget").value;
  try {
    categoryBudgets = setCategoryBudget(categoryBudgets, category, value);
    saveCategoryBudgets(localStorage, categoryBudgets);
    errorElement.textContent = "";
    showChosenCategoryBudget();
    renderCategoryTotals();
  } catch (error) {
    errorElement.textContent = error.message;
  }
});

// R17: Remove the chosen category's budget.
document.getElementById("remove-category-budget").addEventListener("click", () => {
  const category = document.getElementById("category-budget-category").value;
  categoryBudgets = removeCategoryBudget(categoryBudgets, category);
  saveCategoryBudgets(localStorage, categoryBudgets);
  document.getElementById("category-budget-error").textContent = "";
  showChosenCategoryBudget();
  renderCategoryTotals();
});

// R17: Choosing a category shows its current budget.
document.getElementById("category-budget-category").addEventListener("change", () => {
  document.getElementById("category-budget-error").textContent = "";
  showChosenCategoryBudget();
});

setupCategories();
showChosenCategoryBudget();
// R16: Filters are not saved, so always start with all expenses shown,
// even if the browser tries to restore the old choice after a reload.
document.getElementById("filter-category").value = "";
document.getElementById("filter-month").value = "";
document.getElementById("date").value = todayString();
if (budget !== null) {
  document.getElementById("budget").value = budget;
}
render();
