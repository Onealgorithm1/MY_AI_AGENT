
import { useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';

const DEFAULT_PROVIDERS = [
    {
        providerName: 'openai',
        displayName: 'OpenAI',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png',
        authType: 'api_key',
        docsUrl: 'https://platform.openai.com/api-keys'
    },
    {
        providerName: 'gemini',
        displayName: 'Google Gemini',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg',
        authType: 'api_key',
        docsUrl: 'https://makersuite.google.com/app/apikey'
    },
    {
        providerName: 'anthropic',
        displayName: 'Anthropic',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg',
        authType: 'api_key',
        docsUrl: 'https://console.anthropic.com/settings/keys'
    },
    {
        providerName: 'elevenlabs',
        displayName: 'ElevenLabs',
        logoUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kKx8_A5pXp7Jc4t4o4q4q4q4q4q4q4q4q4=s900-c-k-c0x00ffffff-no-rj',
        authType: 'api_key',
        docsUrl: 'https://elevenlabs.io/app/voice-lab'
    },
    {
        providerName: 'stripe',
        displayName: 'Stripe',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
        authType: 'api_key',
        docsUrl: 'https://dashboard.stripe.com/apikeys'
    },
    {
        providerName: 'google',
        displayName: 'Google Cloud',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
        authType: 'api_key',
        docsUrl: 'https://console.cloud.google.com/apis/credentials'
    },
    {
        providerName: 'samgov',
        displayName: 'SAM.gov',
        logoUrl: 'https://gsa.gov/sites/default/files/styles/576px_wide/public/2021-04/SAM.png',
        authType: 'api_key',
        docsUrl: 'https://sam.gov/content/api-key'
    }
];

export default function AddApiKeyModal({ onClose, onSave, providers = DEFAULT_PROVIDERS, initialProvider = null, initialLabel = '' }) {
    const [step, setStep] = useState(initialProvider ? 'config' : 'provider'); // provider, config
    const [selectedProvider, setSelectedProvider] = useState(initialProvider);
    const [formData, setFormData] = useState({
        keyLabel: initialLabel || '',
        apiKey: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const providerObj = providers.find(p => p.providerName === selectedProvider);

    const handleProviderSelect = (providerName) => {
        setSelectedProvider(providerName);
        const provider = providers.find(p => p.providerName === providerName);
        setFormData({
            keyLabel: `${provider.displayName} Key`,
            apiKey: ''
        });
        setError(null);
        setStep('config');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.apiKey.trim()) {
            setError('Please enter your API key');
            return;
        }

        try {
            setLoading(true);
            await onSave({
                provider: selectedProvider,
                apiKey: formData.apiKey, // Keeping key names consistent with backend expectation
                keyLabel: formData.keyLabel
            });
            onClose(); // Close on success
        } catch (err) {
            setError(err.message || 'Failed to save API key');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {step === 'config' && !initialProvider && (
                            <button
                                onClick={() => {
                                    setStep('provider');
                                    setSelectedProvider(null);
                                }}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                type="button"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ margin: 0 }}>
                            {step === 'provider' ? 'Select API Provider' : 'Configure API Key'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 'provider' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {providers.map(provider => (
                                <button
                                    key={provider.providerName}
                                    onClick={() => handleProviderSelect(provider.providerName)}
                                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all text-left group"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        padding: '20px',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background: 'white',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = '#2196f3';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.1)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = '#e0e0e0';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                    type="button"
                                >
                                    {provider.logoUrl ? (
                                        <img
                                            src={provider.logoUrl}
                                            alt={provider.displayName}
                                            className="w-10 h-10 mb-3"
                                            style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '12px' }}
                                        />
                                    ) : (
                                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔑</div>
                                    )}
                                    <h3 className="font-semibold text-gray-900 dark:text-white" style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                                        {provider.displayName}
                                    </h3>
                                    {provider.authType === 'api_key' && (
                                        <p className="text-xs text-gray-500" style={{ margin: 0, fontSize: '12px' }}>API Key Integration</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Configuration Form
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div style={{ padding: '12px', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '16px', border: '1px solid #ef9a9a' }}>
                                    {error}
                                </div>
                            )}

                            {/* Key Label */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                                    Key Label
                                </label>
                                <input
                                    type="text"
                                    value={formData.keyLabel}
                                    onChange={(e) => setFormData({ ...formData, keyLabel: e.target.value })}
                                    placeholder="e.g. Production Key"
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                            </div>

                            {/* API Key */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    value={formData.apiKey}
                                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                    placeholder={`Paste your ${providerObj?.displayName} API Key`}
                                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'monospace' }}
                                    autoFocus
                                />

                                {providerObj?.docsUrl && (
                                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                        <a href={providerObj.docsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2196f3', textDecoration: 'none' }}>
                                            Get your API key from {providerObj.displayName} dashboard &rarr;
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('provider');
                                    }}
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        background: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: '#2196f3',
                                        color: 'white',
                                        cursor: loading ? 'wait' : 'pointer',
                                        opacity: loading ? 0.7 : 1,
                                        fontWeight: 500
                                    }}
                                >
                                    {loading ? 'Saving...' : 'Save API Key'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
