# URL Content Extraction & Analysis

A comprehensive URL fetching and content extraction system powered by Gemini AI.

## Overview

This feature enables your AI agent to:
- Fetch and parse content from any URL
- Extract clean text, metadata, images, and links
- Generate AI-powered summaries using Gemini
- Analyze content types and extract structured data
- Compare multiple URLs
- Cache fetched content for performance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Endpoints                          │
│                  /api/url-content/*                         │
└───────────────┬─────────────────────────────────────────────┘
                │
                ├──► urlFetcher.js (HTML parsing & extraction)
                │
                ├──► contentExtractor.js (Gemini AI analysis)
                │
                └──► PostgreSQL (url_cache, url_summaries)
```

## Components

### 1. URL Fetcher Service (`src/services/urlFetcher.js`)

Handles fetching and parsing HTML content.

**Features:**
- Fetches HTML from any HTTP/HTTPS URL
- Parses with Cheerio for fast, reliable extraction
- Extracts metadata (title, description, author, dates, etc.)
- Cleans and extracts text content
- Extracts images with alt text
- Extracts links with context
- Handles errors gracefully
- Supports batch fetching

**Functions:**
- `fetchUrl(url, options)` - Fetch and extract content from a single URL
- `fetchMultipleUrls(urls, options)` - Batch fetch multiple URLs
- `extractTextFromHtml(html)` - Extract clean text from HTML
- `isValidUrl(urlString)` - Validate URL format

### 2. Content Extractor Service (`src/services/contentExtractor.js`)

Uses Gemini AI to analyze and extract insights from fetched content.

**Features:**
- AI-powered summarization with configurable length
- Key points extraction
- Entity recognition (people, organizations, locations, products)
- Topic identification
- Custom query-based extraction
- Multi-URL comparison
- Content type detection and structured data extraction

**Functions:**
- `summarizeUrl(url, options)` - Generate AI summary of URL content
- `extractFromUrl(url, query, options)` - Extract specific information
- `compareUrls(urls, criteria)` - Compare multiple URLs
- `analyzeContentType(url)` - Detect content type and extract structured data

## API Endpoints

All endpoints require authentication (`verifyToken` middleware).

### POST `/api/url-content/fetch`

Fetch and extract raw content from a URL.

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "includeImages": true,
  "includeLinks": false
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com/article",
  "canonicalUrl": "https://example.com/article",
  "metadata": {
    "title": "Article Title",
    "description": "Article description...",
    "author": "John Doe",
    "publishedDate": "2024-01-15",
    "siteName": "Example Site",
    "keywords": "tech, AI, innovation"
  },
  "content": {
    "text": "Clean extracted text...",
    "wordCount": 1234,
    "characterCount": 5678,
    "headings": [
      { "level": 1, "text": "Main Heading" },
      { "level": 2, "text": "Subheading" }
    ]
  },
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "alt": "Image description",
      "type": "og:image"
    }
  ],
  "fetchedAt": "2024-01-20T12:00:00Z"
}
```

### POST `/api/url-content/summarize`

Generate an AI-powered summary of URL content using Gemini.

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "summaryLength": "medium",
  "includeKeyPoints": true,
  "includeEntities": true,
  "includeTopics": true,
  "customPrompt": null
}
```

**Parameters:**
- `summaryLength`: `"short"` (2-3 sentences), `"medium"` (5-7 sentences), `"long"` (multiple paragraphs)
- `includeKeyPoints`: Extract 5-7 key takeaways
- `includeEntities`: Identify people, organizations, locations, products
- `includeTopics`: Identify main topics and themes
- `customPrompt`: Override default prompt with custom instructions

**Response:**
```json
{
  "success": true,
  "url": "https://example.com/article",
  "metadata": {
    "title": "Article Title",
    "description": "Description..."
  },
  "analysis": {
    "summary": "This article discusses...",
    "keyPoints": [
      "Point 1",
      "Point 2"
    ],
    "entities": {
      "people": ["John Doe"],
      "organizations": ["Company Inc"],
      "locations": ["New York"],
      "products": ["Product X"]
    },
    "topics": ["AI", "Technology", "Innovation"],
    "mainIdea": "One sentence summary"
  },
  "analyzedAt": "2024-01-20T12:00:00Z"
}
```

### POST `/api/url-content/extract`

Extract specific information from a URL based on a custom query.

**Request Body:**
```json
{
  "url": "https://example.com/product",
  "query": "What is the price and availability?",
  "responseFormat": "text"
}
```

**Parameters:**
- `responseFormat`: `"text"`, `"json"`, `"structured"`

**Response:**
```json
{
  "success": true,
  "url": "https://example.com/product",
  "query": "What is the price and availability?",
  "extractedData": "The product is priced at $99 and is currently in stock.",
  "analyzedAt": "2024-01-20T12:00:00Z"
}
```

### POST `/api/url-content/compare`

Compare content from multiple URLs (2-5 URLs).

**Request Body:**
```json
{
  "urls": [
    "https://example.com/article1",
    "https://example.com/article2",
    "https://example.com/article3"
  ],
  "comparisonCriteria": "Compare the main arguments and conclusions"
}
```

**Response:**
```json
{
  "success": true,
  "urls": [...],
  "comparison": "Detailed comparison text...",
  "pagesAnalyzed": 3,
  "pagesFailed": 0,
  "analyzedAt": "2024-01-20T12:00:00Z"
}
```

### POST `/api/url-content/analyze`

Analyze URL for content type and extract structured data.

**Request Body:**
```json
{
  "url": "https://example.com/recipe"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com/recipe",
  "analysis": {
    "contentType": "recipe",
    "confidence": "high",
    "structuredData": {
      "title": "Chocolate Cake",
      "ingredients": ["flour", "sugar", "chocolate"],
      "instructions": ["Mix ingredients", "Bake at 350°F"],
      "cookTime": "45 minutes",
      "servings": 8
    },
    "mainTopics": ["baking", "dessert"],
    "keyEntities": ["chocolate", "cake"],
    "sentiment": "positive"
  },
  "analyzedAt": "2024-01-20T12:00:00Z"
}
```

### POST `/api/url-content/batch`

Fetch multiple URLs at once (max 10).

**Request Body:**
```json
{
  "urls": [
    "https://example.com/1",
    "https://example.com/2"
  ],
  "includeImages": false,
  "includeLinks": false,
  "concurrent": 3
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { /* fetch result 1 */ },
    { /* fetch result 2 */ }
  ],
  "totalUrls": 2,
  "successfulFetches": 2,
  "failedFetches": 0
}
```

### GET `/api/url-content/history`

Get user's URL fetch history.

**Query Parameters:**
- `limit`: Max results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "url": "https://example.com",
      "metadata": { /* metadata */ },
      "fetched_at": "2024-01-20T12:00:00Z",
      "fetch_count": 3
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

### GET `/api/url-content/summaries`

Get user's URL summaries history.

**Query Parameters:**
- `limit`: Max results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "summaries": [
    {
      "id": "uuid",
      "url": "https://example.com",
      "summary": "Summary text...",
      "analysis": { /* analysis data */ },
      "created_at": "2024-01-20T12:00:00Z"
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

## Database Schema

### Table: `url_cache`

Caches fetched URL content to reduce redundant fetches.

```sql
CREATE TABLE url_cache (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  url TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB,
  fetch_count INTEGER DEFAULT 1,
  fetched_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `url_summaries`

Stores AI-generated summaries and analyses.

```sql
CREATE TABLE url_summaries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  url TEXT NOT NULL,
  summary TEXT NOT NULL,
  analysis JSONB,
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Usage Examples

### Example 1: Fetch Article Content

```javascript
const response = await fetch('/api/url-content/fetch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'x-csrf-token': 'CSRF_TOKEN',
  },
  body: JSON.stringify({
    url: 'https://techcrunch.com/2024/01/15/ai-breakthrough',
    includeImages: true,
    includeLinks: false,
  }),
});

