import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, DollarSign, FileText, Tag } from 'lucide-react';
import { api } from '../services/api';

const AwardDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [award, setAward] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAward = async () => {
            try {
                // Determine if we are looking up by DB ID or mocking it based on generic PIID
                // For this demo, since generic analytics page uses PIIDs like "N000..." which aren't numeric IDs,
                // we might need to handle the "mock navigation" scenario.
                // But generally clean implementation expects an ID.

                // If ID looks like a real DB ID (integer), fetch it.
                // If it looks like a PIID string (contains chars), maybe perform a search-by-PIID?

                // Let's try fetching by ID first.
                const response = await api.get(`/awards/${id}`);
                setAward(response.data.award);
            } catch (err) {
                console.error('Failed to load award:', err);
                // If 404/500, check if it's a mock PIID from the analytics page demo
                // If so, show mock details for demo continuity
                if (isNaN(id)) {
                    setAward({
                        piid: id,
                        vendor_name: 'DEMO VENDOR CORP',
                        contracting_agency_name: 'DEMO AGENCY',
                        current_contract_value: 1000000,
                        award_date: new Date().toISOString(),
                        description_of_requirement: 'This is a generated detail view for a demo PIID. In a production environment, this would display data fetched from the backend.',
                        naics_code: '000000'
                    });
                } else {
                    setError('Award details not found.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchAward();
        }
    }, [id]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(val || 0);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            </div>
        );
    }

    if (!award) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-6 font-medium"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Analytics
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8">
                        <div className="flex justify-between items-start text-white">
                            <div>
                                <h1 className="text-3xl font-bold">{award.piid}</h1>
                                <p className="opacity-90 mt-2 text-lg">{award.vendor_name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-75 uppercase tracking-wider font-semibold">Contract Value</p>
                                <p className="text-3xl font-bold">{formatCurrency(award.current_contract_value)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                                        <Building2 className="w-4 h-4" /> Agency
                                    </h3>
                                    <p className="text-lg font-semibold text-gray-900">{award.contracting_agency_name}</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                                        <Calendar className="w-4 h-4" /> Dates
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">Award Date</p>
                                            <p className="font-medium">{award.award_date ? new Date(award.award_date).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        {award.estimated_completion_date && (
                                            <div>
                                                <p className="text-xs text-gray-500">Completion Date</p>
                                                <p className="font-medium">{new Date(award.estimated_completion_date).toLocaleDateString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                                        <Tag className="w-4 h-4" /> NAICS & Product Service Code
                                    </h3>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-sm font-mono text-gray-700">{award.naics_code}</p>
                                        <p className="text-sm text-gray-600 mt-1">{award.naics_description}</p>
                                    </div>
                                </div>

                                {award.product_or_service_code && (
                                    <div>
                                        <p className="text-sm font-mono text-gray-700">PSC: {award.product_or_service_code}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4" /> Description of Requirement
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {award.description_of_requirement || 'No description provided.'}
                                </p>
                            </div>
                        </div>

                        {/* Additional Metadata / Raw Data if needed */}
                        {award.modification_number && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Mod #{award.modification_number}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AwardDetailsPage;
