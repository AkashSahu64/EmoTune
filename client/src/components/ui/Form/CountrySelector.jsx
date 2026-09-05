import { memo } from 'react';
import { FiGlobe } from 'react-icons/fi';

const COUNTRIES = [
  { code: 'US', dial: '+1', name: 'United States' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' },
  { code: 'IN', dial: '+91', name: 'India' },
  { code: 'CA', dial: '+1', name: 'Canada' },
  { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'DE', dial: '+49', name: 'Germany' },
  { code: 'FR', dial: '+33', name: 'France' },
  { code: 'BR', dial: '+55', name: 'Brazil' },
  { code: 'JP', dial: '+81', name: 'Japan' },
  { code: 'SG', dial: '+65', name: 'Singapore' },
  { code: 'AE', dial: '+971', name: 'UAE' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia' },
  { code: 'KR', dial: '+82', name: 'South Korea' },
  { code: 'SE', dial: '+46', name: 'Sweden' },
  { code: 'NO', dial: '+47', name: 'Norway' },
  { code: 'DK', dial: '+45', name: 'Denmark' },
  { code: 'NL', dial: '+31', name: 'Netherlands' },
  { code: 'IT', dial: '+39', name: 'Italy' },
  { code: 'ES', dial: '+34', name: 'Spain' },
  { code: 'RU', dial: '+7', name: 'Russia' },
  { code: 'CN', dial: '+86', name: 'China' },
  { code: 'ZA', dial: '+27', name: 'South Africa' },
  { code: 'NG', dial: '+234', name: 'Nigeria' },
  { code: 'EG', dial: '+20', name: 'Egypt' },
  { code: 'MX', dial: '+52', name: 'Mexico' },
  { code: 'AR', dial: '+54', name: 'Argentina' },
  { code: 'CL', dial: '+56', name: 'Chile' },
  { code: 'CO', dial: '+57', name: 'Colombia' },
  { code: 'NZ', dial: '+64', name: 'New Zealand' },
  { code: 'HK', dial: '+852', name: 'Hong Kong' },
  { code: 'TW', dial: '+886', name: 'Taiwan' },
  { code: 'MY', dial: '+60', name: 'Malaysia' },
  { code: 'TH', dial: '+66', name: 'Thailand' },
  { code: 'VN', dial: '+84', name: 'Vietnam' },
  { code: 'PH', dial: '+63', name: 'Philippines' },
  { code: 'PK', dial: '+92', name: 'Pakistan' },
  { code: 'BD', dial: '+880', name: 'Bangladesh' },
  { code: 'UA', dial: '+380', name: 'Ukraine' },
  { code: 'PL', dial: '+48', name: 'Poland' },
  { code: 'TR', dial: '+90', name: 'Turkey' },
  { code: 'IL', dial: '+972', name: 'Israel' },
  { code: 'CH', dial: '+41', name: 'Switzerland' },
  { code: 'AT', dial: '+43', name: 'Austria' },
  { code: 'BE', dial: '+32', name: 'Belgium' },
  { code: 'PT', dial: '+351', name: 'Portugal' },
  { code: 'GR', dial: '+30', name: 'Greece' },
  { code: 'IE', dial: '+353', name: 'Ireland' },
  { code: 'FI', dial: '+358', name: 'Finland' },
  { code: 'CZ', dial: '+420', name: 'Czech Republic' },
  { code: 'RO', dial: '+40', name: 'Romania' },
  { code: 'HU', dial: '+36', name: 'Hungary' },
  { code: 'SK', dial: '+421', name: 'Slovakia' },
  { code: 'HR', dial: '+385', name: 'Croatia' },
  { code: 'LT', dial: '+370', name: 'Lithuania' },
  { code: 'SI', dial: '+386', name: 'Slovenia' },
  { code: 'LV', dial: '+371', name: 'Latvia' },
  { code: 'EE', dial: '+372', name: 'Estonia' },
  { code: 'IS', dial: '+354', name: 'Iceland' },
  { code: 'LU', dial: '+352', name: 'Luxembourg' },
  { code: 'MT', dial: '+356', name: 'Malta' },
  { code: 'CY', dial: '+357', name: 'Cyprus' },
];

function getDialCode(code) {
  const country = COUNTRIES.find((c) => c.code === code);
  return country ? country.dial : '+1';
}

function getCountryByDial(dial) {
  return COUNTRIES.find((c) => c.dial === dial) || COUNTRIES[0];
}

const CountrySelector = memo(function CountrySelector({
  value,
  onChange,
  onFocus,
  onBlur,
  state = 'default',
  id = 'field-countryCode',
}) {
  const INPUT_BASE = 'w-full pl-10 pr-4 py-3 rounded-xl bg-surface dark:bg-surface-dark backdrop-blur-glass border text-[13px] focus:outline-none transition-colors duration-200 appearance-none cursor-pointer';
  const borderClass = state === 'error'
    ? 'border-danger dark:border-danger-dark focus:border-danger dark:focus:border-danger-dark focus:ring-1 focus:ring-danger/30 dark:ring-danger-dark/30'
    : state === 'focused'
    ? 'border-primary dark:border-primary-dark text-text-primary dark:text-text-primary-dark focus:border-primary dark:focus:border-primary-dark focus:ring-1 focus:ring-focus/30 dark:focus:ring-focus-dark/30'
    : 'border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark';

  return (
    <div className="relative">
      <FiGlobe
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary dark:text-text-secondary-dark pointer-events-none z-10"
        size={15}
      />
      <select
        id={id}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`${INPUT_BASE} ${borderClass}`}
        aria-label="Country code"
      >
        {COUNTRIES.map((cc) => (
          <option key={cc.code} value={cc.code}>
            {cc.dial} {cc.code}
          </option>
        ))}
      </select>
    </div>
  );
});

export { COUNTRIES, getDialCode, getCountryByDial };
export default CountrySelector;
