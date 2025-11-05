import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({ title, contentType, data }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const codeText = Array.isArray(data) ? data.join('\n') : data;
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const codeLines = Array.isArray(data) ? data : [data];

  return (
    <div className="w-full my-4">
      <div className="bg-gray-900 dark:bg-gray-950 rounded-lg overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-gray-400 dark:text-gray-500">
              {contentType || 'Code'}
            </div>
            {title && (
              <>
                <div className="text-gray-600 dark:text-gray-600">•</div>
                <div className="text-sm text-gray-300 dark:text-gray-400 font-medium">
                  {title}
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300"
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

        <div className="overflow-x-auto">
          <pre className="p-4 text-sm">
            <code className="font-mono text-gray-100 dark:text-gray-200">
              {codeLines.map((line, index) => (
                <div key={index} className="min-h-[1.5rem]">
                  {line}
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
