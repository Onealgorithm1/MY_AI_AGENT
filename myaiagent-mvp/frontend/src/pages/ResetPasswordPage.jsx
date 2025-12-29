import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'sonner';
import { KeyRound, ArrowLeft, Send } from 'lucide-react';

export default function ResetPasswordPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(token ? 'reset' : 'request');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (token) {
            setStep('reset');
        }
    }, [token]);

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.organizations.requestPasswordReset(email);
            setIsSuccess(true);
            toast.success('If an account exists, a reset link has been sent.');
        } catch (error) {
            console.error('Reset request error:', error);
            toast.error('Failed to process request');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        try {
            await api.organizations.resetPassword(token, password);
            toast.success('Password reset successfully');
            navigate('/login');
        } catch (error) {
            console.error('Reset password error:', error);
            toast.error(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gray-900 dark:bg-gray-100 rounded-2xl flex items-center justify-center">
                            <KeyRound className="w-8 h-8 text-white dark:text-gray-900" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {step === 'request' ? 'Reset Password' : 'Set New Password'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {step === 'request'
                            ? "Enter your email and we'll send you instructions to reset your password."
                            : "Please enter your new password below."}
                    </p>
                </div>

                {isSuccess && step === 'request' ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center">
                        <Send className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-2">Check your email</h3>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-6">
                            We've sent a password reset link to <strong>{email}</strong>
                        </p>
                        <Link
                            to="/login"
                            className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-500"
                        >
                            Back to Sign in
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={step === 'request' ? handleRequestReset : handleResetPassword} className="mt-8 space-y-6">
                        <div className="space-y-4">
                            {step === 'request' ? (
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            New Password
                                        </label>
                                        <input
                                            id="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            placeholder="••••••••"
                                            minLength={8}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Confirm New Password
                                        </label>
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            placeholder="••••••••"
                                            minLength={8}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Processing...' : (step === 'request' ? 'Send Reset Link' : 'Reset Password')}
                        </button>

                        <div className="text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Sign in
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
