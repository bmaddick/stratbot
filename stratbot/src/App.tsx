import { useState, useRef, useEffect } from 'react'
import { Send, Menu, ChevronRight } from 'lucide-react'
import './App.css'

// Import UI components
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'

// Import OpenAI service (placeholder)
import { sendMessageToAssistant, createThread } from './services/openai'

// Message type definition
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize thread on component mount
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
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (input.trim() === '') return;
    
    // Create new user message
    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // This will be replaced with actual API call to OpenAI
      const response = await sendMessageToAssistant({
        messages: [{ role: 'user', content: input }],
        assistantId: import.meta.env.VITE_OPENAI_ASSISTANT_ID || 'placeholder-assistant-id',
        threadId: threadId || undefined
      });
      
      // Update thread ID if it's new
      if (response.threadId && (!threadId || threadId !== response.threadId)) {
        setThreadId(response.threadId);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message.content,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message to assistant:', error);
      
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, there was an error processing your request. Please try again later.",
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
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
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
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

        {/* Chat Area */}
        <main className="flex-1 overflow-auto p-4">
          <Card className="mx-auto max-w-4xl">
            <CardHeader className="bg-amber-50 border-b">
              <CardTitle className="text-center text-amber-800">Strategy Assistant</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Messages Container */}
              <div className="h-[calc(100vh-240px)] overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-8 text-gray-500">
                    <h3 className="text-lg font-medium mb-2">Welcome to the Cracker Barrel Strategy Bot</h3>
                    <p className="max-w-md">
                      Ask questions about strategy, operations, or any other business topics. 
                      I'm here to assist with insights and recommendations.
                    </p>
                  </div>
                ) : (
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
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
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
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
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