const data = await response.json();
console.log('Title:', data.metadata.title);
console.log('Word Count:', data.content.wordCount);
console.log('Text:', data.content.text.substring(0, 200));
```

### Example 2: Summarize Research Paper

```javascript
const response = await fetch('/api/url-content/summarize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'x-csrf-token': 'CSRF_TOKEN',
  },
  body: JSON.stringify({
    url: 'https://arxiv.org/abs/2024.12345',
    summaryLength: 'long',
    includeKeyPoints: true,
    includeEntities: true,
    includeTopics: true,
  }),
});

const data = await response.json();
console.log('Summary:', data.analysis.summary);
console.log('Key Points:', data.analysis.keyPoints);
console.log('Topics:', data.analysis.topics);
```

### Example 3: Extract Product Information

```javascript
const response = await fetch('/api/url-content/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'x-csrf-token': 'CSRF_TOKEN',
  },
  body: JSON.stringify({
    url: 'https://amazon.com/product/B08XYZ',
    query: 'Extract the product name, price, rating, and key features',
    responseFormat: 'json',
  }),
});

const data = await response.json();
console.log('Extracted Data:', data.extractedData);
```

### Example 4: Compare News Articles

```javascript
const response = await fetch('/api/url-content/compare', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'x-csrf-token': 'CSRF_TOKEN',
  },
  body: JSON.stringify({
    urls: [
      'https://nytimes.com/article1',
      'https://wsj.com/article2',
      'https://reuters.com/article3',
    ],
    comparisonCriteria: 'Compare the perspectives and key facts presented',
  }),
});

