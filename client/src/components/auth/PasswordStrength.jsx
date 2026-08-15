import { memo } from 'react';

function meetsRequirement(val, req) {
  switch (req) {
    case 'length': return val.length >= 8;
    case 'upper': return /[A-Z]/.test(val);
    case 'lower': return /[a-z]/.test(val);
    case 'number': return /\d/.test(val);
    case 'special': return /[!@#$%^&*(),.?":{}|<>]/.test(val);
    default: return false;
  }
}

const requirements = [
  { key: 'length', label: '8+ characters' },
  { key: 'upper', label: 'Uppercase letter' },
  { key: 'lower', label: 'Lowercase letter' },
  { key: 'number', label: 'Number' },
  { key: 'special', label: 'Special character' },
];

export default memo(function PasswordStrength({ password = '' }) {
  const strength = requirements.filter((r) => meetsRequirement(password, r.key)).length;
  const barColor = strength <= 1 ? 'var(--theme-danger)' : strength <= 3 ? 'var(--theme-warning)' : strength === 4 ? 'var(--theme-primary)' : 'var(--theme-success)';
  const barWidth = (strength / requirements.length) * 100;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-normal"
            style={{ backgroundColor: i < strength ? barColor : 'var(--theme-border)' }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {requirements.map((req) => {
          const met = meetsRequirement(password, req.key);
          return (
            <span
              key={req.key}
              className={`flex items-center gap-1 text-[9px] transition-colors duration-200 ${
                met ? 'text-success' : password ? 'text-text-secondary' : 'text-text-secondary'
              }`}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill={met ? 'var(--theme-success)' : 'var(--theme-text-secondary)'} className="flex-shrink-0">
                {met ? (
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                ) : (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                )}
              </svg>
              {req.label}
            </span>
          );
        })}
      </div>
    </div>
  );
});
