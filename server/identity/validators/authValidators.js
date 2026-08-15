const Joi = require('joi');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

function validateE164Phone(value, helpers) {
  if (!value) return value;
  const phoneNumber = parsePhoneNumberFromString(value);
  if (!phoneNumber || !phoneNumber.isValid()) {
    return helpers.error('string.pattern.base', { message: 'Invalid phone number format (use E.164, e.g., +14155552671)' });
  }
  return phoneNumber.format('E.164');
}

const COUNTRY_CODES = [
  'AF', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ',
  'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BR', 'IO',
  'VG', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA', 'CV', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX',
  'CC', 'CO', 'KM', 'CK', 'CR', 'HR', 'CU', 'CW', 'CY', 'CZ', 'CD', 'DK', 'DJ', 'DM', 'DO',
  'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'GA',
  'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY',
  'HT', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'CI', 'JM',
  'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'XK', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY',
  'LI', 'LT', 'LU', 'MO', 'MK', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU',
  'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL',
  'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'KP', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA',
  'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR', 'QA', 'CG', 'RE', 'RO', 'RU', 'RW', 'BL',
  'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG',
  'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'KR', 'SS', 'ES', 'LK', 'SD', 'SR', 'SJ', 'SZ',
  'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR', 'TM',
  'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UM', 'VI', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN',
  'WF', 'EH', 'YE', 'ZM', 'ZW',
];

const signupSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Full name is required',
    'any.required': 'Full name is required',
  }),
  username: Joi.string().pattern(USERNAME_REGEX).required().messages({
    'string.pattern.base': 'Username must be 3-30 characters (letters, numbers, underscores)',
    'any.required': 'Username is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  countryCode: Joi.string().valid(...COUNTRY_CODES).optional().allow(''),
  phone: Joi.string().optional().allow('').custom(validateE164Phone, 'E.164 phone validation'),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your password',
  }),
  deviceName: Joi.string().max(100).optional(),
  timezone: Joi.string().optional(),
  language: Joi.string().valid('en', 'hi', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru').optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().optional().allow(''),
  password: Joi.string().required(),
  username: Joi.string().optional().allow(''),
  phone: Joi.string().optional().allow('').custom(validateE164Phone, 'E.164 phone validation'),
  rememberMe: Joi.boolean().optional().default(false),
}).or('email', 'username', 'phone').messages({
  'object.missing': 'Provide email, username, or phone number',
  'object.xor': 'Provide one of: email, username, or phone',
});

const emailLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().optional().default(false),
});

const phoneLoginSchema = Joi.object({
  phone: Joi.string().required().custom(validateE164Phone, 'E.164 phone validation'),
  password: Joi.string().required(),
});

const usernameLoginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

// Refresh tokens are accepted only from the HTTP-only cookie. The body is
// intentionally empty to prevent bearer-token leakage through request logs,
// browser tooling, or client-side JavaScript.
const refreshTokenSchema = Joi.object({}).unknown(false);

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().optional().allow(''),
  username: Joi.string().optional().allow(''),
  phone: Joi.string().optional().allow('').custom(validateE164Phone, 'E.164 phone validation'),
}).or('email', 'username', 'phone').messages({
  'object.missing': 'Provide email, username, or phone number',
});

const verifyResetCodeSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required(),
});

const resetPasswordSchema = Joi.object({
  verificationToken: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).optional(),
  username: Joi.string().pattern(USERNAME_REGEX).optional(),
  displayName: Joi.string().max(50).optional(),
  bio: Joi.string().max(200).optional(),
  about: Joi.string().max(500).optional(),
  phone: Joi.string().optional().allow('').custom(validateE164Phone, 'E.164 phone validation'),
  countryCode: Joi.string().valid(...COUNTRY_CODES).optional().allow(''),
  avatar: Joi.string().uri().allow('').optional(),
  wallpaper: Joi.string().uri().allow('').optional(),
  timezone: Joi.string().optional(),
  language: Joi.string().optional(),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});

const sendVerificationEmailSchema = Joi.object({
  email: Joi.string().email().optional(),
});

const sessionActionSchema = Joi.object({
  sessionId: Joi.string().required(),
});

const deviceActionSchema = Joi.object({
  deviceId: Joi.string().required(),
});

const oauthCallbackSchema = Joi.object({
  code: Joi.string().required(),
  state: Joi.string().optional(),
  provider: Joi.string().valid('google', 'apple', 'microsoft').required(),
});

const oauthLinkSchema = Joi.object({
  provider: Joi.string().valid('google', 'apple', 'microsoft').required(),
  code: Joi.string().required(),
});

module.exports = {
  signupSchema,
  loginSchema,
  emailLoginSchema,
  phoneLoginSchema,
  usernameLoginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
  sendVerificationEmailSchema,
  sessionActionSchema,
  deviceActionSchema,
  oauthCallbackSchema,
  oauthLinkSchema,
};
