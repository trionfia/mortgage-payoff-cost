# Loan Payoff vs. Invest

A small, browser-based calculator for comparing two ways to use money equal to a remaining loan balance:

1. **Keep the loan:** leave the balance invested for the remaining loan term and continue making the scheduled monthly loan payments.
2. **Pay off the loan:** use the balance to pay off the loan, then invest the monthly payment amount that is no longer needed.

The calculator estimates the ending investment balance for both strategies and shows the difference. It is an educational illustration, not financial advice.

## Run the app

No build step, package installation, or server is required. Clone or download the repository and open `index.html` in a modern web browser.

## Inputs

- **Remaining loan balance:** the current principal balance, greater than $0 and at most $1 billion.
- **Loan interest rate:** annual loan rate from 0% to 100%, entered to three decimal places (for example, `3.875`).
- **Time left on loan:** whole number of months from 1 to 600.
- **Expected investment APR:** annual investment return from 0% to 100%, entered to two decimal places.

Press **Compare strategies** to recalculate the results. The calculator starts with example values that can be changed.

## How the calculation works

The annual rates are converted to monthly rates by dividing by 12 (and by 100 to convert percentages to decimals).

### Monthly loan payment

For a fixed-rate loan with equal monthly payments, the estimated payment is:

```text
monthly rate = annual loan rate / 12

if monthly rate is 0:
    payment = remaining balance / months remaining
otherwise:
    payment = remaining balance * monthly rate
              / (1 - (1 + monthly rate)^(-months remaining))
```

### Keep the loan and invest

The remaining balance is treated as an investment made today, growing at the assumed monthly investment rate for the full loan term:

```text
ending investment = remaining balance * (1 + monthly investment rate)^months
```

### Pay off the loan and invest the payments

The balance is used to pay off the loan immediately. Each month, the estimated loan payment is invested at the same assumed monthly investment rate. Contributions are assumed to happen at the end of each month:

```text
if monthly investment rate is 0:
    ending investment = monthly payment * months
otherwise:
    ending investment = monthly payment
                        * ((1 + monthly investment rate)^months - 1)
                        / monthly investment rate
```

The displayed difference is the absolute difference between the two ending investment balances. The result indicates which strategy has the higher projected balance. Currency values are rounded to whole dollars for display; calculations retain precision internally.

## Assumptions and limitations

- The loan has a fixed rate and is repaid with equal monthly payments.
- Investment APR is treated as a constant nominal annual rate, compounded monthly.
- Monthly investment contributions are made at month-end.
- Taxes, investment fees, loan fees, changing rates, payment timing variations, and market volatility are not modeled.
- Actual investment returns are uncertain; the estimated result is not a forecast or guarantee.

## Project files

- `index.html` — page structure, form, and result display.
- `styles.css` — responsive layout and visual styling.
- `app.js` — input validation, loan payment formula, investment projections, and result updates.

