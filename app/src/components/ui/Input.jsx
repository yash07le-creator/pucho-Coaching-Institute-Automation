import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

// v5.1 (owner, 28 Oct 2026): every password field shows the eye — show / hide what was typed. Compulsory: ui_check L4 refuses a
// login page whose password field has no working [data-os-reveal] button.
const Input = ({ label, type = 'text', icon, placeholder, value, onChange, error }) => {
  const isPassword = type === 'password';
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <img
            src={icon}
            alt=""
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50"
          />
        )}
        <input
          type={isPassword && shown ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(
            'input',
            icon && 'pl-10',
            isPassword && 'pr-11',
            error && 'border-intent-danger-border focus:ring-[color:var(--bad-edge)] focus:border-bad'
          )}
        />
        {isPassword && (
          <button
            type="button"
            data-os-reveal
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            title={shown ? 'Hide password' : 'Show password'}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            {shown ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-intent-danger-text">{error}</p>}
    </div>
  );
};

export default Input;
