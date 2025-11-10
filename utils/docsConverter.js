const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');
const config = require('./config');

/**
 * API Documentation Converter
 * Converts markdown documentation files to HTML pages
 */

/**
 * Read markdown file
 * @param {string} filePath - Path to markdown file
 * @returns {Promise<string>} - Markdown content
 */
const readMarkdownFile = async (filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read markdown file: ${error.message}`);
  }
};

/**
 * Convert markdown to HTML
 * @param {string} markdown - Markdown content
 * @param {Object} options - Conversion options
 * @returns {string} - HTML content
 */
const markdownToHtml = (markdown, options = {}) => {
  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true, // GitHub Flavored Markdown
    headerIds: true,
    mangle: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: true,
    ...options
  });

  return marked.parse(markdown);
};

/**
 * Generate breadcrumbs HTML
 * @param {string} currentDoc - Currently active document
 * @param {string} docTitle - Document title
 * @returns {string} - Breadcrumbs HTML
 */
const generateBreadcrumbs = (currentDoc, docTitle) => {
  const isIndex = !currentDoc || currentDoc === '';
  
  let html = '<nav class="breadcrumbs" aria-label="Breadcrumb">';
  html += '<ol>';
  html += '<li><a href="/"><i class="fas fa-home"></i> Home</a></li>';
  html += '<li><a href="' + config.API_DOCS_PATH + '"><i class="fas fa-book"></i> Docs</a></li>';
  
  if (!isIndex) {
    html += '<li class="active" aria-current="page">' + docTitle + '</li>';
  }
  
  html += '</ol>';
  html += '</nav>';
  
  return html;
};

/**
 * Generate table of contents from HTML
 * @param {string} htmlContent - HTML content
 * @returns {string} - TOC HTML
 */
const generateTableOfContents = (htmlContent) => {
  const headingRegex = /<h([2-3])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]*>/g, '').trim()
    });
  }

  if (headings.length === 0) return '';

  let html = '<div class="toc-container">';
  html += '<div class="toc-header">';
  html += '<h4><i class="fas fa-list"></i> On This Page</h4>';
  html += '<button class="toc-toggle" onclick="toggleTOC()" aria-label="Toggle table of contents"><i class="fas fa-minus"></i></button>';
  html += '</div>';
  html += '<nav class="toc" id="toc">';
  html += '<ul>';

  headings.forEach(heading => {
    const indent = heading.level === 3 ? 'toc-indent' : '';
    html += `<li class="${indent}"><a href="#${heading.id}">${heading.text}</a></li>`;
  });

  html += '</ul>';
  html += '</nav>';
  html += '</div>';

  return html;
};

/**
 * Generate sidebar navigation HTML
 * @param {Array} docs - Available documentation files
 * @param {string} currentDoc - Currently active document
 * @returns {string} - Sidebar HTML
 */
const generateSidebar = (docs, currentDoc = '') => {
  const docsByLocation = {
    docs: docs.filter(d => d.location === 'docs'),
    root: docs.filter(d => d.location === 'root')
  };

  let html = '<div class="sidebar-search">';
  html += '<i class="fas fa-search search-icon"></i>';
  html += '<input type="text" id="docSearch" placeholder="Search docs..." onkeyup="filterDocs()">';
  html += '</div>';

  html += '<div class="sidebar-section">';
  html += '<h3><i class="fas fa-book section-icon"></i> Documentation</h3>';
  html += '<ul id="docsList">';
  docsByLocation.docs.forEach(doc => {
    const active = doc.name === currentDoc ? 'active' : '';
    html += `<li class="doc-item"><a href="${config.API_DOCS_PATH}/${doc.name}" class="${active}"><i class="fas fa-file-alt doc-icon"></i>${doc.title}</a></li>`;
  });
  html += '</ul></div>';

  if (docsByLocation.root.length > 0) {
    html += '<div class="sidebar-section">';
    html += '<h3><i class="fas fa-folder-open section-icon"></i> Project Info</h3>';
    html += '<ul>';
    docsByLocation.root.forEach(doc => {
      const active = doc.name === currentDoc ? 'active' : '';
      let iconClass = 'fa-file-alt';
      if (doc.name === 'readme') iconClass = 'fa-book-open';
      else if (doc.name === 'changelog') iconClass = 'fa-list-ul';
      else if (doc.name === 'security') iconClass = 'fa-shield-alt';
      else if (doc.name === 'features') iconClass = 'fa-star';
      html += `<li class="doc-item"><a href="${config.API_DOCS_PATH}/${doc.name}" class="${active}"><i class="fas ${iconClass} doc-icon"></i>${doc.title}</a></li>`;
    });
    html += '</ul></div>';
  }

  html += '<div class="sidebar-section">';
  html += '<h3><i class="fas fa-bolt section-icon"></i> Quick Links</h3>';
  html += '<ul>';
  html += `<li><a href="/"><i class="fas fa-home doc-icon"></i>Home</a></li>`;
  html += `<li><a href="/info"><i class="fas fa-info-circle doc-icon"></i>Server Info</a></li>`;
  html += `<li><a href="/health"><i class="fas fa-heartbeat doc-icon"></i>Health Check</a></li>`;
  html += '</ul></div>';

  html += '<div class="sidebar-footer">';
  html += `<div class="version-info">`;
  html += `<span class="version-label"><i class="fas fa-tag"></i> Version</span>`;
  html += `<span class="version-number">${config.APP_VERSION || '1.0.0'}</span>`;
  html += `</div>`;
  html += '</div>';

  return html;
};

/**
 * Wrap HTML content in a styled template with sidebar navigation
 * @param {string} htmlContent - HTML content
 * @param {Object} meta - Page metadata
 * @returns {string} - Complete HTML page
 */
const wrapInTemplate = async (htmlContent, meta = {}) => {
  const {
    title = 'API Documentation',
    description = 'API Documentation for Authn Authentication System',
    author = config.APP_AUTHOR || 'Authn',
    version = config.APP_VERSION || '1.0.0',
    currentDoc = ''
  } = meta;

  // Get docs for sidebar
  const docs = await getAvailableDocs();
  const sidebarHtml = generateSidebar(docs, currentDoc);
  const breadcrumbsHtml = generateBreadcrumbs(currentDoc, title);
  const tocHtml = generateTableOfContents(htmlContent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description}">
  <meta name="author" content="${author}">
  <title>${title} - ${config.APP_NAME}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    /* Modern Premium Documentation Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --primary-light: #818cf8;
      --secondary: #8b5cf6;
      --accent: #ec4899;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #3b82f6;
      
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --bg-elevated: #ffffff;
      
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-tertiary: #94a3b8;
      
      --border-color: #e2e8f0;
      --border-light: #f1f5f9;
      
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      --shadow-md: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.1);
      
      --sidebar-width: 280px;
      --header-height: 64px;
      --toc-width: 240px;
      
      --radius-sm: 6px;
      --radius: 8px;
      --radius-lg: 12px;
      
      --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-tertiary: #334155;
        --bg-elevated: #1e293b;
        
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --text-tertiary: #64748b;
        
        --border-color: #334155;
        --border-light: #1e293b;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', Roboto, 'Helvetica Neue', sans-serif;
      line-height: 1.7;
      color: var(--text-primary);
      background: var(--bg-secondary);
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Header */
    .header {
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-color);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 1000;
      height: var(--header-height);
      box-shadow: var(--shadow-sm);
    }

    .header-content {
      max-width: 1600px;
      margin: 0 auto;
      padding: 0 24px;
      height: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 700;
      font-size: 1.25rem;
      transition: var(--transition);
    }

    .logo:hover {
      color: var(--primary);
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .version-badge {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .theme-toggle, .mobile-menu-btn {
      background: var(--bg-tertiary);
      border: none;
      color: var(--text-primary);
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
      font-size: 1rem;
    }

    .theme-toggle:hover, .mobile-menu-btn:hover {
      background: var(--bg-tertiary);
      transform: scale(1.05);
    }

    /* Breadcrumbs */
    .breadcrumbs {
      padding: 16px 0;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-light);
    }

    .breadcrumbs ol {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0;
      margin: 0;
    }

    .breadcrumbs li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .breadcrumbs li:not(:last-child)::after {
      content: '›';
      color: var(--text-tertiary);
    }

    .breadcrumbs a {
      color: var(--text-secondary);
      text-decoration: none;
      transition: var(--transition);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
    }

    .breadcrumbs a:hover {
      color: var(--primary);
      background: var(--bg-tertiary);
    }

    .breadcrumbs .active {
      color: var(--text-primary);
      font-weight: 500;
    }

    /* Layout */
    .layout {
      display: flex;
      max-width: 1600px;
      margin: 0 auto;
      min-height: calc(100vh - var(--header-height));
      position: relative;
    }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-elevated);
      border-right: 1px solid var(--border-color);
      position: sticky;
      top: var(--header-height);
      height: calc(100vh - var(--header-height));
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .sidebar::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar::-webkit-scrollbar-track {
      background: transparent;
    }

    .sidebar::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 3px;
    }

    .sidebar::-webkit-scrollbar-thumb:hover {
      background: var(--text-tertiary);
    }

    .sidebar-search {
      padding: 20px 16px 16px;
      border-bottom: 1px solid var(--border-light);
      position: sticky;
      top: 0;
      background: var(--bg-elevated);
      z-index: 10;
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 28px;
      top: 30px;
      color: var(--text-tertiary);
      font-size: 0.9rem;
      pointer-events: none;
    }

    .sidebar-search input {
      width: 100%;
      padding: 10px 14px 10px 36px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.875rem;
      transition: var(--transition);
    }

    .sidebar-search input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .sidebar-section {
      padding: 20px 16px;
      border-bottom: 1px solid var(--border-light);
    }

    .sidebar-section:last-of-type {
      border-bottom: none;
      flex: 1;
    }

    .sidebar-section h3 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-tertiary);
      margin-bottom: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      font-size: 0.9rem;
      margin-right: 4px;
      opacity: 0.9;
    }

    .sidebar ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .sidebar li {
      margin: 2px 0;
    }

    .sidebar a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      color: var(--text-secondary);
      text-decoration: none;
      border-radius: var(--radius-sm);
      transition: var(--transition);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .sidebar a:hover {
      background: var(--bg-tertiary);
      color: var(--primary);
      transform: translateX(2px);
    }

    .sidebar a.active {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      font-weight: 600;
      box-shadow: var(--shadow);
    }

    .doc-icon {
      font-size: 0.95rem;
      opacity: 0.7;
      width: 20px;
      text-align: center;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border-light);
      background: var(--bg-secondary);
      margin-top: auto;
    }

    .version-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .version-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .version-number {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary);
      font-family: 'Courier New', monospace;
    }

    /* Main Content */
    .content-wrapper {
      flex: 1;
      display: flex;
      min-width: 0;
    }

    .main-content {
      flex: 1;
      padding: 32px 48px;
      max-width: 900px;
      background: var(--bg-primary);
      min-width: 0;
    }

    /* Table of Contents */
    .toc-sidebar {
      width: var(--toc-width);
      padding: 32px 24px;
      position: sticky;
      top: var(--header-height);
      height: calc(100vh - var(--header-height));
      overflow-y: auto;
      display: none;
    }

    .toc-container {
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 16px;
      position: sticky;
      top: 20px;
    }

    .toc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-light);
    }

    .toc-header h4 {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .toc-toggle {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px;
      font-size: 1rem;
      line-height: 1;
      transition: var(--transition);
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toc-toggle:hover {
      color: var(--primary);
    }

    .toc ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc li {
      margin: 4px 0;
    }

    .toc a {
      display: block;
      padding: 6px 8px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.85rem;
      border-radius: var(--radius-sm);
      transition: var(--transition);
      border-left: 2px solid transparent;
    }

    .toc a:hover {
      color: var(--primary);
      background: var(--bg-secondary);
      border-left-color: var(--primary);
    }

    .toc-indent {
      padding-left: 16px;
    }

    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      color: var(--text-primary);
      margin-top: 48px;
      margin-bottom: 16px;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.02em;
      scroll-margin-top: calc(var(--header-height) + 24px);
    }

    h1 {
      font-size: 2.5rem;
      margin-top: 0;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--border-color);
    }

    h2 {
      font-size: 1.875rem;
      margin-top: 64px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-light);
    }

    h3 { font-size: 1.5rem; }
    h4 { font-size: 1.25rem; }
    h5 { font-size: 1.1rem; }
    h6 { font-size: 1rem; }

    p {
      margin-bottom: 20px;
      color: var(--text-primary);
      font-size: 1rem;
    }

    a {
      color: var(--primary);
      text-decoration: none;
      transition: var(--transition);
      font-weight: 500;
    }

    a:hover {
      color: var(--primary-dark);
      text-decoration: underline;
    }

    /* Code */
    code {
      background: var(--bg-tertiary);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
      font-size: 0.875em;
      color: var(--accent);
      border: 1px solid var(--border-color);
      font-weight: 500;
    }

    pre {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 20px;
      overflow-x: auto;
      margin: 24px 0;
      line-height: 1.6;
      box-shadow: var(--shadow-sm);
    }

    pre code {
      background: none;
      padding: 0;
      color: var(--text-primary);
      font-size: 0.875em;
      border: none;
    }

    /* Lists */
    ul, ol {
      margin: 20px 0;
      padding-left: 28px;
    }

    li {
      margin: 12px 0;
      color: var(--text-primary);
    }

    li::marker {
      color: var(--primary);
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 32px 0;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    th {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-light);
      font-size: 0.9rem;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: var(--bg-secondary);
    }

    /* Blockquotes */
    blockquote {
      border-left: 4px solid var(--primary);
      padding: 16px 24px;
      margin: 24px 0;
      background: var(--bg-secondary);
      border-radius: 0 var(--radius) var(--radius) 0;
      font-style: italic;
    }

    blockquote p:last-child {
      margin-bottom: 0;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      border-radius: var(--radius);
      margin: 24px 0;
      box-shadow: var(--shadow);
      border: 1px solid var(--border-color);
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 600;
      margin: 0 4px;
      vertical-align: middle;
    }

    .badge-success { background: var(--success); color: white; }
    .badge-warning { background: var(--warning); color: white; }
    .badge-danger { background: var(--danger); color: white; }
    .badge-info { background: var(--info); color: white; }
    .badge-primary { background: var(--primary); color: white; }

    /* Alerts */
    .alert {
      padding: 16px 20px;
      border-radius: var(--radius);
      margin: 20px 0;
      border-left: 4px solid;
      box-shadow: var(--shadow-sm);
    }

    .alert-info {
      background: rgba(59, 130, 246, 0.1);
      border-color: var(--info);
      color: var(--info);
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      border-color: var(--success);
      color: var(--success);
    }

    .alert-warning {
      background: rgba(245, 158, 11, 0.1);
      border-color: var(--warning);
      color: var(--warning);
    }

    .alert-danger {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--danger);
      color: var(--danger);
    }

    /* Scroll to top */
    .scroll-top {
      position: fixed;
      bottom: 32px;
      right: 32px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: var(--shadow-lg);
      opacity: 0;
      transform: scale(0.8);
      transition: var(--transition);
      font-size: 20px;
      border: none;
      z-index: 100;
    }

    .scroll-top.visible {
      opacity: 1;
      transform: scale(1);
    }

    .scroll-top:hover {
      transform: scale(1.1) translateY(-2px);
      box-shadow: 0 25px 30px -5px rgb(0 0 0 / 0.2);
    }

    /* Progress Bar */
    .reading-progress {
      position: fixed;
      top: var(--header-height);
      left: 0;
      width: 0%;
      height: 3px;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      z-index: 999;
      transition: width 0.1s ease;
    }

    /* Mobile Responsive */
    @media (max-width: 1200px) {
      .toc-sidebar {
        display: none !important;
      }
    }

    @media (max-width: 968px) {
      :root {
        --sidebar-width: 280px;
      }

      .sidebar {
        position: fixed;
        left: calc(-1 * var(--sidebar-width));
        top: var(--header-height);
        height: calc(100vh - var(--header-height));
        z-index: 999;
        transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: var(--shadow-lg);
      }

      .sidebar.open {
        left: 0;
      }

      .sidebar-overlay {
        position: fixed;
        top: var(--header-height);
        left: 0;
        width: 100%;
        height: calc(100vh - var(--header-height));
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
      }

      .sidebar-overlay.visible {
        opacity: 1;
        pointer-events: all;
      }

      .main-content {
        padding: 24px 20px;
      }

      .mobile-menu-btn {
        display: flex !important;
      }

      h1 { font-size: 2rem; }
      h2 { font-size: 1.5rem; }
      h3 { font-size: 1.25rem; }
      
      .header-content {
        padding: 0 16px;
      }

      .version-badge {
        display: none;
      }
    }

    @media (min-width: 969px) {
      .mobile-menu-btn {
        display: none !important;
      }
      
      .sidebar-overlay {
        display: none !important;
      }
    }

    @media (min-width: 1400px) {
      .toc-sidebar {
        display: block;
      }
    }

    /* Copy button styles */
    .copy-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 6px 12px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      transition: var(--transition);
      box-shadow: var(--shadow-sm);
    }

    .copy-btn:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow);
    }

    .copy-btn.copied {
      background: var(--success);
    }

    /* Anchor link styles */
    .heading-anchor {
      color: var(--primary);
      opacity: 0;
      margin-left: 8px;
      text-decoration: none;
      font-weight: 400;
      transition: var(--transition);
    }

    h1:hover .heading-anchor,
    h2:hover .heading-anchor,
    h3:hover .heading-anchor,
    h4:hover .heading-anchor,
    h5:hover .heading-anchor,
    h6:hover .heading-anchor {
      opacity: 1;
    }

    /* Loading Animation */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .main-content {
      animation: fadeIn 0.5s ease;
    }

    /* Print Styles */
    @media print {
      .header, .sidebar, .toc-sidebar, .scroll-top, .breadcrumbs {
        display: none !important;
      }

      .main-content {
        max-width: 100%;
        padding: 0;
      }

      body {
        background: white;
        color: black;
      }
    }
  </style>
</head>
<body>
  <div class="reading-progress" id="readingProgress"></div>
  
  <div class="header">
    <div class="header-content">
      <div class="header-left">
        <button class="mobile-menu-btn" onclick="toggleSidebar()" aria-label="Toggle menu">
          <i class="fas fa-bars"></i>
        </button>
        <a href="/" class="logo">
          <div class="logo-icon"><i class="fas fa-book"></i></div>
          <span>${config.APP_NAME}</span>
        </a>
      </div>
      <div class="header-right">
        <span class="version-badge">v${version}</span>
        <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme" title="Toggle dark mode">
          <i class="fas fa-moon"></i>
        </button>
      </div>
    </div>
  </div>

  <div class="layout">
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
    
    <aside class="sidebar" id="sidebar">
      ${sidebarHtml}
    </aside>

    <div class="content-wrapper">
      <main class="main-content">
        ${breadcrumbsHtml}
        ${htmlContent}
      </main>

      <aside class="toc-sidebar">
        ${tocHtml}
      </aside>
    </div>
  </div>

  <button class="scroll-top" id="scrollTop" aria-label="Scroll to top">
    <i class="fas fa-arrow-up"></i>
  </button>

  <script>
    // Mobile sidebar toggle
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    }

    function closeSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    }

    // Close sidebar on navigation (mobile)
    document.querySelectorAll('.sidebar a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 968) {
          closeSidebar();
        }
      });
    });

    // Theme toggle
    function toggleTheme() {
      const root = document.documentElement;
      const btn = document.querySelector('.theme-toggle i');
      const currentTheme = localStorage.getItem('theme') || 'auto';
      
      if (currentTheme === 'dark') {
        localStorage.setItem('theme', 'light');
        root.style.colorScheme = 'light';
        btn.className = 'fas fa-moon';
      } else {
        localStorage.setItem('theme', 'dark');
        root.style.colorScheme = 'dark';
        btn.className = 'fas fa-sun';
      }
    }

    // Load saved theme
    (function() {
      const savedTheme = localStorage.getItem('theme');
      const btn = document.querySelector('.theme-toggle i');
      if (savedTheme) {
        document.documentElement.style.colorScheme = savedTheme;
        if (savedTheme === 'dark') {
          btn.className = 'fas fa-sun';
        }
      }
    })();

    // TOC toggle
    function toggleTOC() {
      const toc = document.getElementById('toc');
      const btn = document.querySelector('.toc-toggle i');
      if (toc.style.display === 'none') {
        toc.style.display = 'block';
        btn.className = 'fas fa-minus';
      } else {
        toc.style.display = 'none';
        btn.className = 'fas fa-plus';
      }
    }

    // Search functionality
    function filterDocs() {
      const input = document.getElementById('docSearch');
      const filter = input.value.toLowerCase();
      const items = document.querySelectorAll('.doc-item');
      
      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(filter)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    }

    // Reading progress bar
    function updateReadingProgress() {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.pageYOffset;
      const progress = (scrolled / documentHeight) * 100;
      document.getElementById('readingProgress').style.width = progress + '%';
    }

    window.addEventListener('scroll', updateReadingProgress);

    // Scroll to top functionality
    const scrollTopBtn = document.getElementById('scrollTop');
    
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Enhanced badge rendering
    document.querySelectorAll('img[alt*="badge"]').forEach(img => {
      const alt = img.alt.toLowerCase();
      let badgeClass = 'badge-info';
      
      if (alt.includes('success') || alt.includes('passing')) badgeClass = 'badge-success';
      else if (alt.includes('warning')) badgeClass = 'badge-warning';
      else if (alt.includes('danger') || alt.includes('failing')) badgeClass = 'badge-danger';
      
      const badge = document.createElement('span');
      badge.className = 'badge ' + badgeClass;
      badge.textContent = img.alt.replace(/badge/i, '').trim();
      img.parentNode.replaceChild(badge, img);
    });

    // Convert shields.io badges
    document.querySelectorAll('img[src*="shields.io"], img[src*="badge"]').forEach(img => {
      const badge = document.createElement('span');
      badge.className = 'badge badge-info';
      badge.textContent = img.alt || 'Badge';
      img.parentNode.replaceChild(badge, img);
    });

    // Convert blockquotes to alerts
    document.querySelectorAll('blockquote').forEach(bq => {
      const text = bq.textContent.trim();
      if (text.startsWith('⚠') || text.startsWith('WARNING')) {
        bq.className = 'alert alert-warning';
      } else if (text.startsWith('✓') || text.startsWith('SUCCESS')) {
        bq.className = 'alert alert-success';
      } else if (text.startsWith('ℹ') || text.startsWith('INFO') || text.startsWith('NOTE')) {
        bq.className = 'alert alert-info';
      } else if (text.startsWith('✗') || text.startsWith('ERROR') || text.startsWith('DANGER')) {
        bq.className = 'alert alert-danger';
      }
    });

    // Add copy button to code blocks
    document.querySelectorAll('pre code').forEach(block => {
      const pre = block.parentElement;
      const button = document.createElement('button');
      button.className = 'copy-btn';
      button.textContent = 'Copy';
      
      pre.style.position = 'relative';
      pre.appendChild(button);
      
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(block.textContent);
          button.textContent = '✓ Copied!';
          button.classList.add('copied');
          setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });

      // Auto-format JSON
      const text = block.textContent;
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          const formatted = JSON.stringify(JSON.parse(text), null, 2);
          block.textContent = formatted;
        } catch (e) {
          // Not valid JSON, leave as is
        }
      }
    });

    // Add anchor links to headings
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      if (heading.id) {
        heading.style.cursor = 'pointer';
        heading.title = 'Click to copy link';
        
        const anchor = document.createElement('a');
        anchor.href = '#' + heading.id;
        anchor.className = 'heading-anchor';
        anchor.textContent = '#';
        anchor.onclick = (e) => {
          e.preventDefault();
          const url = window.location.origin + window.location.pathname + '#' + heading.id;
          navigator.clipboard.writeText(url);
          
          // Visual feedback
          const originalText = heading.childNodes[0].textContent;
          heading.childNodes[0].textContent = '✓ Link copied!';
          setTimeout(() => {
            heading.childNodes[0].textContent = originalText;
          }, 2000);
        };
        
        heading.appendChild(anchor);
      }
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Update URL without scrolling
          history.pushState(null, null, this.getAttribute('href'));
        }
      });
    });

    // Highlight active TOC item on scroll
    function highlightActiveTOCItem() {
      const headings = document.querySelectorAll('h2, h3');
      const tocLinks = document.querySelectorAll('.toc a');
      
      let currentHeading = null;
      
      headings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100 && rect.top >= -100) {
          currentHeading = heading.id;
        }
      });
      
      tocLinks.forEach(link => {
        const href = link.getAttribute('href').substring(1);
        if (href === currentHeading) {
          link.style.borderLeftColor = 'var(--primary)';
          link.style.color = 'var(--primary)';
          link.style.fontWeight = '600';
        } else {
          link.style.borderLeftColor = 'transparent';
          link.style.color = 'var(--text-secondary)';
          link.style.fontWeight = '400';
        }
      });
    }

    window.addEventListener('scroll', highlightActiveTOCItem);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('docSearch')?.focus();
      }
      
      // Escape to close sidebar on mobile
      if (e.key === 'Escape') {
        closeSidebar();
      }
    });

    // Print functionality
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        window.print();
      }
    });

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
      updateReadingProgress();
      highlightActiveTOCItem();
      
      // Auto-scroll to hash on load
      if (window.location.hash) {
        setTimeout(() => {
          const target = document.querySelector(window.location.hash);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    });
  </script>
</body>
</html>`;
};

