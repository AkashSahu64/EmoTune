import { memo } from 'react';

const FormLabel = memo(function FormLabel({ htmlFor, children, required, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-[12px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider mb-2 ${className}`}
    >
      {children}
      {required && <span className="text-danger dark:text-danger-dark ml-0.5">*</span>}
    </label>
  );
});

export default FormLabel;
