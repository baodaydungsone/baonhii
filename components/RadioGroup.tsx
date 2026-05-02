import React from 'react';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  label?: string;
  inline?: boolean;
  wrapperClass?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = React.memo(({ name, options, selectedValue, onChange, label, inline = false, wrapperClass = '' }) => {
  const groupId = React.useId();
  return (
    <div className={`mb-4 ${wrapperClass}`}>
      {label && <legend className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{label}</legend>}
      <div className={`${inline ? 'flex flex-wrap items-center gap-x-4 gap-y-2' : 'space-y-2'}`}>
        {options.map(option => (
          <label key={option.value} htmlFor={`${groupId}-${option.value}`} className={`flex items-start group cursor-pointer ${inline ? '' : ''}`}>
            <input
              id={`${groupId}-${option.value}`}
              name={name}
              type="radio"
              value={option.value}
              checked={selectedValue === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only peer"
            />
            <div 
                className="relative flex-shrink-0 flex items-center justify-center w-5 h-5 mt-0.5 rounded-full border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700
                           transition-all duration-200 ease-in-out
                           group-hover:border-primary/70 dark:group-hover:border-primary-light/70
                           peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card-light dark:peer-focus-visible:ring-offset-card-dark peer-focus-visible:ring-primary
                           peer-checked:border-primary dark:peer-checked:border-primary-light"
            >
                <div 
                    className={`w-2.5 h-2.5 rounded-full bg-primary dark:bg-primary-light
                                transition-transform duration-200 ease-in-out
                                ${selectedValue === option.value ? 'scale-100' : 'scale-0'}`}
                />
            </div>
            <div className="ml-2.5 text-sm">
                <span className="font-medium text-text-light dark:text-text-dark">
                  {option.label}
                </span>
                {option.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.description}</p>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
});

export default RadioGroup;
