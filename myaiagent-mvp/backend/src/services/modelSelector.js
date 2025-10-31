/**
 * Intelligent Model Selector
 * Analyzes user queries and recommends the optimal OpenAI model
 */

const MODELS = {
  // Flagship models
  'gpt-4o': {
    name: 'GPT-4o',
    cost: 'high',
    speed: 'medium',
    capabilities: ['text', 'vision', 'audio', 'complex-reasoning'],
    bestFor: ['vision-tasks', 'multimodal', 'complex-analysis', 'long-context'],
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    cost: 'low',
    speed: 'fast',
    capabilities: ['text', 'vision', 'basic-reasoning'],
    bestFor: ['simple-queries', 'quick-responses', 'cost-optimization'],
  },
  
  // Previous generation
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    cost: 'high',
    speed: 'medium',
    capabilities: ['text', 'vision', 'complex-reasoning'],
    bestFor: ['detailed-analysis', 'long-form-content'],
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    cost: 'very-low',
    speed: 'very-fast',
    capabilities: ['text', 'basic-reasoning'],
    bestFor: ['simple-chat', 'quick-answers', 'extreme-cost-optimization'],
  },
  
  // Reasoning models
  'o1-preview': {
    name: 'o1 Preview',
    cost: 'very-high',
    speed: 'slow',
    capabilities: ['text', 'advanced-reasoning', 'problem-solving'],
    bestFor: ['math', 'science', 'coding', 'logic-puzzles', 'complex-problems'],
  },
  'o1-mini': {
    name: 'o1 Mini',
    cost: 'medium',
    speed: 'medium',
    capabilities: ['text', 'reasoning', 'problem-solving'],
    bestFor: ['basic-math', 'simple-coding', 'light-reasoning'],
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
  
  // 1. Check for vision tasks (requires GPT-4o)
  if (hasAttachments || VISION_KEYWORDS.some(keyword => lowerContent.includes(keyword))) {
    return 'gpt-4o';
  }
  
  // 2. Check for complex reasoning (use o1 models)
  const hasReasoningKeywords = REASONING_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  const isLongQuery = wordCount > 100;
  const hasCodeBlock = content.includes('```') || lowerContent.includes('code');
  const hasMath = /\d+\s*[\+\-\*\/\^]\s*\d+/.test(content) || lowerContent.includes('equation');
  
  if (hasReasoningKeywords && (isLongQuery || hasCodeBlock || hasMath)) {
    // Use o1-preview for very complex reasoning
    return 'o1-preview';
  }
  
  if (hasReasoningKeywords || hasMath || hasCodeBlock) {
    // Use o1-mini for moderate reasoning
    return 'o1-mini';
  }
  
  // 3. Check for simple queries (use cheapest/fastest)
  const isSimpleQuery = SIMPLE_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  const isShortQuery = wordCount < 10;
  
  if (isSimpleQuery && isShortQuery) {
    return 'gpt-3.5-turbo';
  }
  
  if (isShortQuery || wordCount < 20) {
    return 'gpt-4o-mini';
  }
  
  // 4. Check conversation context
  const conversationLength = conversationHistory.length;
  const needsContext = conversationLength > 10;
  
  if (needsContext && isLongQuery) {
    // Use GPT-4o for long context understanding
    return 'gpt-4o';
  }
  
  // 5. Default: Balance cost and quality with gpt-4o-mini
  return 'gpt-4o-mini';
}

/**
 * Gets model information
 * @param {string} modelId - Model identifier
 * @returns {Object} - Model metadata
 */
export function getModelInfo(modelId) {
  return MODELS[modelId] || MODELS['gpt-4o-mini'];
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
