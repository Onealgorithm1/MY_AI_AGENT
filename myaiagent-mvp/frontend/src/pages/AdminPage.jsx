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

  const handleSaveSecret = async (keyName) => {
    try {
      await secrets.save({
        keyName,
        keyValue: secretValue,
      });
      toast.success('API key saved successfully');
      setEditingSecret(null);
      setSecretValue('');
      refetchSecrets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save API key');
    }
  };

  const handleTestSecret = async (keyName) => {
    try {
      const response = await secrets.test(keyName);
      if (response.data.success) {
        toast.success(`✓ ${keyName} is valid`);
      } else {
        toast.error(`✗ ${keyName} test failed: ${response.data.message}`);
      }
    } catch (error) {
      toast.error('Failed to test API key');
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
                    Configure API keys for OpenAI, ElevenLabs, and other services. Keys are encrypted and stored securely.
                  </p>
                </div>
              </div>
            </div>

            {/* Available Services */}
            <div className="grid gap-4">
              {definitions.map((def) => {
                const existingSecret = secretsList.find((s) => s.key_name === def.keyName);
                const isEditing = editingSecret === def.keyName;

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
                          {existingSecret && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                              Configured
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
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={secretValue}
                          onChange={(e) => setSecretValue(e.target.value)}
                          placeholder={def.placeholder}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveSecret(def.keyName)}
                            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingSecret(null);
                              setSecretValue('');
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {existingSecret ? (
                          <>
                            <div className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm text-gray-600 dark:text-gray-400">
                              ••••••••••••
                            </div>
                            <button
                              onClick={() => handleTestSecret(def.keyName)}
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center gap-2"
                              title="Test API key"
                            >
                              <TestTube className="w-4 h-4" />
                              Test
                            </button>
                            <button
                              onClick={() => setEditingSecret(def.keyName)}
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                            >
                              Update
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingSecret(def.keyName)}
                            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm"
                          >
                            Add API Key
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
