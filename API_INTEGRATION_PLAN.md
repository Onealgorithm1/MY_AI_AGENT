# Federal Contracting Intelligence APIs - Implementation Plan

## 🎯 Executive Summary

This plan outlines the integration of 6 critical federal contracting APIs to transform the application into a comprehensive GovCon intelligence platform. Implementation is structured in 3 phases over ~6-8 weeks.

**Business Value**:
- **Financial Intelligence**: Analyze agency spending patterns and budget health
- **Competitive Intelligence**: Identify incumbents, subcontractors, and teaming partners
- **Pricing Intelligence**: Benchmark labor rates against awarded contracts
- **Risk Management**: Automatic compliance screening and exclusion checking

---

## 📊 API Priority Matrix

| Priority | API | Business Value | Complexity | Phase |
|----------|-----|----------------|------------|-------|
| **🔴 Critical** | USAspending API | Agency spending analysis, budget forecasting | Medium | Phase 1 |
| **🔴 Critical** | FPDS API (Full) | Deep contract history, incumbent tracking | Medium | Phase 1 |
| **🟡 High** | Subaward APIs | Teaming intelligence, prime-sub relationships | Medium | Phase 2 |
| **🟡 High** | CALC API | Labor rate benchmarking | Low | Phase 2 |
| **🟢 Medium** | Exclusions API | Compliance screening | Low | Phase 2 |
| **🟢 Medium** | Federal Hierarchy API | Agency org mapping | Low | Phase 3 |

---

## 🏗️ Phase 1: Financial & Contract Intelligence (Weeks 1-3)

### 1.1 USAspending API Integration

**Purpose**: Analyze agency spending patterns and identify well-funded opportunities

**Backend Implementation**:

```javascript
// backend/src/services/usaspending.js
import axios from 'axios';

const USASPENDING_BASE_URL = 'https://api.usaspending.gov/api/v2';

export const usaspending = {
  // Get agency spending by NAICS code
  async getAgencySpendingByNAICS(agencyCode, naicsCode, fiscalYear) {
    const response = await axios.post(`${USASPENDING_BASE_URL}/search/spending_by_award/`, {
      filters: {
        agencies: [{ type: 'awarding', tier: 'toptier', name: agencyCode }],
        naics_codes: [naicsCode],
        time_period: [{ start_date: `${fiscalYear}-10-01`, end_date: `${fiscalYear + 1}-09-30` }]
      },
      fields: ['Award ID', 'Award Amount', 'Awarding Agency', 'Recipient Name'],
      page: 1,
      limit: 100
    });
    return response.data;
  },

  // Get spending trend analysis
  async getSpendingTrends(agencyCode, naicsCode, years = 3) {
    const currentYear = new Date().getFullYear();
    const promises = [];

    for (let i = 0; i < years; i++) {
      const fiscalYear = currentYear - i;
      promises.push(this.getAgencySpendingByNAICS(agencyCode, naicsCode, fiscalYear));
    }

    const results = await Promise.all(promises);
    return this.calculateTrends(results);
  },

  // Calculate year-over-year trends
  calculateTrends(yearlyData) {
    return {
      totalSpending: yearlyData.reduce((sum, year) => sum + year.total, 0),
      yearOverYear: yearlyData.map((year, idx) => {
        if (idx === yearlyData.length - 1) return { year: year.fiscalYear, growth: 0 };
        const previousYear = yearlyData[idx + 1];
        const growth = ((year.total - previousYear.total) / previousYear.total) * 100;
        return { year: year.fiscalYear, growth: growth.toFixed(2) };
      }),
      averageAwardSize: yearlyData.reduce((sum, year) => sum + (year.total / year.count), 0) / yearlyData.length
    };
  },

  // Get top contractors by agency and NAICS
  async getTopContractors(agencyCode, naicsCode, limit = 10) {
    const response = await axios.post(`${USASPENDING_BASE_URL}/search/spending_by_award/`, {
      filters: {
        agencies: [{ type: 'awarding', tier: 'toptier', name: agencyCode }],
        naics_codes: [naicsCode]
      },
      fields: ['Recipient Name', 'Award Amount', 'Award Count'],
      page: 1,
      limit
    });
    return response.data;
  }
};
```

