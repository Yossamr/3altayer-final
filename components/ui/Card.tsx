import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-surface-light dark:bg-surface-dark rounded-2xl p-4 md:p-5 shadow-bold border-2 border-gray-100 dark:border-gray-800 ${className}`}
    >
      {children}
    </div>
  );
};