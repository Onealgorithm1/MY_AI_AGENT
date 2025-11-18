# SAM.gov AI Agent Test Script

Test these prompts in your AI chat interface to validate the SAM.gov enhancements.

## Test 1: Basic Search with Increased Limits
```
Search SAM.gov for cybersecurity opportunities posted in the last 30 days
```

## Test 2: Multiple Results with Caching
```
Search SAM.gov for "artificial intelligence" opportunities and show me all results you can find
```

## Test 3: Check NEW vs EXISTING Detection
```
Search SAM.gov for "cloud computing" opportunities posted in the last 60 days
```

Then immediately run the same search again:
```
Search SAM.gov for "cloud computing" opportunities posted in the last 60 days again
```

## Test 4: Detailed Briefing with All Data
```
Search SAM.gov for "software development" contracts and provide detailed briefings including all contact information, attachments, NAICS codes, and resource links
```

## Test 5: Verify Contact Information Access
```
Search SAM.gov for defense contracts and tell me the points of contact with their email addresses and phone numbers
```

## Test 6: Test Attachment and Resource Links
```
Find SAM.gov opportunities with attachments and list all the resource links available for each opportunity
```

## Test 7: Organization and Location Details
```
Search SAM.gov for IT opportunities and provide the contracting office names and places of performance
```

## Test 8: Pagination Test (fetchAll)
```
Search SAM.gov for all available opportunities related to "data analytics" posted in the last 90 days. Fetch all results using pagination.
```

## Test 9: Classification Details
```
Find SAM.gov opportunities and show me their NAICS codes, set-aside types, and classifications
```

## Test 10: Cache History Verification
```
Show me the SAM.gov search history and statistics from our database cache
```

## Test 11: Specific Opportunity Lookup
```
Retrieve the cached SAM.gov opportunity with the most recent notice_id from our database
```

## Test 12: Full Comprehensive Analysis
```
Search SAM.gov for "machine learning" opportunities, save them to the database, identify which are new, and provide a comprehensive briefing for the top 5 opportunities including:
- All contact information
- Attached documents and links
- NAICS codes
- Response deadlines
- Organization details
- Place of performance
```

## Frontend UI Tests

### Test 13: Open SAM.gov Cache Panel
- Click the Building icon (🏢) in the chat page header
- Verify the SAM.gov Cache panel slides in from the right
- Check if search history is displayed

### Test 14: Verify Search Statistics
- Look for "Total", "New", and "Existing" counts in the panel
- Verify timestamps are shown for each search

### Test 15: Refresh Cache Data
- Click the "Refresh" button in the SAM.gov panel
- Verify the data updates

## API Endpoint Tests (Optional - Direct Testing)

### Test 16: Direct API Call - Search with Cache
```bash
curl -X POST http://3.144.201.118/api/sam-gov/search/opportunities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "keyword": "test",
    "limit": 50,
    "cache": true
  }'
```

### Test 17: Direct API Call - Get Search History
```bash
curl http://3.144.201.118/api/sam-gov/search-history?limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 18: Direct API Call - Get Cached Opportunity
```bash
curl http://3.144.201.118/api/sam-gov/cache/NOTICE_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Verification Tests (SSH into EC2)

### Test 19: Verify Cache Table
```bash
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -c "SELECT COUNT(*) FROM samgov_opportunities_cache;"
```

### Test 20: Check Search History
```bash
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -c "SELECT keyword, total_records, new_records, existing_records, searched_at FROM samgov_search_history ORDER BY searched_at DESC LIMIT 5;"
```

### Test 21: Verify NEW vs EXISTING Logic
```bash
PGPASSWORD='SecurePassword123!' psql -h localhost -U myaiagent_user -d myaiagent_db -c "SELECT notice_id, title, seen_count, first_seen_at, last_seen_at FROM samgov_opportunities_cache ORDER BY last_seen_at DESC LIMIT 10;"
```

## Success Criteria

✅ AI returns more than 10 results when searching SAM.gov
✅ Second identical search shows some opportunities marked as "EXISTING"
✅ Briefings include contact names, emails, and phone numbers
✅ Resource links and attachments are listed
✅ NAICS codes and classifications are shown
✅ Organization and location details are provided
✅ SAM.gov Cache panel displays search history
✅ Database contains cached opportunities
✅ Search history table tracks statistics correctly

## Notes

- Run tests in sequence for best results
- Tests 3 requires running the same search twice to verify caching
- Replace `YOUR_TOKEN` with actual auth token for API tests
- Replace `NOTICE_ID_HERE` with actual notice_id from database
