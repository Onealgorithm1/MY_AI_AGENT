import { detectUrls } from '../utils/linkify';

export default function LinkifiedText({ text, className = '' }) {
  const parts = detectUrls(text);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'url') {
          return (
            <a
              key={index}
              href={part.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {part.content}
            </a>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}
