import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  wrapperClass?: string;
  description?: string;
}

const Checkbox: React.FC<CheckboxProps> = React.memo(({ label, id, checked, onChange, className = '', wrapperClass = '', description, ...props }) => {
  // Use React.useId() to generate a unique ID if one isn't provided.
  const uniqueId = id || React.useId();
  return (
    <div className={`mb-3 ${wrapperClass}`}>
        <label htmlFor={uniqueId} className="flex items-start group cursor-pointer">
            <input
                id={uniqueId}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="sr-only peer"
                {...props}
            />
            <div 
                className="relative flex-shrink-0 flex items-center justify-center w-5 h-5 mt-0.5 rounded-md border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 
                           transition-all duration-200 ease-in-out
                           group-hover:border-primary/70 dark:group-hover:border-primary-light/70
                           peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card-light dark:peer-focus-visible:ring-offset-card-dark peer-focus-visible:ring-primary
                           peer-checked:bg-primary dark:peer-checked:bg-primary-light peer-checked:border-primary dark:peer-checked:border-primary-light"
            >
                <svg
                    className={`w-3 h-3 text-white fill-current transition-opacity duration-200 transform ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                    viewBox="0 0 16 16"
                    version="1.1" 
                    aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path>
                </svg>
            </div>
            <div className="ml-2.5 text-sm">
                <span className="font-medium text-text-light dark:text-text-dark">
                    {label}
                </span>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
        </label>
    </div>
  );
});

export default Checkbox;
