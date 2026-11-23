// Browser tests: open the real page in Chrome (or Edge) and use it like a person would.
// Run with: npm test
// Each test name starts with the requirement ID it checks.
// Each test gets a fresh browser context, so Local Storage starts empty.

const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { startServer } = require("../server.js");
const fs = require("node:fs");

let server;
let baseUrl;
let browser;
let context;
let page;
let pageErrors;

// Use the Chrome or Edge already installed on this computer.
async function launchInstalledBrowser() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel: channel, headless: true });
    } catch (error) {
      // Not installed; try the next one.
    }
  }
  throw new Error("Browser tests need Google Chrome or Microsoft Edge installed.");
}

before(async () => {
  server = await new Promise((resolve) => startServer(0, resolve));
  baseUrl = "http://127.0.0.1:" + server.address().port;
  browser = await launchInstalledBrowser();
});

after(async () => {
  if (browser) await browser.close();
  if (server) server.close();
});

beforeEach(async () => {
  context = await browser.newContext();
  page = await context.newPage();
  pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  await page.goto(baseUrl);
});

afterEach(async () => {
  await context.close();
  assert.deepEqual(pageErrors, [], "the page should have no JavaScript or loading errors");
});

// ---------- Helpers ----------

async function addExpense(name, amount, category, date) {
  await page.fill("#name", name);
  await page.fill("#amount", amount);
  await page.selectOption("#category", category);
  await page.fill("#date", date);
  await page.click("#expense-form button[type=submit]");
}

async function setBudget(amount) {
  await page.fill("#budget", amount);
  await page.click("#budget-form button[type=submit]");
}

async function today() {
  return page.evaluate(() => todayString());
}

// A date in the month before the current one, e.g. "2026-10-15".
function lastMonthDate(todayValue) {
  const [year, month] = todayValue.split("-").map(Number);
  const y = month === 1 ? year - 1 : year;
  const m = month === 1 ? 12 : month - 1;
  return y + "-" + String(m).padStart(2, "0") + "-15";
}

async function rowCount() {
  return page.locator("#expense-list tr").count();
}

async function text(selector) {
  return (await page.textContent(selector)).trim();
}

// ---------- R1: Add an expense ----------

test("R1 (browser): adding an expense through the form shows it in the list", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);

  const cells = await page.$$eval("#expense-list tr:first-child td", (tds) => tds.map((td) => td.textContent));
  assert.deepEqual(cells.slice(0, 4), [date, "Groceries", "Food", "$45.20"]);
  assert.equal(await text("#expense-error"), "");
});

test("R1 (browser): an amount of zero shows an error and is not added", async () => {
  // Turn off the browser's own form checks so the app's check is tested.
  await page.$eval("#expense-form", (form) => (form.noValidate = true));
  await addExpense("Free thing", "0", "Other", await today());

  assert.equal(await text("#expense-error"), "Amount must be greater than zero.");
  assert.equal(await rowCount(), 0);
});

// ---------- R2: View expenses ----------

test("R2 (browser): the list shows every expense, newest date first", async () => {
  const date = await today();
  await addExpense("Old jacket", "60", "Shopping", lastMonthDate(date));
  await addExpense("Coffee", "4.80", "Food", date);

  assert.equal(await rowCount(), 2);
  assert.equal(await text("#expense-list tr:nth-child(1) td:nth-child(2)"), "Coffee");
  assert.equal(await text("#expense-list tr:nth-child(2) td:nth-child(2)"), "Old jacket");
  assert.equal(await page.isVisible("#empty-message"), false);
});

test("R2 (browser): an empty list shows a 'No expenses yet' message", async () => {
  assert.equal(await page.isVisible("#empty-message"), true);
  assert.equal(await page.isVisible("#expense-table"), false);
});

test("R2 (browser): expense names are shown as plain text, not HTML", async () => {
  await addExpense("<b>bold</b>", "1", "Other", await today());
  assert.equal(await text("#expense-list tr td:nth-child(2)"), "<b>bold</b>");
});

// ---------- R3: Delete an expense ----------

test("R3 (browser): clicking Delete removes only that expense", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);

  await page.locator("#expense-list tr", { hasText: "Bus pass" }).locator("button.delete").click();

  assert.equal(await rowCount(), 1);
  assert.equal(await text("#expense-list tr td:nth-child(2)"), "Groceries");
  assert.equal(await text("#total"), "$45.20");
});

// ---------- R4: Total spending ----------

test("R4 (browser): total spent adds up all expenses; this month's spending is shown too", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);
  await addExpense("Old jacket", "60", "Shopping", lastMonthDate(date));

  assert.equal(await text("#total"), "$135.20");
  assert.equal(await text("#month-total"), "$75.20");
});

// ---------- R5: Spending by category ----------

// The rows of the "Spending by category" box, as plain text with single spaces.
async function categoryRows() {
  return page.$$eval("#category-list li", (lis) =>
    lis.map((li) => li.innerText.replace(/\s+/g, " ").trim())
  );
}

test("R5 (browser): spending this month is shown for each category, without a budget", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Coffee", "4.80", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);
  // Last month's spending is not counted in the category box (R5 changed in Round 4).
  await addExpense("Old lunch", "12", "Food", lastMonthDate(date));

  assert.deepEqual(await categoryRows(), ["Food $50.00 (no budget)", "Transport $30.00 (no budget)"]);
  assert.match(await text("#category-heading"), /this month/);
});

// ---------- R6: Monthly budget ----------

test("R6 (browser): the user can set a monthly budget", async () => {
  assert.equal(await text("#remaining"), "No budget set");
  await setBudget("100");
  assert.equal(await text("#remaining"), "$100.00 of $100.00");
});

test("R6 (browser): a negative budget shows an error", async () => {
  await page.$eval("#budget-form", (form) => (form.noValidate = true));
  await setBudget("-5");
  assert.equal(await text("#budget-error"), "Budget must be zero or more.");
  assert.equal(await text("#remaining"), "No budget set");
});

// ---------- R7: Remaining budget ----------

