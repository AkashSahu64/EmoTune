import { memo } from 'react';
import FormLabel from './FormLabel';
import FormError from './FormError';

const FormField = memo(function FormField({
  field,
  label,
  required,
  icon,
  children,
  error,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <FormLabel htmlFor={field ? `field-${field}` : undefined} required={required}>
          {label}
        </FormLabel>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none z-10">
            {icon}
          </div>
        )}
        {children}
      </div>
      <FormError message={error} name={field} />
    </div>
  );
});

export default FormField;
