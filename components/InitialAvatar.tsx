
import React, { useState, useEffect } from 'react';

interface InitialAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null; // Added for animated GIF avatars
  className?: string;
  altText?: string;
}

const InitialAvatar: React.FC<InitialAvatarProps> = ({
  name = '',
  avatarUrl,
  animatedAvatarUrl,
  className = 'w-10 h-10 rounded-full object-cover shadow-sm bg-slate-300 dark:bg-slate-600',
  altText = 'Avatar',
}) => {
  const [staticImageError, setStaticImageError] = useState(false);
  const [animatedImageError, setAnimatedImageError] = useState(false);

  useEffect(() => {
    setStaticImageError(false);
  }, [avatarUrl]);

  useEffect(() => {
    setAnimatedImageError(false);
  }, [animatedAvatarUrl]);

  const handleStaticImageError = () => {
    setStaticImageError(true);
  };

  const handleAnimatedImageError = () => {
    setAnimatedImageError(true);
  };

  const firstLetter = name && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : '?';

  // Priority: Animated -> Static -> Initial
  if (animatedAvatarUrl && animatedAvatarUrl.trim() !== '' && !animatedImageError) {
    return (
      <img
        src={animatedAvatarUrl}
        alt={altText || `Avatar động của ${name}`}
        className={className}
        onError={handleAnimatedImageError}
      />
    );
  } else if (avatarUrl && avatarUrl.trim() !== '' && !staticImageError) {
    return (
      <img
        src={avatarUrl}
        alt={altText || `Avatar của ${name}`}
        className={className}
        onError={handleStaticImageError}
      />
    );
  } else {
    // Display initial
    return (
      <div
        className={`${className} flex items-center justify-center bg-secondary dark:bg-secondary-dark text-white font-semibold text-lg`}
        aria-label={altText || `Avatar của ${name} hiển thị chữ cái đầu tiên`}
        title={name.trim() || 'Avatar'}
      >
        {firstLetter}
      </div>
    );
  }
};

export default InitialAvatar;
