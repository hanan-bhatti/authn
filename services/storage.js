const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Configure AWS S3 with SDK v3
const s3Config = {
  endpoint: process.env.AWS_S3_ENDPOINT,
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
};

const s3Client = new S3Client(s3Config);

// Support both environment variable names for flexibility
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'your-s3-bucket';
const CDN_URL = process.env.AWS_S3_CDN_URL || process.env.CDN_URL;
const USE_CDN = process.env.AWS_S3_USE_CDN === 'true' || process.env.USE_CDN === 'true';

// Image size configurations for different use cases
const IMAGE_SIZES = {
  thumbnail: { width: 32, height: 32, quality: 80, description: 'Small icons, badges' },
  icon: { width: 64, height: 64, quality: 85, description: 'User avatars in lists' },
  small: { width: 128, height: 128, quality: 85, description: 'Small profile pictures' },
  medium: { width: 256, height: 256, quality: 90, description: 'Default profile pictures' },
  large: { width: 512, height: 512, quality: 90, description: 'Large profile pictures' },
  xlarge: { width: 1024, height: 1024, quality: 92, description: 'Full resolution' },
  cover: { width: 1920, height: 1080, quality: 90, description: 'Cover images, banners' },
};

// Utility function to validate environment variables
const validateConfig = () => {
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ];
  
  // Check for bucket name (either variable name works)
  const hasBucket = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
  if (!hasBucket) {
    requiredVars.push('AWS_S3_BUCKET_NAME or AWS_S3_BUCKET');
  }
  
  const missing = requiredVars.filter(varName => {
    if (varName.includes('BUCKET')) return false; // Already checked above
    return !process.env[varName];
  });
  
  if (missing.length > 0 || !hasBucket) {
    const allMissing = [...missing];
    if (!hasBucket) allMissing.push('AWS_S3_BUCKET_NAME or AWS_S3_BUCKET');
    throw new Error(`Missing required environment variables: ${allMissing.join(', ')}`);
  }
};

/**
 * Generate S3 key for user files
 * @param {string} userId - User ID
 * @param {string} folder - Folder name (e.g., 'profile', 'documents')
 * @param {string} fileName - File name
 * @param {string} size - Image size variant (optional)
 * @returns {string} - S3 key
 */
const generateS3Key = (userId, folder, fileName, size = null) => {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const uniqueId = uuidv4().split('-')[0]; // First part of UUID for shorter keys
  
  if (size) {
    return `users/${userId}/${folder}/${size}/${timestamp}-${uniqueId}-${sanitizedFileName}`;
  }
  
  return `users/${userId}/${folder}/${timestamp}-${uniqueId}-${sanitizedFileName}`;
};

/**
 * Generate public URL for S3 object
 * @param {string} key - S3 object key
 * @returns {string} - Public URL
 */
