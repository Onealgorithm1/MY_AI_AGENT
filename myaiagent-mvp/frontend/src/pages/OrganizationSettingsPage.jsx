import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Save, Building, Upload, Trash2 } from 'lucide-react';

const OrganizationSettingsPage = () => {
  const { user, currentOrganization } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    brandingSettings: {
      logoUrl: '',
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
    }
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchSettings();
    }
  }, [currentOrganization]);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const orgId = currentOrganization?.id;
      if (!orgId) {
        throw new Error('No organization context found');
      }

      const response = await api.org.getSettings(orgId);
      const data = response.data.settings;

      setSettings({
        name: data.name,
        brandingSettings: data.branding_settings || {
          logoUrl: '',
          primaryColor: '#3B82F6', // Default blue
          secondaryColor: '#10B981' // Default green
        }
      });
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('branding.')) {
      const field = name.split('.')[1];
      setSettings(prev => ({
        ...prev,
        brandingSettings: {
          ...prev.brandingSettings,
          [field]: value
        }
      }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const orgId = currentOrganization?.id;
      await api.org.updateSettings(orgId, {
        name: settings.name,
        brandingSettings: settings.brandingSettings
      });
      setSuccess('Settings updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !currentOrganization) return <div className="p-8 text-center text-gray-500">Select an organization to view settings.</div>;
  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building className="w-8 h-8" />
          Organization Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your organization's profile and branding.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            General Information
          </h2>

          <div className="grid gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={settings.name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Acme Corp"
                required
              />
            </div>
          </div>
        </div>

        {/* Branding Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Branding
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Colors
              </label>
              <div className="space-y-4">
                <div>
                  <label htmlFor="branding.primaryColor" className="text-xs text-gray-500 mb-1 block">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="branding.primaryColor"
                      name="branding.primaryColor"
                      value={settings.brandingSettings.primaryColor}
                      onChange={handleChange}
                      className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {settings.brandingSettings.primaryColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="branding.secondaryColor" className="text-xs text-gray-500 mb-1 block">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="branding.secondaryColor"
                      name="branding.secondaryColor"
                      value={settings.brandingSettings.secondaryColor}
                      onChange={handleChange}
                      className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {settings.brandingSettings.secondaryColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                name="branding.logoUrl"
                value={settings.brandingSettings.logoUrl}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                placeholder="https://example.com/logo.png"
              />
              {settings.brandingSettings.logoUrl && (
                <div className="p-4 border border-dashed border-gray-300 rounded-lg flex justify-center bg-gray-50 dark:bg-gray-900">
                  <img
                    src={settings.brandingSettings.logoUrl}
                    alt="Logo Preview"
                    className="max-h-24 object-contain"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationSettingsPage;
