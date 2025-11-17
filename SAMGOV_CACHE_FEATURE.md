# SAM.gov Multiple Responses with Caching Feature

## Overview

This feature enhances the SAM.gov integration to:
1. Fetch multiple responses from sam.gov (increased from 10 to 50 default, with pagination support)
2. Automatically cache all opportunities in the database
3. Identify and display which opportunities are NEW vs ALREADY IN DATABASE
4. Track search history for analytics

## Changes Made

### 1. Database Schema (Migration 013)

**New Tables:**

#### `samgov_opportunities_cache`
Automatically stores all SAM.gov opportunities discovered in searches.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| notice_id | VARCHAR(255) | Unique SAM.gov notice ID |
| solicitation_number | VARCHAR(255) | Solicitation number |
| title | TEXT | Opportunity title |
| type | VARCHAR(100) | Opportunity type |
| posted_date | TIMESTAMP | Posted date |
| response_deadline | TIMESTAMP | Response deadline |
| archive_date | TIMESTAMP | Archive date |
| naics_code | VARCHAR(50) | NAICS code |
| set_aside_type | VARCHAR(100) | Set-aside type |
| contracting_office | TEXT | Contracting office |
| place_of_performance | TEXT | Place of performance |
| description | TEXT | Description |
| raw_data | JSONB | Full SAM.gov response |
| first_seen_at | TIMESTAMP | When first discovered |
| last_seen_at | TIMESTAMP | When last seen in search |
| seen_count | INTEGER | Number of times seen |
| opportunity_id | INTEGER | Link to tracked opportunity (if saved) |
| created_by | UUID | User who first found it |
| updated_at | TIMESTAMP | Last updated |

#### `samgov_search_history`
Tracks all SAM.gov searches performed.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| keyword | TEXT | Search keyword |
| posted_from | DATE | Date range start |
| posted_to | DATE | Date range end |
| naics_code | VARCHAR(50) | NAICS filter |
| total_records | INTEGER | Total results found |
| new_records | INTEGER | How many were new |
| existing_records | INTEGER | How many already in cache |
| searched_by | UUID | User who searched |
| searched_at | TIMESTAMP | When searched |
| search_params | JSONB | Full search parameters |

### 2. Backend Services

#### Updated: `samGov.js`
- Increased default `limit` from 10 to 50
- Added `fetchAll` parameter to paginate through all results
- Added proper pagination with offset support
- Handles rate limiting with delays between requests

#### New: `samGovCache.js`
Core caching functionality:

**Functions:**
- `cacheOpportunities(opportunities, userId)` - Cache opportunities and identify new vs existing
- `recordSearchHistory(params, results, userId)` - Record search in history
- `searchAndCache(searchParams, searchFunction, userId)` - Combined search + cache operation
- `getCachedOpportunity(noticeId)` - Get cached opportunity by ID
- `getRecentSearches(userId, limit)` - Get recent search history
- `linkToTrackedOpportunity(noticeId, opportunityId)` - Link cache to tracked opportunity

### 3. API Routes (`samGov.js`)

#### Updated: POST `/api/sam-gov/search/opportunities`
Now supports:
- `cache` parameter (default: true) - Enable/disable caching
- `fetchAll` parameter - Fetch all results using pagination
- `limit` parameter - Number of results per request (default: 50, max: 100)
- Automatically categorizes results as new vs existing

#### New: GET `/api/sam-gov/cache/:noticeId`
Get cached opportunity details.

#### New: GET `/api/sam-gov/search-history`
Get recent SAM.gov searches with statistics.

### 4. UI Functions (`uiFunctions.js`)

#### Updated: `searchSAMGovOpportunities`
Now returns:
```javascript
{
  success: true,
  totalRecords: 150,
  cache: {
    total: 150,
    new: 23,
    existing: 127
  },
  categorized: {
    new: [...], // Array of new opportunities
    existing: [...] // Array of existing opportunities
  },
  summary: {
    message: "Found 150 total opportunities: 23 new, 127 already in database"
  }
}
```

**New Parameters:**
- `limit` (number) - Results per request (default: 50, max: 100)
- `fetchAll` (boolean) - Fetch all available results

**New Display Format:**
```
Found 150 federal contract opportunities
📊 23 NEW | 127 already in database

✨ NEW Opportunities:

1. Advanced Cybersecurity Services 🆕
   Type: Solicitation
   Posted: 11/15/2025
   Response Deadline: 12/15/2025
   Solicitation: FA8750-25-R-0001
   Notice ID: abc123xyz

...and 18 more NEW opportunities

📋 Already in Database:

1. Cloud Infrastructure Support
   Type: Solicitation
   Solicitation: FA8750-25-R-0002
   Seen 3 times | First seen: 11/01/2025

...and 124 more existing opportunities
```

## Usage Examples

### 1. Basic Search (Auto-cached)
```javascript
// AI will automatically use caching
User: "Search for cybersecurity opportunities on sam.gov"
AI calls: searchSAMGovOpportunities({ keyword: "cybersecurity" })

Result:
- Fetches 50 results by default
- Caches all results
- Shows NEW vs EXISTING
```

### 2. Comprehensive Search
```javascript
User: "Get all cloud computing opportunities from the last 60 days"
AI calls: searchSAMGovOpportunities({
  keyword: "cloud",
  fetchAll: true,
  postedFrom: "09/17/2025",
  postedTo: "11/17/2025"
})

Result:
- Fetches ALL available results (could be 100s)
- Uses pagination automatically
- Caches everything
- Shows what's new
```

### 3. Check What's New
```javascript
User: "Search for salesforce again, show me what's new"
AI calls: searchSAMGovOpportunities({ keyword: "salesforce" })

Result:
- Compares with previous searches
- Highlights new opportunities since last search
- Shows how many times existing ones have been seen
```

## Benefits

1. **No Duplicate Tracking**: Automatically prevents saving the same opportunity twice
2. **Discovery Tracking**: Know when you first found each opportunity
3. **Trend Analysis**: See how many times an opportunity has appeared in searches
4. **Search History**: Track what's been searched and results over time
5. **More Results**: Default 50 results instead of 10, with option to fetch ALL
6. **Smart Display**: NEW opportunities shown first with 🆕 indicator

## Migration Instructions

1. **Run the migration:**
   ```bash
   cd myaiagent-mvp/backend
   npm run migrate
   ```

2. **Restart the backend:**
   ```bash
   npm run dev
   ```

3. **Test the feature:**
   - Search for opportunities: "Search sam.gov for IT opportunities"
   - Search again to see existing vs new detection
   - Use `fetchAll: true` for comprehensive results

## Technical Notes

- **Caching is enabled by default** but can be disabled with `cache: false` parameter
- **Rate limiting**: 200ms delay between paginated requests to avoid SAM.gov API limits
- **Duplicate detection**: Based on `notice_id` (unique identifier from SAM.gov)
- **Automatic linking**: When user saves an opportunity, it links to the cache entry
- **Performance**: GIN index on raw_data JSONB for fast searches
- **Data retention**: All cached data persists indefinitely (consider adding cleanup script for archived opportunities)

## Future Enhancements

- [ ] Add automatic daily sync to check for new opportunities
- [ ] Email notifications for new opportunities matching criteria
- [ ] Analytics dashboard showing discovery trends
- [ ] Automatic cleanup of archived opportunities
- [ ] Export cached opportunities to CSV/Excel
- [ ] Advanced filtering on cached data without calling SAM.gov API
