import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TasksSection from '../components/TasksSection';

export default function ProjectManagementPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your tasks and projects. You can also ask the AI to create and manage tasks for you!
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <TasksSection />
        </div>
      </div>
    </div>
  );
}
