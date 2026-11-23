// Automated tests for the expense logic.
// Run with: npm test
// Each test name starts with the requirement ID it checks.

const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../expenses.js");

// A simple stand-in for the browser's localStorage.
function createFakeStorage() {
  const data = {};
  return {
    getItem(key) {
      return key in data ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
  };
}

function sampleExpense(id, amount, category, date) {
  return { id: id, name: "Item " + id, amount: amount, category: category, date: date };
}

// ---------- R1: Add an expense ----------

test("R1: createExpense builds an expense with name, amount, category, and date", () => {
  const expense = app.createExpense("Lunch", "12.50", "Food", "2026-11-20");
  assert.equal(expense.name, "Lunch");
  assert.equal(expense.amount, 12.5);
  assert.equal(expense.category, "Food");
  assert.equal(expense.date, "2026-11-20");
  assert.equal(typeof expense.id, "string");
});

test("R1: createExpense trims spaces from the name", () => {
  const expense = app.createExpense("  Bus ticket  ", 3, "Transport", "2026-11-20");
  assert.equal(expense.name, "Bus ticket");
});

test("R1: each new expense gets a different id", () => {
  const a = app.createExpense("A", 1, "Food", "2026-11-20");
  const b = app.createExpense("B", 1, "Food", "2026-11-20");
  assert.notEqual(a.id, b.id);
});

test("R1: amount must be greater than zero", () => {
  assert.throws(() => app.createExpense("Lunch", 0, "Food", "2026-11-20"), /greater than zero/);
  assert.throws(() => app.createExpense("Lunch", -5, "Food", "2026-11-20"), /greater than zero/);
  assert.throws(() => app.createExpense("Lunch", "", "Food", "2026-11-20"), /greater than zero/);
  assert.throws(() => app.createExpense("Lunch", "abc", "Food", "2026-11-20"), /greater than zero/);
});

test("R1: name, category, and date are required", () => {
  assert.throws(() => app.createExpense("   ", 5, "Food", "2026-11-20"), /name/);
  assert.throws(() => app.createExpense("Lunch", 5, "Not a category", "2026-11-20"), /category/);
  assert.throws(() => app.createExpense("Lunch", 5, "Food", ""), /date/);
});

test("R1: addExpense adds the expense to the list without changing the original list", () => {
  const original = [sampleExpense("1", 5, "Food", "2026-11-01")];
  const newExpense = sampleExpense("2", 7, "Other", "2026-11-02");
  const updated = app.addExpense(original, newExpense);
  assert.equal(updated.length, 2);
  assert.deepEqual(updated[1], newExpense);
  assert.equal(original.length, 1);
});

// ---------- R2: View expenses ----------

test("R2: expenses are listed newest date first", () => {
  const expenses = [
    sampleExpense("1", 5, "Food", "2026-10-15"),
    sampleExpense("2", 5, "Food", "2026-11-20"),
    sampleExpense("3", 5, "Food", "2026-11-01"),
  ];
  const sorted = app.sortByDateNewestFirst(expenses);
  assert.deepEqual(sorted.map((e) => e.id), ["2", "3", "1"]);
  // The original list is not changed.
  assert.deepEqual(expenses.map((e) => e.id), ["1", "2", "3"]);
});

// ---------- R3: Delete an expense ----------

test("R3: deleteExpense removes only the expense with the matching id", () => {
  const expenses = [
    sampleExpense("1", 5, "Food", "2026-11-01"),
    sampleExpense("2", 7, "Food", "2026-11-02"),
    sampleExpense("3", 9, "Food", "2026-11-03"),
  ];
  const updated = app.deleteExpense(expenses, "2");
  assert.deepEqual(updated.map((e) => e.id), ["1", "3"]);
  assert.equal(expenses.length, 3);
});

test("R3: deleting an id that does not exist leaves the list the same", () => {
  const expenses = [sampleExpense("1", 5, "Food", "2026-11-01")];
  assert.deepEqual(app.deleteExpense(expenses, "missing"), expenses);
});

// ---------- R4: Total spending ----------

test("R4: getTotal adds up all expense amounts", () => {
  const expenses = [
    sampleExpense("1", 10, "Food", "2026-11-01"),
    sampleExpense("2", 2.5, "Transport", "2026-10-02"),
    sampleExpense("3", 7.25, "Other", "2026-11-03"),
  ];
  assert.equal(app.getTotal(expenses), 19.75);
});

test("R4: getTotal is 0 when there are no expenses", () => {
  assert.equal(app.getTotal([]), 0);
});

test("R4: getTotal avoids floating point errors", () => {
  const expenses = [
    sampleExpense("1", 0.1, "Food", "2026-11-01"),
    sampleExpense("2", 0.2, "Food", "2026-11-01"),
  ];
  assert.equal(app.getTotal(expenses), 0.3);
});

// ---------- R5: Spending by category ----------

test("R5: getTotalsByCategory adds up spending in each category", () => {
  const expenses = [
    sampleExpense("1", 10, "Food", "2026-11-01"),
    sampleExpense("2", 4, "Transport", "2026-11-02"),
    sampleExpense("3", 5.5, "Food", "2026-11-03"),
  ];
  assert.deepEqual(app.getTotalsByCategory(expenses), { Food: 15.5, Transport: 4 });
});

test("R5: getTotalsByCategory is empty when there are no expenses", () => {
  assert.deepEqual(app.getTotalsByCategory([]), {});
});

// ---------- R6: Monthly budget ----------

test("R6: parseBudget accepts zero or a positive number", () => {
  assert.equal(app.parseBudget("500"), 500);
  assert.equal(app.parseBudget("0"), 0);
  assert.equal(app.parseBudget(123.456), 123.46);
});

test("R6: parseBudget rejects negative, empty, or non-number values", () => {
  assert.throws(() => app.parseBudget("-1"), /Budget/);
  assert.throws(() => app.parseBudget(""), /Budget/);
  assert.throws(() => app.parseBudget("abc"), /Budget/);
});

test("R6: the budget is saved and loaded from storage", () => {
  const storage = createFakeStorage();
  assert.equal(app.loadBudget(storage), null);
  app.saveBudget(storage, 750);
  assert.equal(app.loadBudget(storage), 750);
});

// ---------- R7: Remaining budget ----------

test("R7: remaining budget is the budget minus spending in that month only", () => {
  const expenses = [
    sampleExpense("1", 100, "Housing", "2026-11-01"),
    sampleExpense("2", 25.5, "Food", "2026-11-20"),
    sampleExpense("3", 999, "Shopping", "2026-10-31"), // different month, not counted
  ];
  assert.equal(app.getMonthTotal(expenses, "2026-11"), 125.5);
  assert.equal(app.getRemainingBudget(500, expenses, "2026-11"), 374.5);
});

test("R7: remaining budget is negative when over budget", () => {
  const expenses = [sampleExpense("1", 120, "Food", "2026-11-05")];
  assert.equal(app.getRemainingBudget(100, expenses, "2026-11"), -20);
});

test("R7: remaining budget equals the full budget when nothing is spent that month", () => {
  assert.equal(app.getRemainingBudget(300, [], "2026-11"), 300);
});

// ---------- R8: Save expenses ----------

test("R8: saved expenses can be loaded again", () => {
  const storage = createFakeStorage();
  const expenses = [
    sampleExpense("1", 10, "Food", "2026-11-01"),
    sampleExpense("2", 4, "Transport", "2026-11-02"),
  ];
  app.saveExpenses(storage, expenses);
  assert.deepEqual(app.loadExpenses(storage), expenses);
});

test("R8: loading with nothing saved gives an empty list", () => {
  assert.deepEqual(app.loadExpenses(createFakeStorage()), []);
});

test("R8: loading broken saved data gives an empty list instead of crashing", () => {
  const storage = createFakeStorage();
  storage.setItem("expenses", "{not valid json");
  assert.deepEqual(app.loadExpenses(storage), []);
});

test("R8: a deleted expense stays deleted after saving and loading", () => {
  const storage = createFakeStorage();
  let expenses = [
    sampleExpense("1", 10, "Food", "2026-11-01"),
    sampleExpense("2", 4, "Transport", "2026-11-02"),
  ];
  expenses = app.deleteExpense(expenses, "1");
  app.saveExpenses(storage, expenses);
  assert.deepEqual(app.loadExpenses(storage).map((e) => e.id), ["2"]);
});

// ---------- R9-R13: Edit an expense ----------

function sampleList() {
  return [
    sampleExpense("a", 10, "Food", "2026-11-05"),
    sampleExpense("b", 20, "Transport", "2026-11-10"),
    sampleExpense("c", 30, "Shopping", "2026-10-15"),
  ];
}

test("R9: updateExpense changes only the expense with the matching id", () => {
  const list = sampleList();
  const updated = app.updateExpense(list, "b", "Train", "25", "Transport", "2026-11-10");
  assert.equal(updated.length, 3);
  assert.deepEqual(updated[0], list[0]);
  assert.deepEqual(updated[2], list[2]);
  assert.equal(updated[1].name, "Train");
});

test("R9: updateExpense does not change the original list", () => {
  const list = sampleList();
  app.updateExpense(list, "a", "Changed", 99, "Other", "2026-01-01");
  assert.deepEqual(list, sampleList());
});

test("R9: updating an id that does not exist leaves the list the same", () => {
  const list = sampleList();
  assert.deepEqual(app.updateExpense(list, "zzz", "X", 1, "Food", "2026-11-01"), list);
});

test("R10: updateExpense changes name, amount, category, and date and keeps the id", () => {
  const updated = app.updateExpense(sampleList(), "a", "  Dinner out  ", "42.5", "Entertainment", "2026-09-30");
  assert.deepEqual(updated[0], {
    id: "a",
    name: "Dinner out",
    amount: 42.5,
    category: "Entertainment",
    date: "2026-09-30",
  });
});

test("R10: an edited amount is rounded to cents", () => {
  const updated = app.updateExpense(sampleList(), "a", "Lunch", "3.456", "Food", "2026-11-05");
  assert.equal(updated[0].amount, 3.46);
});

test("R11: an edited expense stays changed after saving and loading", () => {
  const storage = createFakeStorage();
  const updated = app.updateExpense(sampleList(), "c", "Coat", 80, "Shopping", "2026-11-01");
  app.saveExpenses(storage, updated);
  const loaded = app.loadExpenses(storage);
  assert.equal(loaded.length, 3);
  assert.deepEqual(loaded.find((e) => e.id === "c"), {
    id: "c", name: "Coat", amount: 80, category: "Shopping", date: "2026-11-01",
  });
});

test("R11: an edited expense moves to its new place in the newest-first list", () => {
  const updated = app.updateExpense(sampleList(), "c", "Item c", 30, "Shopping", "2026-11-20");
  assert.deepEqual(app.sortByDateNewestFirst(updated).map((e) => e.id), ["c", "b", "a"]);
});

test("R12: total, category totals, and remaining budget use the edited values", () => {
  // Before: a=10 Food (Nov), b=20 Transport (Nov), c=30 Shopping (Oct).
  // Edit a: 10 Food -> 15 Transport, and c: Oct -> Nov.
  let list = app.updateExpense(sampleList(), "a", "Taxi", 15, "Transport", "2026-11-05");
  list = app.updateExpense(list, "c", "Item c", 30, "Shopping", "2026-11-12");

  assert.equal(app.getTotal(list), 65);
  assert.deepEqual(app.getTotalsByCategory(list), { Transport: 35, Shopping: 30 });
  assert.equal(app.getMonthTotal(list, "2026-11"), 65);
  assert.equal(app.getRemainingBudget(100, list, "2026-11"), 35);
});

test("R12: moving an expense out of the month gives that money back to the budget", () => {
  const list = app.updateExpense(sampleList(), "b", "Item b", 20, "Transport", "2026-10-01");
  assert.equal(app.getRemainingBudget(100, list, "2026-11"), 90);
  assert.equal(app.getTotal(list), 60);
});

test("R13: an empty name is rejected and the list is not changed", () => {
  const list = sampleList();
  assert.throws(() => app.updateExpense(list, "a", "   ", 10, "Food", "2026-11-05"), /name/);
  assert.deepEqual(list, sampleList());
});

test("R13: an amount of 0 or less is rejected", () => {
  const list = sampleList();
  assert.throws(() => app.updateExpense(list, "a", "Lunch", 0, "Food", "2026-11-05"), /greater than zero/);
  assert.throws(() => app.updateExpense(list, "a", "Lunch", -3, "Food", "2026-11-05"), /greater than zero/);
  assert.throws(() => app.updateExpense(list, "a", "Lunch", "", "Food", "2026-11-05"), /greater than zero/);
  assert.throws(() => app.updateExpense(list, "a", "Lunch", "abc", "Food", "2026-11-05"), /greater than zero/);
  assert.deepEqual(list, sampleList());
});

test("R13: an unknown category or empty date is rejected, as for new expenses", () => {
  assert.throws(() => app.updateExpense(sampleList(), "a", "Lunch", 5, "Nope", "2026-11-05"), /category/);
  assert.throws(() => app.updateExpense(sampleList(), "a", "Lunch", 5, "Food", ""), /date/);
});

// ---------- R14-R16: Filter expenses ----------

function filterList() {
  return [
    sampleExpense("a", 10, "Food", "2026-11-05"),
    sampleExpense("b", 20, "Transport", "2026-11-10"),
    sampleExpense("c", 30, "Food", "2026-10-15"),
    sampleExpense("d", 40, "Shopping", "2025-11-20"),
  ];
}

function ids(list) {
  return list.map((e) => e.id);
}

test("R14: filterExpenses by category keeps only that category", () => {
  assert.deepEqual(ids(app.filterExpenses(filterList(), "Food", "")), ["a", "c"]);
  assert.deepEqual(ids(app.filterExpenses(filterList(), "Shopping", "")), ["d"]);
});

test("R14: a category with no expenses gives an empty list", () => {
  assert.deepEqual(app.filterExpenses(filterList(), "Health", ""), []);
});

test("R14: filterExpenses does not change the original list", () => {
  const list = filterList();
  app.filterExpenses(list, "Food", "2026-11");
  assert.deepEqual(list, filterList());
});

test("R15: filterExpenses by month keeps only expenses in that month and year", () => {
  // d is in November too, but of 2025, so it must not be included.
  assert.deepEqual(ids(app.filterExpenses(filterList(), "", "2026-11")), ["a", "b"]);
  assert.deepEqual(ids(app.filterExpenses(filterList(), "", "2025-11")), ["d"]);
});

test("R14, R15: with both filters, an expense must match both", () => {
  assert.deepEqual(ids(app.filterExpenses(filterList(), "Food", "2026-11")), ["a"]);
  assert.deepEqual(app.filterExpenses(filterList(), "Shopping", "2026-11"), []);
});

test("R15: getMonthsWithExpenses lists each month once, newest first", () => {
  const list = [...filterList(), sampleExpense("e", 5, "Other", "2026-11-28")];
  assert.deepEqual(app.getMonthsWithExpenses(list), ["2026-11", "2026-10", "2025-11"]);
});

test("R15: getMonthsWithExpenses is empty when there are no expenses", () => {
  assert.deepEqual(app.getMonthsWithExpenses([]), []);
});

test("R15: formatMonth shows a month like 'November 2026'", () => {
  assert.equal(app.formatMonth("2026-11"), "November 2026");
  assert.equal(app.formatMonth("2027-01"), "January 2027");
  assert.equal(app.formatMonth("2025-12"), "December 2025");
});

test("R16: with no filters (empty values), every expense is kept", () => {
  assert.deepEqual(ids(app.filterExpenses(filterList(), "", "")), ["a", "b", "c", "d"]);
});

// ---------- R5 (changed), R17, R18: Category budgets ----------

test("R5: getCategorySummary counts only spending in the given month", () => {
  const expenses = [
    sampleExpense("1", 10, "Food", "2026-11-01"),
    sampleExpense("2", 5.5, "Food", "2026-11-20"),
    sampleExpense("3", 99, "Food", "2026-10-31"),
    sampleExpense("4", 7, "Food", "2025-11-15"),
  ];
  const summary = app.getCategorySummary(expenses, {}, "2026-11");
  assert.deepEqual(summary, [
    { category: "Food", spent: 15.5, budget: null, over: false, overBy: 0 },
  ]);
});

test("R5: getCategorySummary lists categories with spending or a budget, in the fixed order", () => {
  const expenses = [
    sampleExpense("1", 30, "Shopping", "2026-11-02"),
    sampleExpense("2", 12, "Food", "2026-11-03"),
    sampleExpense("3", 50, "Health", "2026-10-03"),
  ];
  const budgets = { Transport: 40, Food: 100 };
  const summary = app.getCategorySummary(expenses, budgets, "2026-11");
  assert.deepEqual(summary, [
    { category: "Food", spent: 12, budget: 100, over: false, overBy: 0 },
    { category: "Transport", spent: 0, budget: 40, over: false, overBy: 0 },
    { category: "Shopping", spent: 30, budget: null, over: false, overBy: 0 },
  ]);
});

test("R5: getCategorySummary is empty with no spending this month and no budgets", () => {
  assert.deepEqual(app.getCategorySummary([], {}, "2026-11"), []);
  const old = [sampleExpense("1", 10, "Food", "2026-10-01")];
  assert.deepEqual(app.getCategorySummary(old, {}, "2026-11"), []);
});

test("R17: setCategoryBudget sets a budget and returns a new object", () => {
  const original = { Food: 100 };
  const budgets = app.setCategoryBudget(original, "Transport", "40.5");
  assert.deepEqual(budgets, { Food: 100, Transport: 40.5 });
  assert.deepEqual(original, { Food: 100 });
});

test("R17: setCategoryBudget replaces an existing budget, accepts zero, and rounds to cents", () => {
  assert.deepEqual(app.setCategoryBudget({ Food: 100 }, "Food", "75"), { Food: 75 });
  assert.deepEqual(app.setCategoryBudget({}, "Food", "0"), { Food: 0 });
  assert.deepEqual(app.setCategoryBudget({}, "Food", "10.456"), { Food: 10.46 });
});

test("R17: setCategoryBudget rejects negative, empty, or non-number amounts", () => {
  for (const value of ["-1", "", "abc"]) {
    assert.throws(() => app.setCategoryBudget({}, "Food", value), /Budget must be zero or more/);
  }
});

test("R17: setCategoryBudget rejects a category that is not in the list", () => {
  assert.throws(() => app.setCategoryBudget({}, "Pets", "10"), /Please choose a category/);
  assert.throws(() => app.setCategoryBudget({}, "", "10"), /Please choose a category/);
});

test("R17: removeCategoryBudget removes only that category's budget", () => {
  const original = { Food: 100, Transport: 40 };
  assert.deepEqual(app.removeCategoryBudget(original, "Food"), { Transport: 40 });
  assert.deepEqual(original, { Food: 100, Transport: 40 });
  assert.deepEqual(app.removeCategoryBudget(original, "Health"), { Food: 100, Transport: 40 });
});

test("R17: category budgets are saved and loaded from storage", () => {
  const storage = createFakeStorage();
  assert.deepEqual(app.loadCategoryBudgets(storage), {});
  app.saveCategoryBudgets(storage, { Food: 100, Other: 0 });
  assert.deepEqual(app.loadCategoryBudgets(storage), { Food: 100, Other: 0 });
});

test("R17: category budgets are saved separately from the overall budget", () => {
  const storage = createFakeStorage();
  app.saveBudget(storage, 500);
  app.saveCategoryBudgets(storage, { Food: 100 });
  assert.equal(app.loadBudget(storage), 500);
  assert.deepEqual(app.loadCategoryBudgets(storage), { Food: 100 });
});

test("R17: loading broken or invalid saved category budgets does not crash", () => {
  const storage = createFakeStorage();
  storage.setItem("categoryBudgets", "{not json");
  assert.deepEqual(app.loadCategoryBudgets(storage), {});
  storage.setItem("categoryBudgets", "[1, 2]");
  assert.deepEqual(app.loadCategoryBudgets(storage), {});
  storage.setItem("categoryBudgets", JSON.stringify({ Food: 50, Pets: 10, Health: -5, Other: "x" }));
  assert.deepEqual(app.loadCategoryBudgets(storage), { Food: 50 });
});

test("R18: a category is over budget when this month's spending is more than its budget", () => {
  const expenses = [
    sampleExpense("1", 80.1, "Food", "2026-11-01"),
    sampleExpense("2", 40.2, "Food", "2026-11-02"),
  ];
  const [food] = app.getCategorySummary(expenses, { Food: 100 }, "2026-11");
  assert.equal(food.spent, 120.3);
  assert.equal(food.over, true);
  assert.equal(food.overBy, 20.3);
});

test("R18: spending exactly equal to the budget is not over budget", () => {
  const expenses = [sampleExpense("1", 100, "Food", "2026-11-01")];
  const [food] = app.getCategorySummary(expenses, { Food: 100 }, "2026-11");
  assert.equal(food.over, false);
  assert.equal(food.overBy, 0);
});

test("R18: a category with no budget is never over; a budget of 0 with spending is over", () => {
  const expenses = [
    sampleExpense("1", 500, "Food", "2026-11-01"),
    sampleExpense("2", 3, "Other", "2026-11-01"),
  ];
  const summary = app.getCategorySummary(expenses, { Other: 0 }, "2026-11");
  assert.equal(summary[0].category, "Food");
  assert.equal(summary[0].over, false);
  assert.equal(summary[1].category, "Other");
  assert.equal(summary[1].over, true);
  assert.equal(summary[1].overBy, 3);
});

test("R18: spending from other months does not make a category over budget", () => {
  const expenses = [
    sampleExpense("1", 20, "Food", "2026-11-01"),
    sampleExpense("2", 200, "Food", "2026-10-01"),
  ];
  const [food] = app.getCategorySummary(expenses, { Food: 100 }, "2026-11");
  assert.equal(food.over, false);
});

// ---------- R19: Count of shown expenses when a filter is on ----------

test("R19: isFilterOn is false only when both filters are 'All'", () => {
  assert.equal(app.isFilterOn("", ""), false);
  assert.equal(app.isFilterOn("Food", ""), true);
  assert.equal(app.isFilterOn("", "2026-11"), true);
  assert.equal(app.isFilterOn("Food", "2026-11"), true);
});

test("R19: formatShownCount says how many are shown out of the total", () => {
  assert.equal(app.formatShownCount(2, 5), "Showing 2 of 5 expenses");
  assert.equal(app.formatShownCount(5, 5), "Showing 5 of 5 expenses");
  assert.equal(app.formatShownCount(1, 5), "Showing 1 of 5 expenses");
});

test("R19: formatShownCount shows 0 when nothing matches", () => {
  assert.equal(app.formatShownCount(0, 3), "Showing 0 of 3 expenses");
});

test("R19: formatShownCount uses 'expense' when the total is 1", () => {
  assert.equal(app.formatShownCount(1, 1), "Showing 1 of 1 expense");
  assert.equal(app.formatShownCount(0, 1), "Showing 0 of 1 expense");
});

test("R19: the count of a filtered list matches filterExpenses", () => {
  const list = filterList();
  const shown = app.filterExpenses(list, "Food", "");
  assert.equal(app.formatShownCount(shown.length, list.length), "Showing 2 of 4 expenses");
});
