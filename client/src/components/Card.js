import React from 'react';

const Card = ({
  children,
  header,
  footer,
  className = '',
  hover = false,
  ...props
}) => {
  const cardClasses = `
    card
    ${hover ? 'hover:shadow-lg transition-shadow duration-200' : ''}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} {...props}>
      {header && (
        <div className="card-header">
          {header}
        </div>
      )}
      
      <div className="card-body">
        {children}
      </div>
      
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
