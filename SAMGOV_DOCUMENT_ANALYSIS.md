# SAM.gov Document Analysis System

## Overview

The SAM.gov Document Analysis system automatically fetches, parses, and analyzes documents (PDFs, DOCs, HTML) attached to SAM.gov opportunities using AI-powered analysis.

## Features

### 1. **Automatic Document Fetching**
- Fetches documents from URLs in SAM.gov opportunities
- Supports PDF, HTML, TXT, and DOC/DOCX files
- Handles redirects and timeouts gracefully
- Stores raw document content in database

### 2. **Content Extraction**
- **PDF**: Full text extraction using pdf-parse
- **HTML**: Clean text extraction (removes scripts/styles)
- **TXT**: Direct text storage
- **DOC/DOCX**: Placeholder (extensible for future support)

### 3. **AI-Powered Analysis**
The system uses GPT-4 to analyze documents and extract:

#### Executive Summary
- Brief 2-3 sentence overview of the opportunity

#### Key Requirements
- Technical, administrative, personnel requirements
- Marked as mandatory/optional
- Priority levels (high/medium/low)

#### Evaluation Criteria
- How proposals will be scored
- Weighting factors
- What's being evaluated

#### Deadlines
- Proposal due dates
- Question submission deadlines
- Site visit schedules
- Other important dates

#### Technical Specifications
- Detailed technical requirements
- System specifications
- Performance criteria

#### Contact Information
- Names, roles, emails, phone numbers
- Extracted from document text

#### Pricing Information
- Budget ranges
- Contract type (FFP, T&M, CPFF, etc.)
- Payment terms

#### Compliance Requirements
- Required certifications
- Security clearances
- Regulatory compliance items

#### Risk Assessment
- Identified risks and challenges
- Suggested mitigation strategies

#### Bid Recommendation
- AI recommendation: bid/no-bid/consider
- Detailed reasoning
- Strengths and concerns
- Estimated win probability (0-100%)

## Database Schema

### `samgov_documents`
Stores fetched documents and their analysis:

```sql
- id: Document ID
- opportunity_cache_id: Link to opportunity
- notice_id: SAM.gov notice ID
- document_url: Original URL
- document_type: pdf, html, doc, etc.
- file_name: Document filename
- file_size: Size in bytes
- raw_text: Extracted text content
- extracted_at: When text was extracted
- analyzed: Boolean - has been analyzed
- analysis_completed_at: Analysis timestamp
- key_requirements: JSON array
- evaluation_criteria: JSON array
- deadlines: JSON array
- technical_specifications: JSON object
- contact_info: JSON array
- pricing_info: JSON object
- executive_summary: Text
- requirements_summary: Text
- technical_summary: Text
- compliance_requirements: Text
- risk_assessment: JSON object
- bid_recommendation: Text
- win_probability: Decimal (0-100)
- fetch_status: pending|fetched|analyzing|analyzed|failed
```

### `samgov_document_analysis_queue`
Manages analysis job queue:

```sql
- id: Queue job ID
- document_id: Document to analyze
- priority: 1-10 (higher = more urgent)
- status: pending|processing|completed|failed
- started_at: Processing start time
- completed_at: Processing end time
- error_message: Error details if failed
- retry_count: Number of retry attempts
- max_retries: Maximum allowed retries (default: 3)
```

## API Endpoints

### Fetch Documents

**POST** `/api/sam-gov/documents/fetch`

Fetch and store documents for an opportunity.

```json
{
  "opportunityCacheId": 123,
  "noticeId": "NOTICE-123-ABC",
  "documentUrls": [
    "https://sam.gov/...document1.pdf",
    "https://sam.gov/...document2.pdf"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Fetched 2 documents",
  "documents": [...]
}
```

### Get Opportunity Documents

**GET** `/api/sam-gov/documents/opportunity/:opportunityCacheId`

Get all documents for an opportunity.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "documents": [...]
}
```

### Get Single Document

**GET** `/api/sam-gov/documents/:documentId`

Get a specific document with its content.

**Response:**
```json
{
  "success": true,
  "document": {
    "id": 1,
    "file_name": "solicitation.pdf",
    "document_type": "pdf",
    "file_size": 1234567,
    "raw_text": "...",
    "fetch_status": "fetched"
  }
}
```

### Queue Document for Analysis

**POST** `/api/sam-gov/documents/analyze/:documentId`

Queue a document for AI analysis.

```json
{
  "priority": 8
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document queued for analysis",
  "documentId": 1
}
```

### Get Document Analysis

**GET** `/api/sam-gov/documents/analysis/:documentId`

Get analysis results for a document.

**Response:**
```json
{
  "success": true,
  "analysis": {
    "id": 1,
    "analyzed": true,
    "executive_summary": "...",
    "key_requirements": [...],
    "evaluation_criteria": [...],
    "bid_recommendation": "...",
    "win_probability": 75.5
  }
}
```

### Get Opportunity Analysis

**GET** `/api/sam-gov/opportunity-analysis/:opportunityCacheId`

Get all analyzed documents for an opportunity.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "analyses": [...]
}
```

### Process Analysis Queue

**POST** `/api/sam-gov/process-analysis-queue`

Process pending analysis jobs (typically called by cron job).

```json
{
  "batchSize": 5
}
```

**Response:**
```json
{
  "success": true,
  "processed": 3,
  "results": [...]
}
```

## Usage Examples

### Example 1: Fetch and Analyze Opportunity Documents

