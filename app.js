const form = document.querySelector("#calculator-form");
const errorMessage = document.querySelector("#form-error");
const comparePairButtons = [...document.querySelectorAll(".compare-option")];
let selectedComparePair = "keep-extra";

const fields = {
  principal: document.querySelector("#principal"),
  loanType: document.querySelector("#loan-type"),
  loanRate: document.querySelector("#loan-rate"),
  term: document.querySelector("#term"),
  initialFixedMonths: document.querySelector("#initial-fixed-months"),
  adjustmentInterval: document.querySelector("#adjustment-interval"),
  rateStep: document.querySelector("#rate-step"),
  maxRateChange: document.querySelector("#max-rate-change"),
  rateFloor: document.querySelector("#rate-floor"),
  rateCeiling: document.querySelector("#rate-ceiling"),
  interestOnlyMonths: document.querySelector("#interest-only-months"),
  investmentRate: document.querySelector("#investment-rate"),
  taxEfficiency: document.querySelector("#tax-efficiency"),
  capitalGainsRate: document.querySelector("#capital-gains-rate"),
  extraPayment: document.querySelector("#extra-payment"),
};
const armOptions = document.querySelector("#arm-options");

const formatCurrency = (value) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(value);

function applyAnnualTaxDrag(balance, month, annualTaxDrag) {
  return month % 12 === 0 ? balance * (1 - annualTaxDrag) : balance;
}

function growInitialInvestment(principal, monthlyRate, months, annualTaxDrag) {
  let balance = principal;

  for (let month = 1; month <= months; month += 1) {
    balance *= 1 + monthlyRate;
    balance = applyAnnualTaxDrag(balance, month, annualTaxDrag);
  }

  return balance;
}

function futureValueOfMonthlyContributions(payments, monthlyRate, annualTaxDrag) {
  let balance = 0;

  for (let month = 1; month <= payments.length; month += 1) {
    balance *= 1 + monthlyRate;
    balance += payments[month - 1];
    balance = applyAnnualTaxDrag(balance, month, annualTaxDrag);
  }

  return balance;
}

function calculateScheduledPayment(balance, annualRate, remainingMonths) {
  const monthlyRate = annualRate / 100 / 12;
  return monthlyRate === 0
    ? balance / remainingMonths
    : balance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -remainingMonths));
}

function getRateAfterReset(currentRate, values) {
  let rateChange = values.rateStep;
  if (values.maxRateChange !== null) {
    rateChange = Math.max(-values.maxRateChange, Math.min(values.maxRateChange, rateChange));
  }

  let nextRate = Math.max(0, Math.min(100, currentRate + rateChange));
  if (values.rateFloor !== null) nextRate = Math.max(values.rateFloor, nextRate);
  if (values.rateCeiling !== null) nextRate = Math.min(values.rateCeiling, nextRate);
  return nextRate;
}

function buildLoanSchedule(values, extraMonthlyPayment = 0) {
  const schedule = [];
  let balance = values.principal;
  let currentRate = values.loanRate;
  let scheduledPayment = null;
  let previousMonthWasInterestOnly = false;

  for (let month = 1; month <= values.months; month += 1) {
    const rateReset = values.loanType === "adjustable"
      && month > values.initialFixedMonths
      && (month - values.initialFixedMonths - 1) % values.adjustmentInterval === 0;

    if (rateReset) currentRate = getRateAfterReset(currentRate, values);

    if (balance <= 0) {
      schedule.push({
        rate: currentRate,
        payment: 0,
        interest: 0,
        principal: 0,
        extraPrincipal: 0,
        balance: 0,
        active: false,
      });
      continue;
    }

    const interest = balance * (currentRate / 100 / 12);
    const interestOnly = month <= values.interestOnlyMonths && month < values.months;
    let scheduledPrincipal = 0;

    if (interestOnly) {
      scheduledPayment = interest;
    } else {
      if (scheduledPayment === null || rateReset || previousMonthWasInterestOnly) {
        scheduledPayment = calculateScheduledPayment(balance, currentRate, values.months - month + 1);
      }
      scheduledPrincipal = Math.min(balance, Math.max(0, scheduledPayment - interest));
    }

    const extraPrincipal = Math.min(balance - scheduledPrincipal, extraMonthlyPayment);
    if (month === values.months) {
      scheduledPrincipal = balance - extraPrincipal;
    }
    balance = Math.max(0, balance - scheduledPrincipal - extraPrincipal);

    schedule.push({
      rate: currentRate,
      payment: interest + scheduledPrincipal,
      interest,
      principal: scheduledPrincipal,
      extraPrincipal,
      balance,
      active: true,
    });
    previousMonthWasInterestOnly = interestOnly;
  }

  return schedule;
}

