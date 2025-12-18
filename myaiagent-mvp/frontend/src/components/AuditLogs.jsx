import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { FileText, Filter, User, Calendar, RefreshCw } from 'lucide-react';

export const AuditLogs = ({ orgId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);
    const [filterAction, setFilterAction] = useState('');

    // Available actions for filter (can be dynamic, but hardcoded for MVP)
    const actionTypes = [
        'user.login',
        'user.invite',
        'user.update_role',
        'user.deactivate',
        'organization.update_settings',
        'apikey.create',
        'apikey.rotate',
    ];

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = {
                limit,
                offset: page * limit,
                action: filterAction || undefined
            };

            const response = await api.org.getAuditLogs(orgId, params);
            setLogs(response.data.logs);
            setTotal(response.data.total);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orgId) {
            fetchLogs();
        }
    }, [orgId, page, filterAction]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatDetails = (details) => {
        if (!details || Object.keys(details).length === 0) return '-';
        return Object.entries(details).map(([key, value]) => {
            // Truncate long values
            const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return (
                <div key={key} className="text-xs text-gray-500">
                    <span className="font-medium">{key}:</span> {valStr.substring(0, 50)}{valStr.length > 50 ? '...' : ''}
                </div>
            );
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Logs</h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* Action Filter */}
                    <div className="relative">
                        <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            value={filterAction}
                            onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
                            className="pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none"
                        >
                            <option value="">All Actions</option>
                            {actionTypes.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={fetchLogs}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error ? (
                <div className="p-8 text-center text-red-500">{error}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {logs.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-gray-500">
                                        No activity logs found for this period.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
                                                    {(log.user_name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-gray-900 dark:text-white font-medium">{log.user_name || 'System'}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 ml-8">{log.user_email}</div>
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-500">
                                            {log.resource_type} #{log.resource_id}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-500 max-w-xs overflow-hidden">
                                            {formatDetails(log.details)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-500 font-mono text-xs">
                                            {log.ip_address}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    Showing {logs.length} of {total} events
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={(page + 1) * limit >= total}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
