import { memo } from 'react';

const FormLabel = memo(function FormLabel({ htmlFor, children, required, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-2 ${className}`}
    >
      {children}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
  );
});

export default FormLabel;
