import { Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';

const getIconAndLabel = (state, isError) => {
  if (isError) {
    return {
      icon: AlertCircle,
      label: 'Retry audio',
      color: 'text-red-500',
    };
  }

  switch (state) {
    case 'loading':
      return {
        icon: Loader2,
        label: 'Loading audio',
        color: 'text-gray-400',
        animate: 'animate-spin',
      };
    case 'playing':
      return {
        icon: Volume2,
        label: 'Stop audio',
        color: 'text-blue-500',
      };
    case 'idle':
    default:
      return {
        icon: VolumeX,
        label: 'Play audio',
        color: 'text-gray-500',
      };
  }
};

export default function MessageSpeakerButton({ 
  state, 
  onClick, 
  isError,
  disabled = false,
  className = '',
}) {
  const { icon: Icon, label, color, animate } = getIconAndLabel(state, isError);

  return (
    <button
      onClick={onClick}
      disabled={disabled || state === 'loading'}
      className={`
        relative p-2 md:p-1.5 rounded-full transition-all
        hover:bg-gray-100 dark:hover:bg-gray-700
        active:bg-gray-200 dark:active:bg-gray-600
        focus:outline-none focus:ring-2 focus:ring-blue-400
        disabled:opacity-50 disabled:cursor-not-allowed
        touch-manipulation
        ${color}
        ${className}
      `}
      aria-label={label}
      aria-pressed={state === 'playing'}
      title={label}
      type="button"
    >
      <Icon 
        className={`w-5 h-5 md:w-5 md:h-5 ${animate || ''}`}
        aria-hidden="true"
      />
      
      {state === 'playing' && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
        </span>
      )}
      
      {isError && (
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full border border-white dark:border-gray-800"></span>
      )}
    </button>
  );
}
