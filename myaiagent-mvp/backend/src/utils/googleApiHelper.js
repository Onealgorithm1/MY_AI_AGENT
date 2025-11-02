export async function retryWithExponentialBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const statusCode = error.response?.status || error.status;
      const errorCode = error.response?.data?.error?.code;
      
      const isRateLimitError = 
        statusCode === 429 || 
        statusCode === 403 && (
          errorCode === 'rateLimitExceeded' || 
          errorCode === 'userRateLimitExceeded' ||
          errorCode === 'quotaExceeded'
        );
      
      const isServerError = statusCode >= 500 && statusCode < 600;
      
      if (!isRateLimitError && !isServerError) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error(`❌ Max retries (${maxRetries}) reached for Google API call`);
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay;
      const totalDelay = delay + jitter;
      
      console.log(`⏳ Google API ${statusCode === 429 ? 'rate limit' : 'error'} (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(totalDelay)}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError;
}

export function handleGoogleApiError(error, service = 'Google API') {
  const statusCode = error.response?.status || error.status;
  const errorMessage = error.response?.data?.error?.message || error.message;
  const errorCode = error.response?.data?.error?.code;
  
  if (statusCode === 401) {
    throw new Error('GOOGLE_AUTH_FAILED');
  }
  
  if (statusCode === 403) {
    if (errorCode === 'rateLimitExceeded' || errorCode === 'userRateLimitExceeded') {
      throw new Error(`${service} rate limit exceeded. Please try again later.`);
    }
    if (errorCode === 'quotaExceeded') {
      throw new Error(`${service} quota exceeded. Please try again tomorrow.`);
    }
    throw new Error(`${service} access forbidden: ${errorMessage}`);
  }
  
  if (statusCode === 404) {
    throw new Error(`${service} resource not found: ${errorMessage}`);
  }
  
  if (statusCode === 429) {
    throw new Error(`${service} rate limit exceeded. Please try again later.`);
  }
  
  if (statusCode >= 500) {
    throw new Error(`${service} server error: ${errorMessage}`);
  }
  
  throw new Error(`${service} error: ${errorMessage || 'Unknown error'}`);
}
