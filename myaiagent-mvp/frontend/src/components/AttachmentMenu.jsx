import { useEffect, useRef } from 'react';
import { Paperclip, Search } from 'lucide-react';

export default function AttachmentMenu({ open, onClose, onAttachFiles, onDeepSearch }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }

    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} role="menu" className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-50">
      <button
        onClick={() => { onAttachFiles(); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
        role="menuitem"
        aria-label="Add photos and files"
      >
        <div className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-300">
          <Paperclip className="w-4 h-4" />
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-200">Add photos & files</div>
      </button>

      <button
        onClick={() => { onDeepSearch(); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-left mt-1"
        role="menuitem"
        aria-label="Deep search"
      >
        <div className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-300">
          <Search className="w-4 h-4" />
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-200">Deep Search</div>
      </button>
    </div>
  );
}
