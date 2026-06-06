import React, { forwardRef, type InputHTMLAttributes } from 'react';

interface Option {
  value: string;
  label: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  error?: string;
  options?: Option[]; // If options are provided, render a Select dropdown
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement & HTMLSelectElement, InputProps>(
  ({ label, error, options, icon, className = '', ...props }, ref) => {
    const isSelect = !!options;
    const inputId = props.id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className="input-group">
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
        <div className="input-wrapper">
          {icon && <span className="input-icon-left">{icon}</span>}
          {isSelect ? (
            <select
              id={inputId}
              ref={ref}
              className={`input-field select-field ${icon ? 'has-icon' : ''} ${error ? 'is-invalid' : ''} ${className}`}
              {...props}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={inputId}
              ref={ref}
              className={`input-field ${icon ? 'has-icon' : ''} ${error ? 'is-invalid' : ''} ${className}`}
              {...props}
            />
          )}
        </div>
        {error && <span className="input-error-msg">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
