
import React from 'react';
import { DEFAULT_AVATAR_PATH } from '../constants';
import InitialAvatar from './InitialAvatar'; // Import InitialAvatar

interface TypingIndicatorProps {
  characterName: string; // Add characterName
  avatarUrl?: string;
  animatedAvatarUrl?: string; // Added for animated GIF avatars
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ characterName, avatarUrl, animatedAvatarUrl }) => {
  const avatarSizeClasses = "w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shadow-sm bg-slate-300 dark:bg-slate-600 flex-shrink-0";

  return (
    <div className={`flex items-end space-x-3 justify-start animate-fadeIn`} role="status" aria-label={`${characterName} đang soạn tin`}>
      <InitialAvatar
        name={characterName}
        avatarUrl={avatarUrl}
        animatedAvatarUrl={animatedAvatarUrl}
        className={avatarSizeClasses}
        altText={`Avatar của ${characterName}`}
      />
      <div
        className={`px-3.5 py-2.5 rounded-2xl rounded-bl-lg bg-slate-200 dark:bg-slate-600 shadow-sm`}
      >
        <div className="flex space-x-1.5 items-center h-[1em]"> {/* Ensure consistent height with text line */}
          <span className="typing-dot h-2 w-2 bg-slate-500 dark:bg-slate-400 rounded-full"></span>
          <span className="typing-dot h-2 w-2 bg-slate-500 dark:bg-slate-400 rounded-full"></span>
          <span className="typing-dot h-2 w-2 bg-slate-500 dark:bg-slate-400 rounded-full"></span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
