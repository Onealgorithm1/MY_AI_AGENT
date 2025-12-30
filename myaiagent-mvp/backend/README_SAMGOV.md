# SAM.gov Opportunities Synchronization System

## Overview
This system provides an automated, robust mechanism to fetch, cache, and synchronize federal contract opportunities from the SAM.gov API. This ensures the application always has the latest opportunities while respecting API rate limits and providing historical context.

## 🚀 How It Works

### 1. Automated Cron Jobs
We utilize `node-cron` integrated directly into the Node.js backend to manage synchronization schedules. This removes the dependency on external OS-level cron configurations.

- **Service**: `backend/src/services/cronService.js`
- **Schedules**:
  - **Daily Sync (`0 0 * * *`)**: Runs every midnight to fetch opportunities posted in the **last 7 days**. This overlap ensures no opportunities are missed (e.g., if the server was down for a day).
  - **Startup Backfill**: On server startup, the system checks the `samgov_opportunities_cache` table. If fewer than 100 records exist, it automatically triggers a **2-Year Historical Backfill** in the background.

### 2. Fetching & Pagination Logic
The core logic resides in `backend/src/services/samGovSync.js`.

- **Endpoint**: `GET https://api.sam.gov/opportunities/v2/search`
- **Logic**: 
  - Iterates through pages (Limit: 1000 per request).
  - Uses `postedFrom` and `postedTo` date filters.
  - **Backfill Strategy**: To avoid timeouts and huge memory usage, historical backfill steps backward **month-by-month** (30-day chunks).

### 3. API Key Management (Smart Fallback)
The system requires a valid SAM.gov API Key. It uses a smart fallback mechanism:
1.  **System Key**: Checks for a "System-wide" key configured in `api_secrets` (where `organization_id` is NULL).
2.  **Organization Key**: If no System Key exists, it automatically "borrows" the first available active Organization-level key found in `api_secrets`.
3.  **Environment Variable**: Fallback to `SAM_GOV_API_KEY` from `.env`.

---

## 💾 Data Storage & Format

### Database Table: `samgov_opportunities_cache`
Data is stored in a PostgreSQL table designed for high-performance searching and filtering.

#### Key Columns
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `notice_id` | `VARCHAR` | Unique ID from SAM.gov (Primary Identifier) |
| `title` | `TEXT` | Opportunity Title |
| `solicitation_number` | `VARCHAR` | Solicitation Number |
| `posted_date` | `TIMESTAMP` | Date the opportunity was posted |
| `response_deadline` | `TIMESTAMP` | Proposal due date |
| `naics_code` | `VARCHAR` | NAICS Code (Industry classification) |
| `set_aside_type` | `VARCHAR` | Set-aside category (e.g., SZA, 8(a)) |
| `place_of_performance`| `TEXT` | JSON or String of location (City, State) |
| `description` | `TEXT` | Full description/synopsis |
| `organization_id` | `INTEGER` | ID of the organization who "owns" this cache entry (for isolation) |

### JSON Data (`raw_data`)
We also store the **entire raw JSON response** from SAM.gov in the `raw_data` column (JSONB). This allows future-proofing if we need fields that aren't currently normalized into columns.

**Example Raw Structure:**
```json
```json
{
  "noticeId": "f2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
  "title": "IT Support Services for Naval Systems",
  "solicitationNumber": "N00024-23-R-1234",
  "department": "Department of Defense",
  "subTier": "Department of the Navy",
  "office": "Naval Sea Systems Command",
  "postedDate": "2023-10-25T14:30:00.000Z",
  "type": "Solicitation",
  "naicsCode": "541512",
  "naicsCodes": ["541512", "541519"],
  "classificationCode": "D302",
  "active": "Yes",
  "organizationType": "OFFICE",
  "resourceLinks": [
    "https://sam.gov/opp/f2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p/view"
  ],
  "uiLink": "https://sam.gov/opp/f2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p/view",
  "pointOfContact": [
    {
      "fax": null,
      "type": "primary",
      "email": "contact@navy.mil",
      "phone": "202-555-0101",
      "title": "Contract Specialist",
      "fullName": "Jane Doe"
    }
  ],
  "placeOfPerformance": {
    "city": { "code": "82000", "name": "Washington" },
    "state": { "code": "DC", "name": "District of Columbia" },
    "country": { "code": "USA", "name": "UNITED STATES" },
    "zip": "20376"
  },
  "links": [
    {
      "rel": "self",
      "href": "https://api.sam.gov/opportunities/v2/search/f2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p"
    }
  ],
  "description": "The Naval Sea Systems Command (NAVSEA) has a requirement for IT support services..."
}
```
```

---

## 🛠️ Usage & Commands

### Manual Sync (Development)
You can trigger sync functions programmatically:

```javascript
import samGovSync from './services/samGovSync.js';

// Sync last 7 days
await samGovSync.syncRecentOpportunities(7);

// Backfill last 2 years
await samGovSync.backfillHistoricalData(24);
```

### Checking Status
Monitor the server logs (stdout) for tags:
- `[Cron]`: Scheduled task status.
- `[Backfill Check]`: Startup cache verification.
- `[SAM.gov Sync]`: Fetch progress and API Key usage.
