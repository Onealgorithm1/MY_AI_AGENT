# Self-Testing System

## Overview

The Self-Testing System is an automated testing framework that validates system health, API connectivity, data integrity, and overall application performance. It's designed to generate reports that can be fed to Claude for intelligent analysis and recommendations.

## 🎯 Purpose

- **Proactive Monitoring**: Catch issues before they affect users
- **Health Validation**: Ensure all critical services are operational
- **AI-Powered Analysis**: Generate reports optimized for Claude review
- **Continuous Monitoring**: Track system health over time

## 🏗️ Architecture

### Backend Components

1. **Self-Testing Service** (`backend/src/services/selfTestingService.js`)
   - Core testing engine
   - 9 comprehensive test categories
   - Claude-optimized report generation

2. **API Routes** (`backend/src/routes/selfTest.js`)
   - `POST /api/self-test/run` - Trigger test suite
   - `GET /api/self-test/latest` - Get latest results
   - `GET /api/self-test/history` - Get test history
   - `GET /api/self-test/claude-prompt` - Get Claude-formatted report

3. **Database Schema** (`system_health_checks` table)
   ```sql
   CREATE TABLE system_health_checks (
     id SERIAL PRIMARY KEY,
     check_type VARCHAR(100) NOT NULL,
     status VARCHAR(50) NOT NULL,
     details JSONB NOT NULL,
     checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### Frontend Components

1. **Self-Testing Dashboard** (`frontend/src/components/SelfTestingDashboard.jsx`)
   - Visual test results
   - One-click test execution
   - Copy report for Claude review
   - Test history viewer

2. **Admin Integration** (`frontend/src/pages/AdminPage.jsx`)
   - New "System Tests" tab
   - Full admin access to testing features

## 📋 Test Categories

### 1. Database Health
- **Connection Test**: Validates database connectivity
- **Table Verification**: Checks all required tables exist
- **Query Performance**: Measures database response time

**Example Test:**
```javascript
{
  name: 'Database Connection',
  status: 'passed',
  message: 'Database connection successful',
  duration: 45,
  details: {
    connectionTime: '45ms',
    tablesFound: 13,
    requiredTables: ['users', 'conversations', 'messages', ...]
  }
}
```

### 2. API Endpoints
- **Health Check**: Validates `/health` endpoint
- **Authentication**: Tests JWT authentication
- **Rate Limiting**: Verifies rate limit configuration

### 3. AI Services
- **OpenAI Configuration**: Checks API key availability
- **Model Access**: Validates model permissions
- **STT/TTS Services**: Tests speech services

### 4. Authentication System
- **JWT Validation**: Tests token generation/verification
- **Encryption Keys**: Validates security configuration
- **Admin User**: Ensures admin account exists

### 5. File Operations
- **Upload Directory**: Checks file storage access
- **Permissions**: Validates read/write permissions
- **Disk Space**: Monitors available storage

### 6. WebSocket Connections
- **Voice WebSocket**: Tests real-time voice connection
- **Telemetry WebSocket**: Validates telemetry streaming
- **STT Streaming**: Checks speech-to-text WebSocket

### 7. Data Integrity
- **Orphaned Records**: Finds messages without conversations
- **Empty Conversations**: Identifies conversations with no messages
- **Referential Integrity**: Validates foreign key relationships

### 8. Performance Benchmarks
- **Memory Usage**: Monitors application memory
- **Uptime**: Tracks server uptime
- **Response Times**: Measures API latency

### 9. Security Configuration
- **Environment**: Validates NODE_ENV setting
- **Rate Limiting**: Checks rate limit configuration
- **CORS**: Verifies CORS settings
- **Helmet**: Validates security headers

## 🚀 Usage

### Running Tests via UI

1. Navigate to **Admin Dashboard** (must be admin user)
2. Click on **System Tests** tab
3. Click **Run All Tests** button
4. Wait for tests to complete (usually 5-10 seconds)
5. View results in dashboard

### Running Tests via API

```bash
# Run all tests
curl -X POST http://localhost:3000/api/self-test/run \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Get latest results
curl http://localhost:3000/api/self-test/latest \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Get test history
curl http://localhost:3000/api/self-test/history?limit=10 \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Get Claude-formatted prompt
curl http://localhost:3000/api/self-test/claude-prompt \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

### Running Database Migration

Before first use, run the database migration:

```bash
cd myaiagent-mvp/backend
node src/scripts/add-self-test-table.js
```

## 🤖 Claude Integration

### Generating Reports for Claude

The system generates reports specifically formatted for Claude review:

1. Click **Copy for Claude Review** button in UI
2. Open Claude chat
3. Paste the copied report
4. Claude will analyze results and provide recommendations

### Report Format

