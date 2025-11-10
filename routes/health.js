const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../utils/config');
const logger = require('../loaders/logger');

/**
 * Basic health check endpoint
 */
router.get('/', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: config.APP_VERSION
  };
  
  res.status(200).json(health);
});

/**
 * Detailed health check endpoint
 */
router.get('/detailed', async (req, res) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: config.APP_VERSION,
      services: {
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        },
        memory: {
          usage: process.memoryUsage(),
          free: require('os').freemem(),
          total: require('os').totalmem()
        },
        cpu: {
          usage: process.cpuUsage(),
          loadAverage: require('os').loadavg()
        }
      },
      config: {
        deploymentMode: config.DEPLOYMENT_MODE,
        apiVersioning: config.API_VERSIONING_ENABLED,
        compression: config.COMPRESSION_ENABLED,
        rateLimiting: !config.DEV_DISABLE_RATE_LIMITING
      }
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: config.DEV_DETAILED_ERRORS ? error.message : 'Service unavailable'
    });
  }
});

/**
 * Readiness probe endpoint (for Kubernetes/orchestration)
 */
router.get('/ready', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

/**
 * Liveness probe endpoint (for Kubernetes/orchestration)
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

module.exports = router;
