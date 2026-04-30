// regexPatterns.js - Regex patterns for document validation

export const REGEX_PATTERNS = {
  // Legal Identifiers
  eStampUIN: /[A-Z]{2}[0-9A-Z]{14}[0-9]{2}[A-Z0-9]{4}/i,
  aadhaar: /[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}/,
  pan: /[A-Z]{5}[0-9]{4}[A-Z]{1}/,
  gst: /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/,
  
  // Date Patterns
  dates: /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}/g,
  effectiveDate: /effective\s+date:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
  terminationDate: /termination\s+date:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
  
  // Monetary Amounts
  moneyAmounts: /\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|dollars|rupees|INR)/gi,
  
  // Risk Keywords
  highRiskTerms: [
    /indemnify/i,
    /hold harmless/i,
    /waive.*right/i,
    /binding arbitration/i,
    /no refund/i,
    /non-refundable/i,
    /automatic renewal/i,
    /unilateral.*change/i,
    /modify.*without notice/i,
    /class action waiver/i,
    /limitation of liability/i,
    /as is/i,
    /no warranty/i
  ],
  
  mediumRiskTerms: [
    /late fee/i,
    /penalty/i,
    /termination fee/i,
    /exclusive jurisdiction/i,
    /governing law/i,
    /confidentiality/i,
    /non-compete/i,
    /non-solicit/i
  ],
  
  lowRiskTerms: [
    /30 days notice/i,
    /mutual agreement/i,
    /good faith/i,
    /reasonable/i,
    /standard practice/i
  ],
  
  // Essential Clauses
  essentialClauses: [
    { name: "Termination Clause", pattern: /termination|terminate|cancel/i, weight: 30 },
    { name: "Dispute Resolution", pattern: /dispute|arbitration|mediation|court/i, weight: 25 },
    { name: "Liability Clause", pattern: /liability|indemnification|hold harmless/i, weight: 25 },
    { name: "Governing Law", pattern: /governing law|jurisdiction|applicable law/i, weight: 20 },
    { name: "Privacy/Data Protection", pattern: /privacy|data protection|confidential information/i, weight: 20 },
    { name: "Payment Terms", pattern: /payment|fee|charge|refund/i, weight: 15 },
    { name: "Term/Duration", pattern: /term|duration|effective date|expiration/i, weight: 15 },
    { name: "Notice Clause", pattern: /notice|communication|contact/i, weight: 10 }
  ],
  
  // Consumer Protection
  consumerProtection: [
    { term: /cooling off period/i, weight: -10 },
    { term: /right to cancel/i, weight: -10 },
    { term: /refund policy/i, weight: -5 },
    { term: /consumer protection/i, weight: -15 },
    { term: /free trial/i, weight: -5 }
  ]
};

export function validateEStampUIN(text) {
  const matches = text.match(REGEX_PATTERNS.eStampUIN);
  if (!matches) return { valid: false, message: "No E-Stamp UIN found" };
  
  const uin = matches[0];
  const isValid = uin.length === 20 || uin.length === 24;
  
  return {
    valid: isValid,
    uin: uin,
    message: isValid ? "Valid E-Stamp UIN" : "Invalid format - should be 20-24 characters"
  };
}

export function extractDates(text) {
  const dates = text.match(REGEX_PATTERNS.dates) || [];
  return [...new Set(dates)];
}

export function extractMoneyAmounts(text) {
  const amounts = text.match(REGEX_PATTERNS.moneyAmounts) || [];
  return amounts;
}

export function scoreRiskTerms(text) {
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;
  
  REGEX_PATTERNS.highRiskTerms.forEach(term => {
    const matches = text.match(term);
    if (matches) highRiskCount += matches.length;
  });
  
  REGEX_PATTERNS.mediumRiskTerms.forEach(term => {
    const matches = text.match(term);
    if (matches) mediumRiskCount += matches.length;
  });
  
  REGEX_PATTERNS.lowRiskTerms.forEach(term => {
    const matches = text.match(term);
    if (matches) lowRiskCount += matches.length;
  });
  
  return {
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    riskScore: (highRiskCount * 10) + (mediumRiskCount * 5) - (lowRiskCount * 2)
  };
}