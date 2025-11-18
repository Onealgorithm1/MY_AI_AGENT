import React, { useState, useEffect } from 'react';
import { X, Building2, Calendar, FileText, ExternalLink, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { samGov } from '../services/api';

export default function SAMGovPanel({ isOpen, onClose }) {
  const [searchHistory, setSearchHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadSearchHistory();
    }
  }, [isOpen]);

  const loadSearchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await samGov.getSearchHistory(20);
      setSearchHistory(response.searches || []);
    } catch (err) {
      console.error('Failed to load search history:', err);
      setError('Failed to load SAM.gov data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white flex items-center justify-between border-b border-green-700">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          <h2 className="text-lg font-semibold">SAM.gov Cache</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSearchHistory}
            disabled={isLoading}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && !searchHistory.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-green-600 dark:text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={loadSearchHistory}
                className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : searchHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No SAM.gov searches yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Search for opportunities to see them here
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {/* Summary Stats */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 border-b border-green-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Recent Activity
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {searchHistory.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Searches</div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {searchHistory.reduce((sum, s) => sum + (s.total_records || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {searchHistory.reduce((sum, s) => sum + (s.new_records || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">New</div>
                </div>
              </div>
            </div>

            {/* Search History List */}
            {searchHistory.map((search, index) => (
              <div
                key={search.id || index}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {search.keyword || 'General Search'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {search.new_records > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold">
                        {search.new_records} new
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(search.searched_at).toLocaleString()}
                    </span>
                  </div>

                  {search.posted_from && search.posted_to && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-500">Range:</span>
                      <span>
                        {new Date(search.posted_from).toLocaleDateString()} - {new Date(search.posted_to).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {search.total_records} total
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {search.new_records} new
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {search.existing_records} existing
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Auto-cached opportunities</span>
          <a
            href="https://sam.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline"
          >
            <span>Visit SAM.gov</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
