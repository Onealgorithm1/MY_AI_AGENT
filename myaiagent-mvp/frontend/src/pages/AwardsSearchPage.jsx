import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import AwardFilters from '../components/awards/AwardFilters';
import { api } from '../services/api'; // Assuming generic api wrapper exists, or we'll make a direct call

const AwardsSearchPage = () => {
    const [loading, setLoading] = useState(false);
    const [awards, setAwards] = useState([]);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({
        limit: 20,
        offset: 0,
        sortBy: 'award_date',
        sortOrder: 'DESC'
    });

    const fetchAwards = async () => {
        setLoading(true);
        try {
            // Construct query string
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await api.get(`/awards/search?${params.toString()}`);
            setAwards(response.data.awards || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching awards:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAwards();
    }, [filters.offset, filters.sortBy]); // Trigger on pagination/sort change, filter change usually manual

    const handleFilterChange = (newFilters) => {
        setFilters({ ...filters, ...newFilters, offset: 0 }); // Reset page on filter change
    };

    const handlePageChange = (newOffset) => {
        setFilters({ ...filters, offset: newOffset });
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value && key !== 'limit' && key !== 'offset') params.append(key, value);
            });

            // Trigger download
            window.open(`${import.meta.env.VITE_API_URL || '/api'}/awards/export?${params.toString()}`, '_blank');
        } catch (error) {
            console.error('Export failed:', error);
        }
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

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Award Search</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Search and analyze historical federal contract awards (FPDS data).
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </button>
            </div>

            <AwardFilters
                filters={filters}
                onChange={handleFilterChange}
                onSearch={fetchAwards}
            />

            {/* Results Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PIID / Mod</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agency</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        Loading awards...
                                    </td>
                                </tr>
                            ) : awards.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No awards found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                awards.map((award) => (
                                    <tr key={award.id || award.piid} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {award.piid}
                                            </div>
                                            <div className="text-xs text-gray-500">Mod: {award.modification_number}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white font-medium">{award.vendor_name}</div>
                                            <div className="text-xs text-gray-500">UEI: {award.vendor_uei}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                            {award.contracting_agency_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(award.award_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(award.current_contract_value)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={award.description_of_requirement}>
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
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                            disabled={filters.offset === 0}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(filters.offset + filters.limit)}
                            disabled={filters.offset + filters.limit >= total}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Showing <span className="font-medium">{Math.min(filters.offset + 1, total)}</span> to <span className="font-medium">{Math.min(filters.offset + filters.limit, total)}</span> of <span className="font-medium">{total}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                                    disabled={filters.offset === 0}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(filters.offset + filters.limit)}
                                    disabled={filters.offset + filters.limit >= total}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AwardsSearchPage;
