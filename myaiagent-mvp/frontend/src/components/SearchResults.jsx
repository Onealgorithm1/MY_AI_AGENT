import React from 'react';
import { ExternalLink, Search } from 'lucide-react';

export default function SearchResults({ results }) {
  if (!results || !results.results || results.results.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Search className="w-4 h-4" />
          <span>Web Search Results</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {results.results.length} result{results.results.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {results.results.map((result, index) => (
          <a
            key={index}
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                    {result.title}
                  </h4>
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {result.displayLink}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                  {result.snippet}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