test("R7 (browser): remaining budget counts only this month and updates after changes", async () => {
  const date = await today();
  await setBudget("100");
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Old jacket", "60", "Shopping", lastMonthDate(date));
  assert.equal(await text("#remaining"), "$54.80 of $100.00");

  await page.locator("#expense-list tr", { hasText: "Groceries" }).locator("button.delete").click();
  assert.equal(await text("#remaining"), "$100.00 of $100.00");
});

test("R7 (browser): going over budget shows a negative amount in red", async () => {
  await setBudget("50");
  await addExpense("Rent share", "75", "Housing", await today());

  assert.equal(await text("#remaining"), "-$25.00 of $50.00");
  assert.equal(await page.$eval("#remaining", (el) => el.classList.contains("over")), true);
});

// ---------- R8: Save expenses ----------

test("R8 (browser): expenses and the budget are still there after reloading the page", async () => {
  const date = await today();
  await setBudget("100");
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);
  await page.locator("#expense-list tr", { hasText: "Bus pass" }).locator("button.delete").click();

  await page.reload();

  assert.equal(await rowCount(), 1);
  assert.equal(await text("#expense-list tr td:nth-child(2)"), "Groceries");
  assert.equal(await text("#total"), "$45.20");
  assert.equal(await page.inputValue("#budget"), "100");
  assert.equal(await text("#remaining"), "$54.80 of $100.00");
});

// ---------- R9-R13: Edit an expense ----------

function rowWith(name) {
  return page.locator("#expense-list tr", { hasText: name });
}

async function startEditing(name) {
  await rowWith(name).locator("button.edit").click();
}

async function fillExpenseForm(name, amount, category, date) {
  await page.fill("#name", name);
  await page.fill("#amount", amount);
  await page.selectOption("#category", category);
  await page.fill("#date", date);
}

async function submitText() {
  return text("#expense-form button[type=submit]");
}

test("R9 (browser): clicking Edit fills the form with that expense and switches to edit mode", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", lastMonthDate(date));

  await startEditing("Bus pass");

  assert.equal(await text("#form-title"), "Edit expense");
  assert.equal(await submitText(), "Save changes");
  assert.equal(await page.isVisible("#cancel-edit"), true);
  assert.equal(await page.inputValue("#name"), "Bus pass");
  assert.equal(await page.inputValue("#amount"), "30");
  assert.equal(await page.inputValue("#category"), "Transport");
  assert.equal(await page.inputValue("#date"), lastMonthDate(date));
  assert.equal(await page.evaluate(() => document.activeElement.id), "name");
});

test("R9 (browser): Cancel leaves edit mode without changing the expense", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);

  await startEditing("Groceries");
  await page.fill("#name", "Changed my mind");
  await page.click("#cancel-edit");

  assert.equal(await text("#form-title"), "Add an expense");
  assert.equal(await submitText(), "Add expense");
  assert.equal(await page.isVisible("#cancel-edit"), false);
  assert.equal(await page.inputValue("#name"), "");
  assert.equal(await rowCount(), 1);
  assert.equal(await text("#expense-list tr td:nth-child(2)"), "Groceries");
});

test("R9 (browser): deleting the expense being edited leaves edit mode", async () => {
  await addExpense("Groceries", "45.20", "Food", await today());
  await startEditing("Groceries");
  await rowWith("Groceries").locator("button.delete").click();

  assert.equal(await rowCount(), 0);
  assert.equal(await text("#form-title"), "Add an expense");
  assert.equal(await page.isVisible("#cancel-edit"), false);

  // The form adds a new expense again, rather than saving to the deleted one.
  await addExpense("Coffee", "4", "Food", await today());
  assert.equal(await rowCount(), 1);
});

test("R10 (browser): name, amount, category, and date can all be changed", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);

  await startEditing("Groceries");
  await fillExpenseForm("Cinema", "12.75", "Entertainment", lastMonthDate(date));
  await page.click("#expense-form button[type=submit]");

  const cells = await page.$$eval("#expense-list tr:first-child td", (tds) => tds.map((td) => td.textContent));
  assert.deepEqual(cells.slice(0, 4), [lastMonthDate(date), "Cinema", "Entertainment", "$12.75"]);
});

test("R11 (browser): saving updates the row instead of adding a new one and returns to add mode", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);

  await startEditing("Groceries");
  await page.fill("#name", "Big shop");
  await page.click("#expense-form button[type=submit]");

  assert.equal(await rowCount(), 2);
  assert.equal(await rowWith("Groceries").count(), 0);
  assert.equal(await rowWith("Big shop").count(), 1);
  assert.equal(await text("#form-title"), "Add an expense");
  assert.equal(await submitText(), "Add expense");
  assert.equal(await page.inputValue("#name"), "");
  assert.equal(await page.inputValue("#date"), date);
  assert.equal(await text("#expense-error"), "");
});

test("R11 (browser): an edited date moves the expense to its new place in the list", async () => {
  const date = await today();
  await addExpense("Coffee", "4", "Food", date);
  await addExpense("Old jacket", "60", "Shopping", lastMonthDate(date));

  await startEditing("Coffee");
  await page.fill("#date", "2000-01-01");
  await page.click("#expense-form button[type=submit]");

  assert.equal(await text("#expense-list tr:nth-child(1) td:nth-child(2)"), "Old jacket");
  assert.equal(await text("#expense-list tr:nth-child(2) td:nth-child(2)"), "Coffee");
});

test("R11 (browser): the edited expense is still there after reloading the page", async () => {
  await addExpense("Groceries", "45.20", "Food", await today());
  await startEditing("Groceries");
  await fillExpenseForm("Pharmacy", "9.99", "Health", "2026-03-04");
  await page.click("#expense-form button[type=submit]");

  await page.reload();

  assert.equal(await rowCount(), 1);
  const cells = await page.$$eval("#expense-list tr td", (tds) => tds.map((td) => td.textContent));
  assert.deepEqual(cells.slice(0, 4), ["2026-03-04", "Pharmacy", "Health", "$9.99"]);
});

