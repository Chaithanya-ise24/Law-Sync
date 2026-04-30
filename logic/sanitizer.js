// sanitizer.js - Data cleaning and validation

export function sanitizeAIResponse(rawResponse) {
  let responseText = rawResponse;
  
  if (typeof rawResponse === 'object') {
    responseText = JSON.stringify(rawResponse);
  }
  
  let cleaned = responseText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON Parse Error:', error.message);
    return getFallbackAnalysis();
  }
  
  return {
    clauses: normalizeClauses(parsed.clauses || []),
    missing_clauses: normalizeMissingClauses(parsed.missing_clauses || []),
    overall_assessment: normalizeOverallAssessment(parsed.overall_assessment || {})
  };
}

function normalizeClauses(clauses) {
  if (!Array.isArray(clauses)) return [];
  
  return clauses.map(clause => ({
    name: clause.name || "Unnamed Clause",
    text: clause.text || "",
    risk_level: validateRiskLevel(clause.risk_level),
    reason: clause.reason || "No reason provided",
    recommendation: clause.recommendation || "No recommendation provided"
  }));
}

function validateRiskLevel(level) {
  const validLevels = ['high', 'medium', 'low'];
  return validLevels.includes(level) ? level : 'medium';
}

function normalizeMissingClauses(missingClauses) {
  if (!Array.isArray(missingClauses)) return [];
  
  return missingClauses.map(clause => ({
    name: clause.name || "Unnamed Required Clause",
    importance: validateImportance(clause.importance),
    description: clause.description || "No description provided",
    standard_practice: clause.standard_practice || "No standard provided"
  }));
}

function validateImportance(importance) {
  const validLevels = ['critical', 'important', 'recommended'];
  return validLevels.includes(importance) ? importance : 'recommended';
}

function normalizeOverallAssessment(assessment) {
  return {
    risk_score: validateRiskScore(assessment.risk_score),
    fairness_rating: validateFairnessRating(assessment.fairness_rating),
    key_concerns: Array.isArray(assessment.key_concerns) ? assessment.key_concerns : [],
    positive_aspects: Array.isArray(assessment.positive_aspects) ? assessment.positive_aspects : []
  };
}

function validateRiskScore(score) {
  let num = Number(score);
  if (isNaN(num)) return 50;
  return Math.min(100, Math.max(0, num));
}

function validateFairnessRating(rating) {
  const validRatings = ['fair', 'moderate', 'unfair', 'predatory'];
  return validRatings.includes(rating) ? rating : 'moderate';
}

function getFallbackAnalysis() {
  return {
    clauses: [],
    missing_clauses: [],
    overall_assessment: {
      risk_score: 50,
      fairness_rating: "moderate",
      key_concerns: ["Unable to complete full analysis", "Manual review recommended"],
      positive_aspects: []
    }
  };
}

export function mergeAnalyses(aiAnalysis, regexAnalysis) {
  return {
    ...aiAnalysis,
    regex_validation: regexAnalysis,
    metadata: {
      ai_confidence: calculateConfidenceFromAI(aiAnalysis),
      regex_matches: regexAnalysis.totalMatches,
      timestamp: new Date().toISOString()
    }
  };
}

function calculateConfidenceFromAI(aiAnalysis) {
  let confidence = 70;
  if (aiAnalysis.clauses?.length > 0) confidence += 10;
  if (aiAnalysis.missing_clauses?.length > 0) confidence += 10;
  if (aiAnalysis.overall_assessment?.risk_score) confidence += 10;
  return Math.min(95, confidence);
}