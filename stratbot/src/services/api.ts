/**
 * API Service for Session and Message Management
 * 
 * This module provides integration with the custom API for the Cracker Barrel Strategy Bot.
 * It handles session management, message sending, and response streaming for real-time AI responses.
 */

/**
 * Message interface defines the structure of chat messages
 * - id: Unique identifier for the message
 * - content: The text content of the message
 * - role: Whether the message is from the user or assistant
 * - timestamp: When the message was created
 */
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface Session {
  id: string;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface MessagesResponse {
  messages: Message[];
}

const API_BASE_URL = '/api/v1';

/**
 * Get all available sessions
 * 
 * @returns Promise resolving to an array of sessions
 */
export const getSessions = async (): Promise<Session[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
    }
    
    const data: SessionsResponse = await response.json();
    return data.sessions;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    
    let errorMessage = 'Failed to fetch sessions. Please try again later.';
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = 'Authentication error: Please check your credentials.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded: Too many requests to the API.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error: Please try again later.';
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Create a new session
 * 
 * @returns Promise resolving to the session object
 */
export const createSession = async (): Promise<Session> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating session:', error);
    
    let errorMessage = 'Failed to create session. Please try again later.';
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = 'Authentication error: Please check your credentials.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded: Too many requests to the API.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error: Please try again later.';
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Delete a session
 * 
 * @param sessionId - ID of the session to delete
 * @returns Promise resolving to void
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.status} ${response.statusText}`);
    }
    
    return;
  } catch (error) {
    console.error('Error deleting session:', error);
    
    let errorMessage = 'Failed to delete session. Please try again later.';
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = 'Authentication error: Please check your credentials.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded: Too many requests to the API.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error: Please try again later.';
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Get all messages from a session
 * 
 * @param sessionId - ID of the session to get messages from
 * @returns Promise resolving to an array of messages
 */
export const getSessionMessages = async (sessionId: string): Promise<Message[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
    }
    
    const data: MessagesResponse = await response.json();
    return data.messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    let errorMessage = 'Failed to fetch messages. Please try again later.';
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = 'Authentication error: Please check your credentials.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded: Too many requests to the API.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error: Please try again later.';
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Send a message to a session
 * 
 * This function sends a user message to the specified session and retrieves
 * the response. It supports streaming for real-time updates.
 * 
 * @param sessionId - ID of the session to send message to
 * @param content - Content of the message to send
 * @param onMessageUpdate - Optional callback function for streaming updates
 * @returns Promise resolving to an array of messages including the new response
 */
export const sendMessageToSession = async (
  sessionId: string,
  content: string,
  onMessageUpdate?: (content: string) => void
): Promise<Message[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }
    
    if (response.headers.get('Content-Type')?.includes('text/event-stream') && onMessageUpdate) {
      const reader = response.body?.getReader();
      let receivedContent = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          receivedContent += chunk;
          
          onMessageUpdate(receivedContent);
        }
      }
    }
    
    const data: MessagesResponse = await response.json();
    return data.messages;
  } catch (error) {
    console.error('Error sending message:', error);
    
    let errorMessage = 'Failed to send message. Please try again later.';
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = 'Authentication error: Please check your credentials.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded: Too many requests to the API.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error: Please try again later.';
      }
    }
    
    throw new Error(errorMessage);
  }
};
