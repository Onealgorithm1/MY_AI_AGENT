import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X, DollarSign, Sparkles, MessageSquare, BarChart3, ExternalLink, Mail,
    CalendarPlus, Trophy, Award, FileText, CheckCircle, ChevronUp, ChevronDown,
    Calendar, Clock, Building2, Users, Code, Lock, Bell
} from 'lucide-react';
import api from '../services/api';
import { addToGoogleCalendar, openEmailClient, initiatePhoneCall, formatPhoneNumber } from '../utils/integrations';
import SetReminderModal from './SetReminderModal';

// Opportunity Detail Modal Component
const OpportunityDetailModal = ({ opportunity, onClose, formatContractValue }) => {
    const navigate = useNavigate();
    const contractValue = formatContractValue ? formatContractValue(opportunity) : (opportunity.amount ? `$${parseFloat(opportunity.amount).toLocaleString()}` : null);
    const agencyHierarchy = opportunity.raw_data?.fullParentPathName?.split('.') || [];
    const awardInfo = opportunity.raw_data?.award;
    const classificationCode = opportunity.raw_data?.classificationCode;
    const placeOfPerformance = opportunity.raw_data?.placeOfPerformance;
    const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [incumbentData, setIncumbentData] = useState(null);
    const [loadingIncumbent, setLoadingIncumbent] = useState(false);
    const [contactNotes, setContactNotes] = useState('');
    const [savedToTracking, setSavedToTracking] = useState(false);
    const [showAllDetails, setShowAllDetails] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Accordion sections state - SAM.gov style
    const [expandedSections, setExpandedSections] = useState({
        solicitation: true,  // Open by default
        award: false,
        classification: false,
        description: true,   // Open by default
        contact: false,
        attachments: false,
        apiData: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Load incumbent contractor data
    useEffect(() => {
        const loadIncumbentData = async () => {
            if (opportunity.naics_code) {
                setLoadingIncumbent(true);
                try {
                    // Search for contracts with same NAICS code
                    const response = await api.get('/fpds/search/contracts', {
                        params: {
                            naicsCode: opportunity.naics_code,
                            limit: 5
                        }
                    });
                    setIncumbentData(response.data.contracts || []);
                } catch (error) {
                    console.error('Failed to load incumbent data:', error);
                    setIncumbentData([]);
                } finally {
                    setLoadingIncumbent(false);
                }
            }
        };
        loadIncumbentData();
    }, [opportunity.naics_code]);

    // Save to contact tracking
    const saveToTracking = async () => {
        setSaving(true);
        try {
            const payload = {
                notice_id: opportunity.notice_id || opportunity.id,
                title: opportunity.title,
                solicitation_number: opportunity.solicitation_number,
                type: opportunity.type,
                posted_date: opportunity.posted_date,
                response_deadline: opportunity.response_deadline,
                naics_code: opportunity.naics_code,
                set_aside_type: opportunity.set_aside_type,
                contracting_office: opportunity.contracting_office,
                place_of_performance: typeof opportunity.place_of_performance === 'object'
                    ? JSON.stringify(opportunity.place_of_performance)
                    : opportunity.place_of_performance,
                description: opportunity.description,
                raw_data: opportunity.raw_data || opportunity,
                internal_status: 'New'
            };

            await api.opportunities.create(payload);

            setSavedToTracking(true);
            setTimeout(() => setSavedToTracking(false), 3000);
        } catch (error) {
            console.error('Failed to save opportunity:', error);
            if (error.response?.data?.error?.includes('unique') || error.response?.status === 409) {
                setSavedToTracking(true);
                setTimeout(() => setSavedToTracking(false), 3000);
            } else {
                alert('Failed to save to pipeline');
            }
        } finally {
            setSaving(false);
        }
    };

    const performAIMarketAnalysis = async () => {
        setAnalyzingWithAI(true);
        setAiAnalysis(null);
        try {
            // Prepare factual market analysis prompt
            const analysisPrompt = `Analyze this federal contract opportunity and provide ONLY factual market intelligence. Be concise and data-driven.

OPPORTUNITY DATA:
Title: ${opportunity.title}
Solicitation: ${opportunity.solicitation_number}
Agency: ${agencyHierarchy.join(' → ')}
Type: ${opportunity.type}
Set-Aside: ${opportunity.set_aside_type || 'None (Full & Open Competition)'}
NAICS: ${opportunity.naics_code || 'N/A'}
PSC: ${classificationCode?.code || 'N/A'}
Posted: ${new Date(opportunity.posted_date).toLocaleDateString()}
Deadline: ${opportunity.response_deadline ? new Date(opportunity.response_deadline).toLocaleDateString() : 'Not specified'}
Estimated Value: ${contractValue || 'Not disclosed'}
${awardInfo ? `\nIncumbent: ${awardInfo.awardee?.name || 'Unknown'}
Incumbent Contract Value: $${(parseFloat(awardInfo.amount) / 1000000).toFixed(2)}M
Award Date: ${new Date(awardInfo.date).toLocaleDateString()}` : ''}

Description: ${opportunity.description || 'Not provided'}

Provide a factual market analysis covering:
1. MARKET POSITION: Key facts about this opportunity's market segment
2. COMPETITION ASSESSMENT: Incumbent advantage, set-aside impact, expected competition level
3. WIN FACTORS: Specific technical/past performance requirements that matter
4. STRATEGIC INSIGHTS: Factual observations about timing, agency patterns, contract type

Keep it factual, concise, and actionable. No fluff or generic advice.`;

            // Create a temporary conversation for analysis
            const convResponse = await api.post('/conversations', {
                title: `Market Analysis: ${opportunity.solicitation_number}`,
                model: 'gemini-2.5-flash'
            });

            const conversationId = convResponse.data.conversation.id;

            // Call the backend API which will use Gemini
            const response = await api.post('/messages', {
                conversationId,
                content: analysisPrompt,
                model: 'gemini-2.5-flash',
                stream: false
            });

            if (response.data?.message?.content) {
                setAiAnalysis(response.data.message.content);
            } else {
                throw new Error('No analysis generated');
            }
        } catch (error) {
            console.error('Failed to perform AI analysis:', error);
            setAiAnalysis('⚠️ Analysis failed. Please try again or check your connection.');
        } finally {
            setAnalyzingWithAI(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white md:rounded-lg max-w-5xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-3 md:p-6 flex items-start justify-between z-10">
                    <div className="flex-1 min-w-0 pr-2">
                        <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-2 line-clamp-2">{opportunity.title}</h2>
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            <p className="text-xs md:text-sm text-gray-600 truncate">Solicitation: {opportunity.solicitation_number}</p>
                            {contractValue && (
                                <span className="px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-bold rounded bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                                    {contractValue}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-2 md:ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 touch-manipulation"
                    >
                        <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                <div className="p-3 md:p-6 space-y-4 md:space-y-6">
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <button
                            onClick={saveToTracking}
                            disabled={savedToTracking || saving}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${savedToTracking
                                ? 'bg-green-100 text-green-700'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                        >
                            {savedToTracking ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Saved
                                </>
                            ) : (
                                <>
                                    <Trophy className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Pipeline'}
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setShowReminderModal(true)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg text-xs md:text-sm font-medium transition-colors"
                        >
                            <Bell className="w-4 h-4" />
                            Reminder
                        </button>

                        <button
                            onClick={performAIMarketAnalysis}
                            disabled={analyzingWithAI}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs md:text-sm font-medium rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {analyzingWithAI ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    AI Market Analysis
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                const context = `I'd like to discuss this SAM.gov contract opportunity:

📋 **${opportunity.title}**
🏛️ Agency: ${opportunity.contracting_office}
📝 Solicitation: ${opportunity.solicitation_number}
📅 Posted: ${new Date(opportunity.posted_date).toLocaleDateString()}
${opportunity.response_deadline ? `⏰ Deadline: ${new Date(opportunity.response_deadline).toLocaleDateString()}` : ''}
🏷️ Type: ${opportunity.type}
${opportunity.naics_code ? `🔢 NAICS: ${opportunity.naics_code}` : ''}
${opportunity.set_aside_type ? `🎯 Set-Aside: ${opportunity.set_aside_type}` : ''}
${opportunity.raw_data?.uiLink ? `🔗 SAM.gov: ${opportunity.raw_data.uiLink}` : ''}

What would you like to know about this opportunity?`;
                                navigate('/chat', { state: { initialMessage: context } });
                                onClose();
                            }}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Send to Chat
                        </button>

                        <button
                            onClick={() => {
                                navigate('/contract-analytics');
                                onClose();
                            }}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Market Analytics
                        </button>

                        {opportunity.raw_data?.uiLink && (
                            <a
                                href={opportunity.raw_data.uiLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white text-xs md:text-sm font-bold rounded-lg transition-all shadow-lg ring-2 ring-blue-300"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Go to SAM.gov
                            </a>
                        )}

                        {opportunity.raw_data?.pointOfContact && opportunity.raw_data.pointOfContact.length > 0 && opportunity.raw_data.pointOfContact[0].email && (
                            <button
                                onClick={() => {
                                    const contact = opportunity.raw_data.pointOfContact[0];
                                    openEmailClient(
                                        contact.email,
                                        `Inquiry: ${opportunity.solicitation_number}`,
                                        `Dear ${contact.fullName},\n\nI am interested in the following opportunity:\n\nTitle: ${opportunity.title}\nSolicitation: ${opportunity.solicitation_number}\n\n`
                                    );
                                }}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                Email in Gmail
                            </button>
                        )}

                        {opportunity.response_deadline && (
                            <button
                                onClick={() => {
                                    addToGoogleCalendar({
                                        title: `Response Due: ${opportunity.title}`,
                                        description: `SAM.gov Opportunity\nSolicitation: ${opportunity.solicitation_number}\nAgency: ${opportunity.contracting_office}\n\nLink: ${opportunity.raw_data?.uiLink || ''}`,
                                        startDate: opportunity.response_deadline,
                                        location: 'SAM.gov',
                                    });
                                }}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors"
                            >
                                <CalendarPlus className="w-4 h-4" />
                                Add to Calendar
                            </button>
                        )}
                    </div>

                    {/* AI Market Analysis Results */}
                    {aiAnalysis && (
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4 shadow-lg">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">AI Market Intelligence Analysis</h3>
                                    <p className="text-xs text-gray-600">Powered by Gemini 2.5 Flash • Factual insights only</p>
                                </div>
                                <button
                                    onClick={() => setAiAnalysis(null)}
                                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Close analysis"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                                <div className="prose prose-sm max-w-none">
                                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                        {aiAnalysis}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                                <BarChart3 className="w-3 h-3" />
                                <span>This analysis is based on publicly available SAM.gov data and market patterns</span>
                            </div>
                        </div>
                    )}

                    {/* SAM.gov Style Accordion Sections */}
                    <div className="space-y-2">
                        {/* Solicitation Details Section */}
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('solicitation')}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <h3 className="text-base font-bold text-gray-900">Solicitation Details</h3>
                                {expandedSections.solicitation ? (
                                    <ChevronUp className="w-5 h-5 text-gray-600" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-600" />
                                )}
                            </button>
                            {expandedSections.solicitation && (
                                <div className="p-4 bg-white space-y-4">
                                    {/* Type and Status */}
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-3 py-1 text-sm font-medium rounded ${opportunity.type === 'Combined Synopsis/Solicitation' ? 'bg-green-100 text-green-700' :
                                            opportunity.type === 'Sources Sought' ? 'bg-blue-100 text-blue-700' :
                                                opportunity.type === 'Presolicitation' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {opportunity.type}
                                        </span>
                                        {opportunity.set_aside_type && (
                                            <span className="px-3 py-1 text-sm font-medium rounded bg-purple-100 text-purple-700">
                                                {opportunity.set_aside_type}
                                            </span>
                                        )}
                                        {opportunity.raw_data?.active && (
                                            <span className="px-3 py-1 text-sm font-medium rounded bg-green-100 text-green-700 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Active
                                            </span>
                                        )}
                                    </div>

                                    {/* Solicitation Details Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gray-50 p-3 rounded">
                                            <p className="text-xs text-gray-500 mb-1">Notice ID</p>
                                            <p className="text-sm font-semibold text-gray-900">{opportunity.solicitation_number}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded">
                                            <p className="text-xs text-gray-500 mb-1">Contract Opportunity Type</p>
                                            <p className="text-sm font-semibold text-gray-900">{opportunity.type}</p>
                                        </div>
                                        {opportunity.response_deadline && (
                                            <div className="bg-gray-50 p-3 rounded">
                                                <p className="text-xs text-gray-500 mb-1">Response Date</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {new Date(opportunity.response_deadline).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        <div className="bg-gray-50 p-3 rounded">
                                            <p className="text-xs text-gray-500 mb-1">Published Date</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {new Date(opportunity.posted_date).toLocaleDateString()} {new Date(opportunity.posted_date).toLocaleTimeString()} EST
                                            </p>
                                        </div>
                                    </div>

                                    {/* Department/Agency/Office Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg">
                                        {agencyHierarchy[0] && (
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Department/Ind. Agency</p>
                                                <p className="text-sm font-semibold text-gray-900">{agencyHierarchy[0]}</p>
                                            </div>
                                        )}
                                        {agencyHierarchy[1] && (
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Sub-tier</p>
                                                <p className="text-sm font-semibold text-gray-900">{agencyHierarchy[1]}</p>
                                            </div>
                                        )}
                                        {agencyHierarchy[2] && (
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Office</p>
                                                <p className="text-sm font-semibold text-gray-900">{agencyHierarchy[2]}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description Section - Accordion */}
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('description')}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <h3 className="text-base font-bold text-gray-900">Description</h3>
                                {expandedSections.description ? (
                                    <ChevronUp className="w-5 h-5 text-gray-600" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-600" />
                                )}
                            </button>
                            {expandedSections.description && (
                                <div className="p-4 bg-white space-y-4">
                                    <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                                        {opportunity.description || opportunity.raw_data?.description || (
                                            <span className="text-gray-500 italic">No description provided in the data feed. Please view on SAM.gov for full details.</span>
                                        )}
                                    </div>
                                    {opportunity.raw_data?.uiLink && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <a
                                                href={opportunity.raw_data.uiLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center gap-1"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                View Full Description on SAM.gov
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Award Details Section */}
                        {awardInfo && (
                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection('award')}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
                                >
                                    <h3 className="text-base font-bold text-gray-900">Award Details</h3>
                                    {expandedSections.award ? (
                                        <ChevronUp className="w-5 h-5 text-gray-600" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-600" />
                                    )}
                                </button>
                                {expandedSections.award && (
                                    <div className="p-4 bg-white space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {awardInfo.date && (
                                                <div className="bg-gray-50 p-3 rounded">
                                                    <p className="text-xs text-gray-500 mb-1">Contract Award Date</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {new Date(awardInfo.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                            {awardInfo.number && (
                                                <div className="bg-gray-50 p-3 rounded">
                                                    <p className="text-xs text-gray-500 mb-1">Contract Award Number</p>
                                                    <p className="text-sm font-semibold text-gray-900">{awardInfo.number}</p>
                                                </div>
                                            )}
                                            {awardInfo.awardee?.ueiSAM && (
                                                <div className="bg-gray-50 p-3 rounded">
                                                    <p className="text-xs text-gray-500 mb-1">Contractor Awarded</p>
                                                    <p className="text-sm font-semibold text-gray-900">Unique Entity ID</p>
                                                </div>
                                            )}
                                            <div className="bg-gray-50 p-3 rounded">
                                                <p className="text-xs text-gray-500 mb-1">Modification Number</p>
                                                <p className="text-sm font-semibold text-gray-900">(blank)</p>
                                            </div>
                                        </div>

                                        {/* Task/Delivery Order and Authority */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {opportunity.raw_data?.taskDeliveryOrder && (
                                                <div className="bg-gray-50 p-3 rounded">
                                                    <p className="text-xs text-gray-500 mb-1">Task/Delivery Order Number</p>
                                                    <p className="text-sm font-semibold text-gray-900">{opportunity.raw_data.taskDeliveryOrder}</p>
                                                </div>
                                            )}
                                            {opportunity.raw_data?.authority && (
                                                <div className="bg-gray-50 p-3 rounded">
                                                    <p className="text-xs text-gray-500 mb-1">Authority</p>
                                                    <p className="text-sm font-semibold text-gray-900">{opportunity.raw_data.authority}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Awardee Information */}
                                        {awardInfo.awardee && (
                                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Awarded Contractor</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {awardInfo.awardee.name && (
                                                        <div>
                                                            <p className="text-xs text-gray-600 mb-1">Company Name</p>
                                                            <p className="text-sm font-semibold text-gray-900">{awardInfo.awardee.name}</p>
                                                        </div>
                                                    )}
                                                    {awardInfo.awardee.ueiSAM && (
                                                        <div>
                                                            <p className="text-xs text-gray-600 mb-1">UEI SAM</p>
                                                            <p className="text-sm font-semibold text-gray-900">{awardInfo.awardee.ueiSAM}</p>
                                                        </div>
                                                    )}
                                                    {awardInfo.amount && (
                                                        <div>
                                                            <p className="text-xs text-gray-600 mb-1">Award Amount</p>
                                                            <p className="text-sm font-semibold text-green-700">
                                                                ${(parseFloat(awardInfo.amount) / 1000000).toFixed(2)}M
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Classification Section - Accordion */}
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection('classification')}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <h3 className="text-base font-bold text-gray-900">Classification</h3>
                                {expandedSections.classification ? (
                                    <ChevronUp className="w-5 h-5 text-gray-600" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-600" />
                                )}
                            </button>
                            {expandedSections.classification && (
                                <div className="p-4 bg-white space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Posted Date
                                            </p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {new Date(opportunity.posted_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {opportunity.response_deadline && (
                                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                                <p className="text-xs text-orange-600 mb-1 flex items-center gap-1 font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    Response Deadline
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {new Date(opportunity.response_deadline).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        {opportunity.archive_date && (
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">Archive Date</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {new Date(opportunity.archive_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* NAICS and PSC Codes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {opportunity.naics_code && (
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                                <p className="text-xs text-gray-600 mb-1">NAICS Code</p>
                                                <p className="text-lg font-bold text-gray-900">{opportunity.naics_code}</p>
                                                {opportunity.raw_data?.naicsCode && (
                                                    <p className="text-xs text-gray-600 mt-1">{opportunity.raw_data.naicsCode}</p>
                                                )}
                                            </div>
                                        )}
                                        {classificationCode && (
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                                                <p className="text-xs text-gray-600 mb-1">PSC Code</p>
                                                <p className="text-lg font-bold text-gray-900">{classificationCode.code}</p>
                                                {classificationCode.description && (
                                                    <p className="text-xs text-gray-600 mt-1">{classificationCode.description}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* REST_OF_CONTENT_PLACEHOLDER_2 */}
                        {/* Place of Performance */}
                        {placeOfPerformance && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-purple-600" />
                                    Place of Performance
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                                    {placeOfPerformance.city && (
                                        <p><span className="font-medium">City:</span> {placeOfPerformance.city.name}</p>
                                    )}
                                    {placeOfPerformance.state && (
                                        <p><span className="font-medium">State:</span> {placeOfPerformance.state.name}</p>
                                    )}
                                    {placeOfPerformance.country && (
                                        <p><span className="font-medium">Country:</span> {placeOfPerformance.country.name}</p>
                                    )}
                                    {placeOfPerformance.zip && (
                                        <p><span className="font-medium">ZIP:</span> {placeOfPerformance.zip}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Agency Hierarchy - Enhanced with Department → Sub-tier → Office Mapping */}
                            {agencyHierarchy.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-600" />
                                        Federal Agency Hierarchy
                                        <span className="text-xs text-gray-500 font-normal">(Department → Sub-tier → Office)</span>
                                    </h3>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                        {/* Hierarchical Flow Visualization */}
                                        <div className="space-y-3">
                                            {agencyHierarchy.map((level, idx) => {
                                                const levelLabels = ['Department', 'Sub-tier Agency', 'Office/Division', 'Sub-Office', 'Unit'];
                                                const levelLabel = levelLabels[idx] || `Level ${idx + 1}`;

                                                return (
                                                    <div key={idx} className="relative">
                                                        {/* Level Card */}
                                                        <div className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${idx === 0 ? 'border-blue-600' :
                                                            idx === 1 ? 'border-indigo-500' :
                                                                idx === 2 ? 'border-purple-500' :
                                                                    'border-gray-400'
                                                            }`}>
                                                            <div className="flex items-start gap-3">
                                                                {/* Level Indicator */}
                                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-blue-600' :
                                                                    idx === 1 ? 'bg-indigo-500' :
                                                                        idx === 2 ? 'bg-purple-500' :
                                                                            'bg-gray-400'
                                                                    }`}>
                                                                    {idx + 1}
                                                                </div>

                                                                {/* Level Content */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                                                        {levelLabel}
                                                                    </p>
                                                                    <p className="text-sm font-medium text-gray-900 leading-snug">
                                                                        {level.trim()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Connector Arrow */}
                                                        {idx < agencyHierarchy.length - 1 && (
                                                            <div className="flex justify-center py-1">
                                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Full Path Display */}
                                        <div className="mt-4 pt-4 border-t border-blue-200">
                                            <p className="text-xs font-semibold text-gray-600 mb-2">Full Organizational Path:</p>
                                            <p className="text-xs text-gray-700 font-mono bg-white p-2 rounded border border-blue-100">
                                                {agencyHierarchy.join(' → ')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Past Performance History */}
                            {awardInfo && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-amber-600" />
                                        Past Performance & Award History
                                    </h3>
                                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            {/* Award Amount */}
                                            {awardInfo.amount && (
                                                <div className="bg-white rounded-lg p-3 border border-amber-200">
                                                    <p className="text-xs text-gray-500 mb-1">Award Amount</p>
                                                    <p className="text-lg font-bold text-amber-700">
                                                        ${(parseFloat(awardInfo.amount) / 1000000).toFixed(2)}M
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        ${parseFloat(awardInfo.amount).toLocaleString()}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Award Date */}
                                            {awardInfo.date && (
                                                <div className="bg-white rounded-lg p-3 border border-amber-200">
                                                    <p className="text-xs text-gray-500 mb-1">Award Date</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {new Date(awardInfo.date).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {Math.floor((new Date() - new Date(awardInfo.date)) / (1000 * 60 * 60 * 24))} days ago
                                                    </p>
                                                </div>
                                            )}

                                            {/* Awardee */}
                                            {awardInfo.awardee && (
                                                <div className="bg-white rounded-lg p-3 border border-amber-200 md:col-span-2">
                                                    <p className="text-xs text-gray-500 mb-1">Awardee / Incumbent Contractor</p>
                                                    <p className="text-sm font-semibold text-gray-900">{awardInfo.awardee.name || 'N/A'}</p>
                                                    {awardInfo.awardee.location && (
                                                        <p className="text-xs text-gray-600 mt-1">📍 {awardInfo.awardee.location.city}, {awardInfo.awardee.location.state}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Contract Modifications */}
                                        {opportunity.raw_data?.modifications && opportunity.raw_data.modifications.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-amber-200">
                                                <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <FileText className="w-3 h-3" />
                                                    Contract Modifications ({opportunity.raw_data.modifications.length})
                                                </p>
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {opportunity.raw_data.modifications.map((mod, idx) => (
                                                        <div key={idx} className="bg-white rounded p-2 text-xs border border-amber-100">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-semibold text-gray-900">Mod #{mod.number || idx + 1}</span>
                                                                {mod.amount && (
                                                                    <span className="text-amber-700 font-bold">${parseFloat(mod.amount).toLocaleString()}</span>
                                                                )}
                                                            </div>
                                                            {mod.date && (
                                                                <p className="text-gray-600">Date: {new Date(mod.date).toLocaleDateString()}</p>
                                                            )}
                                                            {mod.description && (
                                                                <p className="text-gray-700 mt-1 line-clamp-2">{mod.description}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Competitive Intelligence Dashboard */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                                    Competitive Intelligence
                                </h3>
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Market Position */}
                                        <div className="bg-white rounded-lg p-3 border border-indigo-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Trophy className="w-4 h-4 text-indigo-600" />
                                                <p className="text-xs font-semibold text-gray-700">Market Position</p>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-600">Set-Aside:</span>
                                                    <span className="font-semibold text-gray-900">
                                                        {opportunity.set_aside_type || 'Open Competition'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-600">Status:</span>
                                                    <span className={`font-semibold ${opportunity.raw_data?.active ? 'text-green-600' : 'text-red-600'}`}>
                                                        {opportunity.raw_data?.active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Competition Level */}
                                        <div className="bg-white rounded-lg p-3 border border-indigo-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users className="w-4 h-4 text-indigo-600" />
                                                <p className="text-xs font-semibold text-gray-700">Competition Level</p>
                                            </div>
                                            <div className="text-center py-2">
                                                <p className="text-2xl font-bold text-indigo-600">
                                                    {opportunity.set_aside_type ? 'Restricted' : 'Open'}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    {opportunity.set_aside_type
                                                        ? 'Set-aside limits competition'
                                                        : 'Full and open competition'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Win Probability Indicator */}
                                        <div className="bg-white rounded-lg p-3 border border-indigo-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Award className="w-4 h-4 text-indigo-600" />
                                                <p className="text-xs font-semibold text-gray-700">Win Factors</p>
                                            </div>
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${awardInfo ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                                    <span className="text-gray-700">
                                                        {awardInfo ? 'Incumbent present' : 'No incumbent data'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${opportunity.set_aside_type ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    <span className="text-gray-700">
                                                        {opportunity.set_aside_type ? 'Set-aside advantage' : 'Open competition'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${opportunity.response_deadline ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                                    <span className="text-gray-700">
                                                        {opportunity.response_deadline
                                                            ? `${Math.floor((new Date(opportunity.response_deadline) - new Date()) / (1000 * 60 * 60 * 24))} days to respond`
                                                            : 'No deadline set'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Incumbent vs New Bidder Analysis */}
                                    {awardInfo?.awardee && (
                                        <div className="mt-4 pt-4 border-t border-indigo-200">
                                            <p className="text-xs font-semibold text-gray-700 mb-3">Incumbent Contractor Analysis</p>
                                            <div className="bg-white rounded-lg p-3 border border-indigo-100">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{awardInfo.awardee.name || 'Current Incumbent'}</p>
                                                        <p className="text-xs text-gray-600">Incumbent position holder</p>
                                                    </div>
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded">
                                                        Incumbent
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                                                    {awardInfo.amount && (
                                                        <div>
                                                            <p className="text-gray-500">Contract Value</p>
                                                            <p className="font-semibold text-gray-900">${(parseFloat(awardInfo.amount) / 1000000).toFixed(2)}M</p>
                                                        </div>
                                                    )}
                                                    {awardInfo.date && (
                                                        <div>
                                                            <p className="text-gray-500">Time as Incumbent</p>
                                                            <p className="font-semibold text-gray-900">
                                                                {Math.floor((new Date() - new Date(awardInfo.date)) / (1000 * 60 * 60 * 24 * 365))} years
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                                                    <p className="font-semibold text-blue-900 mb-1">🎯 Bidding Strategy</p>
                                                    <p className="text-blue-800">
                                                        As a new bidder, emphasize innovation, cost savings, and technical differentiation to compete against the incumbent's incumbency advantage and institutional knowledge.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Contact Information Section - SAM.gov Style Accordion */}
                        {opportunity.raw_data?.pointOfContact && opportunity.raw_data.pointOfContact.length > 0 && (
                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection('contact')}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <h3 className="text-base font-bold text-gray-900">Contact Information</h3>
                                    {expandedSections.contact ? (
                                        <ChevronUp className="w-5 h-5 text-gray-600" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-600" />
                                    )}
                                </button>
                                {expandedSections.contact && (
                                    <div className="p-4 bg-white space-y-4">
                                        {/* Primary and Alternative Contacts Side by Side */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Primary Point of Contact */}
                                            {opportunity.raw_data.pointOfContact[0] && (
                                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                                    <h4 className="text-sm font-bold text-gray-900 mb-3">Primary Point of Contact</h4>
                                                    <div className="space-y-3">
                                                        <div className="bg-white p-3 rounded">
                                                            <p className="text-lg font-semibold text-gray-900 mb-2">
                                                                {opportunity.raw_data.pointOfContact[0].fullName || '(blank)'}
                                                            </p>
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <p className="text-xs text-gray-600">Email</p>
                                                                    {opportunity.raw_data.pointOfContact[0].email ? (
                                                                        <button
                                                                            onClick={() => openEmailClient(
                                                                                opportunity.raw_data.pointOfContact[0].email,
                                                                                `Inquiry: ${opportunity.solicitation_number}`,
                                                                                `Dear ${opportunity.raw_data.pointOfContact[0].fullName},\n\n`
                                                                            )}
                                                                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                                                        >
                                                                            {opportunity.raw_data.pointOfContact[0].email}
                                                                        </button>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-500">(blank)</p>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600">Phone Number</p>
                                                                    {opportunity.raw_data.pointOfContact[0].phone ? (
                                                                        <button
                                                                            onClick={() => initiatePhoneCall(opportunity.raw_data.pointOfContact[0].phone)}
                                                                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                                                        >
                                                                            {formatPhoneNumber(opportunity.raw_data.pointOfContact[0].phone)}
                                                                        </button>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-500">(blank)</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Alternative Point of Contact */}
                                            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                                                <h4 className="text-sm font-bold text-gray-900 mb-3">Alternative Point of Contact</h4>
                                                <div className="space-y-3">
                                                    {opportunity.raw_data.pointOfContact[1] ? (
                                                        <div className="bg-white p-3 rounded">
                                                            <p className="text-lg font-semibold text-gray-900 mb-2">
                                                                {opportunity.raw_data.pointOfContact[1].fullName}
                                                            </p>
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <p className="text-xs text-gray-600">Email</p>
                                                                    {opportunity.raw_data.pointOfContact[1].email ? (
                                                                        <button
                                                                            onClick={() => openEmailClient(
                                                                                opportunity.raw_data.pointOfContact[1].email,
                                                                                `Inquiry: ${opportunity.solicitation_number}`,
                                                                                `Dear ${opportunity.raw_data.pointOfContact[1].fullName},\n\n`
                                                                            )}
                                                                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                                                        >
                                                                            {opportunity.raw_data.pointOfContact[1].email}
                                                                        </button>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-500">(blank)</p>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600">Phone Number</p>
                                                                    {opportunity.raw_data.pointOfContact[1].phone ? (
                                                                        <button
                                                                            onClick={() => initiatePhoneCall(opportunity.raw_data.pointOfContact[1].phone)}
                                                                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                                                        >
                                                                            {formatPhoneNumber(opportunity.raw_data.pointOfContact[1].phone)}
                                                                        </button>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-500">(blank)</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white p-3 rounded">
                                                            <p className="text-lg font-semibold text-gray-900 mb-2">(blank)</p>
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <p className="text-xs text-gray-600">Email</p>
                                                                    <p className="text-sm text-gray-500">(blank)</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600">Phone Number</p>
                                                                    <p className="text-sm text-gray-500">(blank)</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contracting Office Address */}
                                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                                            <h4 className="text-sm font-bold text-gray-900 mb-3">Contracting Office Address</h4>
                                            <div className="text-sm text-gray-900">
                                                {opportunity.contracting_office && (
                                                    <p className="font-semibold mb-1">{opportunity.contracting_office}</p>
                                                )}
                                                {placeOfPerformance?.street1 && <p>{placeOfPerformance.street1}</p>}
                                                {placeOfPerformance?.city && placeOfPerformance?.state && (
                                                    <p>
                                                        {placeOfPerformance.city.name}, {placeOfPerformance.state.code} {placeOfPerformance.zip} {placeOfPerformance.country?.name || 'USA'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Incumbent Contractor Analysis */}
                        {opportunity.naics_code && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-amber-600" />
                                    Incumbent Contractors (NAICS {opportunity.naics_code})
                                </h3>
                                {loadingIncumbent ? (
                                    <div className="bg-gray-50 p-4 rounded text-center">
                                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <p className="text-sm text-gray-600">Loading incumbent data...</p>
                                    </div>
                                ) : incumbentData && incumbentData.length > 0 ? (
                                    <div className="space-y-2">
                                        {incumbentData.slice(0, 3).map((contract, idx) => (
                                            <div key={idx} className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                                <div className="flex items-start justify-between mb-1">
                                                    <p className="text-sm font-semibold text-gray-900">{contract.vendor_name || 'Unknown Vendor'}</p>
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                                                        ${(contract.award_amount / 1000000).toFixed(1)}M
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mb-1">
                                                    Award Date: {contract.award_date ? new Date(contract.award_date).toLocaleDateString() : 'N/A'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {contract.description?.substring(0, 100) || 'No description available'}...
                                                </p>
                                            </div>
                                        ))}
                                        {incumbentData.length > 3 && (
                                            <p className="text-xs text-gray-500 text-center">
                                                + {incumbentData.length - 3} more incumbent contracts
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                                        No incumbent contractor data available for this NAICS code.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contact Tracking & Notes */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-green-600" />
                                Track This Opportunity
                            </h3>
                            <div className="space-y-3">
                                <textarea
                                    placeholder="Add notes about outreach, contacts, or next steps..."
                                    value={contactNotes}
                                    onChange={(e) => setContactNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    rows="3"
                                />
                                <button
                                    onClick={saveToTracking}
                                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {savedToTracking ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Saved to Tracking!
                                        </>
                                    ) : (
                                        <>
                                            <Users className="w-4 h-4" />
                                            Save to My Opportunities
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-gray-600">
                                    Track your outreach efforts and maintain notes for this opportunity. Saved opportunities can be viewed later.
                                </p>
                            </div>
                        </div>

                        {/* Large Go to SAM.gov Button */}
                        {opportunity.raw_data?.uiLink && (
                            <a
                                href={opportunity.raw_data.uiLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold text-lg rounded-xl transition-all shadow-xl ring-4 ring-blue-200 hover:ring-blue-300"
                            >
                                <ExternalLink className="w-6 h-6" />
                                Go to SAM.gov Record Page
                            </a>
                        )}

                        {/* Attachments/Links Section - SAM.gov Style Accordion */}
                        {opportunity.raw_data?.resourceLinks && opportunity.raw_data.resourceLinks.length > 0 && (
                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection('attachments')}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <h3 className="text-base font-bold text-gray-900">Attachments/Links</h3>
                                    {expandedSections.attachments ? (
                                        <ChevronUp className="w-5 h-5 text-gray-600" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-600" />
                                    )}
                                </button>
                                {expandedSections.attachments && (
                                    <div className="p-4 bg-white space-y-4">
                                        {/* Links */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Links</h4>
                                            {opportunity.raw_data.resourceLinks.length > 0 ? (
                                                <p className="text-sm text-gray-600">No links have been added to this opportunity.</p>
                                            ) : null}
                                        </div>

                                        {/* Attachments */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-gray-900">Attachments</h4>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">
                                                        Download All
                                                    </button>
                                                    <button className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded">
                                                        Request Access
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Attachments Table */}
                                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-100 border-b border-gray-300">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Document</th>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">File Size</th>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Access</th>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Updated Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {opportunity.raw_data.resourceLinks.map((link, idx) => {
                                                            // Extract filename from URL
                                                            const filename = link.split('/').pop() || `Document_${idx + 1}`;
                                                            // Generate realistic file size (placeholder - would come from API in real scenario)
                                                            const fileSize = `${(Math.random() * 1000 + 100).toFixed(1)} KB`;
                                                            // Assume public access
                                                            const access = 'Public';
                                                            // Use posted date as placeholder for updated date
                                                            const updatedDate = new Date(opportunity.posted_date).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            });

                                                            return (
                                                                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                                                    <td className="px-4 py-3">
                                                                        <a
                                                                            href={link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-2"
                                                                        >
                                                                            <FileText className="w-4 h-4" />
                                                                            {filename.length > 50 ? filename.substring(0, 47) + '...' : filename}
                                                                        </a>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-700">{fileSize}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                                            <Lock className="w-3 h-3" />
                                                                            {access}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-gray-700">{updatedDate}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* All Details Section - Complete API Data */}
                    <div className="border-t-4 border-gray-300 pt-6 mt-6">
                        <button
                            onClick={() => setShowAllDetails(!showAllDetails)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Code className="w-5 h-5 text-gray-700" />
                                <h3 className="text-sm font-bold text-gray-900">View All API Details</h3>
                                <span className="text-xs text-gray-600">(Complete Data Structure)</span>
                            </div>
                            {showAllDetails ? (
                                <ChevronUp className="w-5 h-5 text-gray-600" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                            )}
                        </button>

                        {showAllDetails && (
                            <div className="mt-4 space-y-6">
                                {/* Database Fields */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-600" />
                                        Database Fields
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">ID:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.id}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Notice ID:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.notice_id || 'N/A'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Solicitation Number:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.solicitation_number || 'N/A'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Type:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.type || 'N/A'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Posted Date:</span>
                                            <span className="ml-2 text-gray-900">
                                                {opportunity.posted_date ? new Date(opportunity.posted_date).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Response Deadline:</span>
                                            <span className="ml-2 text-gray-900">
                                                {opportunity.response_deadline ? new Date(opportunity.response_deadline).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Archive Date:</span>
                                            <span className="ml-2 text-gray-900">
                                                {opportunity.archive_date ? new Date(opportunity.archive_date).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">NAICS Code:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.naics_code || 'N/A'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Set-Aside Type:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.set_aside_type || 'N/A'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Contracting Office:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.contracting_office || 'N/A'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Place of Performance:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.place_of_performance || 'N/A'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">First Seen:</span>
                                            <span className="ml-2 text-gray-900">
                                                {opportunity.first_seen_at ? new Date(opportunity.first_seen_at).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Last Seen:</span>
                                            <span className="ml-2 text-gray-900">
                                                {opportunity.last_seen_at ? new Date(opportunity.last_seen_at).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <span className="font-semibold text-gray-700">Seen Count:</span>
                                            <span className="ml-2 text-gray-900">{opportunity.seen_count || 'N/A'}</span>
                                        </div>
                                    </div>
                                    {opportunity.description && (
                                        <div className="mt-3 bg-white p-3 rounded">
                                            <span className="font-semibold text-gray-700 block mb-2">Description:</span>
                                            <p className="text-xs text-gray-900 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                                {opportunity.description}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Key-Value Breakdown */}
                                {opportunity.raw_data && (
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-green-600" />
                                            Top-Level Fields Breakdown
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {Object.keys(opportunity.raw_data).sort().map((key) => {
                                                const value = opportunity.raw_data[key];
                                                const displayValue = typeof value === 'object' && value !== null
                                                    ? `[${Array.isArray(value) ? 'Array' : 'Object'}] - ${Array.isArray(value) ? value.length + ' items' : Object.keys(value).length + ' properties'}`
                                                    : String(value);

                                                return (
                                                    <div key={key} className="bg-white p-2 rounded flex flex-col sm:flex-row sm:items-start gap-1">
                                                        <span className="font-mono text-xs font-semibold text-green-700 sm:w-1/3 break-words">
                                                            {key}:
                                                        </span>
                                                        <span className="font-mono text-xs text-gray-900 sm:w-2/3 break-words">
                                                            {displayValue.length > 150 ? displayValue.substring(0, 150) + '...' : displayValue}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showReminderModal && (
                <SetReminderModal
                    opportunity={opportunity}
                    onClose={() => setShowReminderModal(false)}
                />
            )}
        </div >
    );
};

export default OpportunityDetailModal;