const generatePublicUrl = (key) => {
  if (!key) {
    return null;
  }

  // If using CDN, return CDN URL
  if (USE_CDN && CDN_URL) {
    return `${CDN_URL}/${key}`;
  }

  // If using AWS S3 with custom endpoint
  if (process.env.AWS_S3_ENDPOINT) {
    return `${process.env.AWS_S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
  }

  // Default AWS S3 URL format
  const region = process.env.AWS_S3_REGION || 'us-east-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - S3 object key
 * @param {string} contentType - MIME type
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with URL and key
 */
const uploadToS3 = async (fileBuffer, key, contentType, options = {}) => {
  try {
    validateConfig();

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: options.acl || process.env.AWS_S3_DEFAULT_ACL || 'public-read',
      Metadata: {
        uploadedAt: new Date().toISOString(),
        ...options.metadata
      }
    };

    // Add cache control based on file type
    if (contentType.startsWith('image/')) {
      uploadParams.CacheControl = options.cacheControl || 'max-age=31536000, immutable'; // 1 year for images
    } else if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
      uploadParams.CacheControl = options.cacheControl || 'max-age=2592000'; // 30 days for media
    } else {
      uploadParams.CacheControl = options.cacheControl || 'max-age=86400'; // 1 day for other files
    }

    console.log(`Uploading file to S3: ${key}`);

    let uploadResult;

    // Use multipart upload for larger files (>5MB)
    if (fileBuffer.length > 5 * 1024 * 1024) {
      const upload = new Upload({
        client: s3Client,
        params: uploadParams,
        queueSize: 4,
        partSize: 5 * 1024 * 1024, // 5MB parts
        leavePartsOnError: false,
      });

      uploadResult = await upload.done();
      console.log(`File uploaded successfully (multipart): ${uploadResult.Location}`);
    } else {
      // Use simple upload for smaller files
      const command = new PutObjectCommand(uploadParams);
      uploadResult = await s3Client.send(command);
      console.log(`File uploaded successfully: ${key}`);
    }

    return {
      key,
      url: generatePublicUrl(key),
      bucket: BUCKET_NAME,
      etag: uploadResult.ETag?.replace(/"/g, ''),
      size: fileBuffer.length
    };

  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} key - S3 object key or full URL
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromS3 = async (key) => {
  try {
    if (!key) {
      console.log('No file key provided for deletion');
      return true;
    }

    validateConfig();

    // Extract key from URL if full URL provided
    if (key.startsWith('http')) {
      const url = new URL(key);
      // Extract key from various URL formats
      if (url.hostname.includes('s3')) {
        // Format: https://bucket.s3.region.amazonaws.com/key
        key = url.pathname.substring(1);
      } else if (CDN_URL && key.startsWith(CDN_URL)) {
        // Format: https://cdn.example.com/key
        key = key.substring(CDN_URL.length + 1);
      }
      
      // Remove bucket name if it's in the path
      if (key.startsWith(`${BUCKET_NAME}/`)) {
        key = key.substring(`${BUCKET_NAME}/`.length);
      }
    }

    console.log(`Deleting file from S3: ${key}`);

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    console.log(`File deleted successfully: ${key}`);
    return true;

  } catch (error) {
    console.error('S3 delete error:', error);
    // Don't throw error for delete operations to avoid blocking user actions
    return false;
  }
};

/**
 * Process and upload image with multiple sizes
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} userId - User ID
 * @param {string} fileName - Original file name
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Upload results with URLs for different sizes
 */
const processAndUploadImage = async (imageBuffer, userId, fileName, options = {}) => {
  try {
    const {
      sizes = ['thumbnail', 'icon', 'small', 'medium', 'large'],
      folder = 'profile',
      format = 'webp',
      maintainAspectRatio = true,
      uploadOriginal = true
    } = options;

    const results = {};
    const baseName = path.parse(fileName).name;
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');

    console.log(`Processing image for user ${userId}: ${fileName} with ${sizes.length} sizes`);

    // Validate image buffer
    const imageInfo = await sharp(imageBuffer).metadata();
    console.log(`Original image: ${imageInfo.width}x${imageInfo.height}, format: ${imageInfo.format}`);

    // Upload original image (optimized) if requested
    if (uploadOriginal) {
      const originalProcessor = sharp(imageBuffer)
        .rotate()
        .withMetadata();

      if (format === 'jpeg' || format === 'jpg') {
        originalProcessor.jpeg({ quality: 92, progressive: true });
      } else if (format === 'png') {
        originalProcessor.png({ quality: 92, progressive: true });
      } else if (format === 'webp') {
        originalProcessor.webp({ quality: 92 });
      }

      const originalBuffer = await originalProcessor.toBuffer();
      const originalKey = generateS3Key(userId, folder, `${sanitizedBaseName}.${format}`, 'original');
      
      results.original = await uploadToS3(
        originalBuffer,
        originalKey,
        `image/${format}`,
        { 
          metadata: {
            userId,
            originalName: fileName,
            size: 'original',
            width: String(imageInfo.width),
            height: String(imageInfo.height)
          }
        }
      );
    }

    // Process and upload different sizes
    for (const sizeName of sizes) {
      const sizeConfig = IMAGE_SIZES[sizeName];
      
      if (!sizeConfig) {
        console.warn(`Unknown size configuration: ${sizeName}, skipping`);
        continue;
      }

      console.log(`Processing ${sizeName} size: ${sizeConfig.width}x${sizeConfig.height}`);
      
      let resizeOptions = {
        width: sizeConfig.width,
        height: sizeConfig.height,
        fit: maintainAspectRatio ? 'cover' : 'fill',
        position: 'center',
        withoutEnlargement: true
      };

      const resizedBuffer = await sharp(imageBuffer)
        .rotate()
        .resize(resizeOptions)
        .webp({ quality: sizeConfig.quality })
        .toBuffer();

      const key = generateS3Key(userId, folder, `${sanitizedBaseName}-${sizeName}.webp`, sizeName);
      
      results[sizeName] = await uploadToS3(
        resizedBuffer,
        key,
        'image/webp',
        {
          metadata: {
            userId,
            originalName: fileName,
            size: sizeName,
            width: String(sizeConfig.width),
            height: String(sizeConfig.height),
            description: sizeConfig.description
          }
        }
      );
    }

    console.log(`Image processing completed for user ${userId}: ${fileName}`);
    return results;

  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Upload file with comprehensive validation
 * @param {Object} file - Multer file object or file data
 * @param {string} userId - User ID
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with URLs
 */
const uploadFile = async (file, userId, options = {}) => {
  try {
    const {
      allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
        'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg',
        'application/pdf', 'text/plain',
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
      folder = 'uploads',
      processImages = true,
      imageSizes = ['thumbnail', 'icon', 'small', 'medium', 'large']
    } = options;

    // Input validation
    if (!file || !file.buffer) {
      throw new Error('Invalid file object provided');
    }

    if (!userId) {
      throw new Error('User ID is required for file upload');
    }

    // Validate file type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(`File size ${fileSizeMB}MB exceeds maximum allowed size ${maxSizeMB}MB`);
    }

    console.log(`Uploading file for user ${userId}: ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(1)}KB)`);

    // Process images if enabled and file is an image
    if (processImages && file.mimetype.startsWith('image/') && !file.mimetype.includes('svg')) {
      return await processAndUploadImage(file.buffer, userId, file.originalname, { 
        folder, 
        sizes: imageSizes,
        ...options 
      });
    }

    // Upload regular file
    const key = generateS3Key(userId, folder, file.originalname);
    const result = await uploadToS3(
      file.buffer,
      key,
      file.mimetype,
      {
        metadata: {
          userId,
          originalName: file.originalname,
          size: String(file.size)
        }
      }
    );

    return result;

  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

/**
 * Generate signed URL for private files
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
const generateSignedUrl = async (key, expiresIn = 3600) => {
  try {
    validateConfig();

    // Extract key from URL if full URL provided
    if (key.startsWith('http')) {
      const url = new URL(key);
      if (url.hostname.includes('s3')) {
        key = url.pathname.substring(1);
      } else if (CDN_URL && key.startsWith(CDN_URL)) {
        key = key.substring(CDN_URL.length + 1);
      }
      
      if (key.startsWith(`${BUCKET_NAME}/`)) {
        key = key.substring(`${BUCKET_NAME}/`.length);
      }
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    console.log(`Generating signed URL for: ${key} (expires in ${expiresIn}s)`);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    return signedUrl;

  } catch (error) {
    console.error('Signed URL generation error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Check if file exists in S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} - File existence status
 */
const fileExists = async (key) => {
  try {
    validateConfig();

    const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    await s3Client.send(command);
    console.log(`File exists: ${key}`);
    return true;
    
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`File not found: ${key}`);
      return false;
    }
    console.error('File existence check error:', error);
    throw error;
  }
};

/**
 * Get file metadata from S3
 * @param {string} key - S3 object key
 * @returns {Promise<Object>} - File metadata
 */
const getFileMetadata = async (key) => {
  try {
    validateConfig();

    const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const result = await s3Client.send(command);

    return {
      size: result.ContentLength,
      type: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag?.replace(/"/g, ''),
      metadata: result.Metadata || {},
      cacheControl: result.CacheControl,
      expires: result.Expires
    };

  } catch (error) {
    console.error('Get metadata error:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

/**
 * Copy file within S3
 * @param {string} sourceKey - Source file key
 * @param {string} destinationKey - Destination file key
 * @returns {Promise<Object>} - New file details
 */
const copyFile = async (sourceKey, destinationKey) => {
  try {
    validateConfig();

    const copyParams = {
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
      ACL: process.env.AWS_S3_DEFAULT_ACL || 'public-read'
    };

    console.log(`Copying file from ${sourceKey} to ${destinationKey}`);
    const command = new CopyObjectCommand(copyParams);
    await s3Client.send(command);

    return {
      key: destinationKey,
      url: generatePublicUrl(destinationKey),
      bucket: BUCKET_NAME
    };

  } catch (error) {
    console.error('File copy error:', error);
    throw new Error(`File copy failed: ${error.message}`);
  }
};

/**
 * List files in a folder
 * @param {string} prefix - Folder path/prefix
 * @param {Object} options - List options
 * @returns {Promise<Object>} - List of files
 */
const listFiles = async (prefix = '', options = {}) => {
  try {
    validateConfig();

    const {
      maxKeys = 1000,
      continuationToken = null
    } = options;

    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys
    };

    if (continuationToken) {
      listParams.ContinuationToken = continuationToken;
    }

    const command = new ListObjectsV2Command(listParams);
    const result = await s3Client.send(command);

    const files = (result.Contents || []).map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      etag: item.ETag?.replace(/"/g, ''),
      url: generatePublicUrl(item.Key)
    }));

    return {
      files,
      isTruncated: result.IsTruncated,
      nextContinuationToken: result.NextContinuationToken
    };

  } catch (error) {
    console.error('List files error:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
};

/**
 * Delete all files for a user
 * @param {string} userId - User ID
 * @param {string} folder - Specific folder to delete (optional)
 * @returns {Promise<Object>} - Deletion results
 */
const deleteUserFiles = async (userId, folder = null) => {
  try {
    validateConfig();

    const prefix = folder ? `users/${userId}/${folder}/` : `users/${userId}/`;
    console.log(`Deleting all files for user ${userId} in ${prefix}`);

    // List all files for the user
    const listResult = await listFiles(prefix, { maxKeys: 1000 });
    
    if (listResult.files.length === 0) {
      console.log(`No files found for user ${userId}`);
      return { deleted: 0, failed: 0 };
    }

    // Delete all files
    const deletePromises = listResult.files.map(file => deleteFromS3(file.key));
    const results = await Promise.allSettled(deletePromises);

    const deleted = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.filter(r => r.status === 'rejected' || r.value === false).length;

    console.log(`Deleted ${deleted} files, ${failed} failed for user ${userId}`);

    return { deleted, failed, total: listResult.files.length };

  } catch (error) {
    console.error('Delete user files error:', error);
    throw new Error(`Failed to delete user files: ${error.message}`);
  }
};

/**
 * Local file storage fallback (for development)
 */
const localStorage = {
  async upload(fileBuffer, key, contentType, options = {}) {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', path.dirname(key));

      // Create directory if it doesn't exist
      await fs.mkdir(uploadsDir, { recursive: true });

      const filePath = path.join(process.cwd(), 'uploads', key);
      await fs.writeFile(filePath, fileBuffer);

      const localUrl = `/uploads/${key}`.replace(/\/+/g, '/');
      console.log(`File saved locally: ${localUrl}`);
      
      return {
        key,
        url: localUrl,
        bucket: 'local',
        size: fileBuffer.length
      };

    } catch (error) {
      console.error('Local storage error:', error);
      throw new Error(`Local storage failed: ${error.message}`);
    }
  },

  async delete(key) {
    try {
      if (!key) return true;

      const filePath = path.join(process.cwd(), 'uploads', key);
      await fs.unlink(filePath);
      console.log(`Local file deleted: ${key}`);
      return true;

    } catch (error) {
      console.error('Local delete error:', error);
      return false;
    }
  }
};

/**
 * Initialize storage service
 */
const initializeStorage = () => {
  try {
    const hasAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const hasSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const hasBucket = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
    
    if (!hasAccessKey || !hasSecretKey || !hasBucket) {
      console.warn('⚠️  AWS S3 credentials not found. Using local storage fallback.');
      console.warn('Required environment variables:');
      console.warn('- AWS_ACCESS_KEY_ID');
      console.warn('- AWS_SECRET_ACCESS_KEY');
      console.warn('- AWS_S3_BUCKET_NAME (or AWS_S3_BUCKET)');
      return false;
    }

    console.log('✅ AWS S3 storage initialized');
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🌐 Region: ${process.env.AWS_S3_REGION || 'us-east-1'}`);
    if (USE_CDN) {
      console.log(`🔗 CDN: ${CDN_URL}`);
    }
    return true;
    
  } catch (error) {
    console.error('Storage initialization error:', error);
    return false;
  }
};