```markdown
# Self-Test Results for Review

## Summary
- **Total Tests**: 32
- **Passed**: 28
- **Failed**: 2
- **Warnings**: 2
- **Timestamp**: 2025-11-11T10:30:45Z

## Critical Failures
1. **OpenAI API Key Not Configured**
   - Status: failed
   - Message: No OpenAI API key found
   - Recommendation: Configure OPENAI_API_KEY in secrets manager

## Warnings
1. **High Memory Usage**
   - Status: warning
   - Memory: 512MB / 1GB (51% used)
   - Recommendation: Monitor memory usage trends

## Questions for Claude
1. Are there any critical failures that need immediate attention?
2. What are the root causes of the warnings?
3. What additional tests should be added?
4. Are there any patterns in the failures that suggest systemic issues?
5. What performance optimizations would you recommend?

## Full Test Details
[Detailed JSON of all test results...]
```

### Claude Analysis

Claude can provide:
- **Root Cause Analysis**: Identify underlying issues
- **Priority Recommendations**: What to fix first
- **System Insights**: Patterns and trends
- **Optimization Suggestions**: Performance improvements
- **Security Recommendations**: Vulnerability assessment

## 📊 Test Results Interpretation

### Status Levels

- **`passed`** ✅: Test completed successfully
- **`warning`** ⚠️: Test passed but found concerning patterns
- **`failed`** ❌: Test failed, action required

### Response Format

```javascript
{
  "success": true,
  "report": {
    "timestamp": "2025-11-11T10:30:45.123Z",
    "duration": 8547,
    "summary": {
      "total": 32,
      "passed": 28,
      "failed": 2,
      "warnings": 2
    },
    "tests": [
      {
        "category": "Database Health",
        "name": "Connection Test",
        "status": "passed",
        "message": "Database connected successfully",
        "duration": 45,
        "details": { ... }
      }
    ]
  }
}
```

## 🔧 Configuration

### Environment Variables

No special configuration required. Tests automatically detect:
- Database connection from `DATABASE_URL`
- API keys from secrets manager
- Server configuration from environment

### Customizing Tests

To add new tests, edit `backend/src/services/selfTestingService.js`:

```javascript
async testMyCustomFeature() {
  try {
    // Your test logic here
    const result = await someOperation();

    this.testResults.push({
      category: 'Custom Tests',
      name: 'My Custom Feature',
      status: 'passed',
      message: 'Feature working correctly',
      duration: 123,
      details: { result }
    });
  } catch (error) {
    this.testResults.push({
      category: 'Custom Tests',
      name: 'My Custom Feature',
      status: 'failed',
      message: error.message,
      details: { error: error.stack }
    });
  }
}
```

## 📈 Monitoring Best Practices

### Recommended Schedule

- **Development**: Run on-demand when testing features
- **Staging**: Run before each deployment
- **Production**: Run daily or after major changes

### Setting Up Automated Testing

You can set up automated testing with cron jobs:

```bash
# Add to crontab (run daily at 2 AM)
0 2 * * * curl -X POST http://localhost:3000/api/self-test/run \
  -H "Cookie: token=$(cat /path/to/admin-token.txt)"
```

### Alerting

Consider setting up alerts for critical failures:

```javascript
// Example: Send Slack notification on failures
const result = await selfTestingService.runAllTests();
if (result.summary.failed > 0) {
  await sendSlackAlert({
    text: `⚠️ Self-test failures detected: ${result.summary.failed} tests failed`,
    url: 'https://yourapp.com/admin?tab=self-testing'
  });
}
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Ensure PostgreSQL is running and DATABASE_URL is correct

#### Authentication Failures
```
Error: JWT secret not configured
```
**Solution**: Set JWT_SECRET environment variable

#### Permission Errors
```
Error: EACCES: permission denied, mkdir '/uploads'
```
**Solution**: Check file system permissions for upload directory

## 🔒 Security Considerations

- **Admin Only**: Self-test endpoints require admin authentication
- **No Sensitive Data**: Test reports mask API keys and sensitive information
- **Rate Limiting**: Tests are subject to rate limiting to prevent abuse
- **Audit Logging**: All test runs are logged to database

## 📝 Changelog

### Version 1.0.0 (2025-11-11)
- Initial implementation
- 9 test categories with 32+ individual tests
- Claude-optimized report generation
- Admin UI dashboard
- Test history tracking
- One-click copy for Claude review

## 🚀 Future Enhancements

Planned improvements:
- [ ] Scheduled automated testing
- [ ] Email/Slack notifications for failures
- [ ] Performance trending graphs
- [ ] Custom test configuration via UI
- [ ] Export test results to CSV/JSON
- [ ] Integration with CI/CD pipelines
- [ ] Real-time test streaming
- [ ] Test result comparison (before/after deployments)

## 📚 Related Documentation

- [System Audit](./SYSTEM_AUDIT.md) - Overall system health
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Security Guide](../security/SECURITY_GUIDE.md) - Security best practices
- [Quick Start](../setup/QUICK_START.md) - Getting started

---

**Need help?** The system is designed to be self-explanatory, but if you encounter issues, run a self-test and paste the results to Claude for guidance!
