// OpenAI Assistant API Integration Service
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
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
    throw error;
  }
};

// Function to send a message to the assistant and get a response
export const sendMessageToAssistant = async (
  request: ChatCompletionRequest
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
      const textContent = latestMessage.content.find((item: any) => item.type === 'text');
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
  } catch (error) {
    console.error('Error sending message to assistant:', error);
    throw error;
  }
};
