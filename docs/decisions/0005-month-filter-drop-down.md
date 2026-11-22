# 0005: Month filter is a drop-down of months that have expenses

Date: 2026-11-21

Status: Accepted (chosen by the project owner before implementation)

## Decision (Y-statement)

In the context of **R15, where the user can filter expenses by month**,
facing **the need for a month control that works the same in every browser, fits on a phone screen, and can be tested reliably**,
we decided for **a `<select>` drop-down with "All months" followed by only the months that have at least one expense, newest first, labelled like "November 2026"**
and neglected **the browser's own month picker (`<input type="month">`), and a fixed list of the last 12 months**,
to achieve **a control that cannot pick an empty month, looks and behaves the same as the category filter, and can be set in tests with `selectOption`**,
accepting that **the list of months must be rebuilt every time an expense is added, edited, or deleted, and that the chosen month has to fall back to "All months" when its last expense is removed or moved to another month**.

## Alternatives considered

1. **`<input type="month">`.** Lets the user pick any month, with no extra code to build the list. But it looks different in each browser, some browsers show it as a plain text box, and an empty "All months" choice would need a separate button or checkbox.
2. **A fixed list of the last 12 months.** Simple to build, but it hides older expenses and lists months with nothing in them.
3. **Months that have expenses (chosen).**

## Related choices

- Month names come from a fixed English list in `formatMonth`, not from the browser's language settings, so the labels are the same everywhere and in the tests.
- The value of each option is the "YYYY-MM" month, the same form `getMonth` already returns, so it can be compared directly with each expense's date.
