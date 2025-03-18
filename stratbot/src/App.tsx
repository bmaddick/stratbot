/**
 * Cracker Barrel Strategy Bot - Chat Interface
 * 
 * This application provides a chat interface for users to interact with an OpenAI Assistant
 * specialized in strategy and business topics for Cracker Barrel. It uses the OpenAI
 * Assistants API with streaming for real-time responses.
 * 
 * @module App
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Menu, ChevronRight } from 'lucide-react' // Import Lucide icons for UI elements
import ReactMarkdown from 'react-markdown' // Import ReactMarkdown for formatting AI responses
import './App.css'

// Import UI components from the component library (Radix UI with Tailwind styling)
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'

// Import OpenAI service functions for API communication
import { sendMessageToAssistant, createThread } from './services/openai'

/**
 * Message interface defines the structure of chat messages
 * - id: Unique identifier for the message
 * - content: The text content of the message
 * - role: Whether the message is from the user or assistant
 * - timestamp: When the message was created
 */
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

/**
 * Main App component for the Cracker Barrel Strategy Bot
 * 
 * This component manages the entire chat interface, handling:
 * - Message state and history
 * - OpenAI thread creation and management
 * - Real-time streaming of AI responses
 * - Error handling and user feedback
 * - Responsive UI for desktop and mobile
 * 
 * The component uses the OpenAI Assistants API to provide strategy
 * and business insights for Cracker Barrel.
 */
