// OpenAI Assistant API Integration Service
import OpenAI from 'openai';

// Validate environment variables
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
if (!apiKey) {
  console.error('OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to your .env file.');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey as string,
  dangerouslyAllowBrowser: true // Allow API key usage in browser for demo purposes
});

// Types
export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: AssistantMessage[];
  assistantId: string;
  threadId?: string;
}

export interface ChatCompletionResponse {
  message: AssistantMessage;
  threadId: string;
}

// Function to create a new thread
export const createThread = async (): Promise<string> => {
  try {
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);
    return thread.id;
  } catch (error) {
    console.error('Error creating thread:', error);
    
    // Provide more specific error information
    let errorMessage = 'Failed to create conversation thread.';
    
    if (error instanceof Error) {
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
    
    throw new Error(errorMessage);
  }
};

// Function to send a message to the assistant and get a response
export const sendMessageToAssistant = async (
  request: ChatCompletionRequest,
  onMessageUpdate?: (content: string) => void
): Promise<ChatCompletionResponse> => {
  try {
    // Get or create thread ID
    let threadId = request.threadId;
    if (!threadId) {
      threadId = await createThread();
    }

    // Add user message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: request.messages[request.messages.length - 1].content
    });

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: request.assistantId,
    });

    if (onMessageUpdate) {
      // Use streaming for real-time updates
      let fullContent = '';
      
      try {
        const stream = await openai.beta.threads.runs.stream(threadId, run.id);
        
        for await (const event of stream) {
          if (event.event === 'thread.message.delta' && event.data?.delta?.content) {
            const contentDelta = event.data.delta.content[0];
            if (contentDelta.type === 'text' && contentDelta.text) {
              fullContent += contentDelta.text.value;
              onMessageUpdate(fullContent);
            }
          } else if (event.event === 'error') {
            // Handle streaming errors
            const errorMessage = `Streaming error: ${JSON.stringify(event.data)}`;
            onMessageUpdate(`Error: ${errorMessage}`);
            throw new Error(errorMessage);
          }
        }
      } catch (streamError) {
        console.error('Error in streaming:', streamError);
        if (streamError instanceof Error) {
          onMessageUpdate(`Error: ${streamError.message}`);
          throw streamError;
        }
      }
      
      // Return the final message
      return {
        message: {
          role: 'assistant',
          content: fullContent
        },
        threadId: threadId
      };
    } else {
      // Fallback to polling if no streaming callback is provided
      // Poll for the run to complete
      let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      // Wait until the run is completed
      while (runStatus.status !== 'completed') {
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
          throw new Error(`Run ended with status: ${runStatus.status}`);
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      // Get the latest message from the thread
      const messages = await openai.beta.threads.messages.list(threadId);
      const latestMessage = messages.data[0]; // Messages are sorted by creation time in descending order

      // Extract the content from the message
      let content = '';
      if (latestMessage.content && latestMessage.content.length > 0) {
        const textContent = latestMessage.content.find((item) => item.type === 'text');
        if (textContent && 'text' in textContent && textContent.text) {
          content = textContent.text.value;
        }
      }

      return {
        message: {
          role: 'assistant',
          content: content
        },
        threadId: threadId
      };
    }
  } catch (error) {
    console.error('Error sending message to assistant:', error);
    throw error;
  }
};
