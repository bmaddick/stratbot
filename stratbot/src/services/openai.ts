/**
 * OpenAI Assistant API Integration Service
 * 
 * This module provides integration with OpenAI's Assistants API for the Cracker Barrel Strategy Bot.
 * It handles thread creation, message sending, and response streaming for real-time AI responses.
 * 
 * The service uses the OpenAI Node.js SDK and is designed to work in a browser environment
 * with appropriate security considerations.
 * 
 * @module openai-service
 */
import OpenAI from 'openai';

/**
 * Validate environment variables
 * 
 * Checks for the presence of the OpenAI API key in environment variables.
 * Provides a clear error message if the key is missing to help with configuration.
 */
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const assistantId = import.meta.env.VITE_OPENAI_ASSISTANT_ID;

console.log('Environment variables loaded:', { 
  apiKeyExists: !!apiKey, 
  assistantIdExists: !!assistantId,
  assistantIdValue: assistantId // Log the actual value for debugging
});

if (!apiKey) {
  console.error('OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to your .env file.');
}

if (!assistantId) {
  console.error('Assistant ID is missing. Please add VITE_OPENAI_ASSISTANT_ID to your .env file.');
}

/**
 * Initialize OpenAI client
 * 
 * Creates an instance of the OpenAI client with the API key from environment variables.
 * Uses dangerouslyAllowBrowser option to enable client-side API calls for this demo application.
 * 
 * Note: In production, API calls should be proxied through a backend to protect API keys.
 */
const openai = new OpenAI({
  apiKey: apiKey as string,
  dangerouslyAllowBrowser: true // Allow API key usage in browser for demo purposes
});

/**
 * Type Definitions for OpenAI Assistant API Integration
 */

/**
 * AssistantMessage interface
 * 
 * Represents a message in the conversation between the user and the assistant.
 * 
 * @property role - Identifies whether the message is from the user or assistant
 * @property content - The text content of the message
 */
export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * ChatCompletionRequest interface
 * 
 * Represents a request to the OpenAI Assistant API for generating a response.
 * 
 * @property messages - Array of messages in the conversation
 * @property assistantId - The ID of the OpenAI Assistant to use
 * @property threadId - Optional ID of an existing conversation thread
 */
export interface ChatCompletionRequest {
  messages: AssistantMessage[];
  assistantId: string;
  threadId?: string;
}

/**
 * ChatCompletionResponse interface
 * 
 * Represents a response from the OpenAI Assistant API.
 * 
 * @property message - The assistant's response message
 * @property threadId - The ID of the conversation thread (new or existing)
 */
export interface ChatCompletionResponse {
  message: AssistantMessage;
  threadId: string;
}

/**
 * Creates a new conversation thread with the OpenAI Assistant API
 * 
 * A thread represents a conversation session between the user and the assistant.
 * It maintains context across multiple messages, allowing for coherent multi-turn
 * conversations. The thread ID is used in subsequent API calls to add messages
 * and get responses.
 * 
 * @returns Promise resolving to the thread ID string
 * @throws Error with user-friendly message if thread creation fails
 */
export const createThread = async (): Promise<string> => {
  try {
    // Create a new thread using the OpenAI API
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);
    return thread.id;
  } catch (error) {
    console.error('Error creating thread:', error);
    
    // Provide specific error messages based on error type for better user feedback
    let errorMessage = 'Failed to create conversation thread.';
    
    if (error instanceof Error) {
      // Map common HTTP error codes to user-friendly messages
      if (error.message.includes('401')) {
        errorMessage = 'Authentication error: Please check your OpenAI API key.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded: Too many requests to the OpenAI API.';
      } else if (error.message.includes('500')) {
        errorMessage = 'OpenAI server error: Please try again later.';
      } else {
        errorMessage = `Error creating thread: ${error.message}`;
      }
    }
    
    // Throw a new error with the user-friendly message
    throw new Error(errorMessage);
  }
};

