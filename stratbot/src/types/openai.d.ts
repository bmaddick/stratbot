declare module 'openai' {
  export default class OpenAI {
    constructor(options: { apiKey: string; dangerouslyAllowBrowser?: boolean });
    
    beta: {
      threads: {
        create(): Promise<{ id: string }>;
        messages: {
          create(threadId: string, message: { role: string; content: string }): Promise<any>;
          list(threadId: string): Promise<{ data: Array<{ 
            content: Array<{ 
              type: string; 
              text?: { value: string } 
            }> 
          }> }>;
        };
        runs: {
          create(threadId: string, options: { assistant_id: string }): Promise<{ id: string }>;
          retrieve(threadId: string, runId: string): Promise<{ 
            status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired' 
          }>;
        };
      };
    };
  }
}
