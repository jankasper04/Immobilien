import { Property, Transaction, TransactionType, StrategicInsight } from './types';

// Formatierungshilfe für Euro
export const formatEUR = (val: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
};

// 1. Berechnung der Anschaffungskosten
export const calculatePurchaseCosts = (price: number, renovation: number, financials: Property['financials']) => {
  const tax = price * (financials.transferTaxPercent / 100);
  const notary = price * (financials.notaryPercent / 100);
  const registry = price * (financials.registryPercent / 100);
  const agent = price * (financials.agentPercent / 100);
  
  const purchasingCosts = tax + notary + registry + agent;
  const totalInvest = price + purchasingCosts + renovation;

  return {
    tax,
    notary,
    registry,
    agent,
    purchasingCosts,
    renovation,
    totalInvest
  };
};

// 2. Monatlicher Cashflow & Kennzahlen
export const calculateMonthlyCashflow = (prop: Property) => {
  const f = prop.financials;
  const costs = calculatePurchaseCosts(prop.purchasePrice, prop.renovationCost, f);

  // --- Einnahmen ---
  const warmRent = f.coldRent + f.operatingCostsRecoverable;

  // --- Ausgaben ---
  const totalOperatingCosts = f.operatingCostsRecoverable + f.operatingCostsNonRecoverable + (f.maintenanceReserve || 0);
  
  // Kapitaldienst
  const annualInterest = f.loanAmount * (f.loanInterestRate / 100);
  const annualRepayment = f.loanAmount * (f.loanRepaymentRate / 100); 
  const monthlyInterest = annualInterest / 12;
  const monthlyRepayment = annualRepayment / 12;
  const monthlyDebtService = monthlyInterest + monthlyRepayment;

  // Cashflows
  const preTaxCashflow = f.coldRent - (f.operatingCostsNonRecoverable + (f.maintenanceReserve || 0)) - monthlyDebtService;

  // Steuer
  const buildingValue = prop.purchasePrice * ((100 - f.landValuePercent) / 100);
  const annualAfA = buildingValue * 0.02; 
  const monthlyAfA = annualAfA / 12;
  const taxableIncome = f.coldRent - monthlyInterest - f.operatingCostsNonRecoverable - monthlyAfA;
  const estimatedTax = taxableIncome > 0 ? taxableIncome * (f.personalTaxRate / 100) : 0;
  const postTaxCashflow = preTaxCashflow - estimatedTax;
  const monthlyAmortization = monthlyRepayment;

  // KPIs
  const annualColdRent = f.coldRent * 12;
  const grossYield = (annualColdRent / prop.purchasePrice) * 100;
  const annualNonRecoverable = (f.operatingCostsNonRecoverable + (f.maintenanceReserve || 0)) * 12;
  const netYield = ((annualColdRent - annualNonRecoverable) / costs.totalInvest) * 100;
  const factor = prop.purchasePrice / annualColdRent;
  const equity = costs.totalInvest - f.loanAmount;
  const annualProfit = (postTaxCashflow * 12) + annualRepayment; 
  const equityYield = equity > 0 ? (annualProfit / equity) * 100 : 0;

  return {
    warmRent,
    totalOperatingCosts,
    monthlyDebtService,
    monthlyInterest,
    monthlyRepayment,
    monthlyAmortization,
    preTaxCashflow,
    monthlyAfA,
    taxableIncome,
    estimatedTax,
    postTaxCashflow,
    grossYield,
    netYield,
    factor,
    equity,
    equityYield,
    costs
  };
};

// 15% Grenze Überwachung
export const calculate15PercentRule = (prop: Property, transactions: Transaction[]) => {
  const buildingValue = prop.purchasePrice * ((100 - prop.financials.landValuePercent) / 100);
  const limit15Percent = buildingValue * 0.15;
  
  const purchaseDate = new Date(prop.purchaseDate);
  const threeYearsLater = new Date(purchaseDate);
  threeYearsLater.setFullYear(purchaseDate.getFullYear() + 3);

  const renovationCosts = transactions
    .filter(t => {
      const tDate = new Date(t.date);
      return (
        t.propertyId === prop.id &&
        t.type === TransactionType.EXPENSE &&
        (t.category.toLowerCase().includes('renovierung') || t.category.toLowerCase().includes('sanierung')) &&
        tDate >= purchaseDate &&
        tDate <= threeYearsLater
      );
    })
    .reduce((sum, t) => sum + t.amount, 0) + (prop.renovationCost || 0); 

  return {
    buildingValue,
    limit: limit15Percent,
    currentUsage: renovationCosts,
    isBreached: renovationCosts > limit15Percent,
    isWarning: renovationCosts > (limit15Percent * 0.8) 
  };
};

