import React from 'react';

const Loader = ({ size = 'md', color = 'text-[#111111]', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`inline-block ${className}`}>
      <div
        className={`${sizeMap[size]} ${color} border-current border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
};

export default Loader;