const data = await response.json();
console.log('Comparison:', data.comparison);
```

## Testing

Run the test script to verify the installation:

```bash
cd myaiagent-mvp/backend
node test-url-fetcher.js
```

The test script will:
1. Validate URL formats
2. Fetch and parse a sample URL
3. Generate a summary (requires Gemini API key)
4. Analyze content type (requires Gemini API key)

## Configuration

### Environment Variables

```bash
# Required for AI features
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Database for caching
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```

### Performance Tuning

The URL fetcher includes several configurable limits:

```javascript
// In urlFetcher.js
const options = {
  timeout: 10000,              // Request timeout (ms)
  maxContentLength: 5242880,   // Max content size (5MB)
  includeImages: true,         // Extract images
  includeLinks: false,         // Extract links
};
```

## Security Considerations

1. **URL Validation**: Only HTTP/HTTPS protocols are allowed
2. **Content Type Checking**: Only HTML/XHTML content is processed
3. **Size Limits**: Content is limited to 5MB by default
4. **Timeout Protection**: Requests timeout after 10 seconds
5. **User-Agent**: Uses a friendly user-agent string
6. **Authentication**: All API endpoints require JWT authentication
7. **CSRF Protection**: All POST endpoints require CSRF token

## Error Handling

All functions return structured error responses:

```json
{
  "success": false,
  "url": "https://example.com",
  "error": {
    "message": "HTTP 404: Not Found",
    "type": "Error"
  }
}
```

Common errors:
- `Invalid URL format` - URL validation failed
- `Unsupported content type` - Not an HTML page
- `Content too large` - Exceeds size limit
- `Timeout` - Request took too long
- `HTTP XXX` - Server returned error status

## Performance Monitoring

All URL fetches are monitored via the `performanceMonitoring` middleware:

```javascript
await monitorExternalApi('url-fetch', url, async () => {
  // Fetch operation
});
```

Metrics tracked:
- Fetch duration
- Success/failure rates
- Error types
- Content sizes

## Future Enhancements

Potential improvements:
- [ ] PDF content extraction
- [ ] Video transcript extraction
- [ ] Social media post extraction
- [ ] RSS feed parsing
- [ ] Automatic screenshot capture
- [ ] Link graph analysis
- [ ] Content freshness detection
- [ ] Multi-language support
- [ ] Custom extraction templates

## Troubleshooting

**Problem**: URLs not fetching
- Check that the URL is valid HTTP/HTTPS
- Verify the target site allows automated access
- Check for network connectivity issues

**Problem**: Summaries not generating
- Ensure GEMINI_API_KEY is configured
- Check API quota and rate limits
- Verify the content is not too large

**Problem**: Database errors
- Run the migration: `node run-url-cache-migration.js`
- Check database connection
- Verify user permissions

## Support

For issues or questions:
- Check the logs for detailed error messages
- Review the test script for usage examples
- Consult the API documentation above

---

**Version**: 1.0.0
**Last Updated**: 2024-01-20
**Dependencies**: cheerio, @google/generative-ai
