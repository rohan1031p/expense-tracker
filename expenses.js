// Expense logic for the Expense Tracker.
// This file has no page (DOM) code, so it can be used by the browser
// and by the automated tests in Node.js.

const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Other",
];

const EXPENSES_KEY = "expenses";
const BUDGET_KEY = "monthlyBudget";

// Round a number to 2 decimal places (cents) to avoid results like 0.30000000000000004.
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

// R1: Build a new expense. Throws an Error with a helpful message if any input is invalid.
function createExpense(name, amount, category, date) {
  const cleanName = String(name || "").trim();
  if (cleanName === "") {
    throw new Error("Please enter a name.");
  }

  const numberAmount = Number(amount);
  if (amount === "" || !Number.isFinite(numberAmount) || numberAmount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  if (!CATEGORIES.includes(category)) {
    throw new Error("Please choose a category.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    throw new Error("Please enter a date.");
  }

  return {
    id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 8),
    name: cleanName,
    amount: roundMoney(numberAmount),
    category: category,
    date: date,
  };
}

// R1: Return a new list with the expense added.
function addExpense(expenses, expense) {
  return [...expenses, expense];
}

// R3: Return a new list without the expense that has this id.
function deleteExpense(expenses, id) {
  return expenses.filter((expense) => expense.id !== id);
}

// R2: Return the expenses sorted with the newest date first.
function sortByDateNewestFirst(expenses) {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date));
}

// R4: Total amount spent across all expenses.
function getTotal(expenses) {
  let total = 0;
  for (const expense of expenses) {
    total += expense.amount;
  }
  return roundMoney(total);
}

// R5: Total spent in each category, e.g. { Food: 12.5, Transport: 3 }.
// Only categories that have at least one expense are included.
function getTotalsByCategory(expenses) {
  const totals = {};
  for (const expense of expenses) {
    const current = totals[expense.category] || 0;
    totals[expense.category] = roundMoney(current + expense.amount);
  }
  return totals;
}

// The month part of a date, e.g. "2026-11-20" -> "2026-11".
function getMonth(date) {
  return date.slice(0, 7);
}

// Total spent in one month. month looks like "2026-11".
function getMonthTotal(expenses, month) {
  const inMonth = expenses.filter((expense) => getMonth(expense.date) === month);
  return getTotal(inMonth);
}

// R6: Check a budget value and return it as a number. Throws an Error if invalid.
function parseBudget(value) {
  const budget = Number(value);
  if (value === "" || !Number.isFinite(budget) || budget < 0) {
    throw new Error("Budget must be zero or more.");
  }
  return roundMoney(budget);
}

// R7: Budget left for the given month. A negative number means over budget.
function getRemainingBudget(budget, expenses, month) {
  return roundMoney(budget - getMonthTotal(expenses, month));
}

// R8: Save the expense list. storage is window.localStorage in the browser.
function saveExpenses(storage, expenses) {
  storage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

// R8: Load the expense list. Returns an empty list if nothing is saved
// or the saved data is broken.
function loadExpenses(storage) {
  const saved = storage.getItem(EXPENSES_KEY);
  if (!saved) {
    return [];
  }
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

// R6: Save the monthly budget so it is still set after reloading the page.
function saveBudget(storage, budget) {
  storage.setItem(BUDGET_KEY, String(budget));
}

// R6: Load the monthly budget. Returns null if no budget has been set.
function loadBudget(storage) {
  const saved = storage.getItem(BUDGET_KEY);
  if (saved === null) {
    return null;
  }
  const budget = Number(saved);
  return Number.isFinite(budget) ? budget : null;
}

// Let Node.js tests use these functions. In the browser they are global.
if (typeof module !== "undefined") {
  module.exports = {
    CATEGORIES,
    createExpense,
    addExpense,
    deleteExpense,
    sortByDateNewestFirst,
    getTotal,
    getTotalsByCategory,
    getMonth,
    getMonthTotal,
    parseBudget,
    getRemainingBudget,
    saveExpenses,
    loadExpenses,
    saveBudget,
    loadBudget,
  };
}
