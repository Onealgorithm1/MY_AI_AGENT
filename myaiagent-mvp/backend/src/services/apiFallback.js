import { getApiKey } from '../utils/apiKeys.js';

/**
 * API Fallback Service
 * Handles provider failures and quota limits by automatically switching to alternative providers
 */

const PROVIDER_PRIORITY = [
  'gemini',
  'openai',
  'anthropic',
  'cohere',
  'groq'
];

const FALLBACK_MODELS = {
  'gemini': [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ],
  'openai': [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4o-mini',
    'gpt-3.5-turbo'
  ],
  'anthropic': [
    'claude-3-opus-20250219',
    'claude-3-sonnet-20250229',
    'claude-3-haiku-20250307'
  ],
  'cohere': [
    'command-r-plus',
    'command-r',
    'command'
  ],
  'groq': [
    'mixtral-8x7b-32768',
    'llama-3.1-70b-versatile',
    'gemma2-9b-it'
  ]
};

/**
 * Check if error is a rate limit/quota error
 */
export function isRateLimitError(error) {
  if (!error) return false;
  
  const message = error.message || '';
  const status = error.status || 0;
  
  return (
    status === 429 ||
    status === 503 ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('503') ||
    message.includes('Too Many Requests') ||
    message.includes('Service Unavailable')
  );
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error) {
  if (!error) return false;
  
  const message = error.message || '';
  const status = error.status || 0;
  
  return (
    status === 401 ||
    status === 403 ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid api key') ||
    message.includes('authentication')
  );
}

/**
 * Get next available provider to try
 * @param {string} currentProvider - Current failed provider
 * @param {Array} unavailableProviders - List of providers that have already failed
 * @returns {string|null} - Next provider to try or null if none available
 */
export function getNextFallbackProvider(currentProvider, unavailableProviders = []) {
  const failedProviders = new Set(unavailableProviders);
  failedProviders.add(currentProvider);

  for (const provider of PROVIDER_PRIORITY) {
    if (!failedProviders.has(provider)) {
      return provider;
    }
  }

  return null;
}

/**
 * Get fallback model for a provider
 * @param {string} provider - Provider name
 * @returns {string|null} - First available model or null
 */
export function getFallbackModel(provider) {
  const models = FALLBACK_MODELS[provider?.toLowerCase()];
  return models?.[0] || null;
}

/**
 * Check if API key is available for provider
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>}
 */
export async function hasApiKeyForProvider(provider) {
  try {
    const apiKey = await getApiKey(provider);
    return !!apiKey;
  } catch (error) {
    console.warn(`⚠️ Could not check API key availability for ${provider}:`, error.message);
    return false;
  }
}

/**
 * Determine best fallback strategy based on error
 * @param {Error} error - The error that occurred
 * @param {string} currentProvider - Provider that failed
 * @returns {Object} - Fallback strategy { provider, model, shouldRetry, reason }
 */
export async function determineFallbackStrategy(error, currentProvider = 'gemini') {
  console.log(`🔄 Determining fallback strategy for ${currentProvider} error:`, {
    message: error.message?.substring(0, 100),
    isRateLimit: isRateLimitError(error),
    isAuth: isAuthError(error)
  });

  if (isAuthError(error)) {
    return {
      provider: null,
      model: null,
      shouldRetry: false,
      reason: 'Authentication error - API key may be invalid or expired',
      retryAfter: null
    };
  }

  if (isRateLimitError(error)) {
    // Extract retry-after if available
    const retryAfterMatch = error.message?.match(/retry.*?(\d+)\s*s/i);
    const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1]) : 60;

    const nextProvider = getNextFallbackProvider(currentProvider);
    const model = nextProvider ? getFallbackModel(nextProvider) : null;

    if (nextProvider && model) {
      const hasKey = await hasApiKeyForProvider(nextProvider);
      if (hasKey) {
        return {
          provider: nextProvider,
          model: model,
          shouldRetry: true,
          reason: `Rate limit exceeded on ${currentProvider}. Switching to ${nextProvider}.`,
          retryAfter: retryAfter
        };
      }
    }

    return {
      provider: null,
      model: null,
      shouldRetry: false,
      reason: 'Rate limit exceeded and no alternative providers available with valid keys',
      retryAfter: retryAfter
    };
  }

  // For other errors, try next provider without waiting
  const nextProvider = getNextFallbackProvider(currentProvider);
  const model = nextProvider ? getFallbackModel(nextProvider) : null;

  if (nextProvider && model) {
    const hasKey = await hasApiKeyForProvider(nextProvider);
    if (hasKey) {
      return {
        provider: nextProvider,
        model: model,
        shouldRetry: true,
        reason: `Error on ${currentProvider}: ${error.message?.substring(0, 50)}. Trying ${nextProvider}.`,
        retryAfter: null
      };
    }
  }

  return {
    provider: null,
    model: null,
    shouldRetry: false,
    reason: `${currentProvider} failed and no alternative providers available`,
    retryAfter: null
  };
}

/**
 * Log fallback attempt for monitoring
 * @param {string} originalProvider - Original provider
 * @param {string} fallbackProvider - Fallback provider being used
 * @param {string} reason - Reason for fallback
 * @param {Error} originalError - Original error
 */
export function logFallbackAttempt(originalProvider, fallbackProvider, reason, originalError) {
  console.log(`⚠️ FALLBACK ATTEMPT:
    Original Provider: ${originalProvider}
    Fallback Provider: ${fallbackProvider}
    Reason: ${reason}
    Error: ${originalError?.message?.substring(0, 100)}`);
}

export default {
  isRateLimitError,
  isAuthError,
  getNextFallbackProvider,
  getFallbackModel,
  hasApiKeyForProvider,
  determineFallbackStrategy,
  logFallbackAttempt
};