test("R12 (browser): totals, category spending, and budget remaining update after an edit", async () => {
  const date = await today();
  await setBudget("100");
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);
  assert.equal(await text("#remaining"), "$24.80 of $100.00");

  // Change the amount and category, and move it out of this month.
  await startEditing("Groceries");
  await fillExpenseForm("Groceries", "50", "Transport", lastMonthDate(date));
  await page.click("#expense-form button[type=submit]");

  assert.equal(await text("#total"), "$80.00");
  assert.equal(await text("#month-total"), "$30.00");
  assert.equal(await text("#remaining"), "$70.00 of $100.00");
  // Groceries moved to last month, so only the bus pass counts in this month's category box.
  assert.deepEqual(await categoryRows(), ["Transport $30.00 (no budget)"]);
});

test("R13 (browser): an empty name shows an error and nothing is changed", async () => {
  await page.$eval("#expense-form", (form) => (form.noValidate = true));
  await addExpense("Groceries", "45.20", "Food", await today());

  await startEditing("Groceries");
  await page.fill("#name", "   ");
  await page.fill("#amount", "99");
  await page.click("#expense-form button[type=submit]");

  assert.equal(await text("#expense-error"), "Please enter a name.");
  assert.equal(await text("#expense-list tr td:nth-child(2)"), "Groceries");
  assert.equal(await text("#total"), "$45.20");
  // Still editing, so the user can fix the mistake.
  assert.equal(await text("#form-title"), "Edit expense");

  await page.reload();
  assert.equal(await text("#expense-list tr td:nth-child(2)"), "Groceries");
  assert.equal(await text("#total"), "$45.20");
});

test("R13 (browser): an amount of 0 or less shows an error and nothing is changed", async () => {
  await page.$eval("#expense-form", (form) => (form.noValidate = true));
  await addExpense("Groceries", "45.20", "Food", await today());

  for (const badAmount of ["0", "-5"]) {
    await startEditing("Groceries");
    await page.fill("#amount", badAmount);
    await page.click("#expense-form button[type=submit]");

    assert.equal(await text("#expense-error"), "Amount must be greater than zero.");
    assert.equal(await text("#expense-list tr td:nth-child(4)"), "$45.20");
    assert.equal(await rowCount(), 1);
    await page.click("#cancel-edit");
  }

  await page.reload();
  assert.equal(await text("#expense-list tr td:nth-child(4)"), "$45.20");
});

test("R13 (browser): after an error, fixing the value and saving works", async () => {
  await page.$eval("#expense-form", (form) => (form.noValidate = true));
  await addExpense("Groceries", "45.20", "Food", await today());

  await startEditing("Groceries");
  await page.fill("#amount", "0");
  await page.click("#expense-form button[type=submit]");
  await page.fill("#amount", "50");
  await page.click("#expense-form button[type=submit]");

  assert.equal(await text("#expense-error"), "");
  assert.equal(await text("#total"), "$50.00");
  assert.equal(await rowCount(), 1);
});

// ---------- R14-R16: Filter expenses ----------

// The names in the list, from top to bottom.
async function listedNames() {
  return page.$$eval("#expense-list tr td:nth-child(2)", (tds) => tds.map((td) => td.textContent));
}

async function optionLabels(selector) {
  return page.$$eval(selector + " option", (options) => options.map((o) => o.textContent));
}

// The label the page shows for the month of a date, e.g. "November 2026".
async function monthLabel(date) {
  return page.evaluate((d) => formatMonth(getMonth(d)), date);
}

// Adds expenses in this month and last month, in two categories. Returns today's date.
async function addFilterExamples() {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);
  await addExpense("Old lunch", "12", "Food", lastMonthDate(date));
  return date;
}

test("R14 (browser): choosing a category shows only that category's expenses", async () => {
  await addFilterExamples();
  assert.equal(await page.inputValue("#filter-category"), "");
  assert.deepEqual(await optionLabels("#filter-category"), [
    "All categories", "Food", "Transport", "Housing", "Utilities", "Entertainment", "Health", "Shopping", "Other",
  ]);

  await page.selectOption("#filter-category", "Food");
  assert.deepEqual(await listedNames(), ["Groceries", "Old lunch"]);

  await page.selectOption("#filter-category", "Transport");
  assert.deepEqual(await listedNames(), ["Bus pass"]);
});

test("R14 (browser): the filter changes only the list, not the totals or budget", async () => {
  await setBudget("100");
  await addFilterExamples();
  await page.selectOption("#filter-category", "Transport");

  assert.equal(await text("#total"), "$87.20");
  assert.equal(await text("#month-total"), "$75.20");
  assert.equal(await text("#remaining"), "$24.80 of $100.00");
  // The category box shows this month's spending (R5) and ignores the filter.
  assert.deepEqual(await categoryRows(), ["Food $45.20 (no budget)", "Transport $30.00 (no budget)"]);
});

test("R14 (browser): a category with no expenses shows a 'no matches' message", async () => {
  await addFilterExamples();
  await page.selectOption("#filter-category", "Health");

  assert.equal(await page.isVisible("#expense-table"), false);
  assert.equal(await page.isVisible("#empty-message"), true);
  assert.equal(await text("#empty-message"), "No expenses match the filters.");
});

test("R14 (browser): with no expenses at all, the message still says 'No expenses yet.'", async () => {
  await page.selectOption("#filter-category", "Food");
  assert.equal(await text("#empty-message"), "No expenses yet.");
});

test("R14 (browser): an edited expense that no longer matches leaves the filtered list but is kept", async () => {
  await addFilterExamples();
  await page.selectOption("#filter-category", "Food");
  await startEditing("Groceries");
  await page.selectOption("#category", "Shopping");
  await page.click("#expense-form button[type=submit]");

  assert.deepEqual(await listedNames(), ["Old lunch"]);
  assert.equal(await page.inputValue("#filter-category"), "Food");
  await page.selectOption("#filter-category", "Shopping");
  assert.deepEqual(await listedNames(), ["Groceries"]);
});

test("R15 (browser): the month filter lists months that have expenses, newest first", async () => {
  const date = await addFilterExamples();
  assert.equal(await page.inputValue("#filter-month"), "");
  assert.deepEqual(await optionLabels("#filter-month"), [
    "All months", await monthLabel(date), await monthLabel(lastMonthDate(date)),
  ]);
});

