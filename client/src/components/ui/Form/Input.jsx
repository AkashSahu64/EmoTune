import { forwardRef, memo } from 'react';
import { cn } from '../../../theme/utilities';

const Input = memo(forwardRef(function Input({
  id, type = 'text', value, onChange, onFocus, onBlur, onKeyDown, placeholder,
  autoComplete, autoFocus, disabled, readOnly, maxLength, inputMode, pattern,
  state = 'default', className = '', ariaLabel, ariaRequired, ariaInvalid,
  ariaDescribedby, tabIndex, name,
}, ref) {
  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      disabled={disabled}
      readOnly={readOnly}
      maxLength={maxLength}
      inputMode={inputMode}
      pattern={pattern}
      tabIndex={tabIndex}
      className={cn(
        'glass-input h-11 w-full rounded-lg py-3 pl-10 pr-4 text-body focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40',
        state === 'error' ? 'border-danger text-danger focus-visible:ring-danger/25' : 'text-text-primary focus-visible:ring-focus/30',
        className,
      )}
      aria-label={ariaLabel}
      aria-required={ariaRequired}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedby}
    />
  );
}));

export default Input;
