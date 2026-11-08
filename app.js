const form = document.querySelector("#calculator-form");
const errorMessage = document.querySelector("#form-error");

const fields = {
  principal: document.querySelector("#principal"),
  loanRate: document.querySelector("#loan-rate"),
  term: document.querySelector("#term"),
  investmentRate: document.querySelector("#investment-rate"),
};

const formatCurrency = (value) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(value);

function futureValueOfMonthlyContributions(payment, monthlyRate, months) {
  if (monthlyRate === 0) return payment * months;
  return payment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

function calculateComparison({ principal, loanRate, months, investmentRate }) {
  const monthlyLoanRate = loanRate / 100 / 12;
  const monthlyInvestmentRate = investmentRate / 100 / 12;
  const monthlyPayment = monthlyLoanRate === 0
    ? principal / months
    : principal * monthlyLoanRate / (1 - Math.pow(1 + monthlyLoanRate, -months));
  const keepInvestment = principal * Math.pow(1 + monthlyInvestmentRate, months);
  const payoffInvestment = futureValueOfMonthlyContributions(
    monthlyPayment,
    monthlyInvestmentRate,
    months,
  );

  return {
    monthlyPayment,
    keepInvestment,
    payoffInvestment,
    difference: keepInvestment - payoffInvestment,
  };
}

function showResults(result) {
  const keepValue = document.querySelector("#keep-value");
  const payoffValue = document.querySelector("#payoff-value");
  const difference = document.querySelector("#difference");
  const caption = document.querySelector("#result-caption");
  const maximumBalance = Math.max(result.keepInvestment, result.payoffInvestment, 1);

  keepValue.textContent = formatCurrency(result.keepInvestment);
  payoffValue.textContent = formatCurrency(result.payoffInvestment);
  document.querySelector("#monthly-payment").textContent = formatCurrency(result.monthlyPayment);
  difference.textContent = formatCurrency(Math.abs(result.difference));
  difference.classList.toggle("negative-result", result.difference < 0);

  if (Math.abs(result.difference) < 0.5) {
    document.querySelector("#results-title").textContent = "The two strategies are nearly even";
    caption.textContent = "at the end of your loan term";
  } else if (result.difference > 0) {
    document.querySelector("#results-title").textContent = "Investing may leave you with";
    caption.textContent = "more by keeping the loan and investing your balance";
  } else {
    document.querySelector("#results-title").textContent = "Paying it off may leave you with";
    caption.textContent = "more by investing each monthly payment";
  }

  document.querySelector("#keep-bar").style.width = `${(result.keepInvestment / maximumBalance) * 100}%`;
  document.querySelector("#payoff-bar").style.width = `${(result.payoffInvestment / maximumBalance) * 100}%`;
}

function readInputs() {
  return {
    principal: Number(fields.principal.value),
    loanRate: Number(fields.loanRate.value),
    months: Number(fields.term.value),
    investmentRate: Number(fields.investmentRate.value),
  };
}

function validateInputs(values) {
  const limits = [
    [fields.principal, values.principal > 0 && values.principal <= 1_000_000_000],
    [fields.loanRate, values.loanRate >= 0 && values.loanRate <= 100],
    [fields.term, Number.isInteger(values.months) && values.months >= 1 && values.months <= 600],
    [fields.investmentRate, values.investmentRate >= 0 && values.investmentRate <= 100],
  ];

  for (const [field, valid] of limits) {
    field.setAttribute("aria-invalid", String(!valid));
    if (!valid) {
      field.focus();
      return false;
    }
  }
  return true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = readInputs();

  if (!validateInputs(values)) {
    errorMessage.textContent = "Enter a positive loan balance, rates from 0% to 100%, and a whole loan term from 1 to 600 months.";
    errorMessage.hidden = false;
    return;
  }

  errorMessage.hidden = true;
  showResults(calculateComparison(values));
});

for (const field of Object.values(fields)) {
  field.addEventListener("input", () => {
    field.removeAttribute("aria-invalid");
    errorMessage.hidden = true;
  });
}

showResults(calculateComparison(readInputs()));
