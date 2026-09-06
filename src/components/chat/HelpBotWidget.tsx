import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithAuth } from '../../utils/fetchWithAuth';

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

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: queryText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({ role: m.role, text: m.text }));
      
      const response = await fetchWithAuth('/api/chat', {
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
                    m.id === botMsgId ? { ...m, text: m.text + '\n' + parsed.error } : m
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
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          text: 'I am experiencing high network traffic. Please try asking again or select one of the suggested tactical topics.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendQuery(input);
  };

  const SUGGESTED_QUESTIONS = [
    'What is Seemadrishti?',
    'What is Camera Fleet?',
    'Explain the 5 Swarm Agents',
    'How does Target Journey work?',
    'Explain Stream Diagnostics',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-84 sm:w-96 h-[520px] bg-[#040812]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.95)] backdrop-blur-xl flex flex-col overflow-hidden mb-3"
          >
            {/* Tactical Header */}
            <div className="bg-[#02040a] px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-cyan-950/80 border border-cyan-500/40 p-1.5 rounded-lg text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-cyan-200 font-mono tracking-wider uppercase">
                      SEEMADRISHTI COPILOT
                    </h3>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">Autonomous Swarm & Defense Advisory</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer"
                title="Close Copilot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#030712]/70 font-mono text-xs">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-3">
                  <div className="w-12 h-12 bg-cyan-950/60 border border-cyan-500/40 rounded-full flex items-center justify-center mb-2.5 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h4 className="text-cyan-200 font-bold text-xs mb-1 tracking-wider uppercase">TACTICAL INTELLIGENCE COPILOT</h4>
                  <p className="text-[10px] text-slate-400 max-w-[280px] mb-3 font-sans leading-relaxed">
                    Direct access to surveillance telemetry, 5-agent swarm coordination, and Section 65B forensics:
                  </p>
                  <div className="flex flex-col gap-1.5 w-full">
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendQuery(q)}
                        className="w-full px-3 py-1.5 text-[11px] rounded-lg bg-[#090d16] hover:bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/60 transition-all text-left font-mono cursor-pointer flex items-center justify-between group"
                      >
                        <span className="truncate">{q}</span>
                        <span className="text-slate-600 group-hover:text-cyan-400 text-[10px]">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 border ${
                        msg.role === 'user' 
                          ? 'bg-cyan-950 border-cyan-400/50 text-cyan-300' 
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}>
                        {msg.role === 'user' ? (
                          <User className="w-3 h-3 text-cyan-300" />
                        ) : (
                          <Bot className="w-3 h-3 text-cyan-400" />
                        )}
                      </div>
                      <div className={`px-3 py-2 rounded-xl text-xs whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-cyan-900/60 text-cyan-100 border border-cyan-500/40 rounded-tr-xs shadow-[0_0_12px_rgba(0,240,255,0.15)]' 
                          : 'bg-[#090d16] text-slate-200 border border-slate-800 rounded-tl-xs shadow-md'
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
                    <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 bg-slate-900 border border-slate-700">
                      <Bot className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-[#090d16] border border-cyan-500/30 rounded-tl-xs flex items-center gap-2 h-[34px]">
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      <span className="text-[10px] text-slate-400 font-mono">Synthesizing intelligence...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-2.5 bg-[#02040a] border-t border-cyan-500/20">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter tactical query..."
                  className="w-full bg-[#090d16] border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 top-1 bottom-1 px-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-md transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Tactical Launcher Button */}
      <div className="flex items-center gap-2">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#040812]/90 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wider text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)] backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            AI COPILOT
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-12 h-12 rounded-full bg-[#040812] border-2 border-cyan-400/80 hover:border-cyan-300 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title="Tactical AI Copilot & Defense Help Bot"
        >
          <span className="absolute -inset-1 rounded-full border border-cyan-500/30 animate-ping pointer-events-none opacity-40"></span>
          {isOpen ? <X className="w-5 h-5 text-rose-400" /> : <Bot className="w-5 h-5 text-cyan-300" />}
        </button>
      </div>
    </div>
  );
}