test("R15 (browser): choosing a month shows only that month's expenses", async () => {
  const date = await addFilterExamples();

  await page.selectOption("#filter-month", lastMonthDate(date).slice(0, 7));
  assert.deepEqual(await listedNames(), ["Old lunch"]);

  await page.selectOption("#filter-month", date.slice(0, 7));
  assert.deepEqual(await listedNames(), ["Groceries", "Bus pass"]);
});

test("R15 (browser): category and month filters together show only expenses matching both", async () => {
  const date = await addFilterExamples();
  await page.selectOption("#filter-category", "Food");
  await page.selectOption("#filter-month", date.slice(0, 7));
  assert.deepEqual(await listedNames(), ["Groceries"]);
});

test("R15 (browser): the month list updates when expenses are added, edited, or deleted", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  assert.deepEqual(await optionLabels("#filter-month"), ["All months", await monthLabel(date)]);

  await addExpense("Concert", "80", "Entertainment", "2025-03-09");
  assert.equal((await optionLabels("#filter-month")).includes("March 2025"), true);

  await startEditing("Concert");
  await page.fill("#date", "2025-04-01");
  await page.click("#expense-form button[type=submit]");
  const afterEdit = await optionLabels("#filter-month");
  assert.equal(afterEdit.includes("March 2025"), false);
  assert.equal(afterEdit.includes("April 2025"), true);

  await rowWith("Concert").locator("button.delete").click();
  assert.equal((await optionLabels("#filter-month")).includes("April 2025"), false);
});

test("R15 (browser): if the chosen month has no expenses left, the filter goes back to all months", async () => {
  const date = await addFilterExamples();
  await page.selectOption("#filter-month", lastMonthDate(date).slice(0, 7));
  await rowWith("Old lunch").locator("button.delete").click();

  assert.equal(await page.inputValue("#filter-month"), "");
  assert.deepEqual(await listedNames(), ["Groceries", "Bus pass"]);
});

test("R16 (browser): Clear filters shows all expenses again", async () => {
  const date = await addFilterExamples();
  await page.selectOption("#filter-category", "Food");
  await page.selectOption("#filter-month", date.slice(0, 7));
  assert.deepEqual(await listedNames(), ["Groceries"]);

  await page.click("#clear-filters");

  assert.equal(await page.inputValue("#filter-category"), "");
  assert.equal(await page.inputValue("#filter-month"), "");
  assert.deepEqual(await listedNames(), ["Groceries", "Bus pass", "Old lunch"]);
});

test("R16 (browser): Clear filters hides the 'no matches' message", async () => {
  await addFilterExamples();
  await page.selectOption("#filter-category", "Health");
  await page.click("#clear-filters");

  assert.equal(await page.isVisible("#empty-message"), false);
  assert.equal(await rowCount(), 3);
});

test("R16 (browser): filters are not saved, so after a reload all expenses are shown", async () => {
  await addFilterExamples();
  await page.selectOption("#filter-category", "Transport");
  await page.reload();

  assert.equal(await page.inputValue("#filter-category"), "");
  assert.equal(await page.inputValue("#filter-month"), "");
  assert.equal(await rowCount(), 3);
});

// ---------- R5 (changed), R17, R18: Category budgets ----------

async function setCategoryBudget(category, amount) {
  await page.selectOption("#category-budget-category", category);
  await page.fill("#category-budget", amount);
  await page.click("#category-budget-form button[type=submit]");
}

async function removeCategoryBudget(category) {
  await page.selectOption("#category-budget-category", category);
  await page.click("#remove-category-budget");
}

// The rows of the category box that are marked as over budget.
async function overRows() {
  return page.$$eval("#category-list li.over", (lis) =>
    lis.map((li) => li.innerText.replace(/\s+/g, " ").trim())
  );
}

test("R5 (browser): with nothing spent this month and no budgets, the box says so", async () => {
  assert.deepEqual(await categoryRows(), ["Nothing spent this month."]);
  await addExpense("Old lunch", "12", "Food", lastMonthDate(await today()));
  assert.deepEqual(await categoryRows(), ["Nothing spent this month."]);
});

test("R5 (browser): each category's spending is shown next to its budget", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);
  await setCategoryBudget("Food", "100");
  await setCategoryBudget("Health", "25");

  assert.deepEqual(await categoryRows(), [
    "Food $45.20 of $100.00 $54.80 left",
    "Transport $30.00 (no budget)",
    "Health $0.00 of $25.00 $25.00 left",
  ]);
});

test("R17 (browser): the category budget form lists every category", async () => {
  assert.deepEqual(await optionLabels("#category-budget-category"), [
    "Food", "Transport", "Housing", "Utilities", "Entertainment", "Health", "Shopping", "Other",
  ]);
});

test("R17 (browser): setting a budget again replaces it, and choosing a category shows its budget", async () => {
  await setCategoryBudget("Food", "100");
  await setCategoryBudget("Food", "80");
  assert.deepEqual(await categoryRows(), ["Food $0.00 of $80.00 $80.00 left"]);
  assert.equal(await text("#category-budget-error"), "");

  await page.selectOption("#category-budget-category", "Transport");
  assert.equal(await page.inputValue("#category-budget"), "");
  await page.selectOption("#category-budget-category", "Food");
  assert.equal(await page.inputValue("#category-budget"), "80");
});

test("R17 (browser): Remove budget removes only that category's budget", async () => {
  await addExpense("Groceries", "45.20", "Food", await today());
  await setCategoryBudget("Food", "100");
  await setCategoryBudget("Health", "25");

  await removeCategoryBudget("Food");
  assert.deepEqual(await categoryRows(), ["Food $45.20 (no budget)", "Health $0.00 of $25.00 $25.00 left"]);
  assert.equal(await page.inputValue("#category-budget"), "");

  // Health has no spending, so without a budget it is no longer listed.
  await removeCategoryBudget("Health");
  assert.deepEqual(await categoryRows(), ["Food $45.20 (no budget)"]);
});

