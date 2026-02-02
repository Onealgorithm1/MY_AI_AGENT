import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import AwardStatsCards from '../components/awards/AwardStatsCards';
import { api } from '../services/api';

const VendorPerformancePage = () => {
    const [activeTab, setActiveTab] = useState('my_performance'); // 'my_performance' or 'market'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [awards, setAwards] = useState([]);
    const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 });

    // Market Data State
    const [topPerformers, setTopPerformers] = useState([]);
    const [marketSearch, setMarketSearch] = useState({
        keyword: '',
        agency: '',
        minValue: '',
        maxValue: '',
        naicsCode: ''
    });
    const [marketResults, setMarketResults] = useState([]);
    const [marketLoading, setMarketLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch stats
            const statsRes = await api.get('/awards/vendor/performance');
            setStats(statsRes.data.summary);

            // Fetch history
            const historyRes = await api.get(`/awards/vendor/history?limit=${pagination.limit}&offset=${pagination.offset}`);
            setAwards(historyRes.data.awards || []);
            setPagination(prev => ({ ...prev, total: historyRes.data.total }));
        } catch (err) {
            console.error('Failed to load performance data:', err);
            if (err.response && err.response.data && err.response.data.error === 'Organization configuration missing UEI') {
                setError('missing_uei');
            } else {
                setError('generic');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchMarketData = async () => {
        setMarketLoading(true);
        try {
            // Fetch Top Performers (Increased to 100 as requested)
            const topRes = await api.get('/awards/vendor/top-performers?limit=100');
            setTopPerformers(topRes.data.vendors || []);
        } catch (err) {
            console.error('Failed to load market data:', err);
        } finally {
            setMarketLoading(false);
        }
    };

    const handleMarketSearch = async (e) => {
        if (e) e.preventDefault();
        setMarketLoading(true);
        try {
            const params = new URLSearchParams(marketSearch);
            // Default sort
            params.append('sortBy', 'current_contract_value');
            params.append('sortOrder', 'DESC');

            const res = await api.get(`/awards/search?${params.toString()}`);
            setMarketResults(res.data.awards || []);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setMarketLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [pagination.offset]);

    useEffect(() => {
        if ((activeTab === 'market' || activeTab === 'top_performers') && topPerformers.length === 0) {
            fetchMarketData();
        }
    }, [activeTab]);

    const handleExport = () => {
        alert("Exporting your full history...");
        // In a real app, window.open(`${API_URL}/awards/export?vendor_uei=${orgUei}`, '_blank');
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    if (loading && !stats && activeTab === 'my_performance') {
        return (
            <div className="p-8 flex justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
            </div>
        );
    }

    if (error === 'missing_uei' && activeTab === 'my_performance') {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-md mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                Configuration Required
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                <p>
                                    Your organization profile is missing a Unique Entity ID (UEI).
                                    To view your award performance and history, please update your
                                    <a href="/admin/org/settings" className="font-bold underline ml-1">Organization Settings</a>
                                    with your SAM.gov UEI.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Allow switching to Market tab even if UEI is missing */}
                <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button
                        onClick={() => setActiveTab('my_performance')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'my_performance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        My Performance
                    </button>
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'market' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Market Intelligence
                    </button>
                </div>
                {activeTab === 'market' && renderMarketTab()}
            </div>
        );
    }

    // --- Render Helpers ---

    const renderMyPerformanceTab = () => (
        <>
            <AwardStatsCards stats={stats} />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Award History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PIID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agency</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {awards.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No awards found.
                                    </td>
                                </tr>
                            ) : (
                                awards.map((award) => (
                                    <tr key={award.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                                            {award.piid}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {award.contracting_agency_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(award.award_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600 dark:text-green-400">
                                            {formatCurrency(award.current_contract_value)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                            {award.description_of_requirement}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6">
                    <div className="flex-1 flex justify-between">
                        <button
                            onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
                            disabled={pagination.offset === 0}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <div className="text-sm text-gray-500 self-center">
                            {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                        </div>
                        <button
                            onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
                            disabled={pagination.offset + pagination.limit >= pagination.total}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </>
    );

    const renderTopPerformersTab = () => (
        <div className="space-y-8">
            {/* Top Performers Section */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">🏆 Top Performers</h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">UEI</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Value</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Awards</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {topPerformers.map((vendor, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">
                                            #{idx + 1}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {vendor.vendor_name || 'Unknown Vendor'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {vendor.vendor_uei}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(vendor.total_value)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                            {vendor.award_count}
                                        </td>
                                    </tr>
                                ))}
                                {topPerformers.length === 0 && !marketLoading && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No data available yet. Backfill in progress...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMarketTab = () => (
        <div className="space-y-8">
            {/* Search Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">🔍 Search Awards</h3>
                <form onSubmit={handleMarketSearch} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Keyword (Vendor, Desc, PIID)"
                        className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={marketSearch.keyword}
                        onChange={(e) => setMarketSearch({ ...marketSearch, keyword: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Agency Name"
                        className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={marketSearch.agency}
                        onChange={(e) => setMarketSearch({ ...marketSearch, agency: e.target.value })}
                    />
                    <div className="flex space-x-2">
                        <input
                            type="number"
                            placeholder="Min Value ($)"
                            className="w-1/2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={marketSearch.minValue}
                            onChange={(e) => setMarketSearch({ ...marketSearch, minValue: e.target.value })}
                        />
                        <input
                            type="number"
                            placeholder="Max Value ($)"
                            className="w-1/2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={marketSearch.maxValue}
                            onChange={(e) => setMarketSearch({ ...marketSearch, maxValue: e.target.value })}
                        />
                    </div>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="NAICS Code"
                            className="flex-grow p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={marketSearch.naicsCode}
                            onChange={(e) => setMarketSearch({ ...marketSearch, naicsCode: e.target.value })}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                            disabled={marketLoading}
                        >
                            {marketLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </form>

                {/* Search Results Table */}
                {marketResults.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vendor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Agency</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {marketResults.map((award) => (
                                    <tr key={award.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {award.vendor_name}<br />
                                            <span className="text-xs text-gray-500">{award.piid}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {award.contracting_agency_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-medium text-green-600">
                                            {formatCurrency(award.current_contract_value)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {formatDate(award.award_date)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {marketLoading && marketResults.length === 0 && <p className="text-center text-gray-500 mt-4">Loading results...</p>}
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Track your performance and analyze market trends.
                    </p>
                </div>
                {activeTab === 'my_performance' && (
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export History
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('my_performance')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'my_performance'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    My Performance
                </button>
                <button
                    onClick={() => setActiveTab('top_performers')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'top_performers'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    Top Performers
                </button>
                <button
                    onClick={() => setActiveTab('market')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'market'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    Market Intelligence
                </button>
            </div>

            {/* Content */}
            {activeTab === 'my_performance' && renderMyPerformanceTab()}
            {activeTab === 'top_performers' && renderTopPerformersTab()}
            {activeTab === 'market' && renderMarketTab()}
        </div>
    );
};

export default VendorPerformancePage;
