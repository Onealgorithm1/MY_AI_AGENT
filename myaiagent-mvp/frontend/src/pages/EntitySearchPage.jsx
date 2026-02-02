import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import EntityDetailModal from '../components/entities/EntityDetailModal'; // We will create this next
import {
    Search,
    MapPin,
    Building2,
    Calendar,
    Filter,
    ChevronRight,
    AlertCircle
} from 'lucide-react';

export default function EntitySearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalRecords, setTotalRecords] = useState(0);
    const [selectedEntityUEI, setSelectedEntityUEI] = useState(null);

    // Search state
    const keyword = searchParams.get('keyword') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;

    // Filter & Sort State
    const [filters, setFilters] = useState({
        status: ['Active'], // Default to Active
        purpose: []
    });
    const [sort, setSort] = useState('relevance');

    useEffect(() => {
        if (keyword) {
            handleSearch();
        }
    }, [page, keyword, filters, sort]);

    const handleSearch = async () => {
        setLoading(true);
        setError(null);
        console.log('Searching entities with params:', { page, keyword, filters, sort });
        try {
            const offset = (page - 1) * limit;

            const searchPayload = {
                limit,
                offset,
                // Pass filters
                registrationStatus: filters.status.length > 0 ? filters.status.join(',') : undefined,
                // Map purpose friendly names to codes if needed, or pass as is 
                // (Assuming simple mapping for now: 'All Awards' -> 'Z1', 'Assistance' -> 'Z2' etc if known, else undefined)
                // For MVP let's just use what we have or skip complex mapping until verified.

                sort: sort
            };

            // Simple heuristic for search term
            if (keyword.length === 12 && /^[A-Z0-9]+$/.test(keyword)) {
                searchPayload.ueiSAM = keyword;
            } else if (keyword.length === 5 && /^[A-Z0-9]+$/.test(keyword)) {
                searchPayload.cageCode = keyword;
            } else {
                searchPayload.legalBusinessName = keyword;
            }

            const response = await api.samGov.searchEntities(searchPayload);

            if (response.success) {
                setEntities(response.entities || []);
                setTotalRecords(response.totalRecords || 0);
            } else {
                setError('Failed to fetch entities');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred while searching');
        } finally {
            setLoading(false);
        }
    };

    const updateFilter = (type, value) => {
        setFilters(prev => {
            const current = prev[type];
            const newList = current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value];
            return { ...prev, [type]: newList };
        });
        // Reset page to 1 on filter change
        setSearchParams({ keyword, page: '1' });
    };

    const updateSearch = (newKeyword) => {
        setSearchParams({ keyword: newKeyword, page: '1' });
    };

    const changePage = (newPage) => {
        setSearchParams({ keyword, page: newPage.toString() });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        Entity Search
                    </h1>

                    <div className="relative w-full md:w-1/2">
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                            placeholder="Search by Entity Name, UEI, or CAGE..."
                            defaultValue={keyword}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') updateSearch(e.target.value);
                            }}
                        />
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 md:grid md:grid-cols-4 gap-6">
                {/* Sidebar Filters */}
                <div className="hidden md:block col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 font-semibold mb-4 text-sm uppercase tracking-wide text-gray-500">
                            <Filter className="w-4 h-4" /> Filters
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Entity Status</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600"
                                            checked={filters.status.includes('Active')}
                                            onChange={() => updateFilter('status', 'Active')}
                                        />
                                        Active Registration
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600"
                                            checked={filters.status.includes('Inactive')}
                                            onChange={() => updateFilter('status', 'Inactive')}
                                        />
                                        Inactive Registration
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results List */}
                <div className="col-span-3 space-y-4">
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                        <span>Showing {entities.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, totalRecords)} of {totalRecords} results</span>
                        <select
                            className="bg-transparent border-none text-blue-600 font-medium cursor-pointer focus:ring-0"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                        >
                            <option value="relevance">Sort by Relevance</option>
                            <option value="name">Sort by Name (A-Z)</option>
                            <option value="expiration">Sort by Expiration (Oldest)</option>
                            <option value="-expiration">Sort by Expiration (Newest)</option>
                        </select>
                    </div>

                    {loading && (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    {!loading && entities.length === 0 && keyword && (
                        <div className="bg-white dark:bg-gray-800 p-12 rounded-lg text-center text-gray-500">
                            No entities found matching "{keyword}"
                        </div>
                    )}

                    {!loading && !keyword && entities.length === 0 && (
                        <div className="space-y-8">
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center mx-auto max-w-2xl">
                                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Search for Entities</h3>
                                <p className="text-gray-500 mb-6">Enter a Legal Business Name, UEI, or CAGE code to find entity registrations.</p>
                            </div>

                            {/* Top Entities Leaderboard */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 px-4">🏆 Top Performers</h3>
                                <TopEntitiesList onSelectEntity={setSelectedEntityUEI} />
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {entities.map((entity, index) => {
                            // SAM.gov API v3/v4 structure mapping
                            const reg = entity.entityRegistration || {};
                            const core = entity.coreData || {};
                            const uei = reg.ueiSAM || entity.ueiSAM;
                            const name = reg.legalBusinessName || entity.legalBusinessName;
                            const cage = reg.cageCode || entity.cageCode;
                            const status = reg.registrationStatus || 'Active'; // default to active if missing for now
                            const expiration = reg.expirationDate;
                            const address = core.physicalAddress || {};
                            const fullAddress = [address.addressLine1, address.city, address.stateOrProvinceCode, address.zipCode].filter(Boolean).join(', ');

                            return (
                                <div
                                    key={uei || index}
                                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                                    onClick={() => setSelectedEntityUEI(uei)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-1 group-hover:underline">
                                                {name}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                                <span className="flex items-center gap-1">
                                                    <span className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    {status} Registration
                                                </span>
                                                <span className="text-gray-300">|</span>
                                                <span>UEI: <span className="font-mono font-medium text-gray-900 dark:text-gray-200">{uei}</span></span>
                                                <span className="text-gray-300">|</span>
                                                <span>CAGE: <span className="font-mono font-medium text-gray-900 dark:text-gray-200">{cage}</span></span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <span className="font-medium">Physical Address</span>
                                                        <p className="text-gray-600 dark:text-gray-400">{fullAddress || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <span className="font-medium">Expiration Date</span>
                                                        <p className="text-gray-600 dark:text-gray-400">{expiration || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-8 h-8 text-gray-300" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalRecords > limit && (
                        <div className="flex justify-center gap-2 mt-8">
                            <button
                                disabled={page === 1}
                                onClick={() => changePage(page - 1)}
                                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2">Page {page}</span>
                            <button
                                disabled={page * limit >= totalRecords}
                                onClick={() => changePage(page + 1)}
                                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Entity Details Modal */}
            {selectedEntityUEI && (
                <EntityDetailModal
                    uei={selectedEntityUEI}
                    onClose={() => setSelectedEntityUEI(null)}
                />
            )}
        </div>
    );
}

// Sub-component for Top Entities
function TopEntitiesList({ onSelectEntity }) {
    const [topEntities, setTopEntities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTop = async () => {
            try {
                // Reuse the same performance endpoint as it returns entities with values
                const res = await api.get('/awards/vendor/top-performers?limit=100');
                setTopEntities(res.data.vendors || []);
            } catch (err) {
                console.error('Failed to load top entities', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTop();
    }, []);

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    if (loading) return <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Entity Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">UEI</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contract Value</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Awards</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {topEntities.map((entity, idx) => (
                            <tr
                                key={idx}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                onClick={() => onSelectEntity(entity.vendor_uei)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">
                                    #{idx + 1}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                    {entity.vendor_name || 'Unknown Entity'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {entity.vendor_uei}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(entity.total_value)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                    {entity.award_count}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
