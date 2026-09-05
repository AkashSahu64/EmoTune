import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

const OTP_LENGTH = 6;

export default function OTPInput({ value, onChange, disabled, error }) {
  const [otp, setOtp] = useState(value ? value.split('') : Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    setOtp(value ? value.split('') : Array(OTP_LENGTH).fill(''));
  }, [value]);

  const handleChange = useCallback((index, e) => {
    const char = e.target.value;
    if (char && !/^\d$/.test(char)) return;

    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);
    onChange(newOtp.join(''));

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1].focus();
    }
  }, [otp, onChange]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange(newOtp.join(''));
        inputRefs.current[index - 1].focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        onChange(newOtp.join(''));
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1].focus();
    }
  }, [otp, onChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    onChange(newOtp.join(''));

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex].focus();
  }, [onChange]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {otp.map((digit, index) => (
        <motion.div
          key={index}
          initial={{ }}
          animate={{ }}
          transition={{  duration: 0.3 }}
        >
          <input
            ref={(el) => { inputRefs.current[index] = el; }}
            id={`otp-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            autoComplete="one-time-code"
            className={`w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 text-center text-xl sm:text-2xl font-bold text-text-primary dark:text-text-primary-dark bg-surface dark:bg-surface-dark backdrop-blur-glass border-2 rounded-xl transition-colors duration-200 outline-none ${
              error
                ? 'border-danger dark:border-danger-dark text-danger dark:text-danger-dark focus:border-danger dark:focus:border-danger-dark focus:ring-2 focus:ring-danger/20 dark:ring-danger-dark/20'
                : digit
                  ? 'border-primary dark:border-primary-dark text-text-primary dark:text-text-primary-dark focus:border-primary dark:focus:border-primary-dark focus:ring-2 focus:ring-focus/20 dark:focus:ring-focus-dark/20'
                  : 'border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:border-primary dark:focus:border-primary-dark focus:ring-2 focus:ring-focus/20 dark:focus:ring-focus-dark/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={`Digit ${index + 1}`}
          />
        </motion.div>
      ))}
    </div>
  );
}