**Database Schema**:

```sql
-- Add to migrations
CREATE TABLE agency_spending_cache (
  id SERIAL PRIMARY KEY,
  agency_code VARCHAR(10) NOT NULL,
  naics_code VARCHAR(10) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  total_spending NUMERIC(15, 2),
  award_count INTEGER,
  top_contractors JSONB,
  spending_trend JSONB,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agency_code, naics_code, fiscal_year)
);

CREATE INDEX idx_agency_spending_lookup ON agency_spending_cache(agency_code, naics_code, fiscal_year);
```

**API Routes**:

```javascript
// backend/src/routes/usaspending.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { usaspending } from '../services/usaspending.js';
import { query } from '../utils/database.js';

const router = express.Router();

// Get agency spending analysis
router.get('/agency-spending/:agencyCode/:naicsCode', authenticate, async (req, res) => {
  try {
    const { agencyCode, naicsCode } = req.params;
    const { fiscalYear = new Date().getFullYear() } = req.query;

    // Check cache first
    const cached = await query(
      'SELECT * FROM agency_spending_cache WHERE agency_code = $1 AND naics_code = $2 AND fiscal_year = $3 AND cached_at > NOW() - INTERVAL \'7 days\'',
      [agencyCode, naicsCode, fiscalYear]
    );

    if (cached.rows.length > 0) {
      return res.json({ source: 'cache', data: cached.rows[0] });
    }

    // Fetch from API
    const spendingData = await usaspending.getAgencySpendingByNAICS(agencyCode, naicsCode, fiscalYear);
    const trends = await usaspending.getSpendingTrends(agencyCode, naicsCode, 3);
    const topContractors = await usaspending.getTopContractors(agencyCode, naicsCode, 10);

    // Cache results
    await query(
      `INSERT INTO agency_spending_cache (agency_code, naics_code, fiscal_year, total_spending, award_count, top_contractors, spending_trend)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (agency_code, naics_code, fiscal_year) DO UPDATE SET
       total_spending = EXCLUDED.total_spending,
       award_count = EXCLUDED.award_count,
       top_contractors = EXCLUDED.top_contractors,
       spending_trend = EXCLUDED.spending_trend,
       cached_at = CURRENT_TIMESTAMP`,
      [agencyCode, naicsCode, fiscalYear, spendingData.total, spendingData.count, JSON.stringify(topContractors), JSON.stringify(trends)]
    );

    res.json({ source: 'api', data: { spending: spendingData, trends, topContractors } });
  } catch (error) {
    console.error('USAspending API error:', error);
    res.status(500).json({ error: 'Failed to fetch spending data' });
  }
});

export default router;
```

**Frontend Component** - Agency Spending Dashboard:

