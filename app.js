const form = document.querySelector("#calculator-form");
const errorMessage = document.querySelector("#form-error");
const comparePairButtons = [...document.querySelectorAll(".compare-option")];
let selectedComparePair = "keep-extra";

const fields = {
  principal: document.querySelector("#principal"),
  loanRate: document.querySelector("#loan-rate"),
  term: document.querySelector("#term"),
  investmentRate: document.querySelector("#investment-rate"),
  extraPayment: document.querySelector("#extra-payment"),
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

function getLoanPayoffMonths({ principal, loanRate, months, extraMonthlyPayment }) {
  if (extraMonthlyPayment <= 0) return months;

  const monthlyLoanRate = loanRate / 100 / 12;
  const monthlyPayment = monthlyLoanRate === 0
    ? principal / months
    : principal * monthlyLoanRate / (1 - Math.pow(1 + monthlyLoanRate, -months));

  let loanBalance = principal;
  let paidMonths = 0;

  while (loanBalance > 0 && paidMonths < months) {
    const interest = loanBalance * monthlyLoanRate;
    const totalPayment = monthlyPayment + extraMonthlyPayment;
    const principalReduction = Math.min(loanBalance, Math.max(0, totalPayment - interest));
    loanBalance = Math.max(0, loanBalance - principalReduction);
    paidMonths += 1;
  }

  return paidMonths;
}

function simulateKeepLoanWithExtraMonthlyPayment({ principal, loanRate, months, investmentRate, extraMonthlyPayment }) {
  if (extraMonthlyPayment === 0) {
    return principal * Math.pow(1 + (investmentRate / 100 / 12), months);
  }

  const monthlyLoanRate = loanRate / 100 / 12;
  const monthlyInvestmentRate = investmentRate / 100 / 12;
  const monthlyPayment = monthlyLoanRate === 0
    ? principal / months
    : principal * monthlyLoanRate / (1 - Math.pow(1 + monthlyLoanRate, -months));

  let loanBalance = principal;
  let investmentBalance = principal;

  for (let month = 0; month < months; month += 1) {
    investmentBalance *= 1 + monthlyInvestmentRate;

    if (loanBalance > 0) {
      investmentBalance -= extraMonthlyPayment;

      const interest = loanBalance * monthlyLoanRate;
      const totalPayment = monthlyPayment + extraMonthlyPayment;
      const principalReduction = Math.min(loanBalance, Math.max(0, totalPayment - interest));
      loanBalance = Math.max(0, loanBalance - principalReduction);
    } else {
      investmentBalance += monthlyPayment;
    }
  }

  return investmentBalance;
}

function calculateComparison({ principal, loanRate, months, investmentRate, extraMonthlyPayment = 0 }) {
  const monthlyInvestmentRate = investmentRate / 100 / 12;
  const monthlyLoanRate = loanRate / 100 / 12;
  const monthlyPayment = monthlyLoanRate === 0
    ? principal / months
    : principal * monthlyLoanRate / (1 - Math.pow(1 + monthlyLoanRate, -months));

  const keepInvestment = principal * Math.pow(1 + monthlyInvestmentRate, months);
  const keepInvestmentWithExtra = simulateKeepLoanWithExtraMonthlyPayment({
    principal,
    loanRate,
    months,
    investmentRate,
    extraMonthlyPayment,
  });
  const payoffInvestment = futureValueOfMonthlyContributions(
    monthlyPayment,
    monthlyInvestmentRate,
    months,
  );
  const loanPayoffMonthsWithExtra = getLoanPayoffMonths({
    principal,
    loanRate,
    months,
    extraMonthlyPayment,
  });

  return {
    monthlyPayment,
    keepInvestment,
    keepInvestmentWithExtra,
    payoffInvestment,
    extraMonthlyPayment,
    originalTerm: months,
    loanPayoffMonthsWithExtra,
    monthsEarly: Math.max(0, months - loanPayoffMonthsWithExtra),
  };
}

function getScenarioLabel(name) {
  const labels = {
    keep: "Keep loan + invest balance",
    extra: "Keep loan + extra monthly payment",
    payoff: "Pay off + invest payments",
  };

  return labels[name] || name;
}

function showResults(result) {
  const keepValue = document.querySelector("#keep-value");
  const extraValue = document.querySelector("#extra-value");
  const payoffValue = document.querySelector("#payoff-value");
  const difference = document.querySelector("#difference");
  const caption = document.querySelector("#result-caption");
  const monthsEarlyText = document.querySelector("#months-early-text");
  const monthsEarlyValue = document.querySelector("#months-early");
  const keepBar = document.querySelector("#keep-bar");
  const extraBar = document.querySelector("#extra-bar");
  const payoffBar = document.querySelector("#payoff-bar");
  const keepDot = document.querySelector("#keep-dot");
  const extraDot = document.querySelector("#extra-dot");
  const payoffDot = document.querySelector("#payoff-dot");
  const maximumBalance = Math.max(result.keepInvestment, result.keepInvestmentWithExtra, result.payoffInvestment, 1);
  const scenarioValues = {
    keep: result.keepInvestment,
    extra: result.keepInvestmentWithExtra,
    payoff: result.payoffInvestment,
  };
  const rankOrder = Object.entries(scenarioValues).sort((a, b) => b[1] - a[1]);
  const colors = {
    best: "#86c4aa",
    middle: "#f4c985",
    worst: "#d86d6d",
  };

  const valueMap = {
    keep: keepValue,
    extra: extraValue,
    payoff: payoffValue,
  };
  const barMap = {
    keep: keepBar,
    extra: extraBar,
    payoff: payoffBar,
  };
  const dotMap = {
    keep: keepDot,
    extra: extraDot,
    payoff: payoffDot,
  };

  rankOrder.forEach(([name, value], index) => {
    const color = index === 0 ? colors.best : index === 1 ? colors.middle : colors.worst;
    valueMap[name].textContent = formatCurrency(value);
    valueMap[name].style.color = color;
    valueMap[name].style.fontWeight = "700";
    barMap[name].style.width = `${(value / maximumBalance) * 100}%`;
    barMap[name].style.backgroundColor = color;
    dotMap[name].style.backgroundColor = color;
  });

  const compareMap = {
    "keep-extra": ["keep", "extra"],
    "keep-payoff": ["keep", "payoff"],
    "extra-payoff": ["extra", "payoff"],
  };
  const [leftKey, rightKey] = compareMap[selectedComparePair];
  const leftValue = scenarioValues[leftKey];
  const rightValue = scenarioValues[rightKey];
  const leadingScenario = leftValue >= rightValue ? leftKey : rightKey;
  const trailingScenario = leadingScenario === leftKey ? rightKey : leftKey;
  const delta = Math.abs(leftValue - rightValue);

  difference.textContent = formatCurrency(delta);
  difference.classList.toggle("negative-result", false);

  const leadLabel = getScenarioLabel(leadingScenario);
  const trailLabel = getScenarioLabel(trailingScenario);
  document.querySelector("#results-title").textContent = `${leadLabel} may leave you with`;
  caption.textContent = `more than ${trailLabel}`;

  document.querySelector("#monthly-payment").textContent = formatCurrency(result.monthlyPayment);
  if (result.extraMonthlyPayment > 0) {
    const monthsEarly = result.monthsEarly;
    monthsEarlyText.style.opacity = "1";
    monthsEarlyValue.textContent = `${monthsEarly} months`;
    monthsEarlyText.querySelector("strong").textContent = `${monthsEarly} months`;
  } else {
    monthsEarlyText.style.opacity = "0";
  }
}

function readInputs() {
  return {
    principal: Number(fields.principal.value),
    loanRate: Number(fields.loanRate.value),
    months: Number(fields.term.value),
    investmentRate: Number(fields.investmentRate.value),
    extraMonthlyPayment: Number(fields.extraPayment.value),
  };
}

function validateInputs(values) {
  const limits = [
    [fields.principal, values.principal > 0 && values.principal <= 1_000_000_000],
    [fields.loanRate, values.loanRate >= 0 && values.loanRate <= 100],
    [fields.term, Number.isInteger(values.months) && values.months >= 1 && values.months <= 600],
    [fields.investmentRate, values.investmentRate >= 0 && values.investmentRate <= 100],
    [fields.extraPayment, Number.isFinite(values.extraMonthlyPayment) && values.extraMonthlyPayment >= 0 && values.extraMonthlyPayment <= 1_000_000_000],
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
    errorMessage.textContent = "Enter a positive loan balance, rates from 0% to 100%, a whole loan term from 1 to 600 months, and an extra payment of $0 or more.";
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

comparePairButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedComparePair = button.dataset.pair;
    comparePairButtons.forEach((option) => {
      option.classList.toggle("is-active", option === button);
    });
    showResults(calculateComparison(readInputs()));
  });
});

showResults(calculateComparison(readInputs()));
