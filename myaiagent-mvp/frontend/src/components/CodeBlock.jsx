import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

  const codeText = Array.isArray(data) ? data.join('\n') : data;
  
  // Map content type to language for syntax highlighting
  const getLanguage = (type) => {
    if (!type) return 'text';
    const lower = type.toLowerCase();
    if (lower.includes('javascript') || lower.includes('js')) return 'javascript';
    if (lower.includes('typescript') || lower.includes('ts')) return 'typescript';
    if (lower.includes('python') || lower.includes('py')) return 'python';
    if (lower.includes('html')) return 'markup';
    if (lower.includes('css')) return 'css';
    if (lower.includes('json')) return 'json';
    if (lower.includes('sql')) return 'sql';
    if (lower.includes('bash') || lower.includes('shell')) return 'bash';
    if (lower.includes('yaml')) return 'yaml';
    if (lower.includes('markdown')) return 'markdown';
    return 'text';
  };

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
          <SyntaxHighlighter
            language={getLanguage(contentType)}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '0.875rem',
            }}
            codeTagProps={{
              style: {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }
            }}
          >
            {codeText}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
