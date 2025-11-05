import { query } from '../utils/database.js';
import { conductWeeklyResearch, getLatestResearchFindings } from './competitiveResearch.js';
import { generateFeatureRequest, generateFollowUp, getPendingRequests } from './featureAdvocacy.js';

export async function runWeeklyImprovementCycle() {
  console.log('🤖 Starting AI self-improvement cycle...');
  
  const cycleStart = new Date();
  const results = {
    researchFindings: [],
    newRequests: [],
    followUps: [],
    errors: []
  };

  try {
    console.log('📚 Step 1: Conduct competitive research...');
    const findings = await conductWeeklyResearch();
    results.researchFindings = findings;
    console.log(`✅ Found ${findings.length} new features/patterns`);

    console.log('💭 Step 2: Analyze gaps and generate feature requests...');
    const topFindings = findings
      .sort((a, b) => (b.novelty_score + b.reliability_score) - (a.novelty_score + a.reliability_score))
      .slice(0, 3);

    for (const finding of topFindings) {
      try {
        const request = await generateFeatureRequest(finding);
        results.newRequests.push(request);
        console.log(`✅ Generated request: ${finding.feature_name}`);
      } catch (err) {
        console.error(`Failed to generate request for ${finding.feature_name}:`, err);
        results.errors.push(`Request generation failed: ${finding.feature_name}`);
      }
    }

    console.log('🔔 Step 3: Send follow-ups for pending requests...');
    const pendingRequests = await getPendingRequests();
    const oldRequests = pendingRequests.filter(r => {
      const daysSince = Math.floor((Date.now() - new Date(r.created_at)) / (1000 * 60 * 60 * 24));
      const lastFollowUp = r.last_follow_up ? new Date(r.last_follow_up) : null;
      const daysSinceFollowUp = lastFollowUp 
        ? Math.floor((Date.now() - lastFollowUp) / (1000 * 60 * 60 * 24))
        : daysSince;
      
      return daysSince >= 7 && daysSinceFollowUp >= 7 && r.follow_up_count < 3;
    });

    for (const request of oldRequests.slice(0, 2)) {
      try {
        const followUp = await generateFollowUp(request.id);
        results.followUps.push({
          requestId: request.id,
          featureName: request.feature_name,
          message: followUp
        });
        console.log(`✅ Generated follow-up: ${request.feature_name}`);
      } catch (err) {
        console.error(`Failed to generate follow-up for ${request.feature_name}:`, err);
        results.errors.push(`Follow-up failed: ${request.feature_name}`);
      }
    }

    const cycleDuration = Math.floor((Date.now() - cycleStart) / 1000);
    console.log(`✅ Weekly cycle complete in ${cycleDuration}s`);
    
    await logCycleSummary(results, cycleDuration);

  } catch (error) {
    console.error('Weekly improvement cycle failed:', error);
    results.errors.push(`Cycle error: ${error.message}`);
  }

  return results;
}

async function logCycleSummary(results, duration) {
  const summary = {
    findings_discovered: results.researchFindings.length,
    requests_generated: results.newRequests.length,
    follow_ups_sent: results.followUps.length,
    errors: results.errors.length,
    duration_seconds: duration,
    timestamp: new Date()
  };

  console.log('\n📊 WEEKLY CYCLE SUMMARY:');
  console.log(`   Research findings: ${summary.findings_discovered}`);
  console.log(`   Feature requests: ${summary.requests_generated}`);
  console.log(`   Follow-ups sent: ${summary.follow_ups_sent}`);
  console.log(`   Errors: ${summary.errors}`);
  console.log(`   Duration: ${summary.duration_seconds}s\n`);

  return summary;
}

export async function checkForShippedFeatures() {
  const shippedFeatures = await query(
    `SELECT * FROM feature_requests 
     WHERE status = 'shipped' AND celebration_sent = FALSE`
  );

  const celebrations = [];
  for (const feature of shippedFeatures.rows) {
    try {
      const { generateCelebration } = await import('./featureAdvocacy.js');
      const celebration = await generateCelebration(feature.id);
      celebrations.push({
        featureId: feature.id,
        featureName: feature.feature_name,
        message: celebration
      });
    } catch (err) {
      console.error(`Failed to generate celebration for ${feature.feature_name}:`, err);
    }
  }

  return celebrations;
}

export async function trackPromiseFulfillment(featureRequestId, promiseId, evidence) {
  await query(
    `UPDATE ai_promises 
     SET status = 'fulfilled', fulfillment_evidence = $1, fulfilled_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND feature_request_id = $3`,
    [evidence, promiseId, featureRequestId]
  );

  const promises = await query(
    `SELECT * FROM ai_promises WHERE feature_request_id = $1`,
    [featureRequestId]
  );

  const total = promises.rows.length;
  const fulfilled = promises.rows.filter(p => p.status === 'fulfilled').length;

  return {
    total,
    fulfilled,
    percentage: total > 0 ? Math.round((fulfilled / total) * 100) : 0
  };
}

export async function getSelfImprovementSummary() {
  const stats = await query(`
    SELECT
      (SELECT COUNT(*) FROM feature_requests) as total_requests,
      (SELECT COUNT(*) FROM feature_requests WHERE status = 'proposed') as pending,
      (SELECT COUNT(*) FROM feature_requests WHERE status = 'shipped') as shipped,
      (SELECT COUNT(*) FROM feature_requests WHERE status = 'declined') as declined,
      (SELECT COUNT(*) FROM improvement_recommendations) as total_improvements,
      (SELECT COUNT(*) FROM improvement_recommendations WHERE status = 'pending') as pending_improvements,
      (SELECT COUNT(*) FROM ai_feature_intel) as features_researched,
      (SELECT COUNT(DISTINCT source) FROM ai_feature_intel) as sources_tracked,
      (SELECT COUNT(*) FROM ai_promises WHERE status = 'fulfilled') as promises_kept,
      (SELECT COUNT(*) FROM ai_promises WHERE status = 'broken') as promises_broken,
      (SELECT MAX(research_date) FROM ai_feature_intel) as last_research,
      (SELECT MAX(created_at) FROM feature_requests) as last_request
  `);

  const recentRequests = await query(`
    SELECT * FROM feature_requests 
    ORDER BY created_at DESC LIMIT 5
  `);

  const recentImprovements = await query(`
    SELECT ir.*, fr.feature_name
    FROM improvement_recommendations ir
    JOIN feature_requests fr ON ir.feature_request_id = fr.id
    ORDER BY ir.created_at DESC LIMIT 5
  `);

  return {
    statistics: stats.rows[0],
    recentRequests: recentRequests.rows,
    recentImprovements: recentImprovements.rows
  };
}
