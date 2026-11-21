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

// ---------- Layout ----------

test("Layout (browser): the page does not scroll sideways on a phone-sized screen", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addExpense("A long expense name for testing", "1234.56", "Entertainment", await today());

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(pageWidth <= 375, "page is " + pageWidth + "px wide");
});

test("Layout (browser): on a phone-sized screen each expense is a card with labels and a visible Delete button", async () => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addExpense("A long expense name for testing", "1234.56", "Entertainment", await today());

  // The column headings are hidden; each value shows its own label instead.
  assert.equal(await page.isVisible("#expense-table thead"), false);
  const label = await page.$eval("#expense-list td:nth-child(2)", (td) =>
    getComputedStyle(td, "::before").content
  );
  assert.equal(label, '"Name"');

  // The Delete button is fully inside the screen, without scrolling sideways.
  const box = await page.locator("#expense-list button.delete").boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 375, "Delete button is at x=" + box.x);

  // The card still works: Delete removes the expense.
  await page.click("#expense-list button.delete");
  assert.equal(await rowCount(), 0);
});

test("Layout (browser): on a wide screen expenses are shown as a table with headings", async () => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await addExpense("Groceries", "45.20", "Food", await today());
  assert.equal(await page.isVisible("#expense-table thead"), true);
});
