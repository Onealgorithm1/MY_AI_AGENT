import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getCsrfToken } from '../services/api.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    this.reportErrorToBackend(error, errorInfo);
  }

  reportErrorToBackend = async (error, errorInfo) => {
    try {
      const telemetryData = {
        type: 'react_error',
        timestamp: new Date().toISOString(),
        error: {
          message: error?.message || 'Unknown error',
          stack: error?.stack?.substring(0, 1000),
          componentStack: errorInfo?.componentStack?.substring(0, 1000),
        },
        context: {
          url: window.location.pathname,
          userAgent: navigator.userAgent.substring(0, 200),
        },
      };

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const csrfToken = getCsrfToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      await fetch(`${apiUrl}/telemetry/error`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(telemetryData),
      });
    } catch (reportError) {
      console.error('Failed to report error to backend:', reportError);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Something went wrong
              </h2>
            </div>

            <p className="text-gray-600 mb-4">
              We've encountered an unexpected error. The issue has been automatically reported to our AI for analysis.
            </p>

            {this.state.error && (
              <details className="mb-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Error details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs font-mono text-red-600 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
