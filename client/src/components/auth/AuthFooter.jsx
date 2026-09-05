import { memo } from 'react';
import { Link } from 'react-router-dom';

export default memo(function AuthFooter() {
  return (
    <p className="text-[10px] text-text-muted dark:text-text-muted-dark text-center leading-relaxed">
      By continuing you agree to our{' '}
      <a href="#" className="text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark underline underline-offset-2 transition-colors">
        Terms of Service
      </a>{' '}
      and{' '}
      <a href="#" className="text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark underline underline-offset-2 transition-colors">
        Privacy Policy
      </a>
    </p>
  );
});
