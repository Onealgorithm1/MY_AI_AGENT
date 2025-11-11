# SAM.gov Integration

## Overview

Integration with the U.S. System for Award Management (SAM.gov) API for accessing federal procurement data, entity information, contract opportunities, and exclusions.

## Features

- **Entity Search**: Search for registered entities in SAM.gov
- **Entity Details**: Get comprehensive entity information by UEI
- **Contract Opportunities**: Search federal contract opportunities
- **Exclusions**: Check if entities are debarred or excluded

## Setup

### 1. Get SAM.gov API Key

1. Visit https://open.gsa.gov/api/sam-entity-api/
2. Register for a SAM.gov account
3. Request an API key
4. Your API key will be in the format: `SAM-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 2. Add API Key to System

#### Via Admin UI:

1. Navigate to **Admin Dashboard** → **API Keys**
2. Find **SAM.gov** in the list (or create custom category)
3. Click **"Add SAM.gov API Key"**
4. Enter your API key: `SAM-4722a397-88b2-402b-b6b7-d84b2e726046`
5. Click **"Save Key"**
6. Click **"Test"** to verify the key works

#### Via API:

```bash
curl -X POST http://localhost:3000/api/secrets/save \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "serviceName": "SAM.gov",
    "keyName": "SAM_GOV_API_KEY",
    "keyValue": "SAM-4722a397-88b2-402b-b6b7-d84b2e726046",
    "keyLabel": "Production Key",
    "isDefault": true
  }'
```

## Usage

### Backend (Node.js)

```javascript
import * as samGov from '../services/samGov.js';

// Search for entities
const entities = await samGov.searchEntities({
  legalBusinessName: 'Acme Corporation',
  limit: 10
}, userId);

// Get entity by UEI
const entity = await samGov.getEntityByUEI('ABC123DEF456', userId);

// Search contract opportunities
const opportunities = await samGov.searchOpportunities({
  keyword: 'software development',
  postedFrom: '2025-01-01',
  postedTo: '2025-12-31',
  limit: 20
}, userId);

// Check exclusions
const exclusions = await samGov.getExclusions({
  name: 'Company Name',
  limit: 10
}, userId);
```

### Frontend (React)

```javascript
import * as samGovApi from '../services/samGov';

