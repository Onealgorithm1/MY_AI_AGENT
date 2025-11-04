import React from 'react';
import { ExternalLink, Search, Globe } from 'lucide-react';

export default function SearchResults({ results }) {
  if (!results || !results.results || results.results.length === 0) {
    return null;
  }

  const openAllLinks = () => {
    results.results.forEach(result => {
      window.open(result.link, '_blank');
    });
  };

  return (
    <div className="mt-3 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-sm">
      <div className="px-3 py-2.5 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-gray-800 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
            <Search className="w-4 h-4" />
            <span>Web Search Results</span>
            <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs font-bold">
              {results.results.length}
            </span>
          </div>
          {results.results.length > 1 && (
            <button
              onClick={openAllLinks}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition-colors flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              Open All
            </button>
          )}
        </div>
        {results.query && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
            "{results.query}"
          </p>
        )}
      </div>
      
      <div className="divide-y divide-blue-100 dark:divide-gray-700">
        {results.results.map((result, index) => (
          <a
            key={index}
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-3 hover:bg-blue-100/50 dark:hover:bg-gray-700/50 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold group-hover:scale-110 transition-transform">
                {result.rank || index + 1}
              </div>
              
              {result.image && (
                <img 
                  src={result.image} 
                  alt="" 
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 group-hover:underline flex-1">
                    {result.title}
                  </h4>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400 dark:text-blue-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {result.displayLink}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                  {result.snippet}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
      
      {results.totalResults && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-gray-800 border-t border-blue-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          About {parseInt(results.totalResults).toLocaleString()} total results found
        </div>
      )}
    </div>
  );
}
