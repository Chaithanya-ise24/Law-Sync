// riskScoring.js - Risk scoring algorithm

export function calculateRiskScore(aiAnalysis, regexAnalysis) {
  let score = 0;
  const weights = {
    highRiskClause: 15,
    mediumRiskClause: 8,
    lowRiskClause: 3,
    missingCritical: 20,
    missingImportant: 10,
    missingRecommended: 5,
    highRiskTerm: 10,
    mediumRiskTerm: 5,
    consumerProtection: -8
  };
  
  // Score from AI-identified clauses
  if (aiAnalysis.clauses) {
    aiAnalysis.clauses.forEach(clause => {
      switch(clause.risk_level) {
        case 'high': score += weights.highRiskClause; break;
        case 'medium': score += weights.mediumRiskClause; break;
        case 'low': score += weights.lowRiskClause; break;
      }
    });
  }
  
  // Score from missing clauses
  if (aiAnalysis.missing_clauses) {
    aiAnalysis.missing_clauses.forEach(missing => {
      switch(missing.importance) {
        case 'critical': score += weights.missingCritical; break;
        case 'important': score += weights.missingImportant; break;
        case 'recommended': score += weights.missingRecommended; break;
      }
    });
  }
  
  // Score from regex term detection
  if (regexAnalysis) {
    score += (regexAnalysis.highRiskCount * weights.highRiskTerm);
    score += (regexAnalysis.mediumRiskCount * weights.mediumRiskTerm);
    score -= (regexAnalysis.consumerProtectionCount * weights.consumerProtection);
  }
  
  return Math.min(100, Math.max(0, score));
}

export function getFairnessRating(score) {
  if (score <= 20) return { rating: "fair", color: "green", description: "Document appears fair and balanced" };
  if (score <= 40) return { rating: "moderate", color: "yellow", description: "Some concerning clauses, review recommended" };
  if (score <= 70) return { rating: "unfair", color: "orange", description: "Multiple problematic clauses, legal review strongly advised" };
  return { rating: "predatory", color: "red", description: "Highly one-sided document, contains predatory terms" };
}

export function calculateConfidence(aiAnalysis, regexMatchCount, documentLength) {
  let confidence = 70;
  
  if (aiAnalysis.clauses && aiAnalysis.clauses.length > 0) {
    confidence += Math.min(15, aiAnalysis.clauses.length * 3);
  }
  
  if (regexMatchCount > 0) {
    confidence += Math.min(10, regexMatchCount);
  }
  
  if (documentLength < 500) {
    confidence -= 20;
  }
  
  return Math.min(100, Math.max(0, confidence));
}

export function generateExecutiveSummary(score, rating, keyConcerns, positiveAspects) {
  let summary = "";
  
  if (score <= 20) {
    summary = "This document appears well-balanced with fair terms. ";
  } else if (score <= 40) {
    summary = "This document has some concerning clauses that warrant review. ";
  } else if (score <= 70) {
    summary = "⚠️ This document contains multiple problematic clauses that significantly favor one party. ";
  } else {
    summary = "🚨 HIGH RISK: This document contains predatory terms that could be detrimental. ";
  }
  
  if (keyConcerns && keyConcerns.length > 0) {
    summary += `Key concerns: ${keyConcerns.slice(0, 3).join(", ")}. `;
  }
  
  if (positiveAspects && positiveAspects.length > 0) {
    summary += `Positive: ${positiveAspects.slice(0, 2).join(", ")}. `;
  }
  
  return summary;
}