test("R17 (browser): a negative or empty category budget shows an error and is not saved", async () => {
  await page.$eval("#category-budget-form", (form) => (form.noValidate = true));
  await setCategoryBudget("Food", "-5");
  assert.equal(await text("#category-budget-error"), "Budget must be zero or more.");
  assert.deepEqual(await categoryRows(), ["Nothing spent this month."]);

  await setCategoryBudget("Food", "");
  assert.equal(await text("#category-budget-error"), "Budget must be zero or more.");
  assert.deepEqual(await categoryRows(), ["Nothing spent this month."]);

  // Fixing the amount saves it and clears the error.
  await setCategoryBudget("Food", "60");
  assert.equal(await text("#category-budget-error"), "");
  assert.deepEqual(await categoryRows(), ["Food $0.00 of $60.00 $60.00 left"]);
});

test("R17 (browser): category budgets are still there after reloading the page", async () => {
  await setCategoryBudget("Food", "100");
  await setCategoryBudget("Transport", "40");
  await removeCategoryBudget("Transport");
  await setCategoryBudget("Other", "0");

  await page.reload();

  assert.deepEqual(await categoryRows(), ["Food $0.00 of $100.00 $100.00 left", "Other $0.00 of $0.00 $0.00 left"]);
  assert.equal(await page.inputValue("#category-budget-category"), "Food");
  assert.equal(await page.inputValue("#category-budget"), "100");
});

test("R17 (browser): category budgets are separate from the overall monthly budget", async () => {
  await setBudget("500");
  await addExpense("Groceries", "45.20", "Food", await today());
  await setCategoryBudget("Food", "20");

  // Food is over its own budget, but the overall budget is not affected.
  assert.equal(await text("#remaining"), "$454.80 of $500.00");
  assert.equal(await page.$eval("#remaining", (el) => el.classList.contains("over")), false);

  // Changing the overall budget does not change the category budget.
  await setBudget("50");
  assert.deepEqual(await categoryRows(), ["Food $45.20 of $20.00 Over by $25.20"]);
});

test("R18 (browser): a category over its budget is shown in red with the amount it is over by", async () => {
  const date = await today();
  await setCategoryBudget("Food", "100");
  await setCategoryBudget("Transport", "50");
  await addExpense("Groceries", "80", "Food", date);
  await addExpense("Dinner", "40", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);

  assert.deepEqual(await categoryRows(), [
    "Food $120.00 of $100.00 Over by $20.00",
    "Transport $30.00 of $50.00 $20.00 left",
  ]);
  assert.deepEqual(await overRows(), ["Food $120.00 of $100.00 Over by $20.00"]);
  const overColor = await page.$eval("#category-list li.over", (li) => getComputedStyle(li).color);
  assert.equal(overColor, "rgb(198, 40, 40)");
  const normalColor = await page.$eval("#category-list li:not(.over)", (li) => getComputedStyle(li).color);
  assert.notEqual(normalColor, "rgb(198, 40, 40)");
});

test("R18 (browser): spending exactly at the budget, or with no budget, is not over", async () => {
  const date = await today();
  await setCategoryBudget("Food", "50");
  await addExpense("Groceries", "50", "Food", date);
  await addExpense("Big shop", "900", "Shopping", date);

  assert.deepEqual(await categoryRows(), ["Food $50.00 of $50.00 $0.00 left", "Shopping $900.00 (no budget)"]);
  assert.deepEqual(await overRows(), []);
});

test("R18 (browser): the over-budget warning updates after adding, editing, deleting, and changing the budget", async () => {
  const date = await today();
  await setCategoryBudget("Food", "50");
  await addExpense("Groceries", "45", "Food", date);
  assert.deepEqual(await overRows(), []);

  await addExpense("Snack", "10", "Food", date);
  assert.deepEqual(await overRows(), ["Food $55.00 of $50.00 Over by $5.00"]);

  // Moving the snack to another category takes Food back under budget.
  await startEditing("Snack");
  await fillExpenseForm("Snack", "10", "Other", date);
  await page.click("#expense-form button[type=submit]");
  assert.deepEqual(await overRows(), []);

  // A big amount moved into last month does not count against this month.
  await startEditing("Groceries");
  await fillExpenseForm("Groceries", "200", "Food", lastMonthDate(date));
  await page.click("#expense-form button[type=submit]");
  assert.deepEqual(await overRows(), []);

  await addExpense("Dinner", "60", "Food", date);
  assert.deepEqual(await overRows(), ["Food $60.00 of $50.00 Over by $10.00"]);

  await setCategoryBudget("Food", "70");
  assert.deepEqual(await overRows(), []);

  await setCategoryBudget("Food", "30");
  assert.deepEqual(await overRows(), ["Food $60.00 of $30.00 Over by $30.00"]);
  await rowWith("Dinner").locator("button.delete").click();
  assert.deepEqual(await overRows(), []);
  assert.deepEqual(await categoryRows(), ["Food $0.00 of $30.00 $30.00 left", "Other $10.00 (no budget)"]);
});

test("R18 (browser): the over-budget warning is still shown after reloading the page", async () => {
  await setCategoryBudget("Food", "10");
  await addExpense("Groceries", "45.20", "Food", await today());
  await page.reload();
  assert.deepEqual(await overRows(), ["Food $45.20 of $10.00 Over by $35.20"]);
});

test("R18 (browser): the list filters do not change the category box", async () => {
  const date = await today();
  await setCategoryBudget("Food", "10");
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);
  await page.selectOption("#filter-category", "Transport");

  assert.deepEqual(await overRows(), ["Food $45.20 of $10.00 Over by $35.20"]);
});

// ---------- R19: Count of shown expenses when a filter is on ----------

test("R19 (browser): with no filter on, no count is shown", async () => {
  await addFilterExamples();
  assert.equal(await page.isVisible("#filter-count"), false);
});

test("R19 (browser): a category filter shows how many expenses are shown out of the total", async () => {
  await addFilterExamples();
  await page.selectOption("#filter-category", "Food");

  assert.equal(await page.isVisible("#filter-count"), true);
  assert.equal(await text("#filter-count"), "Showing 2 of 3 expenses");
  assert.equal(await rowCount(), 2);
});

