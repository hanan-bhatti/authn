// auth.test.js

const request = require('supertest');
const app = require('../server'); // Assuming your Express app is exported from server.js
const mongoose = require('mongoose');
const User = require('../models/User');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MONGO_URL = 'mongodb://localhost:27017/authn_test';
process.env.JWT_SECRET = 'testsecret';
process.env.BCRYPT_ROUNDS = '10';

describe('Auth API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterEach(async () => {
    await User.deleteMany();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        deviceInfo: {
          deviceId: 'testdevice123',
          deviceName: 'Test Device',
          platform: 'Test Platform',
          browser: 'Test Browser',
          os: 'Test OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Testland' }
        }
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.user.email).toEqual('test@example.com');
    expect(res.body.data.requiresEmailVerification).toEqual(true);
  });

  it('should not register a user with existing email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        deviceInfo: {
          deviceId: 'testdevice123',
          deviceName: 'Test Device',
          platform: 'Test Platform',
          browser: 'Test Browser',
          os: 'Test OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Testland' }
        }
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'anotheruser',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Another',
        lastName: 'User',
        deviceInfo: {
          deviceId: 'testdevice456',
          deviceName: 'Another Test Device',
          platform: 'Test Platform',
          browser: 'Test Browser',
          os: 'Test OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Testland' }
        }
      });
    expect(res.statusCode).toEqual(409);
    expect(res.body.success).toEqual(false);
    expect(res.body.error).toEqual('An account with this email already exists');
  });

  it('should log in an existing user', async () => {
    // Register a user first
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'Password123!',
        firstName: 'Login',
        lastName: 'User',
        deviceInfo: {
          deviceId: 'logindevice123',
          deviceName: 'Login Device',
          platform: 'Login Platform',
          browser: 'Login Browser',
          os: 'Login OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Loginland' }
        }
      });

    // Manually verify email for login test
    const user = await User.findOne({ email: 'login@example.com' });
    user.isEmailVerified = true;
    await user.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'login@example.com',
        password: 'Password123!',
        deviceInfo: {
          deviceId: 'logindevice123',
          deviceName: 'Login Device',
          platform: 'Login Platform',
          browser: 'Login Browser',
          os: 'Login OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Loginland' }
        }
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.user.email).toEqual('login@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should not log in with incorrect password', async () => {
    // Register a user first
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'wrongpassuser',
        email: 'wrongpass@example.com',
        password: 'Password123!',
        firstName: 'Wrong',
        lastName: 'Pass',
        deviceInfo: {
          deviceId: 'wrongpassdevice123',
          deviceName: 'Wrong Pass Device',
          platform: 'Wrong Pass Platform',
          browser: 'Wrong Pass Browser',
          os: 'Wrong Pass OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Wrong Passland' }
        }
      });

    // Manually verify email for login test
    const user = await User.findOne({ email: 'wrongpass@example.com' });
    user.isEmailVerified = true;
    await user.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'wrongpass@example.com',
        password: 'WrongPassword!',
        deviceInfo: {
          deviceId: 'wrongpassdevice123',
          deviceName: 'Wrong Pass Device',
          platform: 'Wrong Pass Platform',
          browser: 'Wrong Pass Browser',
          os: 'Wrong Pass OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Wrong Passland' }
        }
      });
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toEqual(false);
    expect(res.body.error).toEqual('Invalid credentials');
  });

  it('should verify email with OTP', async () => {
    // Register a user first
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'verifyemailuser',
        email: 'verify@example.com',
        password: 'Password123!',
        firstName: 'Verify',
        lastName: 'Email',
        deviceInfo: {
          deviceId: 'verifyemaildevice123',
          deviceName: 'Verify Email Device',
          platform: 'Verify Email Platform',
          browser: 'Verify Email Browser',
          os: 'Verify Email OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Verify Emailland' }
        }
      });

    const user = await User.findOne({ email: 'verify@example.com' });
    const otp = user.generateEmailVerificationOTP(); // Get the OTP
    await user.save();

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: 'verify@example.com',
        otp: otp,
        deviceInfo: {
          deviceId: 'verifyemaildevice123',
          deviceName: 'Verify Email Device',
          platform: 'Verify Email Platform',
          browser: 'Verify Email Browser',
          os: 'Verify Email OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Verify Emailland' }
        }
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toEqual(true);
    expect(res.body.data.user.isEmailVerified).toEqual(true);
  });

  it('should not verify email with invalid OTP', async () => {
    // Register a user first
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'invalidotpuser',
        email: 'invalidotp@example.com',
        password: 'Password123!',
        firstName: 'Invalid',
        lastName: 'OTP',
        deviceInfo: {
          deviceId: 'invalidotpdevice123',
          deviceName: 'Invalid OTP Device',
          platform: 'Invalid OTP Platform',
          browser: 'Invalid OTP Browser',
          os: 'Invalid OTP OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Invalid OTPLand' }
        }
      });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: 'invalidotp@example.com',
        otp: '000000', // Invalid OTP
        deviceInfo: {
          deviceId: 'invalidotpdevice123',
          deviceName: 'Invalid OTP Device',
          platform: 'Invalid OTP Platform',
          browser: 'Invalid OTP Browser',
          os: 'Invalid OTP OS',
          ipAddress: '127.0.0.1',
          location: { country: 'Invalid OTPLand' }
        }
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toEqual(false);
    expect(res.body.error).toEqual('Invalid or expired verification code');
  });
});