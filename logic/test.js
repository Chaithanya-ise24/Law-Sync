// test.js - Test the logic module
import { processForensicAnalysis, buildSystemPrompt } from './index.js';

const sampleDocument = `
EMPLOYMENT AGREEMENT

This Agreement is between Tech Corp and Employee.

1. INDEMNIFICATION: Employee agrees to indemnify Company for any claims.
2. ARBITRATION: Any disputes shall be resolved by binding arbitration.
3. Company may modify terms at any time without notice.
4. No refunds under any circumstances.
5. Employee waives all rights to class action.

The effective date is 01/15/2026.
`;

const mockAIResponse = {
  clauses: [
    {
      name: "Indemnification Clause",
      text: "Employee agrees to indemnify Company for any claims.",
      risk_level: "high",
      reason: "Unlimited indemnification shifts all liability to employee",
      recommendation: "Limit to employee-caused damages only"
    },
    {
      name: "Arbitration Clause",
      text: "Any disputes shall be resolved by binding arbitration.",
      risk_level: "high",
      reason: "No exception for small claims, waives jury trial",
      recommendation: "Add small claims court exception"
    }
  ],
  missing_clauses: [
    {
      name: "Termination Clause",
      importance: "critical",
      description: "No termination terms specified",
      standard_practice: "30-day notice period for either party"
    }
  ],
  overall_assessment: {
    risk_score: 75,
    fairness_rating: "unfair",
    key_concerns: ["Unlimited indemnification", "Forced arbitration", "No termination terms"],
    positive_aspects: []
  }
};

console.log('='.repeat(60));
console.log('LawSync Logic Module Test');
console.log('='.repeat(60));

const result = processForensicAnalysis(sampleDocument, mockAIResponse);

console.log('\n📊 Risk Assessment:');
console.log(`   Risk Score: ${result.risk_assessment.risk_score}/100`);
console.log(`   Fairness Rating: ${result.risk_assessment.fairness_rating}`);
console.log(`   Confidence: ${result.risk_assessment.confidence_score}%`);
console.log(`\n📝 Executive Summary: ${result.risk_assessment.executive_summary}`);
console.log(`\n💡 Recommendations:`);
result.recommendations.forEach(r => console.log(`   ${r}`));

console.log('\n✅ Test Complete');