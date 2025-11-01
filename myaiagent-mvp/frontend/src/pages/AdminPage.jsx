import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { admin, secrets } from '../services/api';
import { Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Activity,
  AlertCircle,
  DollarSign,
  Settings,
  Key,
  ArrowLeft,
  Check,
  X,
  TestTube,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSecretValues, setShowSecretValues] = useState({});
  const [editingSecret, setEditingSecret] = useState(null);
  const [secretValue, setSecretValue] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customKeys, setCustomKeys] = useState([
    { keyName: '', keyLabel: '', keyValue: '', docsUrl: '' }
  ]);

  // Get stats
  const { data: statsData } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await admin.stats();
      return response.data;
    },
    refetchInterval: 30000,
  });

  // Get secrets
  const { data: secretsData, refetch: refetchSecrets } = useQuery({
    queryKey: ['secrets'],
    queryFn: async () => {
      const response = await secrets.list();
      return response.data.secrets;
    },
  });

  // Get secret definitions
  const { data: definitionsData } = useQuery({
    queryKey: ['secretDefinitions'],
    queryFn: async () => {
      const response = await secrets.definitions();
      return response.data.secrets;
    },
  });

  const handleSaveSecret = async (serviceName, keyName) => {
    try {
      await secrets.save({
        serviceName,
        keyName,
        keyValue: secretValue,
        keyLabel: newKeyLabel || `${serviceName} Key`,
        isDefault: isAddingNew, // New keys default to being the default
      });
      toast.success('API key saved successfully');
      setEditingSecret(null);
      setSecretValue('');
      setNewKeyLabel('');
      setIsAddingNew(false);
      setSelectedService(null);
      refetchSecrets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save API key');
    }
  };

  const handleTestSecret = async (secretId) => {
    try {
      const response = await secrets.test(secretId);
      if (response.data.success) {
        toast.success(`✓ ${response.data.message}`);
      } else {
        toast.error(`✗ Test failed: ${response.data.message}${response.data.hint ? ` (${response.data.hint})` : ''}`);
      }
    } catch (error) {
      toast.error('Failed to test API key');
    }
  };

  const handleSetDefault = async (secretId) => {
    try {
      await secrets.setDefault(secretId);
      toast.success('Default key updated');
      refetchSecrets();
    } catch (error) {
      toast.error('Failed to set default key');
    }
  };

  const handleDeleteSecret = async (secretId) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    try {
      await secrets.delete(secretId);
      toast.success('API key deleted');
      refetchSecrets();
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const handleDeleteCategory = async (serviceName) => {
    if (!confirm(`Are you sure you want to delete the entire "${serviceName}" category and all its keys?`)) return;
    try {
      const response = await secrets.deleteCategory(serviceName);
      toast.success(`${serviceName} category deleted (${response.data.deletedCount} keys removed)`);
      refetchSecrets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const addCustomKey = () => {
    setCustomKeys([...customKeys, { keyName: '', keyLabel: '', keyValue: '', docsUrl: '' }]);
  };

  const removeCustomKey = (index) => {
    if (customKeys.length === 1) {
      toast.error('You must have at least one key');
      return;
    }
    setCustomKeys(customKeys.filter((_, i) => i !== index));
  };

  const updateCustomKey = (index, field, value) => {
    const updated = [...customKeys];
    updated[index][field] = value;
    setCustomKeys(updated);
  };

  const handleSaveCustomCategory = async () => {
    if (!customCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    // Validate all keys
    for (let i = 0; i < customKeys.length; i++) {
      const key = customKeys[i];
      if (!key.keyName || !key.keyLabel || !key.keyValue || !key.docsUrl) {
        toast.error(`Please fill in all required fields for key ${i + 1}`);
        return;
      }
    }

    try {
      // Save all keys sequentially
      for (let i = 0; i < customKeys.length; i++) {
        const key = customKeys[i];
        await secrets.save({
          serviceName: customCategoryName,
          keyName: key.keyName,
          keyValue: key.keyValue,
          keyLabel: key.keyLabel,
          description: customDescription,
          docsUrl: key.docsUrl,
          isDefault: i === 0, // First key is default
        });
      }
      
      toast.success(`Custom category created with ${customKeys.length} key${customKeys.length > 1 ? 's' : ''}`);
      setIsAddingCustomCategory(false);
      setCustomCategoryName('');
      setCustomDescription('');
      setCustomKeys([{ keyName: '', keyLabel: '', keyValue: '', docsUrl: '' }]);
      refetchSecrets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create custom category');
    }
  };

  const stats = statsData || {
    users: { total: 0, active: 0 },
    messages: { total: 0, today: 0 },
    voice: { minutesToday: 0 },
    tokens: { total: 0, today: 0, estimatedCost: '0.00' },
    system: { recentErrors: 0, avgResponseTime: 0 },
  };

  const secretsList = secretsData || [];
  const definitions = definitionsData || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your AI Agent system
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('secrets')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'secrets'
                  ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              API Keys
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                label="Total Users"
                value={stats.users.total}
                subValue={`${stats.users.active} active`}
                color="blue"
              />
              <StatCard
                icon={MessageSquare}
                label="Messages Today"
                value={stats.messages.today}
                subValue={`${stats.messages.total} total`}
                color="green"
              />
              <StatCard
                icon={DollarSign}
                label="API Cost"
                value={`$${stats.tokens.estimatedCost}`}
                subValue={`${stats.tokens.today} tokens today`}
                color="purple"
              />
              <StatCard
                icon={Activity}
                label="Response Time"
                value={`${stats.system.avgResponseTime}ms`}
                subValue={`${stats.system.recentErrors} errors`}
                color="orange"
              />
            </div>

            {/* Voice Usage */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Voice Usage Today
              </h3>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.voice.minutesToday.toFixed(1)} minutes
              </div>
            </div>
          </div>
        )}

        {activeTab === 'secrets' && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    API Keys Management
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Configure multiple API keys for each service. Use project keys (sk-proj-) for chat and admin keys (sk-admin-) for administrative operations.
                  </p>
                </div>
              </div>
            </div>

            {/* Services with Keys */}
            <div className="grid gap-4">
              {definitions.map((def) => {
                const serviceKeys = secretsList.filter((s) => s.service_name === def.service_name);
                const isAddingToService = isAddingNew && selectedService === def.service_name;

                return (
                  <div
                    key={def.keyName}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {def.serviceName}
                          </h3>
                          {serviceKeys.length > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                              {serviceKeys.length} {serviceKeys.length === 1 ? 'key' : 'keys'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {def.description}
                        </p>
                        <a
                          href={def.docs_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                        >
                          Get API key →
                        </a>
                      </div>
                      {serviceKeys.length > 0 && (
                        <button
                          onClick={() => handleDeleteCategory(def.service_name)}
                          className="px-3 py-1.5 text-xs border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"
                          title="Delete entire category"
                        >
                          <X className="w-3 h-3" />
                          Delete Category
                        </button>
                      )}
                    </div>

                    {/* Existing Keys */}
                    {serviceKeys.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {serviceKeys.map((secret) => (
                          <div
                            key={secret.id}
                            className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {secret.key_label || 'Unnamed Key'}
                                </span>
                                {secret.is_default && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                    Default
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  secret.key_type === 'project' 
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                    : secret.key_type === 'admin'
                                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                                }`}>
                                  {secret.key_type}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                ••••••••••••
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {!secret.is_default && (
                                <button
                                  onClick={() => handleSetDefault(secret.id)}
                                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                                  title="Set as default"
                                >
                                  Set Default
                                </button>
                              )}
                              <button
                                onClick={() => handleTestSecret(secret.id)}
                                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-1"
                                title="Test key"
                              >
                                <TestTube className="w-3 h-3" />
                                Test
                              </button>
                              <button
                                onClick={() => handleDeleteSecret(secret.id)}
                                className="px-3 py-1.5 text-xs border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete key"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Key Form */}
                    {isAddingToService ? (
                      <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <input
                          type="text"
                          value={newKeyLabel}
                          onChange={(e) => setNewKeyLabel(e.target.value)}
                          placeholder="Key label (e.g., Production, Development, Admin)"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                        <input
                          type="text"
                          value={secretValue}
                          onChange={(e) => setSecretValue(e.target.value)}
                          placeholder={def.placeholder}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveSecret(def.service_name, def.keyName)}
                            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save Key
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingNew(false);
                              setSelectedService(null);
                              setSecretValue('');
                              setNewKeyLabel('');
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsAddingNew(true);
                          setSelectedService(def.service_name);
                        }}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white text-sm"
                      >
                        + Add {def.serviceName} API Key
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Custom Category Creation */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
                {isAddingCustomCategory ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Create Custom API Category
                    </h3>
                    
                    {/* Category Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="e.g., Stripe, Twilio, SendGrid"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Brief description of this API service"
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    {/* API Keys */}
                    <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          API Keys ({customKeys.length})
                        </label>
                        <button
                          onClick={addCustomKey}
                          className="px-3 py-1.5 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded hover:bg-gray-800 dark:hover:bg-gray-200"
                        >
                          + Add Another Key
                        </button>
                      </div>

                      {customKeys.map((key, index) => (
                        <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-900/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Key #{index + 1}
                            </span>
                            {customKeys.length > 1 && (
                              <button
                                onClick={() => removeCustomKey(index)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                title="Remove this key"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          <input
                            type="text"
                            value={key.keyName}
                            onChange={(e) => updateCustomKey(index, 'keyName', e.target.value)}
                            placeholder="Key Name (e.g., STRIPE_API_KEY) *"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                          />
                          
                          <input
                            type="text"
                            value={key.keyLabel}
                            onChange={(e) => updateCustomKey(index, 'keyLabel', e.target.value)}
                            placeholder="Key Label (e.g., Production Key) *"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                          
                          <input
                            type="text"
                            value={key.keyValue}
                            onChange={(e) => updateCustomKey(index, 'keyValue', e.target.value)}
                            placeholder="API Key Value *"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                          
                          <input
                            type="url"
                            value={key.docsUrl}
                            onChange={(e) => updateCustomKey(index, 'docsUrl', e.target.value)}
                            placeholder="Get API Key URL (e.g., https://dashboard.stripe.com/apikeys) *"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveCustomCategory}
                        className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Create Category with {customKeys.length} Key{customKeys.length > 1 ? 's' : ''}
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingCustomCategory(false);
                          setCustomCategoryName('');
                          setCustomDescription('');
                          setCustomKeys([{ keyName: '', keyLabel: '', keyValue: '', docsUrl: '' }]);
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingCustomCategory(true)}
                    className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
                  >
                    + Create Custom API Category
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{subValue}</div>
    </div>
  );
}
