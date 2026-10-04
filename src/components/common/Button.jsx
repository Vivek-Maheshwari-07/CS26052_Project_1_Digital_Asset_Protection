import React from 'react';
import Loader from './Loader';

const Button = ({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  isLoading = false,
  isDisabled = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-lg';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const variantStyles = {
    primary: 'bg-[#111111] hover:bg-black text-white font-medium',
    secondary: 'bg-white hover:bg-gray-50 text-[#111111] border border-[#E5E5E5] font-medium',
    outline: 'bg-white hover:bg-gray-50 text-[#111111] border border-[#E5E5E5]',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-medium',
    ghost: 'bg-transparent hover:bg-gray-100 text-[#111111]',
  };

  return (
    <button
      type={type}
      disabled={isDisabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader size="sm" color={variant === 'primary' ? 'text-white' : 'text-[#111111]'} />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