/**
 * Get available documentation files
 * @returns {Promise<Array>} - List of available docs
 */
const getAvailableDocs = async () => {
  const docsDir = path.resolve(__dirname, '../docs');
  const rootFiles = ['README.md', 'FEATURES.md', 'SECURITY.md', 'CHANGELOG.md'];
  
  const docs = [];

  // Check docs folder
  try {
    const files = await fs.readdir(docsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    for (const file of mdFiles) {
      docs.push({
        name: file.replace('.md', '').toLowerCase(),
        title: file.replace('.md', '').replace(/[-_]/g, ' '),
        path: path.join(docsDir, file),
        location: 'docs'
      });
    }
  } catch (error) {
    console.warn('Docs directory not found');
  }

  // Check root markdown files
  for (const file of rootFiles) {
    try {
      const filePath = path.resolve(__dirname, '..', file);
      await fs.access(filePath);
      docs.push({
        name: file.replace('.md', '').toLowerCase(),
        title: file.replace('.md', '').replace(/[-_]/g, ' '),
        path: filePath,
        location: 'root'
      });
    } catch (error) {
      // File doesn't exist, skip
    }
  }

  return docs;
};

/**
 * Convert markdown file to HTML
 * @param {string} docName - Document name (e.g., 'api', 'faq')
 * @returns {Promise<string>} - HTML content
 */
const convertDocToHtml = async (docName) => {
  const docs = await getAvailableDocs();
  const doc = docs.find(d => d.name === docName.toLowerCase());

  if (!doc) {
    throw new Error(`Documentation '${docName}' not found`);
  }

  const markdown = await readMarkdownFile(doc.path);
  const html = markdownToHtml(markdown);
  
  return await wrapInTemplate(html, {
    title: doc.title,
    description: `${doc.title} - ${config.APP_NAME} Documentation`,
    currentDoc: doc.name
  });
};

/**
 * Generate documentation index page
 * @returns {Promise<string>} - HTML content
 */
const generateDocsIndex = async () => {
  const docs = await getAvailableDocs();
  
  let markdown = `# Welcome to ${config.APP_NAME} Documentation\n\n`;
  markdown += `Comprehensive documentation for the ${config.APP_NAME} Authentication & User Management System.\n\n`;
  
  markdown += `## 📚 Getting Started\n\n`;
  markdown += `This documentation will help you understand and integrate the ${config.APP_NAME} API into your applications.\n\n`;

  const docsByLocation = {
    docs: docs.filter(d => d.location === 'docs'),
    root: docs.filter(d => d.location === 'root')
  };

  if (docsByLocation.docs.length > 0) {
    markdown += `## 📖 Documentation Pages\n\n`;
    markdown += `| Document | Description |\n`;
    markdown += `|----------|-------------|\n`;
    docsByLocation.docs.forEach(doc => {
      markdown += `| [${doc.title}](${config.API_DOCS_PATH}/${doc.name}) | Detailed guide for ${doc.title.toLowerCase()} |\n`;
    });
    markdown += `\n`;
  }

  if (docsByLocation.root.length > 0) {
    markdown += `## 📄 Project Information\n\n`;
    markdown += `| Document | Description |\n`;
    markdown += `|----------|-------------|\n`;
    docsByLocation.root.forEach(doc => {
      markdown += `| [${doc.title}](${config.API_DOCS_PATH}/${doc.name}) | Project ${doc.title.toLowerCase()} |\n`;
    });
    markdown += `\n`;
  }

  markdown += `## ⚡ Quick Reference\n\n`;
  markdown += `\`\`\`json\n`;
  markdown += `{\n`;
  markdown += `  "name": "${config.APP_NAME}",\n`;
  markdown += `  "version": "${config.APP_VERSION}",\n`;
  markdown += `  "environment": "${config.NODE_ENV}",\n`;
  markdown += `  "api_base": "${config.IS_PRODUCTION ? config.PROD_BASE_URL : config.BASE_URL}/api${config.API_VERSIONING_ENABLED ? `/${config.API_VERSION}` : ''}",\n`;
  markdown += `  "support": "${config.APP_SUPPORT_EMAIL}"\n`;
  markdown += `}\n`;
  markdown += `\`\`\`\n\n`;
  
  if (config.DEV_MODE) {
    markdown += `> ⚠️ **Development Mode Active**\n>\n`;
    markdown += `> This server is running in development mode with enhanced debugging features.\n`;
    markdown += `> Detailed errors and permissive CORS are enabled.\n\n`;
  }

  markdown += `## 🚀 Additional Resources\n\n`;
  markdown += `- [Server Info](/info) - View server configuration and status\n`;
  markdown += `- [Health Check](/health) - Monitor system health\n`;
  markdown += `- [API Endpoints](/api/v1/info) - Get runtime API information\n`;
  markdown += `- [Features](/api/v1/info/features) - View enabled features\n\n`;

  markdown += `---\n\n`;
  markdown += `**Need Help?** Contact support at [${config.APP_SUPPORT_EMAIL}](mailto:${config.APP_SUPPORT_EMAIL})\n`;

  const html = markdownToHtml(markdown);
  return await wrapInTemplate(html, {
    title: 'API Documentation Home',
    description: 'Complete API documentation and guides',
    currentDoc: ''
  });
};

module.exports = {
  readMarkdownFile,
  markdownToHtml,
  wrapInTemplate,
  getAvailableDocs,
  convertDocToHtml,
  generateDocsIndex
};
