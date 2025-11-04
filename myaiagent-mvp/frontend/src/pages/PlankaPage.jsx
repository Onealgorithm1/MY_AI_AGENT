import { useEffect } from 'react';

export default function PlankaPage() {
  useEffect(() => {
    // Redirect to Planka server running on port 3002
    window.location.href = 'http://localhost:3002';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300">Opening Planka...</p>
      </div>
    </div>
  );
}