```jsx
// frontend/src/components/AgencySpendingDashboard.jsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Award, Users } from 'lucide-react';
import api from '../services/api';

const AgencySpendingDashboard = ({ agencyCode, naicsCode }) => {
  const [loading, setLoading] = useState(true);
  const [spendingData, setSpendingData] = useState(null);

  useEffect(() => {
    loadSpendingData();
  }, [agencyCode, naicsCode]);

  const loadSpendingData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/usaspending/agency-spending/${agencyCode}/${naicsCode}`);
      setSpendingData(response.data.data);
    } catch (error) {
      console.error('Failed to load spending data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading spending analysis...</div>;
  if (!spendingData) return null;

  const { trends, topContractors } = spendingData;
  const latestTrend = trends.yearOverYear[0];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Agency Spending Analysis</h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Total Spending (3yr)</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            ${(trends.totalSpending / 1000000).toFixed(1)}M
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {latestTrend.growth > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <p className="text-sm text-gray-600">YoY Growth</p>
          </div>
          <p className={`text-2xl font-bold ${latestTrend.growth > 0 ? 'text-green-900' : 'text-red-900'}`}>
            {latestTrend.growth > 0 ? '+' : ''}{latestTrend.growth}%
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Avg Award Size</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            ${(trends.averageAwardSize / 1000000).toFixed(2)}M
          </p>
        </div>
      </div>

      {/* Top Contractors */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Top 10 Contractors in This Space
        </h4>
        <div className="space-y-2">
          {topContractors.slice(0, 10).map((contractor, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-gray-900">{contractor.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-700">
                ${(contractor.amount / 1000000).toFixed(1)}M
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-2">💡 Strategic Insights</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Agency spending is {latestTrend.growth > 0 ? 'increasing' : 'decreasing'} - {latestTrend.growth > 10 ? 'strong growth market' : 'stable market'}</li>
          <li>• Average award size: ${(trends.averageAwardSize / 1000000).toFixed(2)}M - {trends.averageAwardSize > 5000000 ? 'Large contract market' : 'SMB-friendly market'}</li>
          <li>• Top 3 contractors control {((topContractors.slice(0, 3).reduce((sum, c) => sum + c.amount, 0) / trends.totalSpending) * 100).toFixed(1)}% of market</li>
        </ul>
      </div>
    </div>
  );
};

export default AgencySpendingDashboard;
```

---

### 1.2 FPDS API (Full Integration)

**Purpose**: Deep historical contract analysis and incumbent tracking

**Backend Service**:

```javascript
// backend/src/services/fpds.js (Enhanced)
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const FPDS_BASE_URL = 'https://www.fpds.gov/ezsearch/FEEDS/ATOM';

export const fpds = {
  // Search contracts with advanced filters
  async searchContracts(filters = {}) {
    const {
      naicsCode,
      agencyCode,
      contractorName,
      pscCode,
      dateFrom,
      dateTo,
      limit = 100
    } = filters;

    const params = new URLSearchParams();
    if (naicsCode) params.append('NAICS_CODE', naicsCode);
    if (agencyCode) params.append('CONTRACTING_AGENCY_CODE', agencyCode);
    if (contractorName) params.append('VENDOR_NAME', contractorName);
    if (pscCode) params.append('PRODUCT_OR_SERVICE_CODE', pscCode);
    if (dateFrom) params.append('LAST_MOD_DATE', `[${dateFrom},${dateTo || new Date().toISOString().split('T')[0]}]`);
    params.append('NUM_RECORDS', limit.toString());

    const response = await axios.get(`${FPDS_BASE_URL}?${params.toString()}`);
    const parsed = await parseStringPromise(response.data);

    return this.parseContracts(parsed);
  },

  // Get contractor past performance
  async getContractorHistory(contractorName, naicsCode, years = 3) {
    const dateFrom = new Date();
    dateFrom.setFullYear(dateFrom.getFullYear() - years);

    const contracts = await this.searchContracts({
      contractorName,
      naicsCode,
      dateFrom: dateFrom.toISOString().split('T')[0],
      limit: 500
    });

    return {
      totalContracts: contracts.length,
      totalValue: contracts.reduce((sum, c) => sum + parseFloat(c.dollarAmount || 0), 0),
      averageValue: contracts.reduce((sum, c) => sum + parseFloat(c.dollarAmount || 0), 0) / contracts.length,
      agencies: [...new Set(contracts.map(c => c.agencyName))],
      performanceMetrics: this.calculatePerformanceMetrics(contracts)
    };
  },

  // Calculate performance metrics
  calculatePerformanceMetrics(contracts) {
    const modifications = contracts.filter(c => c.modificationNumber > 0);
    const modificationRate = (modifications.length / contracts.length) * 100;

    return {
      modificationRate: modificationRate.toFixed(2),
      averageContractDuration: this.calculateAverageDuration(contracts),
      agencyDiversity: [...new Set(contracts.map(c => c.agencyName))].length,
      recentActivity: contracts.filter(c => {
        const contractDate = new Date(c.signedDate);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return contractDate > oneYearAgo;
      }).length
    };
  },

  // Parse XML response to structured data
  parseContracts(xmlData) {
    // Implementation depends on FPDS XML structure
    // This is a simplified version
    const entries = xmlData.feed?.entry || [];
    return entries.map(entry => ({
      contractId: entry.id?.[0],
      contractorName: entry.vendor_name?.[0],
      agencyName: entry.agency_name?.[0],
      dollarAmount: entry.dollars_obligated?.[0],
      signedDate: entry.signed_date?.[0],
      naicsCode: entry.naics_code?.[0],
      pscCode: entry.psc_code?.[0],
      modificationNumber: entry.mod_number?.[0] || 0,
      description: entry.description?.[0]
    }));
  }
};
```

---

## 🏗️ Phase 2: Teaming & Labor Intelligence (Weeks 4-5)

### 2.1 Subaward APIs Integration

**Purpose**: Identify prime-sub relationships and teaming opportunities

**Backend Service**:

```javascript
// backend/src/services/subawards.js
import axios from 'axios';

const SAM_BASE_URL = 'https://api.sam.gov/prod/federalsubawarding/v1';

export const subawards = {
  // Get subawards for a prime contractor
  async getPrimeSubawards(primeContractorName, apiKey) {
    const response = await axios.get(`${SAM_BASE_URL}/subawards`, {
      params: {
        prime_awardee_name: primeContractorName,
        limit: 100
      },
      headers: {
        'X-Api-Key': apiKey
      }
    });

    return response.data;
  },

  // Find potential teaming partners
  async findTeamingPartners(naicsCode, capabilities, apiKey) {
    // Search for primes who frequently subcontract in this NAICS
    const response = await axios.get(`${SAM_BASE_URL}/subawards`, {
      params: {
        naics_code: naicsCode,
        limit: 200
      },
      headers: {
        'X-Api-Key': apiKey
      }
    });

    const subawards = response.data.subawards || [];

    // Analyze which primes give the most subcontracts
    const primeAnalysis = {};
    subawards.forEach(sub => {
      const primeName = sub.primeAwardeeName;
      if (!primeAnalysis[primeName]) {
        primeAnalysis[primeName] = {
          name: primeName,
          totalSubawards: 0,
          totalValue: 0,
          subcontractors: new Set()
        };
      }
      primeAnalysis[primeName].totalSubawards++;
      primeAnalysis[primeName].totalValue += parseFloat(sub.subawardAmount || 0);
      primeAnalysis[primeName].subcontractors.add(sub.subawardeeName);
    });

    // Return top 20 primes by subawarding activity
    return Object.values(primeAnalysis)
      .sort((a, b) => b.totalSubawards - a.totalSubawards)
      .slice(0, 20)
      .map(prime => ({
        ...prime,
        subcontractors: prime.subcontractors.size
      }));
  },

  // Analyze subcontracting patterns
  async analyzeSubcontractingPatterns(agencyCode, naicsCode, apiKey) {
    const response = await axios.get(`${SAM_BASE_URL}/subawards`, {
      params: {
        agency_code: agencyCode,
        naics_code: naicsCode,
        limit: 500
      },
      headers: {
        'X-Api-Key': apiKey
      }
    });

    const subawards = response.data.subawards || [];

    return {
      totalSubawards: subawards.length,
      totalValue: subawards.reduce((sum, s) => sum + parseFloat(s.subawardAmount || 0), 0),
      averageSubawardSize: subawards.reduce((sum, s) => sum + parseFloat(s.subawardAmount || 0), 0) / subawards.length,
      topSubcontractors: this.getTopSubcontractors(subawards, 10),
      smallBusinessPercentage: this.calculateSmallBusinessPercentage(subawards)
    };
  },

  getTopSubcontractors(subawards, limit) {
    const contractors = {};
    subawards.forEach(sub => {
      const name = sub.subawardeeName;
      if (!contractors[name]) {
        contractors[name] = { name, count: 0, totalValue: 0 };
      }
      contractors[name].count++;
      contractors[name].totalValue += parseFloat(sub.subawardAmount || 0);
    });

    return Object.values(contractors)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  },

  calculateSmallBusinessPercentage(subawards) {
    const smallBusinessSubawards = subawards.filter(s => s.smallBusinessIndicator === 'Y');
    return (smallBusinessSubawards.length / subawards.length) * 100;
  }
};
```

### 2.2 CALC API Integration

**Purpose**: Labor rate benchmarking for services contracts

**Backend Service**:

```javascript
// backend/src/services/calc.js
import axios from 'axios';

const CALC_BASE_URL = 'https://calc.gsa.gov/api';

export const calc = {
  // Search labor rates by category
  async searchRates(laborCategory, education = null, experience = null) {
    const params = new URLSearchParams({
      q: laborCategory,
      price_min: 0,
      price_max: 500
    });

    if (education) params.append('education', education);
    if (experience) params.append('min_years_experience', experience);

    const response = await axios.get(`${CALC_BASE_URL}/rates/?${params.toString()}`);
    return response.data;
  },

  // Get rate statistics for benchmarking
  async getRateStatistics(laborCategory) {
    const rates = await this.searchRates(laborCategory);

    if (rates.results.length === 0) {
      return null;
    }

    const hourlyRates = rates.results.map(r => parseFloat(r.current_price));

    return {
      count: hourlyRates.length,
      min: Math.min(...hourlyRates),
      max: Math.max(...hourlyRates),
      average: hourlyRates.reduce((sum, rate) => sum + rate, 0) / hourlyRates.length,
      median: this.calculateMedian(hourlyRates),
      percentile25: this.calculatePercentile(hourlyRates, 25),
      percentile75: this.calculatePercentile(hourlyRates, 75),
      distributionByEducation: this.groupByEducation(rates.results),
      distributionByExperience: this.groupByExperience(rates.results)
    };
  },

  calculateMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  },

  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  },

  groupByEducation(results) {
    const groups = {};
    results.forEach(r => {
      const edu = r.education_level || 'Not Specified';
      if (!groups[edu]) groups[edu] = [];
      groups[edu].push(parseFloat(r.current_price));
    });

    return Object.entries(groups).map(([education, rates]) => ({
      education,
      count: rates.length,
      average: rates.reduce((sum, r) => sum + r, 0) / rates.length
    }));
  },

  groupByExperience(results) {
    const groups = {
      '0-2 years': [],
      '3-5 years': [],
      '6-10 years': [],
      '10+ years': []
    };

    results.forEach(r => {
      const exp = parseInt(r.min_years_experience) || 0;
      if (exp <= 2) groups['0-2 years'].push(parseFloat(r.current_price));
      else if (exp <= 5) groups['3-5 years'].push(parseFloat(r.current_price));
      else if (exp <= 10) groups['6-10 years'].push(parseFloat(r.current_price));
      else groups['10+ years'].push(parseFloat(r.current_price));
    });

    return Object.entries(groups).map(([range, rates]) => ({
      experienceRange: range,
      count: rates.length,
      average: rates.length > 0 ? rates.reduce((sum, r) => sum + r, 0) / rates.length : 0
    }));
  }
};
```

### 2.3 Exclusions API Integration

**Purpose**: Automatic compliance screening

**Backend Service**:

```javascript
// backend/src/services/exclusions.js
import axios from 'axios';

const SAM_BASE_URL = 'https://api.sam.gov/prod/entity-information/v3/exclusions';

export const exclusions = {
  // Check if entity is excluded
  async checkExclusion(entityName, ueiSAM = null, apiKey) {
    const params = new URLSearchParams({
      legalBusinessName: entityName
    });

    if (ueiSAM) params.append('ueiSAM', ueiSAM);

    try {
      const response = await axios.get(`${SAM_BASE_URL}?${params.toString()}`, {
        headers: {
          'X-Api-Key': apiKey
        }
      });

      const exclusions = response.data.exclusionDetails || [];

      return {
        isExcluded: exclusions.length > 0,
        exclusionCount: exclusions.length,
        activeExclusions: exclusions.filter(e => this.isActive(e)),
        details: exclusions
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { isExcluded: false, exclusionCount: 0, activeExclusions: [] };
      }
      throw error;
    }
  },

  // Check if exclusion is currently active
  isActive(exclusion) {
    if (!exclusion.activationDate) return false;

    const activationDate = new Date(exclusion.activationDate);
    const now = new Date();

    if (activationDate > now) return false;

    if (exclusion.terminationDate) {
      const terminationDate = new Date(exclusion.terminationDate);
      return terminationDate > now;
    }

    return true; // No termination date means indefinite
  },

  // Batch check multiple entities
  async batchCheckExclusions(entities, apiKey) {
    const promises = entities.map(entity =>
      this.checkExclusion(entity.name, entity.ueiSAM, apiKey)
        .then(result => ({ ...entity, exclusionCheck: result }))
        .catch(error => ({ ...entity, exclusionCheck: { error: error.message } }))
    );

    return await Promise.all(promises);
  },

  // Get exclusion statistics
  async getExclusionStatistics(apiKey) {
    try {
      const response = await axios.get(`${SAM_BASE_URL}?includeSections=exclusionDetails`, {
        headers: {
          'X-Api-Key': apiKey
        },
        params: {
          page: 0,
          size: 1000
        }
      });

      const exclusions = response.data.exclusionDetails || [];

      return {
        total: exclusions.length,
        active: exclusions.filter(e => this.isActive(e)).length,
        byClassification: this.groupByClassification(exclusions),
        byAgency: this.groupByAgency(exclusions)
      };
    } catch (error) {
      console.error('Failed to get exclusion statistics:', error);
      return null;
    }
  },

  groupByClassification(exclusions) {
    const groups = {};
    exclusions.forEach(e => {
      const classification = e.classificationType || 'Unknown';
      groups[classification] = (groups[classification] || 0) + 1;
    });
    return groups;
  },

  groupByAgency(exclusions) {
    const groups = {};
    exclusions.forEach(e => {
      const agency = e.excludingAgencyName || 'Unknown';
      groups[agency] = (groups[agency] || 0) + 1;
    });
    return Object.entries(groups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }
};
```

---

## 🏗️ Phase 3: Advanced Features (Week 6)

### 3.1 Federal Hierarchy API Integration

**Purpose**: Map spending to correct organizational structure

```javascript
// backend/src/services/federalHierarchy.js
import axios from 'axios';

const HIERARCHY_BASE_URL = 'https://api.sam.gov/prod/federalorganizations/v1';

export const federalHierarchy = {
  // Get organization details
  async getOrganization(orgKey, apiKey) {
    const response = await axios.get(`${HIERARCHY_BASE_URL}/orgs/${orgKey}`, {
      headers: {
        'X-Api-Key': apiKey
      }
    });

    return response.data;
  },

  // Search organizations
  async searchOrganizations(query, apiKey) {
    const response = await axios.get(`${HIERARCHY_BASE_URL}/orgs`, {
      params: {
        orgName: query
      },
      headers: {
        'X-Api-Key': apiKey
      }
    });

    return response.data.orgList || [];
  },

  // Get full hierarchy path
  async getHierarchyPath(orgKey, apiKey) {
    const org = await this.getOrganization(orgKey, apiKey);
    const path = [org];

    let currentOrg = org;
    while (currentOrg.parentOrgKey) {
      const parent = await this.getOrganization(currentOrg.parentOrgKey, apiKey);
      path.unshift(parent);
      currentOrg = parent;
    }

    return path;
  }
};
```

---

## 🧪 Testing Strategy

### Phase 1 Testing

**Unit Tests** (`backend/tests/services/`):

```javascript
// backend/tests/services/usaspending.test.js
import { usaspending } from '../../src/services/usaspending.js';

describe('USAspending Service', () => {
  test('should fetch agency spending data', async () => {
    const data = await usaspending.getAgencySpendingByNAICS('1700', '541511', 2024);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
  });

  test('should calculate spending trends correctly', async () => {
    const trends = await usaspending.getSpendingTrends('1700', '541511', 3);
    expect(trends).toHaveProperty('totalSpending');
    expect(trends).toHaveProperty('yearOverYear');
    expect(trends.yearOverYear).toHaveLength(3);
  });

  test('should get top contractors', async () => {
    const contractors = await usaspending.getTopContractors('1700', '541511', 10);
    expect(contractors.results.length).toBeLessThanOrEqual(10);
  });
});
```

**Integration Tests**:

```javascript
// backend/tests/integration/api.test.js
import request from 'supertest';
import app from '../../src/app.js';

describe('USAspending API Endpoints', () => {
  let authToken;

  beforeAll(async () => {
    // Login and get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = response.body.token;
  });

  test('GET /api/usaspending/agency-spending/:agencyCode/:naicsCode', async () => {
    const response = await request(app)
      .get('/api/usaspending/agency-spending/1700/541511')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('spending');
    expect(response.body.data).toHaveProperty('trends');
  });
});
```

### Manual Testing Checklist

**Phase 1 - Financial Intelligence**:
- [ ] USAspending: Fetch spending data for DoD (agency 1700) + NAICS 541511
- [ ] USAspending: Verify 3-year trend calculation is accurate
- [ ] USAspending: Check cache is working (second request should be faster)
- [ ] FPDS: Search contracts by NAICS code
- [ ] FPDS: Get contractor history for known contractor (e.g., "Lockheed Martin")
- [ ] Frontend: Agency spending dashboard renders correctly
- [ ] Frontend: Spending trends show correct growth percentages

**Phase 2 - Teaming Intelligence**:
- [ ] Subawards: Find subawards for a prime contractor
- [ ] Subawards: Identify potential teaming partners for NAICS 541511
- [ ] CALC: Search labor rates for "Software Engineer"
- [ ] CALC: Verify rate statistics (min, max, average, median)
- [ ] Exclusions: Check known excluded entity (test with public exclusion list)
- [ ] Exclusions: Verify clean entity returns isExcluded: false

**Phase 3 - Hierarchy**:
- [ ] Federal Hierarchy: Search for "Department of Defense"
- [ ] Federal Hierarchy: Get full hierarchy path for an office

---

## 📦 Environment Variables

Add to `.env`:

```bash
# SAM.gov API Key (required for most SAM endpoints)
SAM_API_KEY=your_sam_gov_api_key_here

# USAspending doesn't require API key
# FPDS doesn't require API key

# CALC doesn't require API key

# Optional: Rate limiting
API_RATE_LIMIT_PER_HOUR=1000
```

---

## 🚀 Deployment Checklist

**Pre-Deployment**:
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] API keys configured in production environment
- [ ] Database migrations run successfully
- [ ] Cache tables created

**Post-Deployment Verification**:
- [ ] Monitor API response times (should be < 2s for cached data)
- [ ] Check error logs for API failures
- [ ] Verify cache hit rate (should be > 60% after 24 hours)
- [ ] Test each API endpoint manually in production
- [ ] Verify data accuracy against SAM.gov website

---

## 📊 Success Metrics

**Phase 1** (Week 3):
- ✅ USAspending API returning data for 95%+ of queries
- ✅ Cache hit rate > 50%
- ✅ Agency spending dashboard loading in < 3 seconds

**Phase 2** (Week 5):
- ✅ Subaward data available for 80%+ of searches
- ✅ CALC rate benchmarks available for 100+ labor categories
- ✅ Exclusion checks completing in < 1 second

**Phase 3** (Week 6):
- ✅ Complete federal hierarchy mapping for top 20 agencies
- ✅ All APIs integrated and tested
- ✅ Production deployment completed

---

## 🎯 Next Steps

1. **Week 1**: Set up USAspending service and database schema
2. **Week 2**: Build Agency Spending Dashboard UI
3. **Week 3**: Complete FPDS integration and testing
4. **Week 4**: Implement Subaward APIs
5. **Week 5**: Add CALC and Exclusions APIs
6. **Week 6**: Federal Hierarchy + final testing
7. **Week 7**: Production deployment and monitoring

---

## 📚 API Documentation References

- **USAspending**: https://api.usaspending.gov/docs/endpoints
- **FPDS**: https://www.fpds.gov/wiki/index.php/ATOM_Feed_Usage
- **SAM.gov APIs**: https://open.gsa.gov/api/
- **CALC**: https://calc.gsa.gov/api/docs/
- **Federal Hierarchy**: https://open.gsa.gov/api/fh-public-api/

---

**Prepared by**: AI Development Assistant
**Date**: December 2, 2025
**Status**: Ready for Implementation
