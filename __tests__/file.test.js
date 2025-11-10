const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../utils/config');
const path = require('path');
const fs = require('fs');

// Mock fileStorageService to prevent actual file uploads during tests
jest.mock('../services/fileStorageService', () => {
  const config = require('../utils/config'); // Import config inside the mock
  const { ApiError } = require('../utils/helpers'); // Also import ApiError if used in mock
  return {
    uploadFile: jest.fn((fileBuffer, fileName, mimetype, userId) => {
      if (fileBuffer.length > config.MAX_FILE_SIZE) {
        throw new ApiError(`File size exceeds the maximum limit of ${config.MAX_FILE_SIZE / (1024 * 1024)}MB.`, 400);
      }
      if (!config.ALLOWED_FILE_TYPES.includes(mimetype)) {
        throw new ApiError(`File type '${mimetype}' is not allowed.`, 400);
      }
      return Promise.resolve([{
        key: `mock-uploads/${userId}/${fileName}`,
        url: `http://mock-storage.com/mock-uploads/${userId}/${fileName}`,
        mimetype: mimetype,
        size: fileBuffer.length,
        original: true,
      }]);
    }),
    deleteFile: jest.fn(() => Promise.resolve({ success: true, message: 'File deleted.' })),
    getSignedDownloadUrl: jest.fn(() => Promise.resolve('http://mock-storage.com/signed-url')),
  };
});

const fileStorageService = require('../services/fileStorageService');

describe('File Upload API', () => {
  let testUser;
  let userToken;

  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(config.MONGO_URL, {
      maxPoolSize: config.MONGO_MAX_POOL_SIZE,
      serverSelectionTimeoutMS: config.MONGO_TIMEOUT_MS,
      socketTimeoutMS: config.MONGO_SOCKET_TIMEOUT_MS,
      bufferCommands: false,
    });

    // Create a test user
    testUser = await User.create({
      username: 'testuserupload',
      email: 'testupload@example.com',
      password: 'password123',
      isEmailVerified: true,
    });

    // Log in the test user to get a token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testupload@example.com',
        password: 'password123',
      });
    userToken = res.body.data.token;
  });

  afterAll(async () => {
    // Clean up test user
    await User.findByIdAndDelete(testUser._id);
    // Disconnect from the database
    await mongoose.disconnect();
  });

  beforeEach(() => {
    // Clear mock calls before each test
    fileStorageService.uploadFile.mockClear();
  });

  it('should upload a file successfully', async () => {
    const filePath = path.join(__dirname, 'test-image.png');
    // Create a dummy file for testing
    fs.writeFileSync(filePath, Buffer.from('test image data'));

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', filePath);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data[0]).toHaveProperty('url');
    expect(fileStorageService.uploadFile).toHaveBeenCalledTimes(1);

    fs.unlinkSync(filePath); // Clean up dummy file
  });

  it('should return 400 if no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .send({}); // No file attached

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toEqual('No file uploaded.');
    expect(fileStorageService.uploadFile).not.toHaveBeenCalled();
  });

  it('should return 400 for an unsupported file type', async () => {
    const filePath = path.join(__dirname, 'test.txt');
    fs.writeFileSync(filePath, Buffer.from('this is a text file'));

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', filePath);

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('File type');
    expect(res.body.error).toContain('is not allowed.');
    expect(fileStorageService.uploadFile).not.toHaveBeenCalled();

    fs.unlinkSync(filePath);
  });

  it('should return 400 if file size exceeds limit', async () => {
    const largeFilePath = path.join(__dirname, 'large-test-image.png');
    // Create a buffer larger than MAX_FILE_SIZE
    const largeBuffer = Buffer.alloc(config.MAX_FILE_SIZE + 1, 'a');
    fs.writeFileSync(largeFilePath, largeBuffer);

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', largeFilePath);

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('File size exceeds the maximum limit');
    expect(fileStorageService.uploadFile).not.toHaveBeenCalled();

    fs.unlinkSync(largeFilePath);
  });

  it('should return 401 if not authenticated', async () => {
    const filePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(filePath, Buffer.from('test image data'));

    const res = await request(app)
      .post('/api/upload')
      .attach('file', filePath); // No Authorization header

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toEqual('Not authorized, token failed');
    expect(fileStorageService.uploadFile).not.toHaveBeenCalled();

    fs.unlinkSync(filePath);
  });

  it('should return 400 if file storage is disabled', async () => {
    // Temporarily disable file storage for this test
    const originalFileStorageEnabled = config.FILE_STORAGE_ENABLED;
    config.FILE_STORAGE_ENABLED = false;

    const filePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(filePath, Buffer.from('test image data'));

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', filePath);

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toEqual('File storage is disabled.');
    expect(fileStorageService.uploadFile).not.toHaveBeenCalled();

    fs.unlinkSync(filePath);
    config.FILE_STORAGE_ENABLED = originalFileStorageEnabled; // Re-enable
  });
});