export const calculateProjection = (prop: Property, years = 10) => {
  const f = prop.financials;
  const data = [];
  
  let currentLoan = f.loanAmount;
  let currentValue = prop.purchasePrice;
  let currentRent = f.coldRent * 12; 
  const APPRECIATION_RATE = 0.02; 
  const RENT_INCREASE_RATE = 0.015; 
  const annualAnnuity = f.loanAmount * ((f.loanInterestRate + f.loanRepaymentRate) / 100);

  for (let year = 1; year <= years; year++) {
    const interestPayment = currentLoan * (f.loanInterestRate / 100);
    const principalPayment = annualAnnuity - interestPayment;
    currentLoan = Math.max(0, currentLoan - principalPayment);
    currentValue = currentValue * (1 + APPRECIATION_RATE);
    currentRent = currentRent * (1 + RENT_INCREASE_RATE);
    const equity = currentValue - currentLoan;
    
    data.push({
      year: `Jahr ${year}`,
      loanBalance: Math.round(currentLoan),
      propertyValue: Math.round(currentValue),
      equity: Math.round(equity),
      accumulatedRent: Math.round(currentRent)
    });
  }
  return data;
};

// --- FIX & FLIP CALCULATION ---
export const calculateFlipScenario = (prop: Property, targetPrice: number, durationMonths: number, extraRenovation: number) => {
    const cf = calculateMonthlyCashflow(prop);
    
    // 1. Costs
    const purchaseSide = cf.costs.totalInvest; // Purchase + Tax + Notary + Initial Renovation
    
    // Holding Costs during renovation/sales period (Interest + Non-recoverable operating costs)
    // Assuming vacancy during flip
    const monthlyHoldingCost = cf.monthlyInterest + prop.financials.operatingCostsNonRecoverable + prop.financials.operatingCostsRecoverable; // Full operating costs as vacancy
    const totalHoldingCosts = monthlyHoldingCost * durationMonths;

    // Selling Costs (Makler for seller side usually lower or 0 depending on region, assume 1.5% notary/legal for contract draft if seller pays, plus maybe marketing)
    // Let's assume 2% selling costs (Marketing, Staging, Partial Agent)
    const sellingCosts = targetPrice * 0.02; 
    
    // Speculation Tax (if private and < 10 years). Assuming personal tax rate on profit.
    // Profit before tax
    const totalInvested = purchaseSide + extraRenovation + totalHoldingCosts + sellingCosts;
    const profitPreTax = targetPrice - totalInvested;
    
    // Simple tax assumption: If bought recently, full tax.
    const tax = profitPreTax > 0 ? profitPreTax * (prop.financials.personalTaxRate / 100) : 0;
    const netProfit = profitPreTax - tax;

    const roi = (netProfit / (cf.equity + extraRenovation)) * 100; // Return on invested Equity
    const annualizedRoi = roi * (12 / durationMonths);

    return {
        purchaseSide,
        totalHoldingCosts,
        sellingCosts,
        totalInvested,
        profitPreTax,
        tax,
        netProfit,
        roi,
        annualizedRoi
    };
};

// --- NEW: AI & Strategic Logic ---

