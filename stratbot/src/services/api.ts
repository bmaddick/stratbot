/**
 * API Service for Session and Message Management
 *
 * This module provides integration with the custom API for the Praevius.
 * It handles session management, message sending, and response streaming for real-time AI responses.
 */

/**
 * Function to get the token from the URL
 */
export function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') {
    // Handle server-side rendering or environments without window
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

/**
 * Function to extract the 10-character suffix from the token
 */
export function extractSuffixFromToken(token: string): string | null {
  if (token.length < 10) {
    console.error('Token is too short to extract suffix.');
    return null;
  }
  const first5 = token.substring(0, 5);
  const last5 = token.substring(token.length - 5);
  return first5 + last5;
}

/**
 * Function to get the API keys based on the token
 */
function getApiKeysForToken(): { beApiKey: string; assistantId: string } | null {
  const token = getTokenFromUrl();

  if (!token) {
    console.warn('No token found in URL. Using default keys if available.');
    // Optionally handle a default case if no token is present
    // TODO: Implement default key loading if needed
    // For now, returning null if no token is found
    return null;
  }

  const tokenSuffix = extractSuffixFromToken(token);

  if (!tokenSuffix) {
    console.error('Invalid token format or length.');
    return null;
  }

  const beApiKeyEnvVar = `VITE_BE_API_KEY_${tokenSuffix}`;
  const assistantIdEnvVar = `VITE_OPENAI_ASSISTANT_ID_${tokenSuffix}`;

  const beApiKey = import.meta.env[beApiKeyEnvVar];
  const assistantId = import.meta.env[assistantIdEnvVar];

  if (!beApiKey || !assistantId) {
    console.error(`Missing config for token suffix: ${tokenSuffix}`);
    return null;
  }

  return {
    beApiKey: beApiKey,
    assistantId: assistantId,
  };
}


/**
 * Message interface defines the structure of chat messages
 * - id: Unique identifier for the message
 * - content: The text content of the message
 * - role: Whether the message is from the user or assistant
 * - timestamp: When the message was created
 */
export interface Message {
  id: string;
  content: string[]; // Changed from string to string[]
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface Session {
  id: string;
  company_uuid: string;
  openai_thread_id: string;
}

export type SessionsResponse = Session[];

export type MessagesResponse = Message[];

export interface ResponseModel<T = any> {
  code: string;
  message?: string;
  data?: T;
}

const API_BASE_URL = 'https://us-compsuite-api.mms-internal.my.id/api/v1';

/**
 * Get headers with API key for all requests
 */
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  const keys = getApiKeysForToken();
  if (keys && keys.beApiKey) {
    headers['X-Api-Key'] = keys.beApiKey;
  } else {
    console.warn('No token-specific BE API key found. Requests may fail.');
    // Optionally use a default key if no token is present or valid
    // if (import.meta.env.VITE_BE_API_KEY_DEFAULT) {
    //   headers['X-Api-Key'] = import.meta.env.VITE_BE_API_KEY_DEFAULT;
    // }
  }

  return headers;
};

/**
 * Get all available sessions
 *
 * @returns Promise resolving to an array of sessions
 */
export const getSessions = async (): Promise<Session[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
    }

    const responseModel: ResponseModel<SessionsResponse> = await response.json();
    return responseModel.data || [];
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
 * Get company information
 *
 * @returns Promise resolving to the company information object
 */
export const getCompanyInfo = async (): Promise<{ company_uuid: string; company_name: string; display_name: string; is_active: boolean; created_at: string; updated_at: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/companies/info`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch company info: ${response.status} ${response.statusText}`);
    }

    const responseModel: ResponseModel<{ company_uuid: string; company_name: string; display_name: string; is_active: boolean; created_at: string; updated_at: string }> = await response.json();
    if (!responseModel.data) {
      throw new Error('Invalid response format: missing data');
    }
    return responseModel.data;
  } catch (error) {
    console.error('Error fetching company info:', error);

    let errorMessage = 'Failed to fetch company info. Please try again later.';

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
    const keys = getApiKeysForToken();
    if (!keys) {
      throw new Error('Cannot create session: Failed to retrieve API keys based on the provided token.');
    }

    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        openai_assistant_id: keys.assistantId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
    }

    const responseModel: ResponseModel<Session> = await response.json();
    if (!responseModel.data) {
      throw new Error('Invalid response format: missing data');
    }
    return responseModel.data;
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
      method: 'DELETE',
      headers: getHeaders()
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
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
    }

    const responseModel: ResponseModel<Message[]> = await response.json();
    return responseModel.data || [];
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
  content: string
): Promise<Message[]> => {
  try {
    // getHeaders already uses the token-specific key internally
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        message: content
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }

    const responseModel: ResponseModel<Message[]> = await response.json();
    return responseModel.data || [];
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
