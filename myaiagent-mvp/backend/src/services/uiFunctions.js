/**
 * UI Functions for OpenAI Function Calling
 * Defines all available UI actions that the AI can execute
 */

export const UI_FUNCTIONS = [
  {
    name: 'changeModel',
    description: 'Switch the AI model PERMANENTLY for this conversation. ONLY call this when the user gives a DIRECT COMMAND to change models, such as: "switch to GPT-3.5", "use GPT-4", "change model to GPT-4 Turbo". DO NOT call this function in these situations: 1) Normal conversation about models, 2) When Auto mode already selected a model for you, 3) When user just asks "what model are you?", 4) When explaining model capabilities. If you are unsure, DO NOT call this function.',
    parameters: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          enum: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'auto'],
          description: 'The model to switch to',
        },
      },
      required: ['model'],
    },
  },
  {
    name: 'createNewChat',
    description: 'Create a new conversation/chat. Use this when the user wants to start fresh or discuss a new topic.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title for the new conversation (e.g., "Python Help", "Math Problems")',
        },
      },
      required: [],
    },
  },
  {
    name: 'renameConversation',
    description: 'Rename the current conversation. Use this when the user asks to rename the chat.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'New title for the conversation',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'deleteConversation',
    description: 'Delete the current conversation. Use this when the user explicitly asks to delete or remove the current chat.',
    parameters: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Confirmation that the user wants to delete (always true when calling)',
        },
      },
      required: ['confirm'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a different page in the application. Use this when the user wants to go to admin panel, settings, or other pages.',
    parameters: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['chat', 'admin', 'login'],
          description: 'The page to navigate to',
        },
      },
      required: ['page'],
    },
  },
  {
    name: 'webSearch',
    description: 'Search the web for current information, news, facts, or real-time data. Use this when you need to answer questions about recent events, current statistics, live data, or information that changes frequently. Examples: "Who won the 2024 Super Bowl?", "What is the current weather in New York?", "Latest news about AI", "Current stock price of Apple". DO NOT use for general knowledge questions you already know.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web',
        },
        numResults: {
          type: 'number',
          description: 'Number of search results to return (default: 5, max: 10)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
];

/**
 * Get function definition by name
 */
export function getFunctionByName(name) {
  return UI_FUNCTIONS.find(fn => fn.name === name);
}

/**
 * Execute a UI function
 * @param {string} functionName - Name of the function to execute
 * @param {Object} args - Function arguments
 * @param {Object} context - Execution context (user, conversation, etc.)
 * @returns {Promise<Object>} - Result of execution
 */
export async function executeUIFunction(functionName, args, context) {
  const { conversationId, userId } = context;
  
  if (functionName === 'webSearch') {
    const { performWebSearch, logSearchUsage } = await import('./webSearch.js');
    
    try {
      const searchResults = await performWebSearch(args.query, args.numResults || 5);
      
      await logSearchUsage(userId, args.query, searchResults.results.length, conversationId);
      
      return {
        success: true,
        message: `Found ${searchResults.results.length} results for "${args.query}"`,
        data: searchResults,
      };
    } catch (error) {
      return {
        success: false,
        message: `Web search failed: ${error.message}`,
        data: null,
      };
    }
  }
  
  const { ActionExecutor } = await import('./actionExecutor.js');
  
  // Map function calls to UI actions
  const actionMap = {
    changeModel: 'changeModel',
    createNewChat: 'createNewChat',
    renameConversation: 'renameConversation',
    deleteConversation: 'deleteConversation',
    navigate: 'navigate',
  };
  
  const actionType = actionMap[functionName];
  
  if (!actionType) {
    throw new Error(`Unknown function: ${functionName}`);
  }
  
  // Build action parameters
  let actionParams = { ...args };
  
  // Add conversationId for conversation-specific actions
  if (['renameConversation', 'deleteConversation'].includes(functionName)) {
    actionParams.conversationId = conversationId;
  }
  
  // Execute the action using the static method
  const result = await ActionExecutor.executeAction(actionType, actionParams, userId);
  
  return {
    success: result.success,
    message: result.message || `Successfully executed ${functionName}`,
    data: result.result,
  };
}

export default {
  UI_FUNCTIONS,
  getFunctionByName,
  executeUIFunction,
};