function simulateKeepLoanWithExtraMonthlyPayment(values, baselineSchedule, extraSchedule) {
  const monthlyInvestmentRate = values.investmentRate / 100 / 12;
  if (values.extraMonthlyPayment === 0) {
    return {
      balance: growInitialInvestment(values.principal, monthlyInvestmentRate, values.months, values.annualTaxDrag),
      contributions: 0,
    };
  }

  let investmentBalance = values.principal;
  let contributions = 0;

  for (let month = 1; month <= values.months; month += 1) {
    investmentBalance *= 1 + monthlyInvestmentRate;
    const extraLoanMonth = extraSchedule[month - 1];

    if (extraLoanMonth.active) {
      investmentBalance = Math.max(0, investmentBalance - extraLoanMonth.extraPrincipal);
    } else {
      const contribution = baselineSchedule[month - 1].payment;
      investmentBalance += contribution;
      contributions += contribution;
    }

    investmentBalance = applyAnnualTaxDrag(investmentBalance, month, values.annualTaxDrag);
  }

  return { balance: investmentBalance, contributions };
}

function getLoanPayoffMonths(schedule) {
  const payoffIndex = schedule.findIndex((month) => month.balance === 0);
  return payoffIndex < 0 ? schedule.length : payoffIndex + 1;
}