test("R19 (browser): a month filter, and both filters together, show the count", async () => {
  const date = await addFilterExamples();
  await page.selectOption("#filter-month", lastMonthDate(date).slice(0, 7));
  assert.equal(await text("#filter-count"), "Showing 1 of 3 expenses");

  await page.selectOption("#filter-month", date.slice(0, 7));
  assert.equal(await text("#filter-count"), "Showing 2 of 3 expenses");

  await page.selectOption("#filter-category", "Transport");
  assert.equal(await text("#filter-count"), "Showing 1 of 3 expenses");
});

test("R19 (browser): when nothing matches, the count shows 0 above the 'no matches' message", async () => {
  await addFilterExamples();
  await page.selectOption("#filter-category", "Health");

  assert.equal(await page.isVisible("#filter-count"), true);
  assert.equal(await text("#filter-count"), "Showing 0 of 3 expenses");
  assert.equal(await page.isVisible("#empty-message"), true);
  assert.equal(await text("#empty-message"), "No expenses match the filters.");

  const count = await page.locator("#filter-count").boundingBox();
  const message = await page.locator("#empty-message").boundingBox();
  assert.ok(count.y < message.y, "the count is above the message");
});

test("R19 (browser): the count is between the filters and the list", async () => {
  await addFilterExamples();
  await page.selectOption("#filter-category", "Food");

  const filters = await page.locator(".filters").boundingBox();
  const count = await page.locator("#filter-count").boundingBox();
  const table = await page.locator("#expense-table").boundingBox();
  assert.ok(count.y >= filters.y + filters.height, "the count is below the filters");
  assert.ok(count.y + count.height <= table.y, "the count is above the list");
});

test("R19 (browser): the count is hidden after clearing the filters or choosing 'All' again", async () => {
  const date = await addFilterExamples();
  await page.selectOption("#filter-category", "Food");
  await page.selectOption("#filter-month", date.slice(0, 7));
  await page.click("#clear-filters");
  assert.equal(await page.isVisible("#filter-count"), false);

  await page.selectOption("#filter-month", date.slice(0, 7));
  assert.equal(await page.isVisible("#filter-count"), true);
  await page.selectOption("#filter-month", "");
  assert.equal(await page.isVisible("#filter-count"), false);
});

test("R19 (browser): the count updates when expenses are added, edited, or deleted", async () => {
  const date = await addFilterExamples();
  await page.selectOption("#filter-category", "Food");
  assert.equal(await text("#filter-count"), "Showing 2 of 3 expenses");

  await addExpense("Dinner", "25", "Food", date);
  assert.equal(await text("#filter-count"), "Showing 3 of 4 expenses");

  // An added expense that does not match is still counted in the total.
  await addExpense("Cinema", "15", "Entertainment", date);
  assert.equal(await text("#filter-count"), "Showing 3 of 5 expenses");

  await startEditing("Dinner");
  await page.selectOption("#category", "Shopping");
  await page.click("#expense-form button[type=submit]");
  assert.equal(await text("#filter-count"), "Showing 2 of 5 expenses");

  await rowWith("Groceries").locator("button.delete").click();
  assert.equal(await text("#filter-count"), "Showing 1 of 4 expenses");
});

test("R19 (browser): with one expense in total, the count says 'expense'", async () => {
  await addExpense("Groceries", "45.20", "Food", await today());
  await page.selectOption("#filter-category", "Food");
  assert.equal(await text("#filter-count"), "Showing 1 of 1 expense");
});

test("R19 (browser): with no expenses at all, only 'No expenses yet.' is shown", async () => {
  await page.selectOption("#filter-category", "Food");
  assert.equal(await page.isVisible("#filter-count"), false);
  assert.equal(await text("#empty-message"), "No expenses yet.");
});

test("R19 (browser): filters are not saved, so after a reload no count is shown", async () => {
  await addFilterExamples();
  await page.selectOption("#filter-category", "Food");
  await page.reload();
  assert.equal(await page.isVisible("#filter-count"), false);
});

// ---------- R20: Highlight the expense being edited ----------

// The names of the rows that are highlighted as being edited.
async function highlightedNames() {
  return page.$$eval("#expense-list tr.editing td:nth-child(2)", (tds) => tds.map((td) => td.textContent));
}

async function rowBackground(name) {
  return rowWith(name).evaluate((row) => getComputedStyle(row).backgroundColor);
}

const HIGHLIGHT = "rgb(227, 242, 253)";
const NO_BACKGROUND = "rgba(0, 0, 0, 0)";

test("R20 (browser): no row is highlighted before Edit is clicked", async () => {
  await addFilterExamples();
  assert.deepEqual(await highlightedNames(), []);
  assert.equal(await rowBackground("Groceries"), NO_BACKGROUND);
});

test("R20 (browser): clicking Edit highlights only that expense's row", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");

  assert.deepEqual(await highlightedNames(), ["Bus pass"]);
  assert.equal(await rowBackground("Bus pass"), HIGHLIGHT);
  assert.equal(await rowBackground("Groceries"), NO_BACKGROUND);
  assert.equal(await rowBackground("Old lunch"), NO_BACKGROUND);
  // The row's text and buttons do not change.
  const cells = await rowWith("Bus pass").locator("td").allTextContents();
  assert.deepEqual(cells.slice(1, 4), ["Bus pass", "Transport", "$30.00"]);
  assert.equal(await rowWith("Bus pass").locator("button.edit").textContent(), "Edit");
});

test("R20 (browser): the highlighted row has a blue bar on its left edge", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");
  const bar = await rowWith("Bus pass").locator("td").first().evaluate((td) => getComputedStyle(td).boxShadow);
  assert.match(bar, /rgb\(21, 101, 192\).*inset/);
  const other = await rowWith("Groceries").locator("td").first().evaluate((td) => getComputedStyle(td).boxShadow);
  assert.equal(other, "none");
});

test("R20 (browser): clicking Edit on another expense moves the highlight", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");
  await startEditing("Old lunch");

  assert.deepEqual(await highlightedNames(), ["Old lunch"]);
  assert.equal(await rowBackground("Bus pass"), NO_BACKGROUND);
});

test("R20 (browser): Cancel removes the highlight", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");
  await page.click("#cancel-edit");

  assert.deepEqual(await highlightedNames(), []);
  assert.equal(await rowBackground("Bus pass"), NO_BACKGROUND);
});

