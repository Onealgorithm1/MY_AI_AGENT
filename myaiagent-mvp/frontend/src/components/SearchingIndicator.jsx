import React from 'react';
import { Search, Loader2 } from 'lucide-react';

export default function SearchingIndicator({ query }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-pulse">
      <div className="relative">
        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin absolute -top-1 -right-1" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
          Searching the web...
        </p>
        {query && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            "{query}"
          </p>
        )}
      </div>
    </div>
  );
}
