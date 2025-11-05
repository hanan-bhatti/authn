const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Configure Filebase (S3-compatible) with AWS SDK v3
const filebaseConfig = {
  endpoint: process.env.FILEBASE_ENDPOINT || 'https://s3.filebase.com',
  region: process.env.FILEBASE_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.FILEBASE_ACCESS_KEY_ID,
    secretAccessKey: process.env.FILEBASE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Important for Filebase compatibility
};

const filebase = new S3Client(filebaseConfig);

// Support both FILEBASE_BUCKET_NAME and FILEBASE_BUCKET for flexibility
const BUCKET_NAME = process.env.FILEBASE_BUCKET_NAME || process.env.FILEBASE_BUCKET || 'your-filebase-bucket';

// IPFS Gateway URL for your Filebase bucket
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://spotless-orange-flea.myfilebase.com';

// Utility function to validate environment variables
const validateConfig = () => {
  const requiredVars = [
    'FILEBASE_ACCESS_KEY_ID',
    'FILEBASE_SECRET_ACCESS_KEY'
  ];
  
  // Check for bucket name (either variable name works)
  const hasBucket = process.env.FILEBASE_BUCKET_NAME || process.env.FILEBASE_BUCKET;
  if (!hasBucket) {
    requiredVars.push('FILEBASE_BUCKET_NAME or FILEBASE_BUCKET');
  }
  
  const missing = requiredVars.filter(varName => {
    if (varName.includes('BUCKET')) return false; // Already checked above
    return !process.env[varName];
  });
  
  if (missing.length > 0 || !hasBucket) {
    const allMissing = [...missing];
    if (!hasBucket) allMissing.push('FILEBASE_BUCKET_NAME or FILEBASE_BUCKET');
    throw new Error(`Missing required environment variables: ${allMissing.join(', ')}`);
  }
};

/**
 * Extract IPFS CID from Filebase using HeadObject
 * @param {string} key - S3 object key
 * @returns {string} - IPFS CID
 */
