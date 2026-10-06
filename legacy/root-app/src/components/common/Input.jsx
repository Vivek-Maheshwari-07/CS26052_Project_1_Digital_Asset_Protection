import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({
  label,
  type = 'text',
  id,
  name,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  icon: Icon,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === 'password';
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className="block text-xs font-semibold text-[#111111]"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#666666]">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={id || name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full bg-white text-[#111111] placeholder-[#999999] text-sm rounded-lg py-2 
            border transition-colors duration-150 focus:outline-none
            ${Icon ? 'pl-9' : 'pl-3'}
            ${isPasswordType ? 'pr-9' : 'pr-3'}
            ${
              error
                ? 'border-red-500 focus:border-red-500'
                : 'border-[#E5E5E5] focus:border-[#111111]'
            }
            ${disabled ? 'bg-gray-100 opacity-60 cursor-not-allowed' : ''}
          `}
          {...props}
        />

        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666666] hover:text-[#111111] focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-600 font-medium pl-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#666666] pl-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
