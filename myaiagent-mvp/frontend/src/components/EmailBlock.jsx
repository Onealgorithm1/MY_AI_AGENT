import { useState } from 'react';
import { Copy, Check, Mail } from 'lucide-react';

export default function EmailBlock({ email }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const emailText = `From: ${email.from}\nTo: ${email.to}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateString;
    }
  };

  const stripHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const bodyText = email.body ? stripHtml(email.body) : '(No content)';

  return (
    <div className="w-full my-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Email Header */}
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Email</span>
            </div>
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Subject Line */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {email.subject || '(No Subject)'}
          </h3>

          {/* Email Metadata */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[50px]">From:</span>
              <span className="text-gray-900 dark:text-gray-100 break-all">{email.from || 'Unknown'}</span>
            </div>
            
            {email.to && (
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[50px]">To:</span>
                <span className="text-gray-900 dark:text-gray-100 break-all">{email.to}</span>
              </div>
            )}
            
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[50px]">Date:</span>
              <span className="text-gray-700 dark:text-gray-300">{formatDate(email.date)}</span>
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="p-4 bg-white dark:bg-gray-900">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
              {bodyText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