const extractIpfsHash = async (key) => {
  try {
    console.log(`Extracting IPFS CID for key: ${key}`);
    
    // Use HeadObject to get the CID from Filebase
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    
    const headResult = await filebase.send(headCommand);
    console.log('HeadObject response metadata:', headResult.Metadata);
    console.log('HeadObject response headers:', headResult.$metadata);
    
    // Filebase returns CID in different possible locations:
    // 1. In custom metadata
    if (headResult.Metadata && headResult.Metadata.cid) {
      console.log(`Found CID in metadata: ${headResult.Metadata.cid}`);
      return headResult.Metadata.cid;
    }
    
    if (headResult.Metadata && headResult.Metadata.ipfshash) {
      console.log(`Found IPFS hash in metadata: ${headResult.Metadata.ipfshash}`);
      return headResult.Metadata.ipfshash;
    }
    
    // 2. In response headers (check httpHeaders from AWS SDK response)
    const httpHeaders = headResult.$metadata?.httpHeaders || {};
    
    // Check common header names that Filebase might use
    const possibleCidHeaders = [
      'x-amz-meta-cid',
      'x-ipfs-hash', 
      'x-filebase-cid',
      'cid',
      'ipfs-hash'
    ];
    
    for (const header of possibleCidHeaders) {
      if (httpHeaders[header]) {
        console.log(`Found CID in header ${header}: ${httpHeaders[header]}`);
        return httpHeaders[header];
      }
    }
    
    // 3. Try to extract from ETag if it looks like a CID
    if (headResult.ETag) {
      const etag = headResult.ETag.replace(/"/g, '');
      // Check if ETag looks like an IPFS CID (starts with Qm or b)
      if (etag.match(/^(Qm[a-zA-Z0-9]{44}|b[a-z2-7]{58})$/)) {
        console.log(`Found CID in ETag: ${etag}`);
        return etag;
      }
    }

    console.warn('Could not find CID in any expected location');
    throw new Error('CID not found in response');

  } catch (error) {
    console.error('Error extracting IPFS CID:', error);
    throw new Error(`Failed to extract IPFS CID: ${error.message}`);
  }
};

/**
 * Upload file to Filebase and return IPFS CID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} contentType - MIME type
 * @param {Object} options - Upload options
 * @returns {Promise<string>} - IPFS CID
 */
const uploadToFilebase = async (fileBuffer, fileName, contentType, options = {}) => {
  try {
    validateConfig();

    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${options.folder || 'uploads'}/${Date.now()}-${uuidv4()}-${sanitizedFileName}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: options.acl || 'public-read',
      Metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: fileName,
        ...options.metadata
      }
    };

    // Add cache control for different file types
    if (contentType.startsWith('image/')) {
      uploadParams.CacheControl = 'max-age=31536000'; // 1 year for images
    } else if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
      uploadParams.CacheControl = 'max-age=2592000'; // 30 days for media
    } else {
      uploadParams.CacheControl = 'max-age=86400'; // 1 day for other files
    }

    console.log(`Uploading file to Filebase: ${key}`);

    let uploadResult;

    // Use multipart upload for larger files
    if (fileBuffer.length > 5 * 1024 * 1024) { // 5MB threshold
      const upload = new Upload({
        client: filebase,
        params: uploadParams,
        queueSize: 4,
        leavePartsOnError: false,
      });

      uploadResult = await upload.done();
      console.log(`File uploaded successfully (multipart): ${uploadResult.Location}`);
      console.log('Upload result:', uploadResult);
      
      // Check if CID is in the upload result
      if (uploadResult.$metadata?.httpHeaders) {
        const headers = uploadResult.$metadata.httpHeaders;
        console.log('Upload response headers:', headers);
      }
      
    } else {
      // Use simple upload for smaller files
      const command = new PutObjectCommand(uploadParams);
      const result = await filebase.send(command);
      uploadResult = result;
      console.log(`File uploaded successfully`);
      console.log('Upload result:', result);
      
      // Check if CID is in the response headers
      if (result.$metadata?.httpHeaders) {
        const headers = result.$metadata.httpHeaders;
        console.log('Upload response headers:', headers);
        
        // Try to find CID in response headers
        const possibleCidHeaders = [
          'x-amz-meta-cid',
          'x-ipfs-hash', 
          'x-filebase-cid',
          'cid',
          'ipfs-hash'
        ];
        
        for (const header of possibleCidHeaders) {
          if (headers[header]) {
            console.log(`Found CID in upload response header ${header}: ${headers[header]}`);
            return headers[header];
          }
        }
      }
    }

    // Wait a moment for Filebase to process the file and generate CID
    console.log('Waiting for Filebase to process file...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to get the IPFS CID using HeadObject
    try {
      const cid = await extractIpfsHash(key);
      console.log(`IPFS CID extracted: ${cid}`);
      return cid;
    } catch (hashError) {
      console.warn('Could not extract IPFS CID immediately, retrying...', hashError.message);
      
      // Retry after a longer wait
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const cid = await extractIpfsHash(key);
        console.log(`IPFS CID extracted on retry: ${cid}`);
        return cid;
      } catch (retryError) {
        console.error('Failed to extract IPFS CID after retry:', retryError.message);
        
        // As a fallback, return the S3 key - you might need to map this later
        console.warn(`Returning S3 key as fallback: ${key}`);
        return key;
      }
    }

  } catch (error) {
    console.error('Filebase upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Filebase using IPFS CID or S3 key
 * @param {string} fileIdentifier - IPFS CID, S3 key, or full URL
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromFilebase = async (fileIdentifier) => {
  try {
    if (!fileIdentifier) {
      console.log('No file identifier provided for deletion');
      return true;
    }

    validateConfig();

    let key;

    // If it's an IPFS CID, we need to find the corresponding S3 object
    if (fileIdentifier.match(/^(Qm[a-zA-Z0-9]{44}|b[a-z2-7]{58})$/)) {
      // This is an IPFS CID - we need to find the corresponding S3 key
      console.log(`Attempting to delete file with IPFS CID: ${fileIdentifier}`);
      
      // Search for objects that might have this CID
      try {
        const listResult = await listFiles('', { maxKeys: 1000 });
        const matchingFile = listResult.files.find(async (file) => {
          try {
            const fileCid = await extractIpfsHash(file.key);
            return fileCid === fileIdentifier;
          } catch {
            return false;
          }
        });

        if (matchingFile) {
          key = matchingFile.key;
        } else {
          console.warn(`Could not find S3 object for IPFS CID: ${fileIdentifier}`);
          return true; // Consider it deleted if we can't find it
        }
      } catch (searchError) {
        console.warn('Error searching for file to delete:', searchError.message);
        return true;
      }
    } else if (fileIdentifier.startsWith('http')) {
      // Extract key from URL
      const urlParts = new URL(fileIdentifier);
      key = urlParts.pathname.substring(1); // Remove leading slash
      // Remove bucket name if it's in the path
      if (key.startsWith(`${BUCKET_NAME}/`)) {
        key = key.substring(`${BUCKET_NAME}/`.length);
      }
    } else {
      // Assume it's already a key
      key = fileIdentifier;
    }

    if (!key) {
      console.warn('Could not determine S3 key for deletion');
      return true;
    }

    console.log(`Deleting file from Filebase: ${key}`);

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    const command = new DeleteObjectCommand(deleteParams);
    await filebase.send(command);
    console.log(`File deleted successfully: ${key}`);
    return true;

  } catch (error) {
    console.error('Filebase delete error:', error);
    // Don't throw error for delete operations to avoid blocking user actions
    return false;
  }
};

/**
 * Process and upload image with multiple sizes, returning IPFS CIDs
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} fileName - Original file name
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Upload results with IPFS CIDs for different sizes
 */
const processAndUploadImage = async (imageBuffer, fileName, options = {}) => {
  try {
    const {
      sizes = [
        { name: 'thumbnail', width: 150, height: 150 },
        { name: 'small', width: 300, height: 300 },
        { name: 'medium', width: 800, height: 600 },
        { name: 'large', width: 1920, height: 1080 }
      ],
      quality = 85,
      format = 'webp',
      folder = 'images',
      maintainAspectRatio = true
    } = options;

    const results = {};
    const baseName = path.parse(fileName).name;
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');

    console.log(`Processing image: ${fileName} with ${sizes.length} sizes`);

    // Validate image buffer
    const imageInfo = await sharp(imageBuffer).metadata();
    console.log(`Original image: ${imageInfo.width}x${imageInfo.height}, format: ${imageInfo.format}`);

    // Upload original image (optimized)
    const originalProcessor = sharp(imageBuffer)
      .rotate()
      .withMetadata();

    if (format === 'jpeg' || format === 'jpg') {
      originalProcessor.jpeg({ quality: quality, progressive: true });
    } else if (format === 'png') {
      originalProcessor.png({ quality: quality, progressive: true });
    } else if (format === 'webp') {
      originalProcessor.webp({ quality: quality });
    }

    const originalBuffer = await originalProcessor.toBuffer();
    results.original = await uploadToFilebase(
      originalBuffer,
      `${sanitizedBaseName}.${format}`,
      `image/${format}`,
      { folder: `${folder}/original` }
    );

    // Process and upload different sizes
    for (const size of sizes) {
      console.log(`Processing ${size.name} size: ${size.width}x${size.height}`);
      
      let resizeOptions = {
        width: size.width,
        height: size.height,
        fit: maintainAspectRatio ? 'inside' : 'cover',
        position: 'center',
        withoutEnlargement: true
      };

      const resizedBuffer = await sharp(imageBuffer)
        .rotate()
        .resize(resizeOptions)
        .webp({ quality: quality })
        .toBuffer();

      results[size.name] = await uploadToFilebase(
        resizedBuffer,
        `${sanitizedBaseName}-${size.name}.webp`,
        'image/webp',
        { folder: `${folder}/${size.name}` }
      );
    }

    console.log(`Image processing completed for: ${fileName}`);
    return results;

  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Upload file with comprehensive validation, returning IPFS CID
 * @param {Object} file - Multer file object or file data
 * @param {Object} options - Upload options
 * @returns {Promise<string|Object>} - IPFS CID or object with CIDs for images
 */
const uploadFile = async (file, options = {}) => {
  try {
    const {
      allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/mpeg', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/mp3',
        'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      maxSize = 50 * 1024 * 1024, // 50MB default
      folder = 'uploads',
      processImages = true
    } = options;

    // Input validation
    if (!file || !file.buffer) {
      throw new Error('Invalid file object provided');
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

    console.log(`Uploading file: ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(1)}KB)`);

    // Process images if enabled and file is an image
    if (processImages && file.mimetype.startsWith('image/') && !file.mimetype.includes('svg')) {
      return await processAndUploadImage(file.buffer, file.originalname, { folder, ...options });
    }

    // Upload regular file and return IPFS CID
    const cid = await uploadToFilebase(
      file.buffer,
      file.originalname,
      file.mimetype,
      { folder }
    );

    return cid; // Return just the IPFS CID for non-image files

  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

/**
 * Generate IPFS URL from CID
 * @param {string} cid - IPFS CID
 * @returns {string} - Full IPFS URL
 */
const generateIpfsUrl = (cid) => {
  if (!cid || cid === 'default') {
    return `${IPFS_GATEWAY}/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W`; // Default avatar
  }
  
  // If it's already a full URL, return it
  if (cid.startsWith('http')) {
    return cid;
  }
  
  // If it looks like a CID, build the full IPFS URL
  if (cid.match(/^(Qm[a-zA-Z0-9]{44}|b[a-z2-7]{58})$/)) {
    return `${IPFS_GATEWAY}/ipfs/${cid}`;
  }
  
  // If it's an S3 key (fallback case), construct S3 URL
  if (cid.includes('/')) {
    return `${filebaseConfig.endpoint}/${BUCKET_NAME}/${cid}`;
  }
  
  // Last resort - assume it's a CID
  return `${IPFS_GATEWAY}/ipfs/${cid}`;
};

/**
 * Generate signed URL for private files using AWS SDK v3
 * @param {string} key - Filebase object key or IPFS CID
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL or IPFS URL
 */
const generateSignedUrl = async (key, expiresIn = 3600) => {
  try {
    // If it's an IPFS CID, return the IPFS URL (no signing needed for public IPFS)
    if (key.match(/^(Qm[a-zA-Z0-9]{44}|b[a-z2-7]{58})$/)) {
      return generateIpfsUrl(key);
    }

    // If it's already a full IPFS URL, return it
    if (key.includes('/ipfs/')) {
      return key;
    }

    // Otherwise, try to generate a signed URL for S3
    validateConfig();

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    console.log(`Generating signed URL for: ${key} (expires in ${expiresIn}s)`);
    const signedUrl = await getSignedUrl(filebase, command, { expiresIn });
    
    return signedUrl;

  } catch (error) {
    console.error('Signed URL generation error:', error);
    // Fallback to IPFS URL if available
    if (key.match(/^(Qm[a-zA-Z0-9]{44}|b[a-z2-7]{58})$/)) {
      return generateIpfsUrl(key);
    }
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Check if file exists in Filebase using AWS SDK v3
 * @param {string} key - Filebase object key
 * @returns {Promise<boolean>} - File existence status
 */
const fileExists = async (key) => {
  try {
    validateConfig();

    const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    await filebase.send(command);
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
 * Get file metadata from Filebase using AWS SDK v3
 * @param {string} key - Filebase object key
 * @returns {Promise<Object>} - File metadata including IPFS CID
 */
const getFileMetadata = async (key) => {
  try {
    validateConfig();

    const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const result = await filebase.send(command);

    // Try to extract IPFS CID
    let ipfsCid = null;
    try {
      ipfsCid = await extractIpfsHash(key);
    } catch (cidError) {
      console.warn('Could not extract IPFS CID for metadata:', cidError.message);
    }

    return {
      size: result.ContentLength,
      type: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag?.replace(/"/g, ''),
      metadata: result.Metadata || {},
      cacheControl: result.CacheControl,
      expires: result.Expires,
      ipfsCid: ipfsCid
    };

  } catch (error) {
    console.error('Get metadata error:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

/**
 * Copy file within Filebase using AWS SDK v3
 * @param {string} sourceKey - Source file key
 * @param {string} destinationKey - Destination file key
 * @returns {Promise<string>} - New file IPFS CID
 */
const copyFile = async (sourceKey, destinationKey) => {
  try {
    validateConfig();

    const copyParams = {
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
      ACL: 'public-read'
    };

    console.log(`Copying file from ${sourceKey} to ${destinationKey}`);
    const command = new CopyObjectCommand(copyParams);
    await filebase.send(command);

    // Try to get the IPFS CID for the new file
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
      return await extractIpfsHash(destinationKey);
    } catch (hashError) {
      console.warn('Could not extract IPFS CID for copied file:', hashError.message);
      return destinationKey; // Return the key as fallback
    }

  } catch (error) {
    console.error('File copy error:', error);
    throw new Error(`File copy failed: ${error.message}`);
  }
};

/**
 * List files in a folder using AWS SDK v3
 * @param {string} folder - Folder path
 * @param {Object} options - List options
 * @returns {Promise<Array>} - List of files
 */
const listFiles = async (folder = '', options = {}) => {
  try {
    validateConfig();

    const {
      maxKeys = 1000,
      continuationToken = null
    } = options;

    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: folder,
      MaxKeys: maxKeys
    };

    if (continuationToken) {
      listParams.ContinuationToken = continuationToken;
    }

    const command = new ListObjectsV2Command(listParams);
    const result = await filebase.send(command);

    const files = (result.Contents || []).map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      etag: item.ETag?.replace(/"/g, ''),
      url: `${filebaseConfig.endpoint}/${BUCKET_NAME}/${item.Key}`
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
 * Local file storage fallback (for development)
 */
const localStorage = {
  async upload(fileBuffer, fileName, contentType, options = {}) {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', options.folder || '');

      // Create directory if it doesn't exist
      await fs.mkdir(uploadsDir, { recursive: true });

      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${Date.now()}-${uuidv4()}-${sanitizedFileName}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      await fs.writeFile(filePath, fileBuffer);

      // Return local URL (simulating IPFS CID format)
      const localUrl = `/uploads/${options.folder || ''}/${uniqueFileName}`.replace(/\/+/g, '/');
      console.log(`File saved locally: ${localUrl}`);
      return `local_${uuidv4().replace(/-/g, '')}${Date.now()}`; // Mock IPFS CID

    } catch (error) {
      console.error('Local storage error:', error);
      throw new Error(`Local storage failed: ${error.message}`);
    }
  },

  async delete(fileUrl) {
    try {
      if (!fileUrl || (!fileUrl.startsWith('/uploads/') && !fileUrl.startsWith('local_'))) return true;

      if (fileUrl.startsWith('local_')) {
        console.log(`Mock deletion of local file: ${fileUrl}`);
        return true;
      }

      const filePath = path.join(process.cwd(), fileUrl);
      await fs.unlink(filePath);
      console.log(`Local file deleted: ${fileUrl}`);
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
    // Check if Filebase credentials are available
    const hasAccessKey = process.env.FILEBASE_ACCESS_KEY_ID;
    const hasSecretKey = process.env.FILEBASE_SECRET_ACCESS_KEY;
    const hasBucket = process.env.FILEBASE_BUCKET_NAME || process.env.FILEBASE_BUCKET;
    
    if (!hasAccessKey || !hasSecretKey || !hasBucket) {
      console.warn('⚠️  Filebase credentials not found. Using local storage fallback.');
      console.warn('Required environment variables:');
      console.warn('- FILEBASE_ACCESS_KEY_ID');
      console.warn('- FILEBASE_SECRET_ACCESS_KEY');
      console.warn('- FILEBASE_BUCKET_NAME (or FILEBASE_BUCKET)');
      return false;
    }

    console.log('✅ Filebase storage initialized with AWS SDK v3');
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🌐 Endpoint: ${filebaseConfig.endpoint}`);
    console.log(`🔗 IPFS Gateway: ${IPFS_GATEWAY}`);
    return true;
    
  } catch (error) {
    console.error('Storage initialization error:', error);
    return false;
  }
};

// Initialize and determine storage method
const useFilebase = initializeStorage();

// Export functions based on environment
module.exports = {
  // Main functions - return IPFS CIDs
  uploadToFilebase: useFilebase ? uploadToFilebase : localStorage.upload,
  deleteFromFilebase: useFilebase ? deleteFromFilebase : localStorage.delete,
  processAndUploadImage: useFilebase ? processAndUploadImage : async (buffer, fileName, options = {}) => {
    try {
      const processedBuffer = await sharp(buffer)
        .rotate()
        .webp({ quality: 85 })
        .toBuffer();
      
      const result = await localStorage.upload(processedBuffer, fileName, 'image/webp', options);
      return { original: result }; // Returns mock IPFS hash
    } catch (error) {
      console.error('Local image processing error:', error);
      const result = await localStorage.upload(buffer, fileName, 'image/jpeg', options);
      return { original: result };
    }
  },
  uploadFile: useFilebase ? uploadFile : async (file, options = {}) => {
    const result = await localStorage.upload(file.buffer, file.originalname, file.mimetype, options);
    return result; // Returns mock IPFS hash
  },

  // URL generation
  generateIpfsUrl,

  // Advanced functions (only available with Filebase)
  generateSignedUrl: useFilebase ? generateSignedUrl : async (key) => {
    console.warn('Signed URLs not available in local storage mode');
    return key.startsWith('local_') ? `/uploads/mock/${key}` : key;
  },
  fileExists: useFilebase ? fileExists : async () => {
    console.warn('File existence check not available in local storage mode');
    return true;
  },
  getFileMetadata: useFilebase ? getFileMetadata : async () => {
    console.warn('File metadata not available in local storage mode');
    return {};
  },
  copyFile: useFilebase ? copyFile : async (source, dest) => {
    console.warn('File copying not available in local storage mode');
    return `local_${uuidv4().replace(/-/g, '')}${Date.now()}`;
  },
  listFiles: useFilebase ? listFiles : async () => {
    console.warn('File listing not available in local storage mode');
    return { files: [], isTruncated: false };
  },

  // Utility functions
  validateConfig,
  extractIpfsHash,

  // Storage info
  isFilebaseEnabled: useFilebase,
  bucketName: BUCKET_NAME,
  ipfsGateway: IPFS_GATEWAY,
  
  // Backward compatibility aliases
  uploadToS3: useFilebase ? uploadToFilebase : localStorage.upload,
  deleteFromS3: useFilebase ? deleteFromFilebase : localStorage.delete,
};