export const calculateRentIncreasePotential = (prop: Property) => {
    // Gesetzliche Sperrfrist: 12 Monate unverändert + 3 Monate Überlegungsfrist = 15 Monate
    const lastIncrease = prop.lastRentIncreaseDate ? new Date(prop.lastRentIncreaseDate) : new Date(prop.purchaseDate);
    const nextPossibleDate = new Date(lastIncrease);
    nextPossibleDate.setMonth(nextPossibleDate.getMonth() + 15); // +15 Monate

    const today = new Date();
    const isEligible = today >= nextPossibleDate;
    
    // Kappungsgrenze: Standard 20%, angespannte Märkte 15% (Berlin, München als Beispiel)
    const isTightMarket = ['Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt'].includes(prop.city);
    const capPercent = isTightMarket ? 15 : 20;

    const currentRent = prop.financials.coldRent;
    const maxIncreaseAmount = currentRent * (capPercent / 100);
    const potentialNewRent = currentRent + maxIncreaseAmount;

    return {
        lastIncreaseDate: lastIncrease,
        nextPossibleDate,
        isEligible,
        daysUntilEligible: isEligible ? 0 : Math.ceil((nextPossibleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        capPercent,
        maxIncreaseAmount,
        potentialNewRent
    };
};

export const generateStrategicInsights = (prop: Property): StrategicInsight[] => {
    const insights: StrategicInsight[] = [];
    const stats = calculateMonthlyCashflow(prop);
    const rentCheck = calculateRentIncreasePotential(prop);
    const today = new Date();
    const purchaseDate = new Date(prop.purchaseDate);

    // 1. Mietpreis-Hack
    if (rentCheck.isEligible) {
        insights.push({
            type: 'RENT',
            title: 'Mieterhöhung möglich',
            description: `Die Sperrfrist ist abgelaufen. Sie können die Miete anpassen (Kappungsgrenze ${rentCheck.capPercent}%).`,
            impact: 'HIGH',
            actionLabel: 'Anschreiben erstellen',
            value: `+ ${formatEUR(rentCheck.maxIncreaseAmount)} / Monat`
        });
    } else {
        insights.push({
            type: 'RENT',
            title: 'Nächste Mieterhöhung',
            description: `Sperrfrist aktiv. Planen Sie die nächste Erhöhung für den ${rentCheck.nextPossibleDate.toLocaleDateString('de-DE')}.`,
            impact: 'MEDIUM',
            actionLabel: 'Termin vormerken'
        });
    }

    // 2. Steuer-Hack: AfA
    if (prop.yearBuilt < 1925) {
        insights.push({
            type: 'TAX',
            title: 'AfA-Booster: Altbau',
            description: 'Gebäude vor 1925 können oft mit 2,5% (statt 2%) abgeschrieben werden. Prüfen Sie dies mit Ihrem Steuerberater.',
            impact: 'MEDIUM',
            actionLabel: 'AfA anpassen',
            value: `Steuervorteil`
        });
    }
    
    // 3. Steuer-Hack: Spekulationsfrist
    const tenYearsLater = new Date(purchaseDate);
    tenYearsLater.setFullYear(purchaseDate.getFullYear() + 10);
    if (tenYearsLater > today) {
         insights.push({
            type: 'TAX',
            title: 'Steuerfreier Verkauf',
            description: `Spekulationsfrist läuft noch bis ${tenYearsLater.toLocaleDateString('de-DE')}.`,
            impact: 'LOW',
            value: `${Math.ceil((tenYearsLater.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365))} Jahre`
        });
    } else {
        insights.push({
            type: 'TAX',
            title: 'Steuerfreier Verkauf möglich!',
            description: 'Die 10-Jahres-Frist ist abgelaufen. Ein Verkaufsgewinn wäre steuerfrei.',
            impact: 'HIGH',
            actionLabel: 'Marktwert prüfen'
        });
    }

    // 4. Finance-Hack: Beleihungsauslauf & Leverage
    const ltv = (prop.financials.loanAmount / prop.purchasePrice) * 100;
    if (ltv < 50) {
        insights.push({
            type: 'FINANCE',
            title: 'Verstecktes Kapital (Leverage)',
            description: 'Ihr Beleihungsauslauf ist unter 50%. Sie haben viel "totes" Eigenkapital im Objekt. Refinanzieren Sie, um weitere Objekte zu kaufen.',
            impact: 'HIGH',
            actionLabel: 'Nachbeleihung prüfen',
            value: `LTV: ${ltv.toFixed(0)}%`
        });
    }

    // 5. Energy-Hack
    if (prop.yearBuilt < 1990 && !prop.renovationCost) {
         insights.push({
            type: 'ENERGY',
            title: 'Sanierungsstau droht',
            description: 'Achtung: Bei Gebäuden vor 1990 ohne energetische Sanierung drohen Wertabschläge durch EU-Richtlinien. Prüfen Sie Förderungen (KfW).',
            impact: 'MEDIUM',
            actionLabel: 'Energieberater'
        });
    }

    return insights;
};