test("R20 (browser): saving the changes removes the highlight", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");
  await page.fill("#name", "Train ticket");
  await page.click("#expense-form button[type=submit]");

  assert.deepEqual(await highlightedNames(), []);
  assert.equal(await rowBackground("Train ticket"), NO_BACKGROUND);
});

test("R20 (browser): deleting the expense being edited leaves no row highlighted", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");
  await rowWith("Bus pass").locator("button.delete").click();

  assert.deepEqual(await highlightedNames(), []);
  assert.deepEqual(await listedNames(), ["Groceries", "Old lunch"]);
});

test("R20 (browser): deleting another expense keeps the highlight on the one being edited", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");
  await rowWith("Groceries").locator("button.delete").click();

  assert.deepEqual(await highlightedNames(), ["Bus pass"]);
  assert.equal(await text("#form-title"), "Edit expense");
});

test("R20 (browser): after an invalid change the row stays highlighted", async () => {
  await page.$eval("#expense-form", (form) => (form.noValidate = true));
  await addFilterExamples();
  await startEditing("Bus pass");
  await page.fill("#name", "");
  await page.click("#expense-form button[type=submit]");

  assert.equal(await text("#expense-error"), "Please enter a name.");
  assert.deepEqual(await highlightedNames(), ["Bus pass"]);
});

test("R20 (browser): a row hidden by a filter is highlighted again when it is shown", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");

  await page.selectOption("#filter-category", "Food");
  assert.deepEqual(await highlightedNames(), []);

  await page.click("#clear-filters");
  assert.deepEqual(await highlightedNames(), ["Bus pass"]);
});

test("R20 (browser): after a reload no row is highlighted", async () => {
  await addFilterExamples();
  await startEditing("Bus pass");
  await page.reload();

  assert.deepEqual(await highlightedNames(), []);
  assert.equal(await text("#form-title"), "Add an expense");
});

// ---------- R21: Export expenses to a CSV file ----------

const BOM = "﻿";
const CSV_HEADER = "Date,Name,Category,Amount\r\n";

// Clicks the export button and returns the downloaded file's name and text.
async function exportCsv() {
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export-csv")]);
  const content = fs.readFileSync(await download.path(), "utf8");
  return { name: download.suggestedFilename(), content: content };
}

test("R21 (browser): the export button downloads expenses.csv with every expense, newest first", async () => {
  const date = await addFilterExamples();
  assert.equal(await text("#export-csv"), "Export all expenses (CSV)");

  const file = await exportCsv();
  assert.equal(file.name, "expenses.csv");
  assert.equal(
    file.content,
    BOM + CSV_HEADER +
      date + ",Groceries,Food,45.20\r\n" +
      date + ",Bus pass,Transport,30.00\r\n" +
      lastMonthDate(date) + ",Old lunch,Food,12.00\r\n"
  );
});

test("R21 (browser): with filters on, the file still has every expense", async () => {
  const date = await addFilterExamples();
  await page.selectOption("#filter-category", "Transport");
  await page.selectOption("#filter-month", date.slice(0, 7));
  assert.deepEqual(await listedNames(), ["Bus pass"]);

  const lines = (await exportCsv()).content.split("\r\n");
  assert.equal(lines.length, 5, "header, 3 expenses, and the empty text after the last line break");
  assert.deepEqual(lines.slice(1, 4).map((line) => line.split(",")[1]), ["Groceries", "Bus pass", "Old lunch"]);
  // Exporting does not change the filtered list.
  assert.deepEqual(await listedNames(), ["Bus pass"]);
});

test("R21 (browser): names with commas, quotes, or letters like é are written correctly", async () => {
  const date = await today();
  await addExpense('Bus, "return"', "3", "Transport", date);
  await addExpense("Café", "4.5", "Food", lastMonthDate(date));

  const file = await exportCsv();
  assert.ok(file.content.startsWith(BOM), "the file starts with a byte order mark");
  assert.equal(
    file.content,
    BOM + CSV_HEADER +
      date + ',"Bus, ""return""",Transport,3.00\r\n' +
      lastMonthDate(date) + ",Café,Food,4.50\r\n"
  );
});

test("R21 (browser): the file has the current values after an edit, a delete, and a reload", async () => {
  const date = await addFilterExamples();
  await startEditing("Bus pass");
  await fillExpenseForm("Train ticket", "42", "Transport", date);
  await page.click("#expense-form button[type=submit]");
  await rowWith("Old lunch").locator("button.delete").click();
  await page.reload();

  assert.equal(
    (await exportCsv()).content,
    BOM + CSV_HEADER + date + ",Groceries,Food,45.20\r\n" + date + ",Train ticket,Transport,42.00\r\n"
  );
});

test("R21 (browser): with no expenses, the file has only the header", async () => {
  const file = await exportCsv();
  assert.equal(file.name, "expenses.csv");
  assert.equal(file.content, BOM + CSV_HEADER);
});

test("R21 (browser): exporting does not change the page or Local Storage", async () => {
  await addFilterExamples();
  await setCategoryBudget("Food", "100");
  const storageBefore = await page.evaluate(() => JSON.stringify(localStorage));
  const rowsBefore = await categoryRows();
  const namesBefore = await listedNames();

  await exportCsv();

  assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), storageBefore);
  assert.deepEqual(await categoryRows(), rowsBefore);
  assert.deepEqual(await listedNames(), namesBefore);
  assert.equal(await text("#total"), "$87.20");
});

// ---------- R22: Budget left in each category this month ----------

test("R22 (browser): each category with a budget shows how much of it is left this month", async () => {
  const date = await today();
  await setCategoryBudget("Food", "100");
  await setCategoryBudget("Health", "25");
  await addExpense("Groceries", "45.20", "Food", date);
  // Last month's spending does not count against this month's budget.
  await addExpense("Old lunch", "30", "Food", lastMonthDate(date));
  await addExpense("Bus pass", "30", "Transport", date);

  assert.deepEqual(await categoryRows(), [
    "Food $45.20 of $100.00 $54.80 left",
    "Transport $30.00 (no budget)",
    "Health $0.00 of $25.00 $25.00 left",
  ]);
});