// Initialize and determine storage method
const useS3 = initializeStorage();

// Export functions based on environment
module.exports = {
  // Main functions
  uploadToS3: useS3 ? uploadToS3 : localStorage.upload,
  deleteFromS3: useS3 ? deleteFromS3 : localStorage.delete,
  processAndUploadImage: useS3 ? processAndUploadImage : async (buffer, userId, fileName, options = {}) => {
    try {
      const processedBuffer = await sharp(buffer)
        .rotate()
        .webp({ quality: 85 })
        .toBuffer();
      
      const key = `users/${userId}/profile/default/${fileName}`;
      const result = await localStorage.upload(processedBuffer, key, 'image/webp', options);
      return { medium: result };
    } catch (error) {
      console.error('Local image processing error:', error);
      const key = `users/${userId}/profile/default/${fileName}`;
      const result = await localStorage.upload(buffer, key, 'image/jpeg', options);
      return { medium: result };
    }
  },
  uploadFile: useS3 ? uploadFile : async (file, userId, options = {}) => {
    const key = `users/${userId}/${options.folder || 'uploads'}/${file.originalname}`;
    return await localStorage.upload(file.buffer, key, file.mimetype, options);
  },

  // URL generation
  generatePublicUrl,

  // Advanced functions
  generateSignedUrl: useS3 ? generateSignedUrl : async (key) => {
    console.warn('Signed URLs not available in local storage mode');
    return `/uploads/${key}`;
  },
  fileExists: useS3 ? fileExists : async () => {
    console.warn('File existence check not available in local storage mode');
    return true;
  },
  getFileMetadata: useS3 ? getFileMetadata : async () => {
    console.warn('File metadata not available in local storage mode');
    return {};
  },
  copyFile: useS3 ? copyFile : async (source, dest) => {
    console.warn('File copying not available in local storage mode');
    return { key: dest, url: `/uploads/${dest}` };
  },
  listFiles: useS3 ? listFiles : async () => {
    console.warn('File listing not available in local storage mode');
    return { files: [], isTruncated: false };
  },
  deleteUserFiles: useS3 ? deleteUserFiles : async (userId, folder) => {
    console.warn('Bulk delete not available in local storage mode');
    return { deleted: 0, failed: 0, total: 0 };
  },

  // Utility functions
  validateConfig,
  generateS3Key,

  // Storage info
  isS3Enabled: useS3,
  bucketName: BUCKET_NAME,
  cdnUrl: CDN_URL,
  imageSizes: IMAGE_SIZES,
  
  // Backward compatibility
  upload: useS3 ? uploadToS3 : localStorage.upload,
  delete: useS3 ? deleteFromS3 : localStorage.delete,
};