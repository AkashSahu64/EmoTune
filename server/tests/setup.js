const mongoose = require('mongoose');

const testUri = process.env.MONGODB_TEST_URI || process.env.MONGO_URI;

beforeAll(async () => {
  if (testUri && process.env.NODE_ENV !== 'test') {
    try {
      await mongoose.connect(testUri);
    } catch (err) {
      console.warn('MongoDB connection skipped for tests:', err.message);
    }
  }
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
});
