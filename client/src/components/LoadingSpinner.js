import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  text = 'Loading...',
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'border-primary',
    secondary: 'border-secondary',
    white: 'border-white'
  };

  const spinnerClasses = `
    spinner
    ${sizeClasses[size]}
    ${colorClasses[color]}
    ${className}
  `.trim();

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className={spinnerClasses}></div>
          {text && <p className="text-sm text-gray-600">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className={spinnerClasses}></div>
        {text && <p className="text-sm text-gray-600">{text}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner;
