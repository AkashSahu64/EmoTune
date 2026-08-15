const { IDENTITY_CONFIG } = require('../config/identityConfig');
const { generateOTP } = require('../utils/crypto');

class BaseOTPProvider {
  constructor(config) {
    this.config = config;
    this.name = 'base';
  }

  async sendOTP(phoneNumber, otp, options = {}) {
    throw new Error('Not implemented');
  }

  generateOTP() {
    return generateOTP(this.config.length);
  }

  getExpiryMs() {
    return this.config.expiryMs;
  }
}

class MockOTPProvider extends BaseOTPProvider {
  constructor() {
    super(IDENTITY_CONFIG.otp);
    this.name = 'mock';
  }

  async sendOTP(phoneNumber, otp, options = {}) {
    console.log(`[MOCK OTP] To: ${phoneNumber}, OTP: ${otp}`);
    return { success: true, provider: 'mock', messageId: `mock_${Date.now()}` };
  }
}

class TwilioOTPProvider extends BaseOTPProvider {
  constructor() {
    super(IDENTITY_CONFIG.otp);
    this.name = 'twilio';
  }

  async sendOTP(phoneNumber, otp, options = {}) {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = await client.messages.create({
      body: `Your Emotune verification code is: ${otp}. Valid for ${this.config.expiryMs / 60000} minutes.`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    return { success: true, provider: 'twilio', messageId: message.sid };
  }
}

class SNSOTPProvider extends BaseOTPProvider {
  constructor() {
    super(IDENTITY_CONFIG.otp);
    this.name = 'sns';
  }

  async sendOTP(phoneNumber, otp, options = {}) {
    const AWS = require('aws-sdk');
    const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });

    const result = await sns.publish({
      Message: `Your Emotune verification code is: ${otp}`,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': { StringValue: 'EMOTUNE', DataType: 'String' },
        'AWS.SNS.SMS.SMSType': { StringValue: 'Transactional', DataType: 'String' },
      },
    }).promise();

    return { success: true, provider: 'sns', messageId: result.MessageId };
  }
}

const getOTPProvider = () => {
  const providerName = IDENTITY_CONFIG.otp.provider;
  const providers = {
    mock: MockOTPProvider,
    twilio: TwilioOTPProvider,
    sns: SNSOTPProvider,
  };

  const ProviderClass = providers[providerName];
  if (!ProviderClass) {
    console.warn(`OTP provider "${providerName}" not found, falling back to mock`);
    return new MockOTPProvider();
  }
  return new ProviderClass();
};

module.exports = {
  BaseOTPProvider,
  MockOTPProvider,
  TwilioOTPProvider,
  SNSOTPProvider,
  getOTPProvider,
};
