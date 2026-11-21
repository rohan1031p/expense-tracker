// Browser tests: open the real page in Chrome (or Edge) and use it like a person would.
// Run with: npm test
// Each test name starts with the requirement ID it checks.
// Each test gets a fresh browser context, so Local Storage starts empty.

const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { startServer } = require("../server.js");

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

test("R5 (browser): spending is shown for each category", async () => {
  const date = await today();
  await addExpense("Groceries", "45.20", "Food", date);
  await addExpense("Coffee", "4.80", "Food", date);
  await addExpense("Bus pass", "30", "Transport", date);

  const items = await page.$$eval("#category-list li", (lis) =>
    lis.map((li) => li.innerText.replace(/\s+/g, " ").trim())
  );
  assert.deepEqual(items, ["Food $50.00", "Transport $30.00"]);
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
  const items = await page.$$eval("#category-list li", (lis) =>
    lis.map((li) => li.innerText.replace(/\s+/g, " ").trim())
  );
  assert.deepEqual(items, ["Transport $80.00"]);
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

// ---------- Layout ----------

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
