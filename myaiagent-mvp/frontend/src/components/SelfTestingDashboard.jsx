import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function SelfTestingDashboard() {
  const [expandedTests, setExpandedTests] = useState(new Set());
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Fetch latest test results
  const { data: latestTest, isLoading: isLoadingLatest, refetch: refetchLatest } = useQuery({
    queryKey: ['selfTest', 'latest'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/self-test/latest`, {
        withCredentials: true,
      });
      return response.data.test;
    },
    refetchInterval: false, // CRITICAL: Disabled to prevent 429 errors
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    retry: false, // Don't retry on errors
  });

  // Fetch test history
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['selfTest', 'history'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/self-test/history?limit=10`, {
        withCredentials: true,
      });
      return response.data;
    },
  });

  // Run tests mutation
  const runTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${API_URL}/self-test/run`, {}, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Self-test completed successfully');
      refetchLatest();
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to run self-test');
    },
  });

  // Copy Claude prompt
  const handleCopyClaudePrompt = async () => {
    try {
      const response = await axios.get(`${API_URL}/self-test/claude-prompt`, {
        withCredentials: true,
      });
      await navigator.clipboard.writeText(response.data.prompt);
      setCopiedPrompt(true);
      toast.success('Test report copied to clipboard! Paste it to Claude for review.');
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch (error) {
      toast.error('Failed to copy test report');
    }
  };

  const toggleTestExpanded = (testId) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  if (isLoadingLatest && isLoadingHistory) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const summary = latestTest?.details?.summary || { total: 0, passed: 0, failed: 0, warnings: 0 };
  const tests = latestTest?.details?.tests || [];
  const history = historyData?.tests || [];

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              System Self-Testing
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automated tests to validate system health, API connectivity, and data integrity.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyClaudePrompt}
              disabled={!latestTest}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copiedPrompt ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedPrompt ? 'Copied!' : 'Copy for Claude Review'}
            </button>
            <button
              onClick={() => runTestsMutation.mutate()}
              disabled={runTestsMutation.isPending}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runTestsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              {runTestsMutation.isPending ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {latestTest && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Tests</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{summary.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-green-200 dark:border-green-900">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Passed</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{summary.passed}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-200 dark:border-red-900">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Failed</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.failed}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-yellow-200 dark:border-yellow-900">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Warnings</div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summary.warnings}</div>
          </div>
        </div>
      )}

      {/* Latest Test Results */}
      {latestTest && tests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Latest Test Results
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(latestTest.checked_at).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tests.map((test, index) => (
              <div key={index} className="p-4">
                <div
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() => toggleTestExpanded(index)}
                >
                  <div className="mt-0.5">
                    {getStatusIcon(test.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {test.name}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                      {test.duration && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {test.duration}ms
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {test.message}
                    </p>
                    {expandedTests.has(index) && test.details && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="text-gray-400">
                    {expandedTests.has(index) ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Test History
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((test) => {
              const testSummary = test.details?.summary || { total: 0, passed: 0, failed: 0, warnings: 0 };
              return (
                <div key={test.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {test.check_type}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-x-4">
                      <span>{testSummary.total} tests</span>
                      <span className="text-green-600 dark:text-green-400">{testSummary.passed} passed</span>
                      {testSummary.failed > 0 && (
                        <span className="text-red-600 dark:text-red-400">{testSummary.failed} failed</span>
                      )}
                      {testSummary.warnings > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400">{testSummary.warnings} warnings</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(test.checked_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!latestTest && !isLoadingLatest && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Tests Run Yet
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Click "Run All Tests" to start your first self-test.
          </p>
          <button
            onClick={() => runTestsMutation.mutate()}
            disabled={runTestsMutation.isPending}
            className="px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runTestsMutation.isPending ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <PlayCircle className="w-5 h-5" />
            )}
            {runTestsMutation.isPending ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>
      )}
    </div>
  );
}
