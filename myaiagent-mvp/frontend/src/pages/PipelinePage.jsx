import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Calendar, DollarSign, Search, Filter,
    MoreVertical, Trash2, ExternalLink, MessageSquare,
    Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import OpportunityDetailModal from '../components/OpportunityDetailModal';

const PipelinePage = () => {
    const navigate = useNavigate();
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOpportunity, setSelectedOpportunity] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        loadPipeline();
    }, []);

    const loadPipeline = async () => {
        setLoading(true);
        try {
            // Fetch tracked opportunities created by current user
            const response = await api.opportunities.list({ createdBy: 'me' });
            setOpportunities(response.data.opportunities || []);
        } catch (error) {
            console.error('Failed to load pipeline:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to remove this opportunity from your pipeline?')) {
            try {
                await api.opportunities.delete(id);
                setOpportunities(prev => prev.filter(op => op.id !== id));
            } catch (error) {
                console.error('Failed to delete opportunity:', error);
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-700';
            case 'Qualified': return 'bg-purple-100 text-purple-700';
            case 'In Progress': return 'bg-yellow-100 text-yellow-700';
            case 'Submitted': return 'bg-orange-100 text-orange-700';
            case 'Won': return 'bg-green-100 text-green-700';
            case 'Lost': return 'bg-red-100 text-red-700';
            case 'Archived': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredOpportunities = filterStatus === 'All'
        ? opportunities
        : opportunities.filter(op => op.internal_status === filterStatus);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading pipeline...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Pipeline</h1>
                        <p className="text-gray-600 mt-1">Track and manage your saved opportunities</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/samgov')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Find More Opportunities
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 overflow-x-auto">
                    <div className="flex items-center gap-2">
                        {['All', 'New', 'Qualified', 'In Progress', 'Submitted', 'Won', 'Lost'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === status
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pipeline List */}
                {filteredOpportunities.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200 border-dashed">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities found</h3>
                        <p className="text-gray-600 mb-6">
                            {filterStatus === 'All'
                                ? "You haven't saved any opportunities to your pipeline yet."
                                : `No opportunities with status "${filterStatus}".`}
                        </p>
                        {filterStatus === 'All' && (
                            <button
                                onClick={() => navigate('/samgov')}
                                className="px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                Browse SAM.gov Opportunities
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredOpportunities.map(opp => (
                            <div
                                key={opp.id}
                                onClick={() => setSelectedOpportunity(opp)}
                                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer relative group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(opp.internal_status)}`}>
                                                {opp.internal_status}
                                            </span>
                                            {opp.notice_id && (
                                                <span className="text-xs text-gray-500 font-mono">
                                                    {opp.solicitation_number || opp.notice_id}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                            {opp.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="w-4 h-4" />
                                                <span className="truncate max-w-[200px]">{opp.contracting_office || 'Unknown Agency'}</span>
                                            </div>
                                            {opp.response_deadline && (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Due: {new Date(opp.response_deadline).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {opp.type && (
                                                <div className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                                    {opp.type}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleDelete(e, opp.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove from pipeline"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedOpportunity && (
                <OpportunityDetailModal
                    opportunity={selectedOpportunity}
                    onClose={() => setSelectedOpportunity(null)}
                />
            )}
        </div>
    );
};

export default PipelinePage;
