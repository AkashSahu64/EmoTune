import { useCallback, memo } from 'react';
import { FiPhone, FiGlobe } from 'react-icons/fi';
import { getDialCode, COUNTRIES } from './CountrySelector';

function formatPhoneInput(value, dialCode) {
  let digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith(dialCode.replace('+', ''))) {
    digits = digits.slice(dialCode.length - 1);
  }
  const full = dialCode + digits;
  if (!digits) return '';
  return full;
}

const PhoneInput = memo(function PhoneInput({
  value,
  countryCode,
  onPhoneChange,
  onCountryChange,
  onFocus,
  onBlur,
  state = 'default',
  id = 'field-phone',
  countryId = 'field-countryCode',
  placeholder,
}) {
  const dialCode = getDialCode(countryCode);

  const handlePhoneChange = useCallback((e) => {
    const raw = e.target.value;
    const formatted = formatPhoneInput(raw, dialCode);
    onPhoneChange(formatted);
  }, [dialCode, onPhoneChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = pasted.replace(/[^\d+]/g, '');
    const formatted = cleaned.startsWith('+') ? cleaned : formatPhoneInput(cleaned, dialCode);
    onPhoneChange(formatted);
  }, [dialCode, onPhoneChange]);

  const borderClass = state === 'error'
    ? 'border-border-error ring-2 ring-danger/20'
    : state === 'focused'
    ? 'border-border-focus ring-2 ring-focus/20 shadow-xs'
    : 'border-border';

  return (
    <div className={`relative flex items-stretch rounded-2xl bg-surface-glass backdrop-blur-glass border ${borderClass} transition-colors duration-normal overflow-hidden`}>
      <div className="relative flex items-stretch flex-shrink-0 border-r border-border/60">
        <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none z-10" size={16} />
        <select
          id={countryId}
          value={countryCode}
          onChange={onCountryChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className="h-full pl-10 pr-6 py-3.5 bg-transparent text-[13px] text-text-primary font-medium focus:outline-none appearance-none cursor-pointer min-w-[95px]"
          aria-label="Country code"
        >
          {COUNTRIES.map((cc) => (
            <option key={cc.code} value={cc.code}>
              {cc.dial} {cc.code}
            </option>
          ))}
        </select>
      </div>
      <div className="relative flex-1">
        <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none z-10" size={16} />
        <input
          id={id}
          type="tel"
          value={value}
          onChange={handlePhoneChange}
          onPaste={handlePaste}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder || `${dialCode} 555 123 4567`}
          inputMode="tel"
          autoComplete="tel"
          className="w-full h-full pl-10 pr-4 py-3.5 bg-transparent text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none"
          aria-label="Phone number"
        />
      </div>
    </div>
  );
});

export default PhoneInput;
