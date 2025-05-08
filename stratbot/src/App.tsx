/**
 * Praevius - Chat Interface
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

// Import API service functions for communication
import { getSessions, createSession, deleteSession, getSessionMessages, sendMessageToSession, type Session, type Message, getTokenFromUrl, extractSuffixFromToken, getCompanyInfo } from './services/api'


/**
 * Helper function to generate logo text from display name
 */
function generateLogoText(displayName: string): string {
  if (!displayName) return '';
  const words = displayName.split(' ');
  if (words.length <= 2) {
    return words.map(word => word.charAt(0).toUpperCase()).join('');
  } else {
    return words[0].charAt(0).toUpperCase() + words[words.length - 1].charAt(0).toUpperCase();
  }
}

/**
 * Main App component for the Praevius
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
  const [sessionId, setSessionId] = useState<string | null>(null); // Session ID for the current conversation
  const [sessions, setSessions] = useState<Session[]>([]); // All available sessions for the sidebar
  const [displayName, setDisplayName] = useState('Now Loading'); // State for dynamic display name, initial loading state
  const [initialLoading, setInitialLoading] = useState(true); // State to track initial loading
  const messagesEndRef = useRef<HTMLDivElement>(null); // Reference for auto-scrolling to latest messages

  // Generate logo text based on current display name state
  const logoText = generateLogoText(displayName);

  /**
   * Initialize session, fetch company info, and fetch available sessions on component mount
   * 
   * Creates a new session if none exists, fetches company information to get
   * the display name, and fetches all available sessions for the sidebar.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch company information first to get the display name
        const companyInfo = await getCompanyInfo();
        if (companyInfo && companyInfo.display_name) {
          setDisplayName(companyInfo.display_name);
        } else {
          setDisplayName('Praevius'); // Default if fetching fails or display_name is missing
        }

        // Fetch all available sessions for the sidebar
        const availableSessions = await getSessions();
        setSessions(availableSessions);

      } catch (error) {
        console.error('Error fetching initial data:', error);
        setDisplayName('Error Loading'); // Indicate error in display name
        // Optionally set a default display name or show an error message
      } finally {
        setInitialLoading(false); // End initial loading
      }
    };

    fetchData();
  }, []); // Empty dependency array means this effect runs once on mount

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
   * Handle sending a new message
   * 
   * Adds the user message to the chat, sends it to the API,
   * and handles the response.
   */
  const handleSendMessage = () => {
    // Don't send empty messages
    if (!input.trim() || isLoading) return;
    
    // Create a new message object for the user's input
    const newMessage: Message = {
      id: Date.now().toString(),
      content: [input.trim()], // Wrap content in an array
      role: 'user',
      timestamp: new Date()
    };

    // Add user message to chat and reset input field
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true); // Show loading indicator

    // Removed assistant placeholder message creation and addition

    if (!sessionId) {
      setIsLoading(false);
      // Optionally add an error message here if needed
      console.error("Cannot send message: No active session ID");
      const noSessionError: Message = {
        id: (Date.now() + 1).toString(),
        content: ["Error: No active session. Please create a new conversation."],
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, noSessionError]);
      return;
    }

    sendMessageToSession(
      sessionId,
      newMessage.content.join('') // Join user message content for sending
      // Removed onMessageUpdate callback
    ).then(updatedMessages => {
      setMessages(updatedMessages); // Update with the full list from API
      setIsLoading(false);
    }).catch(error => {
      console.error('Error sending message:', error);
      console.error('Error sending message:', error);

      // Display user-friendly error message in the chat interface
      let errorContent: string;
      if (error instanceof Error && typeof error.message === 'string') {
        errorContent = error.message;
      } else if (typeof error === 'string') {
        errorContent = error;
      } else {
        errorContent = "Sorry, there was an error processing your request. Please try again later.";
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: [errorContent], // Use the guaranteed string in an array
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    });
  };

  /**
   * Handle selecting a session from the sidebar
   * 
   * Loads the messages for the selected session.
   * 
   * @param sessionId - ID of the session to load
   */
  const handleSelectSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setSessionId(sessionId);
      
      const sessionMessages = await getSessionMessages(sessionId);
      setMessages(sessionMessages);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle creating a new session
   * 
   * Creates a new session and clears the current messages.
   */
  const handleCreateNewSession = async () => {
    try {
      setIsLoading(true);
      
      // Create a new session
      const newSession = await createSession();
      setSessionId(newSession.id);
      setMessages([]);
      
      // Update the sessions list
      setSessions([newSession, ...sessions]);
    } catch (error) {
      console.error('Error creating new session:', error);
    } finally {
      setIsLoading(false);
    }
  };
  /**
   * Handle deleting a session
   * 
   * Deletes a session and updates the sessions list.
   * If the deleted session is the current session, selects another session.
   * 
   * @param sessionId - ID of the session to delete
   */
  const handleDeleteSession = async (sessionIdToDelete: string) => {
    try {
      setIsLoading(true);
      
      await deleteSession(sessionIdToDelete);
      
      // Update the sessions list
      setSessions(sessions.filter(session => session.id !== sessionIdToDelete));
      
      if (sessionId === sessionIdToDelete) {
        if (sessions.length > 1) {
          const nextSession = sessions.find(session => session.id !== sessionIdToDelete);
          if (nextSession) {
            await handleSelectSession(nextSession.id);
          }
        } else {
          setSessionId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
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
              {initialLoading ? '' : logoText} {/* Blank circle during initial loading */}
            </div>
            <span className={initialLoading ? 'italic' : ''}>{displayName}</span> {/* Italicize during initial loading */}
          </div>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <div className="px-4 py-2">
            <h2 className="mb-2 text-lg font-semibold">Conversation History</h2>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-left" onClick={handleCreateNewSession} disabled={initialLoading}>
                <ChevronRight className="mr-2 h-4 w-4" />
                <span>New Conversation</span>
              </Button>
              
              {sessions.map(session => (
                <div key={session.id} className="flex items-center">
                  <Button 
                    variant="ghost" 
                    className={`flex-1 justify-start text-left ${sessionId === session.id ? 'bg-gray-100' : ''}`}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <ChevronRight className="mr-2 h-4 w-4" />
                    <span>Session {session.id.substring(0, 8)}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-500"
                    onClick={() => handleDeleteSession(session.id)}
                  >
                    <span className="sr-only">Delete</span>
                    ×
                  </Button>
                </div>
              ))}
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
            <h1 className="text-lg font-semibold">Praevius</h1>
          </div>
        </header>

        {/* Chat Area - Main content with messages */}
        <main className="flex-1 overflow-auto">
          <Card className="w-full">
            <CardHeader className="bg-amber-50 border-b">
              <CardTitle className="text-center text-amber-800">Strategy Assistant</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Messages Container - Scrollable area for chat history */}
              <div className="h-[calc(100vh-240px)] overflow-y-auto p-4 w-full">
                {messages && messages.length === 0 ? (
                  /* Welcome message when no messages exist */
                  <div className="flex h-full flex-col items-center justify-center text-center p-8 text-gray-500">
                    <h3 className="text-lg font-medium mb-2">Welcome to the Praevius</h3>
                    <p className="max-w-md">
                      Ask questions about strategy, operations, or any other business topics.
                      I'm here to assist with insights and recommendations.
                    </p>
                  </div>
                ) : (
                  /* Message list with user and assistant messages */
                  <div className="space-y-4">
                    {messages && messages.map((message) => {
                      return (
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
                                : message.content.join('').startsWith('Error:') || message.content.join('').includes('error') // Join content for checks
                                  ? 'error-message' // Error message styling
                                  : 'bg-gray-100 text-gray-800' // Normal assistant message styling
                            }`}
                          >
                            {message.role === 'user' ? (
                              /* Plain text for user messages */
                              message.content.join('') // Join content for display
                            ) : (
                              /* Markdown rendering for assistant messages */
                              <ReactMarkdown>
                                {message.content.join('') || ''}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                {sessions.length > 0 ? (
                  <div className="flex items-end gap-2">
                    <Input
                      className="flex-1 min-h-10 resize-none"
                      placeholder="Type your message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={isLoading || initialLoading} // Disable during any loading
                    />
                    <Button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={isLoading || initialLoading} // Disable during any loading
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleCreateNewSession}
                    disabled={initialLoading} // Disable during initial loading
                  >
                    {initialLoading ? 'Please Wait...' : 'Create a session'} {/* Change text during initial loading */}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

export default App
