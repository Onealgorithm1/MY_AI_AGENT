import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'sonner';
import { UserPlus, ArrowRight, XCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AcceptInvitePage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [errorMessage, setErrorMessage] = useState('');

    const handleAccept = async () => {
        setIsLoading(true);
        setStatus('processing');
        try {
            await api.organizations.acceptInvitation(token);
            setStatus('success');
            toast.success('Invitation accepted successfully!');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (error) {
            console.error('Accept invite error:', error);
            setStatus('error');
            setErrorMessage(error.response?.data?.error || 'Failed to accept invitation');
            toast.error('Failed to join organization');
        } finally {
            setIsLoading(false);
        }
    };

    // If user is already logged in, we can try to auto-accept or show a "Join" button
    // For safety, let's show a "Join" button so they know what's happening.

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-8 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${status === 'success' ? 'bg-green-100 text-green-600' :
                                status === 'error' ? 'bg-red-100 text-red-600' :
                                    'bg-blue-100 text-blue-600'
                            }`}>
                            {status === 'success' ? <CheckCircle className="w-10 h-10" /> :
                                status === 'error' ? <XCircle className="w-10 h-10" /> :
                                    <UserPlus className="w-10 h-10" />}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {status === 'success' ? 'Welcome Aboard!' :
                                status === 'error' ? 'Invitation Failed' :
                                    'Organization Invitation'}
                        </h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            {status === 'success' ? 'You have successfully joined the organization.' :
                                status === 'error' ? errorMessage :
                                    'You have been invited to join an organization on Werkules.'}
                        </p>
                    </div>

                    {status === 'idle' && (
                        <div className="space-y-4">
                            {user ? (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                                        Signed in as <strong>{user.email}</strong>
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-300">
                                        Click below to accept this invitation with your current account.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        <strong>Note:</strong> You must have an account with the invited email address. If you don't, please Sign Up first using that email.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleAccept}
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? 'Joining...' : 'Accept Invitation'}
                            </button>

                            {!user && (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <Link
                                        to="/login"
                                        className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-center"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        to="/signup"
                                        className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-center"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'success' && (
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center w-full py-3 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                        >
                            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                    )}

                    {status === 'error' && (
                        <Link
                            to="/"
                            className="inline-block text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            Return Home
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
