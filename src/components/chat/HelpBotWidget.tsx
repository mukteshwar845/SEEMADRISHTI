import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export function HelpBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({ role: m.role, text: m.text }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMsg.text,
          history: historyPayload
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '' }]);

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  setMessages(prev => prev.map(m => 
                    m.id === botMsgId ? { ...m, text: m.text + parsed.text } : m
                  ));
                } else if (parsed.error) {
                    setMessages(prev => prev.map(m => 
                        m.id === botMsgId ? { ...m, text: m.text + '\n[Error: ' + parsed.error + ']' } : m
                    ));
                }
              } catch (e) {
                console.error("Error parsing SSE data", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-80 sm:w-96 h-[500px] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gray-950 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-500/20 p-1.5 rounded-lg">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-100">Seemadrishti Help Bot</h3>
                  <p className="text-xs text-gray-400">Ask about agents & tasks</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3">
                    <Bot className="w-6 h-6 text-gray-400" />
                  </div>
                  <h4 className="text-gray-200 font-medium mb-1">How can I help?</h4>
                  <p className="text-xs text-gray-500">
                    Ask me about the Sentinel, Commander, Lex Forensic, or Pathfinder agents.
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                        msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-800'
                      }`}>
                        {msg.role === 'user' ? (
                          <User className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-sm' 
                          : 'bg-gray-800 text-gray-200 border border-gray-700/50 rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 bg-gray-800">
                      <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="px-3 py-2 rounded-2xl bg-gray-800 border border-gray-700/50 rounded-tl-sm flex items-center h-[38px]">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-gray-950 border-t border-gray-800">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
