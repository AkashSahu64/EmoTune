import { memo } from 'react';

const FormCard = memo(function FormCard({
  children,
  className = '',
  maxWidth = 'max-w-[520px]',
}) {
  return (
    <div className={`w-full ${maxWidth} ${className}`}>
      {children}
    </div>
  );
});

export default FormCard;
