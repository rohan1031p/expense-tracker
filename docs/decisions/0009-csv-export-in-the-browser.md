# 0009: The CSV file is built and downloaded in the browser

Date: 2026-11-22

Status: Accepted (which expenses go in the file, and plain-number amounts, were chosen by the project owner; the way the file is made was chosen during implementation)

## Decision (Y-statement)

In the context of **R21, where the user can export their expenses to a CSV file to open in a spreadsheet**,
facing **the need to make a file without a server, an account or any extra package (the app must stay local), and a file that Excel and other spreadsheets open correctly, including names with commas, quotes or letters like "é"**,
we decided for **building the CSV text in `expensesToCsv` in `expenses.js`, and downloading it from `app.js` as a `Blob` through a temporary link with `download="expenses.csv"`, with a UTF-8 byte order mark (BOM) at the start of the file and CRLF line endings**
and neglected **a CSV library, a server route in `server.js` that sends the file, and showing the CSV text on the page for the user to copy**,
to achieve **no new packages and no server code, a file that downloads with one click, CSV text that the logic tests can check exactly, and names that look right when the file is opened in Excel**,
accepting that **we quote values ourselves (the usual rule: values with a comma, a double quote or a line break are put in double quotes, and inner quotes are doubled), and that the BOM is an invisible extra character at the start of the file that a few simple text tools show as odd characters**.

## Alternatives considered

1. **A CSV library.** Handles every edge case, but adds a package to an app that has none, for a few lines of code.
2. **A route in `server.js`.** The server cannot see Local Storage, so the page would have to send the expenses to it first. `npm start` would also become required for exporting.
3. **Show the text to copy.** No download code, but the user has to paste it into a file themselves, which is not "export to a file".
4. **Blob download in the browser (chosen).**

## Related choices

- The file always has every saved expense, even when a filter is on (chosen by the project owner, in line with decision 0004). The button says "Export all expenses (CSV)" so this is clear.
- Amounts are written as plain numbers with two decimals, such as `12.50`, without `$`, so a spreadsheet can add them up (chosen by the project owner).
- Expenses are written newest date first, like the list.
- The file name is always `expenses.csv`, without a date.
- With no expenses, the file has only the header line; the button is not hidden or disabled.
- Names are written exactly as typed. A name starting with `=`, `+`, `-` or `@` is not changed, so a spreadsheet may treat it as a formula. The data is the user's own and never leaves their computer, so changing names was not worth it without asking.
- The link's temporary address (`URL.createObjectURL`) is freed one second after the download starts.
