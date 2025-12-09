import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { db } from '../services/db';
import { Send, Bot, User, Sparkles, AlertCircle, WifiOff } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const AiConsultant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Hello, I am HMWTECH.LTD Pharma AI. I can assist you with drug information, interaction checks, or analyzing your store sales patterns. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isOnline) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare context from DB (lightweight summary)
    const medicines = db.getMedicines();
    const stats = db.getStats();
    const context = `
      Inventory Summary: ${medicines.length} items.
      Low Stock: ${stats.lowStockCount} items.
      Sample items: ${medicines.slice(0, 5).map(m => m.name).join(', ')}.
    `;

    const history = messages.map(m => ({ role: m.role, text: m.text }));
    const responseText = await geminiService.chat(history, userMsg.text, context);

    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const runAnalysis = async () => {
    if (isAnalyzing || !isOnline) return;
    setIsAnalyzing(true);
    const sales = db.getSales();
    const meds = db.getMedicines();
    
    // Add temporary message
    setMessages(prev => [...prev, { id: 'temp', role: 'model', text: 'Analyzing recent sales patterns... please wait.' }]);

    const insights = await geminiService.analyzeTrends(sales, meds);
    
    // Remove temp message and add real response
    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== 'temp');
      const text = `Here are some insights based on your recent data:\n\n${insights.map((i: string) => `• ${i}`).join('\n')}`;
      return [...filtered, { id: Date.now().toString(), role: 'model', text }];
    });
    setIsAnalyzing(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg text-white ${isOnline ? 'bg-purple-600' : 'bg-slate-400'}`}>
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">AI Consultant</h3>
            <p className="text-xs text-slate-500">
              {isOnline ? 'Powered by Gemini 2.5 Flash' : 'Offline Mode - AI Unavailable'}
            </p>
          </div>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={isAnalyzing || !isOnline}
          className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
        >
          <Bot size={14} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze Store Data'}
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex space-x-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isOnline}
            placeholder={isOnline ? "Ask about drug interactions, side effects, or management advice..." : "Internet connection required for AI features."}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none h-12 max-h-32 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isOnline}
            className="absolute right-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors disabled:bg-slate-400"
          >
            <Send size={16} />
          </button>
        </div>
        
        {!isOnline && (
          <div className="mt-2 flex items-center text-xs text-slate-500 bg-slate-100 p-2 rounded">
             <WifiOff size={14} className="mr-1" />
             <span>You are currently offline. Connect to the internet to use AI features.</span>
           </div>
        )}

        {isOnline && !process.env.API_KEY && (
           <div className="mt-2 flex items-center text-xs text-amber-600 bg-amber-50 p-2 rounded">
             <AlertCircle size={14} className="mr-1" />
             <span>Warning: API Key not detected. AI features may be simulated or disabled.</span>
           </div>
        )}
      </div>
    </div>
  );
};