```javascript
// 1. Search for opportunities (returns opportunityCacheId)
const searchResult = await api.post('/api/sam-gov/search/opportunities', {
  keyword: 'cybersecurity',
  fetchAll: true
});

const opportunity = searchResult.data.categorized.newOpportunities[0];
const opportunityCacheId = opportunity.cache_id;
const noticeId = opportunity.noticeId;

// 2. Extract document URLs from opportunity
const documentUrls = opportunity.resourceLinks || [];

// 3. Fetch documents
await api.post('/api/sam-gov/documents/fetch', {
  opportunityCacheId,
  noticeId,
  documentUrls
});

// 4. Get fetched documents
const docsResponse = await api.get(`/api/sam-gov/documents/opportunity/${opportunityCacheId}`);
const documents = docsResponse.data.documents;

// 5. Queue each document for analysis
for (const doc of documents) {
  await api.post(`/api/sam-gov/documents/analyze/${doc.id}`, {
    priority: 7
  });
}

// 6. Process analysis queue (backend cron job or manual trigger)
await api.post('/api/sam-gov/process-analysis-queue', {
  batchSize: 5
});

// 7. Get analysis results
const analysisResponse = await api.get(`/api/sam-gov/opportunity-analysis/${opportunityCacheId}`);
const analyses = analysisResponse.data.analyses;

// 8. Display bid recommendations
analyses.forEach(analysis => {
  console.log(`Document: ${analysis.file_name}`);
  console.log(`Recommendation: ${analysis.bid_recommendation}`);
  console.log(`Win Probability: ${analysis.win_probability}%`);
  console.log(`Executive Summary: ${analysis.executive_summary}`);
});
```

### Example 2: Automated Background Processing

Set up a cron job or scheduled task to process the analysis queue:

```javascript
// Run every 5 minutes
setInterval(async () => {
  try {
    const result = await api.post('/api/sam-gov/process-analysis-queue', {
      batchSize: 10
    });
    console.log(`Processed ${result.data.processed} documents`);
  } catch (error) {
    console.error('Queue processing error:', error);
  }
}, 5 * 60 * 1000);
```

## Configuration

### Environment Variables

```bash
# Required for AI analysis
OPENAI_API_KEY=sk-...

# Database connection (already configured)
DATABASE_URL=postgresql://...
```

### Dependencies

New packages added to `package.json`:

```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",
    "openai": "^4.20.1"
  }
}
```

Install with:
```bash
cd myaiagent-mvp/backend
npm install
```

## Database Migration

Run the migration to create necessary tables:

```bash
cd ~/MY_AI_AGENT/myaiagent-mvp/backend

# On EC2
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -f migrations/014_samgov_document_analysis.sql
```

Or use the migration script:
```bash
npm run migrate
```

## Performance Considerations

### Document Fetching
- 500ms delay between document fetches
- 60-second timeout per document
- Handles large files (stores in database)

### AI Analysis
- Uses GPT-4 Turbo for cost efficiency
- Truncates very large documents (50,000 chars)
- 1-second delay between analyses
- Queued processing to manage load

### Database Storage
- Text content stored in TEXT fields
- Structured data in JSONB for flexibility
- Indexed for fast lookups
- Automatic timestamp tracking

## Error Handling

### Fetch Errors
- Retries not automatic (prevents hammering)
- Error messages stored in `fetch_error` field
- Status tracked in `fetch_status` field

### Analysis Errors
- Automatic retry up to 3 times
- Exponential backoff between retries
- Error messages logged in queue table
- Failed documents marked for manual review

## Future Enhancements

### Planned Features
1. **DOC/DOCX Support** - Add mammoth library for Word documents
2. **Image Analysis** - Extract text from images in PDFs (OCR)
3. **Comparative Analysis** - Compare multiple opportunities side-by-side
4. **Contract Templates** - Generate proposal templates based on analysis
5. **Email Notifications** - Alert users when high-probability opportunities are found
6. **Custom Scoring** - Allow users to define custom scoring criteria
7. **Historical Analysis** - Track win rates and improve recommendations

### Extensibility Points
- Custom analysis prompts per company
- Integration with proposal management systems
- Export to Word/PDF for proposal writing
- Collaboration features (comments, annotations)

## Security Considerations

- All endpoints require authentication
- Document content stored server-side only
- No direct file uploads (fetches from SAM.gov)
- API rate limiting prevents abuse
- Sensitive data in analysis results (company-specific)

## Monitoring & Maintenance

### Health Checks
```sql
-- Check queue status
SELECT status, COUNT(*)
FROM samgov_document_analysis_queue
GROUP BY status;

-- Check analysis success rate
SELECT
  COUNT(*) FILTER (WHERE analyzed = TRUE) as analyzed,
  COUNT(*) FILTER (WHERE fetch_status = 'failed') as failed,
  COUNT(*) as total
FROM samgov_documents;

-- Average analysis time
SELECT AVG(EXTRACT(EPOCH FROM (analysis_completed_at - extracted_at))) as avg_seconds
FROM samgov_documents
WHERE analyzed = TRUE;
```

### Cleanup Old Documents
```sql
-- Delete documents older than 6 months
DELETE FROM samgov_documents
WHERE created_at < NOW() - INTERVAL '6 months'
AND analyzed = FALSE;
```

## Support

For issues or questions:
- Check logs: `pm2 logs myaiagent-backend`
- Database queries: Use psql with credentials
- API testing: Use Postman or curl

## License

Part of MyAIAgent project - Internal use only.
