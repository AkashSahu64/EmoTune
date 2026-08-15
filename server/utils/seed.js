const User = require('../models/User');

const TEST_CREDENTIALS = {
  username: 'testuser',
  email: 'test@emotune.app',
  password: 'Test1234!',
};

async function seedTestUser() {
  try {
    const existing = await User.findOne({ email: TEST_CREDENTIALS.email });
    if (existing) {
      console.log('Test user already exists');
      return TEST_CREDENTIALS;
    }
    await User.create(TEST_CREDENTIALS);
    console.log('Test user created');
    return TEST_CREDENTIALS;
  } catch (err) {
    console.error('Seed error:', err.message);
    return null;
  }
}

function getTestCredentials() {
  return TEST_CREDENTIALS;
}

module.exports = { seedTestUser, getTestCredentials };
