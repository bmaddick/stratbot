/**
 * Type definitions for OpenAI Assistants API
 * 
 * This file provides TypeScript type definitions for the OpenAI Node.js SDK,
 * specifically focusing on the Assistants API features used in the Strategy Bot.
 * 
 * These type definitions enable proper TypeScript type checking and IDE autocompletion
 * when working with the OpenAI API client.
 */
declare module 'openai' {
  /**
   * OpenAI API client class
   * 
   * The main entry point for interacting with the OpenAI API.
   * Provides access to various API endpoints including the Assistants API.
   */
  export default class OpenAI {
    /**
     * Creates a new OpenAI API client instance
     * 
     * @param options Configuration options for the client
     * @param options.apiKey OpenAI API key for authentication
     * @param options.dangerouslyAllowBrowser Whether to allow API key usage in browser environments
     *                                        (should only be used for demos, not production)
     */
    constructor(options: { apiKey: string; dangerouslyAllowBrowser?: boolean });
    
    /**
     * Beta API endpoints
     * 
     * Contains experimental or beta features that may change in future versions.
     * The Assistants API is currently part of the beta namespace.
     */
    beta: {
      /**
       * Threads API
       * 
       * Threads represent conversations between users and assistants.
       * They maintain context across multiple messages and can be used
       * for multi-turn conversations.
       */
      threads: {
        /**
         * Creates a new conversation thread
         * 
         * @returns Promise resolving to an object containing the thread ID
         */
        create(): Promise<{ id: string }>;
        
        /**
         * Messages API
         * 
         * Handles adding and retrieving messages within a thread.
         */
        messages: {
          /**
           * Adds a new message to a thread
           * 
           * @param threadId ID of the thread to add the message to
           * @param message Message object containing role and content
           * @returns Promise resolving to an object containing the message ID
           */
          create(threadId: string, message: { role: string; content: string }): Promise<{ id: string }>;
          
          /**
           * Retrieves messages from a thread
           * 
           * @param threadId ID of the thread to retrieve messages from
           * @returns Promise resolving to an object containing an array of messages
           *          Messages are sorted by creation time in descending order (newest first)
           */
          list(threadId: string): Promise<{ data: Array<{ 
            content: Array<{ 
              type: string; // Type of content (e.g., 'text', 'image')
              text?: { value: string } // Text content if type is 'text'
            }> 
          }> }>;
        };
        
        /**
         * Runs API
         * 
         * Handles executing assistants on threads to generate responses.
         */
        runs: {
          /**
           * Creates a new run of an assistant on a thread
           * 
           * @param threadId ID of the thread to run the assistant on
           * @param options Options for the run, including the assistant ID
           * @returns Promise resolving to an object containing the run ID
           */
          create(threadId: string, options: { assistant_id: string }): Promise<{ id: string }>;
          
          /**
           * Retrieves the status of a run
           * 
           * @param threadId ID of the thread the run belongs to
           * @param runId ID of the run to retrieve
           * @returns Promise resolving to an object containing the run status
           */
          retrieve(threadId: string, runId: string): Promise<{ 
            status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired' 
          }>;
          
          /**
           * Streams events from a run in real-time
           * 
           * This method enables real-time streaming of the assistant's response
           * as it's being generated, rather than waiting for the complete response.
           * 
           * The stream emits events with deltas (chunks) of the response content,
           * which can be used to update the UI incrementally.
           * 
           * @param threadId ID of the thread the run belongs to
           * @param runId ID of the run to stream events from
           * @returns Promise resolving to an AsyncIterable of stream events
           */
          stream(threadId: string, runId: string): Promise<AsyncIterable<{
            event: string; // Event type (e.g., 'thread.message.delta', 'error')
            data?: {
              delta?: {
                content?: Array<{
                  type: string; // Content type (e.g., 'text')
                  text?: { value: string } // Text content delta if type is 'text'
                }>
              }
            }
          }>>;
        };
      };
    };
  }
}
