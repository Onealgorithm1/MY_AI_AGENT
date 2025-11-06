import { useState } from 'react';
import { Copy, Check, Mail, Code2, FileText } from 'lucide-react';

export default function EmailBlock({ email }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('text');

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

  const shortenUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const tracking = ['utm_', 'track', 'ref', 'fbclid', 'gclid', 'mc_', 'lipi', 'mid', 'trk', 'eid', 'otpToken'];
      
      let hasTracking = false;
      for (const [key] of urlObj.searchParams) {
        if (tracking.some(t => key.toLowerCase().includes(t.toLowerCase()))) {
          hasTracking = true;
          break;
        }
      }
      
      if (url.length > 60 || hasTracking) {
        const path = urlObj.pathname === '/' ? '' : urlObj.pathname.substring(0, 25);
        return urlObj.hostname + path + (path ? '...' : '');
      }
      return url;
    } catch (e) {
      return url.length > 60 ? url.substring(0, 60) + '...' : url;
    }
  };

  const linkifyText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const displayText = shortenUrl(part);
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
            title={part}
          >
            {displayText}
          </a>
        );
      }
      return part;
    });
  };

  const bodyText = email.body || '(No content)';

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
            
            <div className="flex items-center gap-2">
              {email.isHtml && email.bodyHtml && (
                <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                  <button
                    onClick={() => setViewMode('text')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
                      viewMode === 'text'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    Clean
                  </button>
                  <button
                    onClick={() => setViewMode('html')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
                      viewMode === 'html'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    HTML
                  </button>
                </div>
              )}
              
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
          {viewMode === 'html' && email.bodyHtml ? (
            <div className="relative">
              <iframe
                srcDoc={email.bodyHtml}
                className="w-full min-h-[400px] border border-gray-200 dark:border-gray-700 rounded"
                sandbox="allow-same-origin"
                title="Email Content"
              />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                {linkifyText(bodyText)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
