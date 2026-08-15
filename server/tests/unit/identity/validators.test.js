const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} = require('../../../identity/validators/authValidators');

describe('Auth Validators', () => {
  describe('signupSchema', () => {
    it('should validate a valid signup payload', () => {
      const { error, value } = signupSchema.validate({
        fullName: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongP@ss1',
        confirmPassword: 'StrongP@ss1',
      });
      expect(error).toBeUndefined();
      expect(value.username).toBe('testuser');
      expect(value.email).toBe('test@example.com');
      expect(value.fullName).toBe('Test User');
    });

    it('should reject missing fullName', () => {
      const { error } = signupSchema.validate({
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongP@ss1',
        confirmPassword: 'StrongP@ss1',
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('fullName');
    });

    it('should reject missing username', () => {
      const { error } = signupSchema.validate({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'StrongP@ss1',
        confirmPassword: 'StrongP@ss1',
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('username');
    });

    it('should reject invalid email', () => {
      const { error } = signupSchema.validate({
        fullName: 'Test User',
        username: 'testuser',
        email: 'not-an-email',
        password: 'StrongP@ss1',
        confirmPassword: 'StrongP@ss1',
      });
      expect(error).toBeDefined();
    });

    it('should reject password mismatch', () => {
      const { error } = signupSchema.validate({
        fullName: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongP@ss1',
        confirmPassword: 'DifferentP@ss2',
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('match');
    });

    it('should reject short username', () => {
      const { error } = signupSchema.validate({
        fullName: 'Test User',
        username: 'ab',
        email: 'test@example.com',
        password: 'StrongP@ss1',
        confirmPassword: 'StrongP@ss1',
      });
      expect(error).toBeDefined();
    });
  });

  describe('loginSchema', () => {
    it('should validate email login', () => {
      const { error, value } = loginSchema.validate({
        email: 'test@example.com',
        password: 'mypassword',
      });
      expect(error).toBeUndefined();
      expect(value.email).toBe('test@example.com');
    });

    it('should validate username login', () => {
      const { error } = loginSchema.validate({
        username: 'testuser',
        password: 'mypassword',
      });
      expect(error).toBeUndefined();
    });

    it('should validate phone login', () => {
      const { error } = loginSchema.validate({
        phone: '+14155552671',
        password: 'mypassword',
      });
      expect(error).toBeUndefined();
    });

    it('should reject empty login', () => {
      const { error } = loginSchema.validate({
        password: 'mypassword',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const { error } = loginSchema.validate({
        email: 'test@example.com',
      });
      expect(error).toBeDefined();
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate valid email', () => {
      const { error } = forgotPasswordSchema.validate({
        email: 'test@example.com',
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const { error } = forgotPasswordSchema.validate({
        email: 'invalid',
      });
      expect(error).toBeDefined();
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate valid payload', () => {
      const { error } = resetPasswordSchema.validate({
        verificationToken: 'valid-token-here',
        password: 'NewStr@ngP1',
        confirmPassword: 'NewStr@ngP1',
      });
      expect(error).toBeUndefined();
    });

    it('should reject mismatch passwords', () => {
      const { error } = resetPasswordSchema.validate({
        verificationToken: 'token',
        password: 'Pass1234!',
        confirmPassword: 'Pass5678!',
      });
      expect(error).toBeDefined();
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid payload', () => {
      const { error } = changePasswordSchema.validate({
        currentPassword: 'OldP@ss1',
        newPassword: 'NewP@ss2',
        confirmPassword: 'NewP@ss2',
      });
      expect(error).toBeUndefined();
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate valid profile update', () => {
      const { error, value } = updateProfileSchema.validate({
        displayName: 'John Doe',
        bio: 'Hello world',
        language: 'en',
      });
      expect(error).toBeUndefined();
      expect(value.displayName).toBe('John Doe');
    });
  });

  describe('verifyEmailSchema', () => {
    it('should require token', () => {
      const { error } = verifyEmailSchema.validate({});
      expect(error).toBeDefined();
    });

    it('should validate with token', () => {
      const { error } = verifyEmailSchema.validate({ token: 'some-token' });
      expect(error).toBeUndefined();
    });
  });
});
