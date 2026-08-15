import { useState, forwardRef, memo, useCallback } from 'react';
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import Input from './Input';

const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number', test: (v) => /\d/.test(v) },
  { key: 'special', label: 'One special character', test: (v) => /[!@#$%^&*(),.?":{}|<>_-]/.test(v) },
];

const strengthConfig = [
  { label: 'Weak', color: 'var(--theme-danger)', min: 0 },
  { label: 'Fair', color: 'var(--theme-warning)', min: 2 },
  { label: 'Good', color: 'var(--theme-primary)', min: 3 },
  { label: 'Strong', color: 'var(--theme-success)', min: 4 },
  { label: 'Very Strong', color: 'var(--theme-success)', min: 5 },
];

function calcStrength(pw) {
  if (!pw) return 0;
  return PASSWORD_REQUIREMENTS.filter((r) => r.test(pw)).length;
}

function getStrengthLabel(score) {
  return strengthConfig.findLast((s) => score >= s.min) || strengthConfig[0];
}

const PasswordRequirementList = memo(function PasswordRequirementList({ password, visible }) {
  if (!visible || !password) return null;
  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-surface/60 backdrop-blur-glass border border-border">
      <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
        Password requirements
      </p>
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = req.test(password);
        return (
          <div key={req.key} className="flex items-center gap-2">
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors duration-200 ${
                met ? 'bg-success/20' : 'bg-[var(--theme-border)]'
              }`}
            >
              {met && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--theme-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className={`text-[10px] transition-colors duration-200 ${met ? 'text-success' : 'text-text-secondary'}`}>
              {req.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});

const PasswordStrengthBar = memo(function PasswordStrengthBar({ score }) {
  if (score === undefined) return null;
  const strength = getStrengthLabel(score);
  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 rounded-full bg-surface-elevated backdrop-blur-glass overflow-hidden">
        <div
          className="h-full rounded-full transition-colors duration-normal ease-out"
          style={{
            width: `${(score / 5) * 100}%`,
            backgroundColor: strength.color,
          }}
        />
      </div>
      <p className="text-[10px] text-right transition-colors duration-normal" style={{ color: strength.color }}>
        {strength.label}
      </p>
    </div>
  );
});

const PasswordInput = memo(forwardRef(function PasswordInput({
  id,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = 'Enter password',
  autoComplete = 'new-password',
  state = 'default',
  disabled,
  showStrength = false,
  showRequirements = false,
  className = '',
}, ref) {
  const [visible, setVisible] = useState(false);
  const score = showStrength ? calcStrength(value) : undefined;
  const toggleVisibility = useCallback(() => setVisible((v) => !v), []);

  return (
    <div>
      <div className="relative">
        <FiLock
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none z-10"
          size={16}
        />
        <Input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          state={state}
          disabled={disabled}
          className={`pl-11 pr-11 ${className}`}
          ariaLabel={placeholder}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary transition-colors focus:outline-none"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>
      <PasswordStrengthBar score={score} />
      <PasswordRequirementList password={value} visible={showRequirements} />
    </div>
  );
}));

export { PASSWORD_REQUIREMENTS, calcStrength, getStrengthLabel, strengthConfig };
export default PasswordInput;
