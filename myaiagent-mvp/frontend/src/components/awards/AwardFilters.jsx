import React from 'react';
import { Search, Filter, Calendar, DollarSign } from 'lucide-react';

const AwardFilters = ({ filters, onChange, onSearch }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange({ ...filters, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch();
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Keyword Search */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Keyword
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                name="keyword"
                                value={filters.keyword || ''}
                                onChange={handleChange}
                                placeholder="Search vendor, description..."
                                className="pl-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Agency */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Agency
                        </label>
                        <div className="relative">
                            <BuildingIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                name="agency"
                                value={filters.agency || ''}
                                onChange={handleChange}
                                placeholder="e.g. NASA, DOD"
                                className="pl-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Date Range Start */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate || ''}
                                onChange={handleChange}
                                className="pl-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Sort By */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Sort By
                        </label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select
                                name="sortBy"
                                value={filters.sortBy || 'award_date'}
                                onChange={handleChange}
                                className="pl-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="award_date">Award Date</option>
                                <option value="current_contract_value">Contract Value</option>
                                <option value="vendor_name">Vendor Name</option>
                                <option value="contracting_agency_name">Agency</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={() => onChange({})}
                        className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Clear
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Search Awards
                    </button>
                </div>
            </form>
        </div>
    );
};

// Simple icon component to avoid import error if lucide-react unavailable or named differently
const BuildingIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <line x1="9" y1="22" x2="9" y2="22.01"></line>
        <line x1="15" y1="22" x2="15" y2="22.01"></line>
        <line x1="12" y1="22" x2="12" y2="22.01"></line>
        <line x1="12" y1="2" x2="12" y2="22"></line>
        <line x1="4" y1="10" x2="20" y2="10"></line>
        <line x1="4" y1="18" x2="20" y2="18"></line>
    </svg>
);

export default AwardFilters;
