# Expense Tracker Specification

## Purpose

The Expense Tracker is a web app that helps users keep track of their expenses and monthly budget.

## Technology

- HTML for the page structure.
- CSS for the design.
- JavaScript for the app logic.
- Browser Local Storage to save expenses.
- Node.js built-in test runner for automated tests.

## Requirements

### R1: Add an expense
The user can add an expense with a name, amount, category, and date. The amount must be greater than zero.

### R2: View expenses
The app displays a list of saved expenses with their name, amount, category, and date.

### R3: Delete an expense
The user can delete an expense from the list.

### R4: Total spending
The app displays the total amount spent.

### R5: Spending by category
The app displays how much money was spent in each category.

### R6: Monthly budget
The user can set a monthly budget.

### R7: Remaining budget
The app displays how much of the monthly budget is remaining.

### R8: Save expenses
The app saves expenses in Local Storage so they remain after the browser is closed and reopened.

## Running the app

The app should run locally with:

`npm start`

## Running tests

Automated tests should run with:

`npm test`

Tests should check the expense logic, including adding, deleting, totals, category spending, and budget calculations.