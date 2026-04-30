// index.js - Main export for Logic Module

import { buildSystemPrompt, buildDocumentPrompt } from './prompts.js';
import { 
  validateEStampUIN, 
  extractDates, 
  extractMoneyAmounts, 
  scoreRiskTerms,
  REGEX_PATTERNS 
} from './regexPatterns.js';
import { 
  calculateRiskScore, 
  getFairnessRating, 
  calculateConfidence,
  generateExecutiveSummary 
} from './riskScoring.js';
import { 
  sanitizeAIResponse, 
  mergeAnalyses 
} from './sanitizer.js';

export function processForensicAnalysis(documentText, aiResponse) {
  console.log('🔍 Starting Forensic Analysis...');
  
  const sanitizedAI = sanitizeAIResponse(aiResponse);
  const regexAnalysis = runRegexAnalysis(documentText);
  const finalScore = calculateRiskScore(sanitizedAI, regexAnalysis);
  const fairnessRating = getFairnessRating(finalScore);
  const executiveSummary = generateExecutiveSummary(
    finalScore,
    fairnessRating.rating,
    sanitizedAI.overall_assessment?.key_concerns || [],
    sanitizedAI.overall_assessment?.positive_aspects || []
  );
  const confidence = calculateConfidence(
    sanitizedAI,
    regexAnalysis.totalMatches,
    documentText.length
  );
  
  const finalAnalysis = {
    success: true,
    document_metadata: {
      length: documentText.length,
      word_count: documentText.split(/\s+/).length,
      line_count: documentText.split('\n').length
    },
    ai_analysis: sanitizedAI,
    regex_validation: regexAnalysis,
    risk_assessment: {
      risk_score: finalScore,
      fairness_rating: fairnessRating.rating,
      fairness_color: fairnessRating.color,
      fairness_description: fairnessRating.description,
      confidence_score: confidence,
      executive_summary: executiveSummary
    },
    legal_identifiers: {
      e_stamp_uin: validateEStampUIN(documentText),
      dates_found: extractDates(documentText),
      monetary_amounts: extractMoneyAmounts(documentText)
    },
    recommendations: generateRecommendations(sanitizedAI, finalScore),
    timestamp: new Date().toISOString()
  };
  
  console.log(`✅ Analysis Complete - Risk Score: ${finalScore}/100`);
  return finalAnalysis;
}

function runRegexAnalysis(text) {
  const riskTerms = scoreRiskTerms(text);
  
  let consumerProtectionCount = 0;
  REGEX_PATTERNS.consumerProtection.forEach(item => {
    const matches = text.match(item.term);
    if (matches) consumerProtectionCount += matches.length;
  });
  
  const missingEssentialClauses = [];
  REGEX_PATTERNS.essentialClauses.forEach(clause => {
    const found = clause.pattern.test(text);
    if (!found) {
      missingEssentialClauses.push({
        name: clause.name,
        weight: clause.weight
      });
    }
  });
  
  return {
    high_risk_terms: riskTerms.highRiskCount,
    medium_risk_terms: riskTerms.mediumRiskCount,
    low_risk_terms: riskTerms.lowRiskCount,
    consumer_protection_terms: consumerProtectionCount,
    missing_essential_clauses: missingEssentialClauses,
    totalMatches: riskTerms.highRiskCount + riskTerms.mediumRiskCount + riskTerms.lowRiskCount
  };
}

function generateRecommendations(aiAnalysis, riskScore) {
  const recommendations = [];
  
  if (riskScore > 60) {
    recommendations.push("🚨 Consult with a legal professional before signing");
    recommendations.push("📝 Request modifications to high-risk clauses identified above");
  }
  
  if (aiAnalysis.missing_clauses?.length > 0) {
    const criticalMissing = aiAnalysis.missing_clauses.filter(m => m.importance === 'critical');
    if (criticalMissing.length > 0) {
      recommendations.push(`⚠️ Missing critical clauses: ${criticalMissing.map(m => m.name).join(", ")}`);
    }
  }
  
  if (aiAnalysis.clauses?.length > 0) {
    const highRiskClauses = aiAnalysis.clauses.filter(c => c.risk_level === 'high');
    if (highRiskClauses.length > 0) {
      recommendations.push(`📌 Renegotiate ${highRiskClauses.length} high-risk clause(s)`);
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push("✅ Document appears fair - no major concerns");
    recommendations.push("📋 Standard review recommended before signing");
  }
  
  return recommendations;
}

export {
  validateEStampUIN,
  extractDates,
  extractMoneyAmounts,
  calculateRiskScore,
  getFairnessRating,
  sanitizeAIResponse,
  buildSystemPrompt,
  buildDocumentPrompt
};