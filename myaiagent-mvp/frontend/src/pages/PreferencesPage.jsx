import { useNavigate } from 'react-router-dom';
import { Settings, ArrowLeft } from 'lucide-react';
import PreferencesPanel from '../components/PreferencesPanel';

export default function PreferencesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-gray-900 dark:text-white" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Preferences</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Customize how the AI communicates with you
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <PreferencesPanel />
        </div>
      </div>
    </div>
  );
}
