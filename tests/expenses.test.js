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
