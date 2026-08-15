import { memo } from 'react';
import { Link } from 'react-router-dom';

export default memo(function AuthFooter() {
  return (
    <p className="text-[10px] text-text-muted text-center leading-relaxed">
      By continuing you agree to our{' '}
      <a href="#" className="text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors">
        Terms of Service
      </a>{' '}
      and{' '}
      <a href="#" className="text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors">
        Privacy Policy
      </a>
    </p>
  );
});
