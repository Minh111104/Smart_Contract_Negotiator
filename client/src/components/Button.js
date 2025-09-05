import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClasses = 'btn';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    error: 'btn-error',
    ghost: 'btn-ghost',
    link: 'btn-link'
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <div className="spinner w-4 h-4"></div>
          <span>Loading...</span>
        </>
      );
    }

    if (icon) {
      if (iconPosition === 'left') {
        return (
          <>
            {icon}
            <span>{children}</span>
          </>
        );
      } else {
        return (
          <>
            <span>{children}</span>
            {icon}
          </>
        );
      }
    }

    return children;
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
