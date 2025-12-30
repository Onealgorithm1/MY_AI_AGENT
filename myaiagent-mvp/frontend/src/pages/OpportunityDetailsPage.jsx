import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const OpportunityDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [opportunity, setOpportunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOpportunity = async () => {
            try {
                setLoading(true);
                // Use the dedicated SAM.gov method
                const response = await api.samGov.getCachedOpportunity(id);
                setOpportunity(response);
            } catch (err) {
                console.error('Error fetching opportunity details:', err);
                setError('Failed to load opportunity details');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchOpportunity();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !opportunity) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
                    <div className="text-red-500 mb-4">{error || 'Opportunity not found'}</div>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-blue-600 hover:text-blue-800"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 truncate max-w-4xl" title={opportunity.title}>
                                {opportunity.title}
                            </h1>
                            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                                <span>{opportunity.solicitation_number}</span>
                                <span>•</span>
                                <span>{opportunity.agency || opportunity.contracting_office || 'Unknown Agency'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Info Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                            <div className="prose prose-sm max-w-none text-gray-600 space-y-4">
                                <div dangerouslySetInnerHTML={{ __html: opportunity.description || 'No description provided.' }} />
                            </div>
                        </div>

                        {/* Scope / Core Data */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Scope & Classification</h2>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">NAICS Code</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{opportunity.naics_code || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">PSC Code</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{opportunity.psc_code || 'N/A'}</dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Place of Performance</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{opportunity.place_of_performance || 'Not specified'}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    {/* Sidebar Info Column */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Key Dates</h2>
                            <ul className="space-y-4">
                                <li className="flex justify-between">
                                    <span className="text-sm text-gray-500">Posted</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {opportunity.posted_date ? new Date(opportunity.posted_date).toLocaleDateString() : 'N/A'}
                                    </span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-sm text-gray-500">Response Due</span>
                                    <span className="text-sm font-medium text-blue-600">
                                        {opportunity.response_deadline ? new Date(opportunity.response_deadline).toLocaleDateString() : 'N/A'}
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Set-Aside</h2>
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                {opportunity.set_aside_type || 'None / Unrestricted'}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Links</h2>
                            {opportunity.uiLink || opportunity.link ? (
                                <a
                                    href={opportunity.uiLink || opportunity.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    View on SAM.gov
                                </a>
                            ) : (
                                <span className="text-sm text-gray-500 italic">No external link available</span>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OpportunityDetailsPage;
