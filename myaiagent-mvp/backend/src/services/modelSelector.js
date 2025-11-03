/**
 * Intelligent Model Selector
 * Analyzes user queries and recommends the optimal Gemini model
 */

const MODELS = {
  // Gemini 2.5 Flash - Latest stable fast model
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    cost: 'low',
    speed: 'very-fast',
    capabilities: ['text', 'vision', 'audio', 'complex-reasoning', 'multimodal'],
    bestFor: ['all-tasks', 'balanced-performance', 'cost-optimization'],
  },
  
  // Gemini 2.5 Pro - Advanced reasoning and long context
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    cost: 'medium',
    speed: 'medium',
    capabilities: ['text', 'vision', 'audio', 'advanced-reasoning', 'long-context'],
    bestFor: ['complex-analysis', 'long-context', 'detailed-reasoning'],
  },
  
  // Gemini 2.0 Flash - Stable and efficient
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    cost: 'very-low',
    speed: 'fast',
    capabilities: ['text', 'vision', 'basic-reasoning'],
    bestFor: ['simple-queries', 'quick-responses', 'high-volume'],
  },
};

// Keywords that indicate complex reasoning tasks
const REASONING_KEYWORDS = [
  'solve', 'calculate', 'prove', 'derive', 'analyze deeply', 'step by step',
  'mathematics', 'physics', 'algorithm', 'logic', 'proof', 'theorem',
  'complex', 'difficult', 'challenging', 'puzzle', 'problem solving',
];

// Keywords that indicate vision/image tasks
const VISION_KEYWORDS = [
  'image', 'picture', 'photo', 'visual', 'see', 'look at', 'describe this',
  'what do you see', 'analyze image', 'read from', 'extract from image',
];

// Keywords that indicate simple tasks
const SIMPLE_KEYWORDS = [
  'hello', 'hi', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no',
  'what is', 'define', 'explain briefly', 'quick question',
];

/**
 * Analyzes query complexity and recommends the best model
 * @param {string} content - User's message
 * @param {boolean} hasAttachments - Whether message has images/files
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {string} - Recommended model ID
 */
export function selectBestModel(content, hasAttachments = false, conversationHistory = []) {
  const lowerContent = content.toLowerCase();
  const wordCount = content.split(/\s+/).length;
  
  // 1. Check for vision tasks (Gemini 2.5 Flash handles multimodal excellently)
  if (hasAttachments || VISION_KEYWORDS.some(keyword => lowerContent.includes(keyword))) {
    return 'gemini-2.5-flash';
  }
  
  // 2. Check for complex reasoning
  const hasReasoningKeywords = REASONING_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  const isLongQuery = wordCount > 100;
  const hasCodeBlock = content.includes('```') || lowerContent.includes('code');
  const hasMath = /\d+\s*[\+\-\*\/\^]\s*\d+/.test(content) || lowerContent.includes('equation');
  
  if (hasReasoningKeywords && (isLongQuery || hasCodeBlock || hasMath)) {
    // Use Gemini 2.5 Pro for very complex reasoning, coding, math
    return 'gemini-2.5-pro';
  }
  
  if (hasReasoningKeywords || hasMath || hasCodeBlock) {
    // Use Gemini 2.5 Flash for moderate reasoning tasks (very capable)
    return 'gemini-2.5-flash';
  }
  
  // 3. Check for simple queries (use fastest)
  const isSimpleQuery = SIMPLE_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  const isShortQuery = wordCount < 10;
  
  if (isSimpleQuery && isShortQuery) {
    return 'gemini-2.0-flash';
  }
  
  if (isShortQuery || wordCount < 20) {
    return 'gemini-2.0-flash';
  }
  
  // 4. Check conversation context
  const conversationLength = conversationHistory.length;
  const needsContext = conversationLength > 10;
  
  if (needsContext && isLongQuery) {
    // Use Gemini 2.5 Pro for long context understanding
    return 'gemini-2.5-pro';
  }
  
  // 5. Default: Balance cost and quality with Gemini 2.5 Flash
  return 'gemini-2.5-flash';
}

/**
 * Gets model information
 * @param {string} modelId - Model identifier
 * @returns {Object} - Model metadata
 */
export function getModelInfo(modelId) {
  return MODELS[modelId] || MODELS['gemini-2.5-flash'];
}

/**
 * Explains why a model was selected
 * @param {string} modelId - Selected model
 * @param {string} content - User query
 * @returns {string} - Explanation
 */
export function explainModelSelection(modelId, content) {
  const model = MODELS[modelId];
  const reasons = [];
  
  if (content.toLowerCase().includes('image') || content.includes('picture')) {
    reasons.push('multimodal capability needed');
  }
  
  if (REASONING_KEYWORDS.some(k => content.toLowerCase().includes(k))) {
    reasons.push('complex reasoning required');
  }
  
  if (content.split(/\s+/).length < 10) {
    reasons.push('simple query');
  }
  
  if (reasons.length === 0) {
    reasons.push('balanced cost-performance');
  }
  
  return `Selected ${model.name} (${reasons.join(', ')})`;
}

export default {
  selectBestModel,
  getModelInfo,
  explainModelSelection,
  MODELS,
};