function calculateComparison(values) {
  const monthlyInvestmentRate = values.investmentRate / 100 / 12;
  const baselineSchedule = buildLoanSchedule(values);
  const extraSchedule = buildLoanSchedule(values, values.extraMonthlyPayment);
  const monthlyPayment = baselineSchedule[0].payment;
  const keepInvestmentBeforeCapitalGains = growInitialInvestment(
    values.principal,
    monthlyInvestmentRate,
    values.months,
    values.annualTaxDrag,
  );
  const keepInvestmentWithExtraProjection = simulateKeepLoanWithExtraMonthlyPayment(
    values,
    baselineSchedule,
    extraSchedule,
  );
  const payoffInvestmentBeforeCapitalGains = futureValueOfMonthlyContributions(
    baselineSchedule.map((month) => month.payment),
    monthlyInvestmentRate,
    values.annualTaxDrag,
  );
  const loanPayoffMonthsWithExtra = getLoanPayoffMonths(extraSchedule);
  const afterCapitalGainsTax = (balance, costBasis) => (
    balance - Math.max(0, balance - costBasis) * values.capitalGainsRate
  );
  const keepInvestment = afterCapitalGainsTax(keepInvestmentBeforeCapitalGains, values.principal);
  const keepInvestmentWithExtra = afterCapitalGainsTax(
    keepInvestmentWithExtraProjection.balance,
    values.principal + keepInvestmentWithExtraProjection.contributions,
  );
  const payoffContributions = baselineSchedule.reduce((total, month) => total + month.payment, 0);
  const payoffInvestment = afterCapitalGainsTax(
    payoffInvestmentBeforeCapitalGains,
    payoffContributions,
  );

  return {
    monthlyPayment,
    keepInvestment,
    keepInvestmentWithExtra,
    payoffInvestment,
    extraMonthlyPayment: values.extraMonthlyPayment,
    originalTerm: values.months,
    loanPayoffMonthsWithExtra,
    monthsEarly: Math.max(0, values.months - loanPayoffMonthsWithExtra),
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
  const optionalNumber = (field) => field.value.trim() === "" ? null : Number(field.value);

  return {
    principal: Number(fields.principal.value),
    loanType: fields.loanType.value,
    loanRate: Number(fields.loanRate.value),
    months: Number(fields.term.value),
    initialFixedMonths: Number(fields.initialFixedMonths.value),
    adjustmentInterval: Number(fields.adjustmentInterval.value),
    rateStep: Number(fields.rateStep.value),
    maxRateChange: optionalNumber(fields.maxRateChange),
    rateFloor: optionalNumber(fields.rateFloor),
    rateCeiling: optionalNumber(fields.rateCeiling),
    interestOnlyMonths: Number(fields.interestOnlyMonths.value),
    investmentRate: Number(fields.investmentRate.value),
    annualTaxDrag: Number(fields.taxEfficiency.value),
    capitalGainsRate: Number(fields.capitalGainsRate.value),
    extraMonthlyPayment: Number(fields.extraPayment.value),
  };
}

function validateInputs(values) {
  const limits = [
    [fields.principal, values.principal > 0 && values.principal <= 1_000_000_000],
    [fields.loanType, ["fixed", "adjustable"].includes(values.loanType)],
    [fields.loanRate, values.loanRate >= 0 && values.loanRate <= 100],
    [fields.term, Number.isInteger(values.months) && values.months >= 1 && values.months <= 600],
    [fields.interestOnlyMonths, Number.isInteger(values.interestOnlyMonths) && values.interestOnlyMonths >= 0 && values.interestOnlyMonths <= values.months],
    [fields.investmentRate, values.investmentRate >= 0 && values.investmentRate <= 100],
    [fields.taxEfficiency, [0.0045, 0.0075, 0.013].includes(values.annualTaxDrag)],
    [fields.capitalGainsRate, [0.15, 0.2].includes(values.capitalGainsRate)],
    [fields.extraPayment, Number.isFinite(values.extraMonthlyPayment) && values.extraMonthlyPayment >= 0 && values.extraMonthlyPayment <= 1_000_000_000],
  ];

  if (values.loanType === "adjustable") {
    limits.push(
      [fields.initialFixedMonths, Number.isInteger(values.initialFixedMonths) && values.initialFixedMonths >= 1 && values.initialFixedMonths <= values.months],
      [fields.adjustmentInterval, [6, 12].includes(values.adjustmentInterval)],
      [fields.rateStep, fields.rateStep.value.trim() !== "" && Number.isFinite(values.rateStep) && values.rateStep >= -100 && values.rateStep <= 100],
      [fields.maxRateChange, values.maxRateChange === null || (Number.isFinite(values.maxRateChange) && values.maxRateChange >= 0 && values.maxRateChange <= 100)],
      [fields.rateFloor, values.rateFloor === null || (Number.isFinite(values.rateFloor) && values.rateFloor >= 0 && values.rateFloor <= 100)],
      [fields.rateCeiling, values.rateCeiling === null || (Number.isFinite(values.rateCeiling) && values.rateCeiling >= 0 && values.rateCeiling <= 100)],
    );
  }

  for (const [field, valid] of limits) {
    field.setAttribute("aria-invalid", String(!valid));
    if (!valid) {
      field.focus();
      return false;
    }
  }

  if (values.loanType === "adjustable") {
    if (values.rateFloor !== null && values.rateCeiling !== null && values.rateFloor > values.rateCeiling) {
      fields.rateFloor.setAttribute("aria-invalid", "true");
      fields.rateFloor.focus();
      return false;
    }
    if (values.rateFloor !== null && values.loanRate < values.rateFloor) {
      fields.rateFloor.setAttribute("aria-invalid", "true");
      fields.rateFloor.focus();
      return false;
    }
    if (values.rateCeiling !== null && values.loanRate > values.rateCeiling) {
      fields.rateCeiling.setAttribute("aria-invalid", "true");
      fields.rateCeiling.focus();
      return false;
    }
  }

  return true;
}

function updateLoanTypeFields() {
  const adjustable = fields.loanType.value === "adjustable";
  armOptions.hidden = !adjustable;
  armOptions.disabled = !adjustable;
  fields.loanType.setAttribute("aria-expanded", String(adjustable));
  if (!adjustable) {
    armOptions.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  }
}

function showInputError() {
  errorMessage.textContent = "Check your entries. Loan and investment rates must be 0%–100%, the extra payment must be $0 or more, the loan term must be 1–600 months, the interest-only period cannot exceed the term, and adjustable-rate limits must be valid.";
  errorMessage.hidden = false;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = readInputs();

  if (!validateInputs(values)) {
    showInputError();
    return;
  }

  errorMessage.hidden = true;
  showResults(calculateComparison(values));
});

for (const field of Object.values(fields)) {
  const clearValidationState = () => {
    field.removeAttribute("aria-invalid");
    errorMessage.hidden = true;
  };
  field.addEventListener("input", clearValidationState);
  field.addEventListener("change", clearValidationState);
}

fields.loanType.addEventListener("change", () => {
  updateLoanTypeFields();
  errorMessage.hidden = true;
});

comparePairButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const values = readInputs();
    if (!validateInputs(values)) {
      showInputError();
      return;
    }

    errorMessage.hidden = true;
    selectedComparePair = button.dataset.pair;
    comparePairButtons.forEach((option) => {
      option.classList.toggle("is-active", option === button);
    });
    showResults(calculateComparison(values));
  });
});

updateLoanTypeFields();
showResults(calculateComparison(readInputs()));