// Search entities
const searchEntities = async () => {
  try {
    const response = await samGovApi.searchEntities({
      legalBusinessName: 'Acme Corp',
      limit: 10,
      offset: 0
    });
    console.log('Entities:', response.data.entities);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Get entity details
const getEntity = async (uei) => {
  try {
    const response = await samGovApi.getEntityByUEI(uei);
    console.log('Entity:', response.data.entity);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Search opportunities
const searchOpps = async () => {
  try {
    const response = await samGovApi.searchOpportunities({
      keyword: 'IT services',
      limit: 20
    });
    console.log('Opportunities:', response.data.opportunities);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## API Endpoints

### Search Entities

**POST** `/api/sam-gov/search/entities`

Request body:
```json
{
  "ueiSAM": "ABC123DEF456",
  "legalBusinessName": "Company Name",
  "dbaName": "DBA Name",
  "cageCode": "1A2B3",
  "limit": 10,
  "offset": 0
}
```

Response:
```json
{
  "success": true,
  "totalRecords": 1,
  "entities": [
    {
      "entityRegistration": {
        "ueiSAM": "ABC123DEF456",
        "legalBusinessName": "Company Name",
        "dbaName": "DBA Name",
        "physicalAddress": { ... },
        "mailingAddress": { ... }
      },
      "coreData": {
        "entityInformation": { ... },
        "businessTypes": { ... }
      }
    }
  ]
}
```

### Get Entity by UEI

**GET** `/api/sam-gov/entity/:uei`

Response:
```json
{
  "success": true,
  "entity": {
    "entityRegistration": { ... },
    "coreData": { ... },
    "repsAndCerts": { ... },
    "pointsOfContact": [ ... ]
  }
}
```

### Search Opportunities

**POST** `/api/sam-gov/search/opportunities`

Request body:
```json
{
  "keyword": "software",
  "postedFrom": "2025-01-01",
  "postedTo": "2025-12-31",
  "limit": 20,
  "offset": 0
}
```

Response:
```json
{
  "success": true,
  "totalRecords": 50,
  "opportunities": [
    {
      "noticeId": "abc123",
      "title": "Software Development Services",
      "solicitationNumber": "ABC-2025-001",
      "department": "Department of Defense",
      "postedDate": "2025-01-15",
      "responseDeadLine": "2025-02-15",
      "description": "..."
    }
  ]
}
```

### Get Exclusions

**POST** `/api/sam-gov/exclusions`

Request body:
```json
{
  "name": "Company Name",
  "ueiSAM": "ABC123DEF456",
  "cageCode": "1A2B3",
  "limit": 10
}
```

Response:
```json
{
  "success": true,
  "exclusions": [
    {
      "classification": "Firm",
      "name": "Company Name",
      "ueiSAM": "ABC123DEF456",
      "exclusionType": "Ineligible (Proceedings Pending)",
      "excludingAgencyName": "Department of Defense",
      "ctCode": "A"
    }
  ]
}
```

## Common Use Cases

### 1. Verify Entity Registration

Check if a company is registered in SAM.gov before awarding a contract:

```javascript
const verifyEntity = async (uei) => {
  const result = await samGov.getEntityByUEI(uei);
  if (result.success && result.entity) {
    const registration = result.entity.entityRegistration;
    console.log(`✅ ${registration.legalBusinessName} is registered`);
    console.log(`Registration Status: ${registration.registrationStatus}`);
    return true;
  }
  console.log('❌ Entity not found or not registered');
  return false;
};
```

### 2. Check for Exclusions

Verify that an entity is not debarred or excluded:

```javascript
const checkExclusions = async (uei) => {
  const result = await samGov.getExclusions({ ueiSAM: uei });
  if (result.exclusions.length > 0) {
    console.log('⚠️ Entity has exclusions:');
    result.exclusions.forEach(ex => {
      console.log(`- ${ex.exclusionType} by ${ex.excludingAgencyName}`);
    });
    return false;
  }
  console.log('✅ No exclusions found');
  return true;
};
```

### 3. Find Contract Opportunities

Search for relevant federal contract opportunities:

```javascript
const findOpportunities = async (keyword) => {
  const result = await samGov.searchOpportunities({
    keyword,
    postedFrom: new Date().toISOString().split('T')[0],
    limit: 50
  });

  console.log(`Found ${result.totalRecords} opportunities`);
  result.opportunities.forEach(opp => {
    console.log(`- ${opp.title}`);
    console.log(`  ${opp.department}`);
    console.log(`  Due: ${opp.responseDeadLine}`);
  });
};
```

## Rate Limits

SAM.gov API has rate limits:
- **Public API**: 10,000 requests per day
- **API Key**: Higher limits based on your registration

Monitor your usage in the Admin Dashboard.

## Error Handling

```javascript
try {
  const result = await samGov.searchEntities({ ... });
  // Handle success
} catch (error) {
  if (error.message.includes('API key')) {
    // API key not configured or invalid
    console.error('Configure SAM.gov API key in Admin Dashboard');
  } else if (error.message.includes('rate limit')) {
    // Rate limit exceeded
    console.error('Rate limit exceeded, try again later');
  } else {
    // Other errors
    console.error('SAM.gov API error:', error.message);
  }
}
```

## Security Considerations

- ✅ API keys are encrypted in database
- ✅ Only authenticated users can access SAM.gov endpoints
- ✅ API keys are masked in UI (show last 4 characters only)
- ✅ Keys can be tested before saving
- ✅ Keys can be rotated without downtime

## Testing

Test your SAM.gov integration:

1. **Via Admin UI**: Click "Test" button next to your API key
2. **Via API**:

```bash
curl -X POST http://localhost:3000/api/sam-gov/search/entities \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{"limit": 1}'
```

## Resources

- [SAM.gov API Documentation](https://open.gsa.gov/api/sam-entity-api/)
- [Entity Registration API](https://open.gsa.gov/api/entity-api/)
- [Opportunities API](https://open.gsa.gov/api/opportunities-api/)
- [Exclusions API](https://open.gsa.gov/api/exclusions-api/)
- [SAM.gov Help](https://sam.gov/content/help)

## Troubleshooting

### API Key Not Working

1. Verify key format: `SAM-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
2. Check key is active at https://open.gsa.gov/
3. Test key using the Admin UI "Test" button
4. Check server logs for detailed error messages

### No Results

- Entity might not be registered in SAM.gov
- Try broader search criteria
- Check spelling of entity names
- Use UEI instead of name for exact matches

### Rate Limiting

- Default: 10,000 requests/day
- Monitor usage in Admin Dashboard
- Request higher limits from SAM.gov if needed
- Implement caching for frequently accessed data

---

**Your API Key**: `SAM-4722a397-88b2-402b-b6b7-d84b2e726046`

Add this key via Admin Dashboard → API Keys → SAM.gov
