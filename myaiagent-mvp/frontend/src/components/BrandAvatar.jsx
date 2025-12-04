import { useState } from 'react';

export default function BrandAvatar({ src, alt = 'Brand', size = 'w-8 h-8', className = '' }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`${size} ${className} rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 overflow-hidden`} role="img" aria-label={alt}>
      {!imgError && src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-white font-semibold">W</span>
      )}
    </div>
  );
}
