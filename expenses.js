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
const CATEGORY_BUDGETS_KEY = "categoryBudgets";

// Round a number to 2 decimal places (cents) to avoid results like 0.30000000000000004.
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

// R1, R13: Check the values for an expense and return them cleaned up.
// Throws an Error with a helpful message if any value is invalid.
// Used both when adding (R1) and when editing (R13), so the rules are the same.
function checkExpenseValues(name, amount, category, date) {
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
    name: cleanName,
    amount: roundMoney(numberAmount),
    category: category,
    date: date,
  };
}

// R1: Build a new expense. Throws an Error if any input is invalid.
function createExpense(name, amount, category, date) {
  const values = checkExpenseValues(name, amount, category, date);
  return {
    id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 8),
    name: values.name,
    amount: values.amount,
    category: values.category,
    date: values.date,
  };
}

// R9-R11, R13: Return a new list where the expense with this id has the new values.
// The id stays the same. Throws an Error (and changes nothing) if any value is invalid.
// If no expense has this id, the list is returned unchanged.
function updateExpense(expenses, id, name, amount, category, date) {
  const values = checkExpenseValues(name, amount, category, date);
  return expenses.map((expense) => {
    if (expense.id !== id) {
      return expense;
    }
    return {
      id: expense.id,
      name: values.name,
      amount: values.amount,
      category: values.category,
      date: values.date,
    };
  });
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
// getCategorySummary uses this on one month's expenses.
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

// R14, R15: Return only the expenses that match the filters.
// category is a category name, or "" for all categories.
// month looks like "2026-11", or "" for all months.
// When both are set, an expense must match both.
function filterExpenses(expenses, category, month) {
  return expenses.filter((expense) => {
    const categoryMatches = category === "" || expense.category === category;
    const monthMatches = month === "" || getMonth(expense.date) === month;
    return categoryMatches && monthMatches;
  });
}

// R15: The months that have at least one expense, each listed once, newest first.
// For example: ["2026-11", "2026-10"].
function getMonthsWithExpenses(expenses) {
  const months = [];
  for (const expense of expenses) {
    const month = getMonth(expense.date);
    if (!months.includes(month)) {
      months.push(month);
    }
  }
  return months.sort().reverse();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// R15: Show a month like "2026-11" as "November 2026".
function formatMonth(month) {
  const [year, monthNumber] = month.split("-");
  return MONTH_NAMES[Number(monthNumber) - 1] + " " + year;
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

// R17: Return a new budgets object with this category's monthly budget set.
// budgets looks like { Food: 100, Transport: 40 }.
// Throws an Error if the category is not in the list or the amount is invalid.
function setCategoryBudget(budgets, category, value) {
  if (!CATEGORIES.includes(category)) {
    throw new Error("Please choose a category.");
  }
  const amount = parseBudget(value);
  return { ...budgets, [category]: amount };
}

// R17: Return a new budgets object without this category's budget.
function removeCategoryBudget(budgets, category) {
  const copy = { ...budgets };
  delete copy[category];
  return copy;
}

// R5, R17, R18: Compare each category's spending in one month with its budget.
// month looks like "2026-11". Returns a list in the fixed category order, e.g.
// [{ category: "Food", spent: 120, budget: 100, over: true, overBy: 20 }].
// A category is included if it has spending that month or a budget.
// budget is null when the category has no budget.
// over is true only when spending is more than the budget.
function getCategorySummary(expenses, budgets, month) {
  const inMonth = expenses.filter((expense) => getMonth(expense.date) === month);
  const totals = getTotalsByCategory(inMonth);
  const summary = [];

  for (const category of CATEGORIES) {
    const spent = totals[category] || 0;
    const budget = budgets[category] === undefined ? null : budgets[category];
    if (totals[category] === undefined && budget === null) {
      continue;
    }
    const over = budget !== null && spent > budget;
    summary.push({
      category: category,
      spent: spent,
      budget: budget,
      over: over,
      overBy: over ? roundMoney(spent - budget) : 0,
    });
  }
  return summary;
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

// R17: Save the category budgets so they are still set after reloading the page.
function saveCategoryBudgets(storage, budgets) {
  storage.setItem(CATEGORY_BUDGETS_KEY, JSON.stringify(budgets));
}

// R17: Load the category budgets. Returns {} if nothing is saved or the data is broken.
// Unknown categories and invalid amounts are left out.
function loadCategoryBudgets(storage) {
  const saved = storage.getItem(CATEGORY_BUDGETS_KEY);
  if (!saved) {
    return {};
  }
  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    return {};
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  const budgets = {};
  for (const category of CATEGORIES) {
    const value = parsed[category];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      budgets[category] = value;
    }
  }
  return budgets;
}

// R19: A filter is on when either drop-down is not set to "All" (an empty value).
function isFilterOn(category, month) {
  return category !== "" || month !== "";
}

// R19: The count shown above a filtered list, e.g. "Showing 2 of 5 expenses".
// The word is "expense" when there is only one expense in total.
function formatShownCount(shown, total) {
  const word = total === 1 ? "expense" : "expenses";
  return "Showing " + shown + " of " + total + " " + word;
}

// Let Node.js tests use these functions. In the browser they are global.
if (typeof module !== "undefined") {
  module.exports = {
    CATEGORIES,
    createExpense,
    addExpense,
    updateExpense,
    deleteExpense,
    sortByDateNewestFirst,
    getTotal,
    getTotalsByCategory,
    getMonth,
    getMonthTotal,
    filterExpenses,
    getMonthsWithExpenses,
    formatMonth,
    isFilterOn,
    formatShownCount,
    parseBudget,
    getRemainingBudget,
    saveExpenses,
    loadExpenses,
    saveBudget,
    loadBudget,
    setCategoryBudget,
    removeCategoryBudget,
    getCategorySummary,
    saveCategoryBudgets,
    loadCategoryBudgets,
  };
}
