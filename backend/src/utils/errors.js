/**
 * Base Application Error class
 * All custom errors should extend this class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace, excluding constructor call from stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * API Key related errors
 */
class APIKeyError extends AppError {
  constructor(service, message = 'API key is missing or invalid') {
    super(`${service}: ${message}`, 401, 'API_KEY_ERROR');
    this.service = service;
  }
}

/**
 * Data Collection errors
 */
class DataCollectionError extends AppError {
  constructor(platform, message, originalError = null) {
    super(`Data collection failed for ${platform}: ${message}`, 502, 'DATA_COLLECTION_ERROR');
    this.platform = platform;
    this.originalError = originalError;
  }
}

/**
 * Sentiment Analysis errors
 */
class SentimentAnalysisError extends AppError {
  constructor(message, originalError = null) {
    super(`Sentiment analysis failed: ${message}`, 503, 'SENTIMENT_ANALYSIS_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Database operation errors
 */
class DatabaseError extends AppError {
  constructor(operation, message, originalError = null) {
    super(`Database ${operation} failed: ${message}`, 500, 'DATABASE_ERROR');
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Validation errors
 */
class ValidationError extends AppError {
  constructor(field, value, message = 'Validation failed') {
    super(`Validation error for ${field}: ${message}`, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}

/**
 * Rate Limiting errors
 */
class RateLimitError extends AppError {
  constructor(service, resetTime = null) {
    super(`Rate limit exceeded for ${service}`, 429, 'RATE_LIMIT_ERROR');
    this.service = service;
    this.resetTime = resetTime;
  }
}

/**
 * Authentication errors
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization errors
 */
class AuthorizationError extends AppError {
  constructor(resource = 'resource', message = 'Access denied') {
    super(`Authorization failed for ${resource}: ${message}`, 403, 'AUTHORIZATION_ERROR');
    this.resource = resource;
  }
}

/**
 * Resource Not Found errors
 */
class NotFoundError extends AppError {
  constructor(resource, id = null) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND_ERROR');
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * Conflict errors (duplicate resources, etc.)
 */
class ConflictError extends AppError {
  constructor(resource, message = 'Resource already exists') {
    super(`Conflict with ${resource}: ${message}`, 409, 'CONFLICT_ERROR');
    this.resource = resource;
  }
}

/**
 * External Service errors
 */
class ExternalServiceError extends AppError {
  constructor(service, message, statusCode = 502) {
    super(`External service ${service} error: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

/**
 * Configuration errors
 */
class ConfigurationError extends AppError {
  constructor(configKey, message = 'Configuration is missing or invalid') {
    super(`Configuration error for ${configKey}: ${message}`, 500, 'CONFIGURATION_ERROR');
    this.configKey = configKey;
  }
}

/**
 * Alert Processing errors
 */
class AlertProcessingError extends AppError {
  constructor(alertId, message, originalError = null) {
    super(`Alert processing failed for ${alertId}: ${message}`, 500, 'ALERT_PROCESSING_ERROR');
    this.alertId = alertId;
    this.originalError = originalError;
  }
}

/**
 * WebSocket errors
 */
class WebSocketError extends AppError {
  constructor(message, originalError = null) {
    super(`WebSocket error: ${message}`, 500, 'WEBSOCKET_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Utility function to create appropriate error based on error type
 */
function createAppropriateError(errorType, ...args) {
  const errorClasses = {
    'api_key': APIKeyError,
    'data_collection': DataCollectionError,
    'sentiment_analysis': SentimentAnalysisError,
    'database': DatabaseError,
    'validation': ValidationError,
    'rate_limit': RateLimitError,
    'authentication': AuthenticationError,
    'authorization': AuthorizationError,
    'not_found': NotFoundError,
    'conflict': ConflictError,
    'external_service': ExternalServiceError,
    'configuration': ConfigurationError,
    'alert_processing': AlertProcessingError,
    'websocket': WebSocketError
  };

  const ErrorClass = errorClasses[errorType] || AppError;
  return new ErrorClass(...args);
}

/**
 * Error handler middleware factory
 */
function createErrorHandler() {
  return (err, req, res, next) => {
    // Set default error values
    let error = { ...err };
    error.message = err.message;

    // Log error
    console.error('❌ Error Handler:', {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // MongoDB CastError (Invalid ObjectId)
    if (err.name === 'CastError') {
      const message = 'Invalid resource ID';
      error = new ValidationError('id', err.value, message);
    }

    // MongoDB Duplicate Key Error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const message = `${field} already exists`;
      error = new ConflictError(field, message);
    }

    // MongoDB ValidationError
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => val.message);
      error = new ValidationError('multiple', null, errors.join(', '));
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
      error = new AuthenticationError('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
      error = new AuthenticationError('Token expired');
    }

    // Send error response
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message,
        code: error.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  };
}

export {
  AppError,
  APIKeyError,
  DataCollectionError,
  SentimentAnalysisError,
  DatabaseError,
  ValidationError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  ConfigurationError,
  AlertProcessingError,
  WebSocketError,
  createAppropriateError,
  createErrorHandler
};