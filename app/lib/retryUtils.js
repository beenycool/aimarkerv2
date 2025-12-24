/**
 * Retry utilities for handling transient network failures
 * Implements exponential backoff with jitter
 */

/**
 * Check if an error is a network error that should be retried
 */
export function isNetworkError(error) {
    if (!error) return false;
    
    // Check for fetch failures
    if (error.message && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed') ||
        error.message.includes('ERR_NETWORK_CHANGED') ||
        error.message.includes('ERR_INTERNET_DISCONNECTED') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('ERR_CONNECTION_RESET')
    )) {
        return true;
    }
    
    // Check for TypeError related to fetch
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return true;
    }
    
    // Check for network-related status codes
    if (error.status && (error.status === 0 || error.status >= 500)) {
        return true;
    }
    
    return false;
}

/**
 * Exponential backoff with jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} maxDelay - Maximum delay in milliseconds (default: 10000)
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 10000) {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    
    // Add jitter (random factor between 0 and 1) to prevent thundering herd
    const jitter = Math.random();
    
    // Cap at maxDelay
    return Math.min(exponentialDelay * jitter, maxDelay);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 10000)
 * @param {Function} options.shouldRetry - Custom function to determine if error should be retried (default: isNetworkError)
 * @param {Function} options.onRetry - Callback called before each retry with (error, attempt)
 * @returns {Promise<any>} Result of the function
 * @throws {Error} Last error if all retries fail
 */
export async function retryWithBackoff(fn, options = {}) {
    const {
        maxAttempts = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        shouldRetry = isNetworkError,
        onRetry = null
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Check if we should retry this error
            if (!shouldRetry(error)) {
                throw error;
            }
            
            // If this was the last attempt, throw the error
            if (attempt === maxAttempts - 1) {
                throw error;
            }
            
            // Calculate backoff delay
            const delay = calculateBackoff(attempt, baseDelay, maxDelay);
            
            // Call onRetry callback if provided
            if (onRetry) {
                onRetry(error, attempt + 1);
            }
            
            console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`, error.message);
            
            // Wait before retrying
            await sleep(delay);
        }
    }
    
    // This should never be reached, but just in case
    throw lastError;
}

/**
 * Wrapper for fetch with retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry options (same as retryWithBackoff)
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
    return retryWithBackoff(
        async () => {
            const response = await fetch(url, options);
            
            // Check for HTTP errors
            if (!response.ok && response.status >= 500) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        },
        {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            ...retryOptions
        }
    );
}
