import express from 'express';
import { authenticate } from '../middleware/auth.js';
import selfTestingService from '../services/selfTestingService.js';
import { query } from '../utils/database.js';

const router = express.Router();

/**
 * Trigger self-test suite
 * POST /api/self-test/run
 *
 * Runs comprehensive self-tests and returns results
 * Output format is optimized for Claude review
 */
router.post('/run', authenticate, async (req, res) => {
  try {
    // Only admins can run self-tests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`🧪 Self-test initiated by ${req.user.email}`);

    // Run all tests
    const report = await selfTestingService.runAllTests();

    // Store test results in database
    await query(
      `INSERT INTO system_health_checks
       (check_type, status, details, checked_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [
        'self_test_suite',
        report.summary.failed === 0 ? 'healthy' : 'degraded',
        JSON.stringify(report),
      ]
    );

    // Return full report
    res.json({
      success: true,
      report,
      message: 'Self-test suite completed',
    });

  } catch (error) {
    console.error('Self-test error:', error);
    res.status(500).json({
      error: 'Self-test execution failed',
      details: error.message,
    });
  }
});

/**
 * Get last test results
 * GET /api/self-test/latest
 */
router.get('/latest', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await query(
      `SELECT * FROM system_health_checks
       WHERE check_type = 'self_test_suite'
       ORDER BY checked_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        message: 'No test results available. Run tests first.',
        hasResults: false,
      });
    }

    res.json({
      hasResults: true,
      result: result.rows[0],
    });

  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

/**
 * Get test history
 * GET /api/self-test/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { limit = 10 } = req.query;
    const validLimit = Math.max(1, Math.min(50, parseInt(limit) || 10));

    const results = await query(
      `SELECT id, check_type, status, checked_at,
              (details->>'summary')::json as summary
       FROM system_health_checks
       WHERE check_type = 'self_test_suite'
       ORDER BY checked_at DESC
       LIMIT $1`,
      [validLimit]
    );

    res.json({
      history: results.rows,
      count: results.rows.length,
    });

  } catch (error) {
    console.error('Error fetching test history:', error);
    res.status(500).json({ error: 'Failed to fetch test history' });
  }
});

/**
 * Generate Claude-optimized prompt
 * GET /api/self-test/claude-prompt
 *
 * Returns the latest test results formatted specifically for Claude review
 */
router.get('/claude-prompt', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await query(
      `SELECT details FROM system_health_checks
       WHERE check_type = 'self_test_suite'
       ORDER BY checked_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        message: 'No test results available. Run tests first.',
        prompt: null,
      });
    }

    const report = result.rows[0].details;

    // Generate formatted prompt for Claude
    const claudePrompt = `# Self-Test Results for Review

## Summary
- **Total Tests**: ${report.summary.total}
- **Passed**: ${report.summary.passed}
- **Failed**: ${report.summary.failed}
- **Warnings**: ${report.summary.warnings}
- **Success Rate**: ${report.summary.successRate}
- **Duration**: ${report.summary.duration}
- **Timestamp**: ${report.summary.timestamp}

## Test Results by Category

${report.results.map(r => `
### ${r.category}: ${r.test}
- **Status**: ${r.status}
- **Details**: ${JSON.stringify(r.details, null, 2)}
`).join('\n')}

## Recommendations from System

${report.recommendations.map(r => `
### ${r.priority} - ${r.category}
${r.message}
${r.tests ? `\n**Affected Tests**:\n${r.tests.map(t => `- ${t}`).join('\n')}` : ''}
${r.action ? `\n**Action**: ${r.action}` : ''}
`).join('\n')}

## Questions for Claude

${report.claudePrompt.questions.map(q => `- ${q}`).join('\n')}

---

**Instructions**: Please analyze these test results and provide:
1. Root cause analysis for any failures
2. Recommendations for fixes
3. Suggestions for additional tests
4. Performance optimization opportunities
5. Security concerns if any

Copy and paste this entire report into Claude for review.`;

    res.json({
      prompt: claudePrompt,
      rawReport: report,
    });

  } catch (error) {
    console.error('Error generating Claude prompt:', error);
    res.status(500).json({ error: 'Failed to generate prompt' });
  }
});

export default router;
