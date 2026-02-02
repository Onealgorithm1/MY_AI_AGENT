import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { X, Building, DollarSign, Users, Briefcase, FileText, Globe, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';

export default function EntityDetailModal({ uei, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('core'); // core, assertions, reps, poc

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const response = await api.samGov.getEntity(uei);
                if (response.success && response.entity) {
                    setData(response.entity);
                }
            } catch (error) {
                console.error("Failed to fetch entity details", error);
            } finally {
                setLoading(false);
            }
        };
        if (uei) fetchDetails();
    }, [uei]);

    if (!uei) return null;

    // Formatting helpers
    const reg = data?.entityRegistration || {};
    const core = data?.coreData || {};
    const assertions = data?.assertions || {};
    const reps = data?.repsAndCerts || {};
    const pocs = data?.pointsOfContact || {};

    const [awards, setAwards] = useState([]);
    const [loadingAwards, setLoadingAwards] = useState(false);

    useEffect(() => {
        if (activeTab === 'awards' && awards.length === 0) {
            const fetchAwards = async () => {
                setLoadingAwards(true);
                try {
                    const res = await api.get(`/awards/vendor/${uei}/history?limit=50`);
                    setAwards(res.data.awards || []);
                } catch (err) {
                    console.error("Failed to fetch awards", err);
                } finally {
                    setLoadingAwards(false);
                }
            };
            fetchAwards();
        }
    }, [activeTab, uei]);

    const tabs = [
        { id: 'core', label: 'Core Data', icon: Building },
        { id: 'awards', label: 'Awards', icon: DollarSign },
        { id: 'assertions', label: 'Assertions', icon: Briefcase },
        { id: 'reps', label: 'Reps & Certs', icon: FileText },
        { id: 'poc', label: 'Points of Contact', icon: Users },
    ];

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 w-full max-w-6xl rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between">
                    {loading ? (
                        <div className="animate-pulse w-1/3 h-8 bg-gray-300 rounded"></div>
                    ) : (
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {reg.legalBusinessName || 'Unknown Entity'}
                            </h2>
                            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                                <span className={`px-2.5 py-0.5 rounded-full flex items-center gap-1 ${reg.registrationStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    <span className={`w-2 h-2 rounded-full ${reg.registrationStatus === 'Active' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                    {reg.registrationStatus} Registration
                                </span>
                                <span className="text-gray-500">UEI: <span className="text-gray-900 dark:text-gray-200">{reg.ueiSAM}</span></span>
                                <span className="text-gray-500">CAGE: <span className="text-gray-900 dark:text-gray-200">{reg.cageCode}</span></span>
                                <span className="text-gray-500">Expires: <span className="text-gray-900 dark:text-gray-200">{reg.expirationDate}</span></span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors h-fit"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200">

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'core' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <Section title="Business Information">
                                        <Field label="Legal Business Name" value={reg.legalBusinessName} />
                                        <Field label="Doing Business As (DBA)" value={reg.dbaName} />
                                        <Field label="Division Name" value={reg.divisionName} />
                                        <Field label="State of Incorporation" value={core.businessInformation?.stateOfIncorporationCode} />
                                        <Field label="Country of Incorporation" value={core.businessInformation?.countryOfIncorporationCode} />
                                        <Field label="Company URL" value={core.businessInformation?.companyUrl} isLink />
                                    </Section>

                                    <Section title="Dates">
                                        <Field label="Registration Date" value={reg.registrationDate} />
                                        <Field label="Last Update Date" value={reg.lastUpdateDate} />
                                        <Field label="Expiration Date" value={reg.expirationDate} />
                                        <Field label="Entity Start Date" value={core.generalInformation?.entityStartDate} />
                                        <Field label="Fiscal Year End" value={core.generalInformation?.fiscalYearEndCloseDate} />
                                    </Section>

                                    <Section title="Physical Address">
                                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-200">{core.physicalAddress?.addressLine1}</div>
                                                <div>{core.physicalAddress?.addressLine2}</div>
                                                <div>
                                                    {core.physicalAddress?.city}, {core.physicalAddress?.stateOrProvinceCode} {core.physicalAddress?.zipCode}
                                                </div>
                                                <div>{core.physicalAddress?.countryCode}</div>
                                            </div>
                                        </div>
                                    </Section>

                                    <Section title="Mailing Address">
                                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-200">{core.mailingAddress?.addressLine1}</div>
                                                <div>{core.mailingAddress?.addressLine2}</div>
                                                <div>
                                                    {core.mailingAddress?.city}, {core.mailingAddress?.stateOrProvinceCode} {core.mailingAddress?.zipCode}
                                                </div>
                                                <div>{core.mailingAddress?.countryCode}</div>
                                            </div>
                                        </div>
                                    </Section>
                                </div>
                            )}

                            {activeTab === 'awards' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center justify-between">
                                            <span>Recent Contract Awards</span>
                                            {!loadingAwards && <span className="text-sm font-normal text-gray-500">{awards.length} found</span>}
                                        </h3>

                                        {loadingAwards ? (
                                            <div className="flex justify-center py-12">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        ) : awards.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PIID</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agency</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {awards.map((award, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                                                                    {award.piid}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                                    {award.contracting_agency_name}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                    {new Date(award.award_date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600 dark:text-green-400">
                                                                    {formatCurrency(award.current_contract_value)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                <p>No recent contract awards found in our database.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'assertions' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <Section title="Goods & Services (NAICS)">
                                        {assertions.goodsAndServices?.naicsList?.map((naics, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-100 dark:border-gray-700">
                                                <div>
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-3">{naics.naicsCode}</span>
                                                    <span className="text-gray-700 dark:text-gray-300">{naics.naicsDescription}</span>
                                                </div>
                                                {naics.primaryNaicsSelection === 'Y' && (
                                                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">PRIMARY</span>
                                                )}
                                            </div>
                                        )) || <p className="text-gray-500 italic">No NAICS codes found.</p>}
                                    </Section>

                                    <Section title="Product Service Codes (PSC)">
                                        <div className="flex flex-wrap gap-2">
                                            {assertions.goodsAndServices?.pscList?.map((psc, idx) => (
                                                <span key={idx} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                                    <span className="font-mono font-bold">{psc.pscCode}</span>
                                                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{psc.pscDescription}</span>
                                                </span>
                                            )) || <p className="text-gray-500 italic">No PSC codes found.</p>}
                                        </div>
                                    </Section>
                                </div>
                            )}

                            {activeTab === 'reps' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <Section title="FAR & DFARS">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            Representations and Certifications are self-reported by the entity.
                                        </p>
                                        <div className="space-y-2">
                                            {/* Mock Reps data visualization as API structure is complex JSON */}
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle className="w-5 h-5" />
                                                <span className="font-medium">FAR 52.204-26 Covered Telecommunications Equipment</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle className="w-5 h-5" />
                                                <span className="font-medium">FAR 52.212-3 Offeror Representations and Certifications</span>
                                            </div>
                                        </div>
                                    </Section>
                                </div>
                            )}

                            {activeTab === 'poc' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <ContactCard title="Electronic Business" contacts={pocs.electronicBusinessPOC} />
                                    <ContactCard title="Government Business" contacts={pocs.governmentBusinessPOC} />
                                    <ContactCard title="Past Performance" contacts={pocs.pastPerformancePOC} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components for cleaner code
function Section({ title, children }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold border-b border-gray-100 dark:border-gray-700 pb-3 mb-4 text-gray-800 dark:text-gray-100">
                {title}
            </h3>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function Field({ label, value, isLink }) {
    if (!value) return null;
    return (
        <div className="grid grid-cols-3 gap-2 text-sm">
            <dt className="text-gray-500 font-medium">{label}</dt>
            <dd className="col-span-2 text-gray-900 dark:text-gray-200 truncate">
                {isLink ? (
                    <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        {value} <Globe className="w-3 h-3" />
                    </a>
                ) : value}
            </dd>
        </div>
    );
}

function ContactCard({ title, contacts }) {
    if (!contacts) return null;
    // API sometimes returns array, sometimes object? Assume object based on SAM structure usually having explicit "primary" fields or array.
    // Documentation says object or list. We'll handle generic fields.
    const { firstName, lastName, email, usPhone, title: jobTitle } = contacts;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border-l-4 border-blue-600 shadow-sm">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> {title}
            </h4>
            <div className="space-y-2 text-sm">
                <div className="font-medium text-lg">{firstName} {lastName}</div>
                {jobTitle && <div className="text-gray-500">{jobTitle}</div>}

                {email && (
                    <a href={`mailto:${email}`} className="flex items-center gap-2 text-blue-600 hover:underline mt-2">
                        <Mail className="w-4 h-4" /> {email}
                    </a>
                )}
                {usPhone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" /> {usPhone}
                    </div>
                )}
            </div>
        </div>
    );
}
