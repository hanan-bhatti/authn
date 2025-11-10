const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('../utils/config');
const docsConverter = require('../utils/docsConverter');
const { ApiResponse, ApiError } = require('../utils/helpers');

/**
 * API Documentation Routes
 * Serves converted markdown documentation as HTML pages
 */

// Helper function to check if HTML is preferred
const prefersHtml = (req) => {
  if (req.query.format === 'html') return true;
  const acceptHeader = req.get('Accept') || '';
  return acceptHeader.includes('text/html') && !acceptHeader.includes('application/json');
};

// Check if API docs are enabled
const checkDocsEnabled = (req, res, next) => {
  if (!config.API_DOCS_ENABLED) {
    throw new ApiError('API documentation is not enabled', 404);
  }
  next();
};

/**
 * GET /api/docs
 * Documentation index page
 */
router.get('/', checkDocsEnabled, async (req, res, next) => {
  try {
    const html = await docsConverter.generateDocsIndex();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(new ApiError(`Failed to generate documentation index: ${error.message}`, 500));
  }
});

/**
 * GET /api/docs/list
 * List all available documentation files
 * Supports both JSON and HTML responses
 */
router.get('/list', checkDocsEnabled, async (req, res, next) => {
  try {
    const docs = await docsConverter.getAvailableDocs();
    
    // If HTML is preferred, serve the docs list page
    if (prefersHtml(req)) {
      return res.sendFile(path.join(__dirname, '../public/docs-list.html'));
    }
    
    // Otherwise return JSON
    res.json(new ApiResponse({
      data: {
        docs: docs.map(doc => ({
          name: doc.name,
          title: doc.title,
          url: `${config.API_DOCS_PATH}/${doc.name}`,
          location: doc.location
        })),
        count: docs.length
      },
      message: 'Available documentation',
      req
    }));
  } catch (error) {
    next(new ApiError(`Failed to list documentation: ${error.message}`, 500));
  }
});

/**
 * GET /api/docs/:docName
 * View specific documentation page
 */
router.get('/:docName', checkDocsEnabled, async (req, res, next) => {
  try {
    const { docName } = req.params;
    
    // Sanitize document name (prevent path traversal)
    const sanitizedName = docName.replace(/[^a-zA-Z0-9-_]/g, '');
    
    const html = await docsConverter.convertDocToHtml(sanitizedName);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    if (error.message.includes('not found')) {
      next(new ApiError(error.message, 404));
    } else {
      next(new ApiError(`Failed to load documentation: ${error.message}`, 500));
    }
  }
});

/**
 * GET /api/docs/:docName/raw
 * Get raw markdown content (JSON)
 */
router.get('/:docName/raw', checkDocsEnabled, async (req, res, next) => {
  try {
    const { docName } = req.params;
    const sanitizedName = docName.replace(/[^a-zA-Z0-9-_]/g, '');
    
    const docs = await docsConverter.getAvailableDocs();
    const doc = docs.find(d => d.name === sanitizedName.toLowerCase());

    if (!doc) {
      throw new ApiError(`Documentation '${sanitizedName}' not found`, 404);
    }

    const markdown = await docsConverter.readMarkdownFile(doc.path);
    
    res.json(new ApiResponse(true, 'Raw documentation content', {
      name: doc.name,
      title: doc.title,
      content: markdown,
      format: 'markdown'
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/docs/convert
 * Convert custom markdown to HTML (for testing)
 */
router.post('/convert', checkDocsEnabled, async (req, res, next) => {
  try {
    const { markdown, title, description } = req.body;

    if (!markdown) {
      throw new ApiError('Markdown content is required', 400);
    }

    const html = docsConverter.markdownToHtml(markdown);
    const fullHtml = docsConverter.wrapInTemplate(html, { title, description });

    res.json(new ApiResponse(true, 'Markdown converted successfully', {
      html: fullHtml,
      preview: html
    }));
  } catch (error) {
    next(new ApiError(`Conversion failed: ${error.message}`, 500));
  }
});

module.exports = router;