function App() {
  // State management for the chat application
  const [messages, setMessages] = useState<Message[]>([]); // Store conversation history
  const [input, setInput] = useState(''); // User input text field value
  const [isLoading, setIsLoading] = useState(false); // Loading indicator for API calls
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar visibility toggle
  const [threadId, setThreadId] = useState<string | null>(null); // OpenAI conversation thread ID
  const messagesEndRef = useRef<HTMLDivElement>(null); // Reference for auto-scrolling to latest messages

  /**
   * Initialize OpenAI thread when component mounts
   * 
   * Creates a new conversation thread with the OpenAI Assistant API
   * that persists throughout the session. This allows the assistant
   * to maintain context across multiple messages.
   */
  useEffect(() => {
    const initThread = async () => {
      try {
        const newThreadId = await createThread();
        setThreadId(newThreadId);
        console.log('Thread created:', newThreadId);
      } catch (error) {
        console.error('Error creating thread:', error);
      }
    };
    
    initThread();
  }, []); // Empty dependency array ensures this runs only once on mount

  /**
   * Auto-scroll to the latest message when messages update
   * 
   * This effect ensures that the chat window automatically scrolls
   * to show the most recent message whenever a new message is added
   * or when the content of a message changes (during streaming).
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // Re-run when messages array changes

  /**
   * Handle sending a new message to the OpenAI Assistant
   * 
   * This function:
   * 1. Creates and adds the user message to the chat
   * 2. Creates an empty assistant message placeholder
   * 3. Streams the AI response in real-time, updating the placeholder
   * 4. Handles errors with user-friendly messages
   * 
   * The streaming approach provides immediate feedback to users as
   * the AI generates its response, rather than waiting for the
   * complete response before displaying anything.
   */
  const handleSendMessage = async () => {
    if (input.trim() === '') return; // Prevent sending empty messages
    
    // Create new user message object
    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };
    
    // Add user message to chat and reset input field
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true); // Show loading indicator
    
    try {
      // Create a placeholder for the assistant message that will be updated with streaming content
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: '', // Start with empty content that will be filled via streaming
        role: 'assistant',
        timestamp: new Date()
      };
      
      // Add empty assistant message to the chat immediately to show a response is coming
      setMessages(prev => [...prev, assistantMessage]);
      
      // Validate environment variables - ensure Assistant ID is configured
      const assistantId = import.meta.env.VITE_OPENAI_ASSISTANT_ID;
      if (!assistantId) {
        throw new Error('Assistant ID is missing. Please add VITE_OPENAI_ASSISTANT_ID to your .env file.');
      }
      
      // Send message to OpenAI with streaming callback for real-time updates
      await sendMessageToAssistant(
        {
          messages: [{ role: 'user', content: input }],
          assistantId: assistantId,
          threadId: threadId || undefined
        },
        (updatedContent) => {
          // This callback is called repeatedly as new content arrives
          // Update the assistant message with the latest content from the stream
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: updatedContent } 
                : msg
            )
          );
        }
      ).then(response => {
        // Store the thread ID for conversation continuity
        if (response.threadId && (!threadId || threadId !== response.threadId)) {
          setThreadId(response.threadId);
        }
      });
    } catch (error) {
      console.error('Error sending message to assistant:', error);
      
      // Display user-friendly error message in the chat interface
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, there was an error processing your request. Please try again later.",
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Always reset loading state when operation completes (success or error)
      setIsLoading(false);
    }
  };

  /**
   * Handle keyboard events in the input field
   * 
   * Allows users to send messages by pressing Enter (without Shift)
   * Shift+Enter can be used for multi-line input
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default to avoid newline
      handleSendMessage();
    }
  };

  /**
   * Render the chat interface with responsive layout
   * 
   * The UI consists of:
   * 1. A sidebar for conversation history (hidden on mobile)
   * 2. Main content area with header and chat interface
   * 3. Message display with user and assistant messages
   * 4. Input area for typing and sending messages
   */
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Hidden on mobile by default, visible on desktop */}
      <div className={`w-64 bg-white border-r border-gray-200 transition-all ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static top-0 bottom-0 left-0 z-40`}>
        <div className="flex h-14 items-center border-b px-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-6 w-6 bg-amber-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              CB
            </div>
            Strategy Bot
          </div>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <div className="px-4 py-2">
            <h2 className="mb-2 text-lg font-semibold">Conversation History</h2>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-left">
                <ChevronRight className="mr-2 h-4 w-4" />
                <span>New Conversation</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile sidebar - Only visible when sidebar is open on mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with mobile menu toggle */}
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:px-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Cracker Barrel Strategy Bot</h1>
          </div>
        </header>

        {/* Chat Area - Main content with messages */}
        <main className="flex-1 overflow-auto p-4">
          <Card className="mx-auto max-w-4xl">
            <CardHeader className="bg-amber-50 border-b">
              <CardTitle className="text-center text-amber-800">Strategy Assistant</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Messages Container - Scrollable area for chat history */}
              <div className="h-[calc(100vh-240px)] overflow-y-auto p-4">
                {messages.length === 0 ? (
                  /* Welcome message when no messages exist */
                  <div className="flex h-full flex-col items-center justify-center text-center p-8 text-gray-500">
                    <h3 className="text-lg font-medium mb-2">Welcome to the Cracker Barrel Strategy Bot</h3>
                    <p className="max-w-md">
                      Ask questions about strategy, operations, or any other business topics. 
                      I'm here to assist with insights and recommendations.
                    </p>
                  </div>
                ) : (
                  /* Message list with user and assistant messages */
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-amber-600 text-white' // User message styling
                              : message.content.startsWith('Error:') || message.content.includes('error')
                                ? 'error-message' // Error message styling
                                : 'bg-gray-100 text-gray-800' // Normal assistant message styling
                          }`}
                        >
                          {message.role === 'user' ? (
                            /* Plain text for user messages */
                            message.content
                          ) : (
                            /* Markdown rendering for assistant messages */
                            <ReactMarkdown>
                              {message.content || ''}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Loading indicator - Animated dots while waiting for response */}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg bg-gray-100 p-3 text-gray-800">
                          <div className="flex space-x-2">
                            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.2s' }}></div>
                            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Invisible element for auto-scrolling to latest message */}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area - Message input and send button */}
              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  <Input
                    className="flex-1 min-h-10 resize-none"
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                  />
                  <Button 
                    type="button"
                    onClick={handleSendMessage} 
                    disabled={false}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

export default App
