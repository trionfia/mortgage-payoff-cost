# Loan Payoff vs. Invest

A small, browser-based calculator for comparing three ways to use money equal to a remaining loan balance:

1. **Keep the loan + invest balance:** leave the balance invested for the remaining loan term and continue making the scheduled monthly loan payments.
2. **Keep the loan + extra monthly payment:** keep the loan in place, invest the balance, and redirect the extra monthly payment amount away from the investment balance each month to reduce the loan principal.
3. **Pay off the loan + invest payments:** use the balance to pay off the loan, then invest the monthly payment amount that is no longer needed.

The calculator estimates the ending investment balance for all three strategies and highlights the strongest result. It is an educational illustration, not financial advice.

## Run the app

No build step, package installation, or server is required. Clone or download the repository and open `index.html` in a modern web browser.

## Inputs

- **Remaining loan balance:** the current principal balance, greater than $0 and at most $1 billion.
- **Loan interest rate:** annual loan rate from 0% to 100%, entered to three decimal places (for example, `3.875`).
- **Time left on loan:** whole number of months from 1 to 600.
- **Expected investment APR:** annual investment return from 0% to 100%, entered to two decimal places.
- **Tax-efficient investment portfolio:** estimated annual tax drag of 0.45% (high), 0.75% (moderate), or 1.3% (low).
- **Long-term capital gains tax rate:** 15% or 20%, applied to each scenario's final investment balance.
- **Extra monthly payment:** optional additional amount applied to the loan principal each month. If set, it can shorten the payoff horizon and reduce total interest paid.

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

### Investment growth and tax drag

All investments grow at the assumed monthly investment rate. At the end of each full 12-month period, the selected annual tax drag is deducted from the investment balance:

```text
annual tax drag = 0.45% (high), 0.75% (moderate), or 1.3% (low)
investment balance after each 12 months *= (1 - annual tax drag)
```

The drag applies to the full balance, including investment gains and contributions. For terms shorter than 12 months, no annual deduction is applied.

### Long-term capital gains tax

After projecting each scenario and applying annual tax drag, the selected long-term capital gains rate applies only to positive investment gains, not to the invested principal/contributions:

```text
taxable gain = max(0, ending investment balance - investment principal/contributions)
after-tax ending balance = ending investment balance - taxable gain * capital gains tax rate
```

The cost basis is the initial balance for “Keep loan + invest balance,” the initial balance plus payments invested after early payoff for “Keep loan + extra monthly payment,” and the sum of monthly payments invested for “Pay off + invest payments.”

### Keep the loan and invest

The remaining balance is treated as an investment made today. It grows monthly, with annual tax drag applied at each 12-month mark.

### Keep the loan and make extra monthly payments

The starting investment is the remaining balance. While the loan is active, each extra monthly payment is deducted from the invested balance and applied to loan principal in addition to the scheduled payment. After early payoff, scheduled loan payments are invested instead. When the extra payment is $0, this projection matches the keep-and-invest scenario.

### Pay off the loan and invest the payments

The balance is used to pay off the loan immediately. Each month, the estimated loan payment is invested at the same assumed monthly investment rate. Contributions are made at month-end, and annual tax drag is applied after each 12th month's contribution.

```text
each month: investment balance = investment balance * (1 + monthly investment rate)
            investment balance += monthly payment
each 12th month: investment balance *= (1 - annual tax drag)
```

The comparison highlights the difference between the selected pair of ending investment balances. Currency values are rounded to whole dollars for display; calculations retain precision internally.

## Assumptions and limitations

- The loan has a fixed rate and is repaid with equal monthly payments.
- Investment APR is treated as a constant nominal annual rate, compounded monthly.
- Monthly investment contributions are made at month-end.
- The selected annual tax drag is a simplified estimate, not a tax calculation; actual tax treatment depends on the portfolio and investor.
- The selected 15% or 20% capital gains rate applies to positive investment gains above the modeled cost basis; actual capital gains taxes depend on taxable gains and individual circumstances.
- Investment fees beyond the selected tax drag, loan fees, changing rates, payment timing variations, and market volatility are not modeled.
- Actual investment returns are uncertain; the estimated result is not a forecast or guarantee.

## Project files

- `index.html` — page structure, form, and result display.
- `styles.css` — responsive layout and visual styling.
- `app.js` — input validation, loan payment formula, investment projections, and result updates.