test("R22 (browser): a category over its budget shows 'Over by' and no amount left", async () => {
  await setCategoryBudget("Food", "100");
  await addExpense("Groceries", "120", "Food", await today());

  assert.deepEqual(await categoryRows(), ["Food $120.00 of $100.00 Over by $20.00"]);
  assert.doesNotMatch(await text("#category-list"), /left/);
});

test("R22 (browser): the amount left updates after adding, editing, deleting, and changing the budget", async () => {
  const date = await today();
  await setCategoryBudget("Food", "50");
  assert.deepEqual(await categoryRows(), ["Food $0.00 of $50.00 $50.00 left"]);

  await addExpense("Groceries", "20", "Food", date);
  assert.deepEqual(await categoryRows(), ["Food $20.00 of $50.00 $30.00 left"]);

  await startEditing("Groceries");
  await fillExpenseForm("Groceries", "50", "Food", date);
  await page.click("#expense-form button[type=submit]");
  assert.deepEqual(await categoryRows(), ["Food $50.00 of $50.00 $0.00 left"]);

  await setCategoryBudget("Food", "80.50");
  assert.deepEqual(await categoryRows(), ["Food $50.00 of $80.50 $30.50 left"]);

  await setCategoryBudget("Food", "40");
  assert.deepEqual(await categoryRows(), ["Food $50.00 of $40.00 Over by $10.00"]);

  await rowWith("Groceries").locator("button.delete").click();
  assert.deepEqual(await categoryRows(), ["Food $0.00 of $40.00 $40.00 left"]);

  await addExpense("Snack", "5", "Food", date);
  await removeCategoryBudget("Food");
  assert.deepEqual(await categoryRows(), ["Food $5.00 (no budget)"]);
});

test("R22 (browser): the amount left ignores the list filters and is still there after a reload", async () => {
  const date = await today();
  await setCategoryBudget("Food", "100");
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);

  await page.selectOption("#filter-category", "Transport");
  assert.deepEqual(await categoryRows(), ["Food $45.20 of $100.00 $54.80 left", "Transport $30.00 (no budget)"]);

  await page.reload();
  assert.deepEqual(await categoryRows(), ["Food $45.20 of $100.00 $54.80 left", "Transport $30.00 (no budget)"]);
});

// ---------- Layout ----------

test("Layout (browser): the export button and a category row with an amount left fit on a phone-sized screen", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await setCategoryBudget("Entertainment", "999999.99");
  await addExpense("A long expense name for testing", "123456.78", "Entertainment", await today());

  for (const selector of ["#export-csv", "#category-list li"]) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375, selector + " is at x=" + box.x + ", width " + box.width);
  }
  assert.deepEqual(await categoryRows(), ["Entertainment $123456.78 of $999999.99 $876543.21 left"]);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(pageWidth <= 375, "page is " + pageWidth + "px wide");
});

test("Layout (browser): the filter count fits on a phone-sized screen", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addFilterExamples();
  await page.selectOption("#filter-category", "Food");

  const box = await page.locator("#filter-count").boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 375, "#filter-count is at x=" + box.x + ", width " + box.width);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(pageWidth <= 375, "page is " + pageWidth + "px wide");
});

test("Layout (browser): on a phone-sized screen the card being edited is highlighted and fits", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addFilterExamples();
  await startEditing("Bus pass");

  const card = rowWith("Bus pass");
  assert.equal(await card.evaluate((row) => getComputedStyle(row).backgroundColor), HIGHLIGHT);
  assert.equal(await card.evaluate((row) => getComputedStyle(row).borderLeftColor), "rgb(21, 101, 192)");
  assert.equal(await rowBackground("Groceries"), NO_BACKGROUND);
  for (const locator of [card, card.locator("button.edit"), card.locator("button.delete")]) {
    const box = await locator.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375, "x=" + box.x + ", width " + box.width);
  }
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(pageWidth <= 375, "page is " + pageWidth + "px wide");
});

test("Layout (browser): the category budget form and an over-budget row fit on a phone-sized screen", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await setCategoryBudget("Entertainment", "1000");
  await addExpense("A long expense name for testing", "123456.78", "Entertainment", await today());

  const selectors = [
    "#category-budget-category",
    "#category-budget",
    "#category-budget-form button[type=submit]",
    "#remove-category-budget",
    "#category-list li.over",
  ];
  for (const selector of selectors) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375, selector + " is at x=" + box.x + ", width " + box.width);
  }
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(pageWidth <= 375, "page is " + pageWidth + "px wide");
});

test("Layout (browser): the filters fit on a phone-sized screen", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addExpense("A long expense name for testing", "1234.56", "Entertainment", await today());

  for (const selector of ["#filter-category", "#filter-month", "#clear-filters"]) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375, selector + " is at x=" + box.x);
  }
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(pageWidth <= 375, "page is " + pageWidth + "px wide");
});

test("Layout (browser): the page does not scroll sideways on a phone-sized screen", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addExpense("A long expense name for testing", "1234.56", "Entertainment", await today());

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(pageWidth <= 375, "page is " + pageWidth + "px wide");
});

test("Layout (browser): on a phone-sized screen each expense is a card with labels and visible Edit and Delete buttons", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addExpense("A long expense name for testing", "1234.56", "Entertainment", await today());

  // The column headings are hidden; each value shows its own label instead.
  assert.equal(await page.isVisible("#expense-table thead"), false);
  const label = await page.$eval("#expense-list td:nth-child(2)", (td) =>
    getComputedStyle(td, "::before").content
  );
  assert.equal(label, '"Name"');

  // The Edit and Delete buttons are fully inside the screen, without scrolling sideways.
  for (const selector of ["#expense-list button.edit", "#expense-list button.delete"]) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375, selector + " is at x=" + box.x);
  }

  // The card still works: Delete removes the expense.
  await page.click("#expense-list button.delete");
  assert.equal(await rowCount(), 0);
});

test("Layout (browser): on a wide screen expenses are shown as a table with headings", async () => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await addExpense("Groceries", "45.20", "Food", await today());
  assert.equal(await page.isVisible("#expense-table thead"), true);
});