/**
 * Sends a message to the OpenAI Assistant and retrieves a response
 * 
 * This function handles the complete flow of:
 * 1. Creating or retrieving a conversation thread
 * 2. Adding the user's message to the thread
 * 3. Running the assistant on the thread
 * 4. Either streaming the response in real-time or polling for completion
 * 5. Returning the final response
 * 
 * The function supports two modes of operation:
 * - Streaming mode: Updates the UI in real-time as the assistant generates its response
 * - Polling mode: Waits for the complete response before returning
 * 
 * @param request - Object containing messages, assistantId, and optional threadId
 * @param onMessageUpdate - Optional callback function for streaming updates
 * @returns Promise resolving to the assistant's response and thread ID
 * @throws Error if any part of the process fails
 */
export const sendMessageToAssistant = async (
  request: ChatCompletionRequest,
  onMessageUpdate?: (content: string) => void
): Promise<ChatCompletionResponse> => {
  try {
    // Get existing thread ID or create a new one if not provided
    let threadId = request.threadId;
    if (!threadId) {
      threadId = await createThread();
    }

    // Add the user's message to the conversation thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: request.messages[request.messages.length - 1].content
    });

    // Start a new run with the specified assistant
    // This initiates the AI processing of the conversation
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: request.assistantId,
    });
    
    // Log the request parameters for debugging
    console.log('Creating run with parameters:', { 
      threadId, 
      assistant_id: request.assistantId 
    });

    // Check if streaming callback is provided
    if (onMessageUpdate) {
      /**
       * Streaming mode implementation
       * 
       * This section handles real-time streaming of the assistant's response.
       * It connects to the OpenAI streaming API and processes each chunk of
       * the response as it arrives, updating the UI through the callback.
       */
      let fullContent = '';
      
      try {
        // Connect to the streaming API
        const stream = await openai.beta.threads.runs.stream(threadId, run.id);
        
        // Process each event from the stream
        for await (const event of stream) {
          // Handle content delta events (new content chunks)
          if (event.event === 'thread.message.delta' && event.data?.delta?.content) {
            const contentDelta = event.data.delta.content[0];
            if (contentDelta.type === 'text' && contentDelta.text) {
              // Append new content to the accumulated response
              fullContent += contentDelta.text.value;
              // Update the UI with the latest content
              onMessageUpdate(fullContent);
            }
          } 
          // Handle error events from the stream
          else if (event.event === 'error') {
            // Format error message and display it to the user
            const errorMessage = `Streaming error: ${JSON.stringify(event.data)}`;
            onMessageUpdate(`Error: ${errorMessage}`);
            throw new Error(errorMessage);
          }
        }
      } catch (streamError) {
        // Handle exceptions during streaming
        console.error('Error in streaming:', streamError);
        if (streamError instanceof Error) {
          // Display error message to the user through the callback
          onMessageUpdate(`Error: ${streamError.message}`);
          throw streamError;
        }
      }
      
      // Return the complete response after streaming finishes
      return {
        message: {
          role: 'assistant',
          content: fullContent
        },
        threadId: threadId
      };
    } else {
      /**
       * Polling mode implementation (fallback when streaming is not used)
       * 
       * This section uses a polling approach to wait for the assistant's
       * response to be ready. It periodically checks the status of the run
       * until it completes, then retrieves the final message.
       */
      
      // Get initial run status
      let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      // Poll until the run is completed or fails
      while (runStatus.status !== 'completed') {
        // Check for failure states
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
          throw new Error(`Run ended with status: ${runStatus.status}`);
        }
        
        // Wait 1 second before checking again to avoid excessive API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      // Once completed, retrieve all messages from the thread
      const messages = await openai.beta.threads.messages.list(threadId);
      // Get the most recent message (the assistant's response)
      const latestMessage = messages.data[0]; // Messages are sorted by creation time in descending order

      // Extract the text content from the message object
      let content = '';
      if (latestMessage.content && latestMessage.content.length > 0) {
        // Find the text content in the message (could also contain images or other content types)
        const textContent = latestMessage.content.find((item) => item.type === 'text');
        if (textContent && 'text' in textContent && textContent.text) {
          content = textContent.text.value;
        }
      }

      // Return the assistant's response and thread ID
      return {
        message: {
          role: 'assistant',
          content: content
        },
        threadId: threadId
      };
    }
  } catch (error) {
    /**
     * Error handling for the entire sendMessageToAssistant function
     * 
     * Logs the error to the console and re-throws it to be handled by the caller.
     * The App component will display a user-friendly error message in the chat interface.
     */
    console.error('Error sending message to assistant:', error);
    throw error;
  }
};
