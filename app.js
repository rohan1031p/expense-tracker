// Page code for the Expense Tracker.
// The calculations live in expenses.js; this file connects them to the page.

let expenses = loadExpenses(localStorage);
let budget = loadBudget(localStorage);

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

// Fill the category drop-down.
function setupCategories() {
  const select = document.getElementById("category");
  for (const category of CATEGORIES) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  }
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
}

// R2, R3, R9: Draw the list of expenses with Edit and Delete buttons on each row.
function renderExpenseList() {
  const list = document.getElementById("expense-list");
  list.innerHTML = "";

  for (const expense of sortByDateNewestFirst(expenses)) {
    const row = document.createElement("tr");

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

  const isEmpty = expenses.length === 0;
  document.getElementById("empty-message").hidden = !isEmpty;
  document.getElementById("expense-table").hidden = isEmpty;
}

// R5: Draw the spending for each category.
function renderCategoryTotals() {
  const list = document.getElementById("category-list");
  list.innerHTML = "";
  const totals = getTotalsByCategory(expenses);

  for (const category of CATEGORIES) {
    if (totals[category] === undefined) {
      continue;
    }
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = category;
    const amount = document.createElement("span");
    amount.textContent = formatMoney(totals[category]);
    item.appendChild(name);
    item.appendChild(amount);
    list.appendChild(item);
  }

  if (list.children.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Nothing spent yet.";
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
  renderExpenseList();
}

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

setupCategories();
document.getElementById("date").value = todayString();
if (budget !== null) {
  document.getElementById("budget").value = budget;
}
render();
