import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, X, MessageSquare, Loader2, Bot, User, ChevronDown } from 'lucide-react';
import { FancyButton } from './ui/Shared';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export const AIAssistant = () => {
  const { properties, tenants, tickets, transactions } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hallo! Ich bin Ihr PropMaster AI Assistent. Ich habe vollen Zugriff auf Ihre Portfolio-Daten. Fragen Sie mich nach Leerständen, Finanzkennzahlen oder lassen Sie mich Anschreiben an Mieter entwerfen.',
      timestamp: new Date()
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prepare Context Data
      const contextData = {
        currentDate: new Date().toISOString(),
        properties: properties.map(p => ({
            address: p.address,
            city: p.city,
            units: p.units,
            financials: p.financials
        })),
        tenants: tenants.map(t => ({
            name: t.name,
            rent: t.rent,
            status: t.status,
            leaseEnd: t.leaseEnd,
            propertyId: t.propertyId
        })),
        tickets: tickets.filter(t => t.status !== 'ERLEDIGT').map(t => ({
            title: t.title,
            priority: t.priority,
            status: t.status
        })),
        recentTransactions: transactions.slice(0, 10)
      };

      const systemPrompt = `
        Du bist der "PropMaster AI", ein hochprofessioneller Immobilien-Asset-Manager Assistent.
        Antworte präzise, hilfreich und professionell auf Deutsch.
        
        Hier sind die LIVE-Daten des Portfolios (JSON Format):
        ${JSON.stringify(contextData)}

        Regeln:
        1. Analysiere die Daten, um Fragen zu beantworten (z.B. "Wie hoch ist der Cashflow?", "Wer zahlt nicht?").
        2. Wenn du Texte generierst (z.B. E-Mail an Mieter), nutze Platzhalter wo nötig.
        3. Formatiere deine Antworten sauber (nutze Stichpunkte wenn sinnvoll).
        4. Gib keine technischen JSON-Strukturen aus, sondern natürliche Sprache.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: [
            { role: 'user', parts: [{ text: systemPrompt + "\n\nUser Anfrage: " + userMsg.text }] }
        ],
      });

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "Entschuldigung, ich konnte darauf keine Antwort generieren.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Es gab ein Problem bei der Verbindung zum AI Service. Bitte prüfen Sie den API Key.",
        timestamp: new Date()
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const QuickPrompt = ({ text }: { text: string }) => (
    <button 
        onClick={() => { setInput(text); }}
        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-full text-xs font-medium text-slate-600 transition-all whitespace-nowrap"
    >
        {text}
    </button>
  );

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 right-8 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center ${
            isOpen ? 'bg-slate-800 rotate-90' : 'bg-gradient-to-r from-emerald-500 to-teal-600 animate-bounce-slow'
        }`}
      >
        {isOpen ? <X className="text-white" /> : <Sparkles className="text-white" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-8 z-40 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 font-sans ring-1 ring-black/5">
            {/* Header */}
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white flex-none">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                        <Bot size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">PropMaster AI</h3>
                        <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Online • Portfolio Connected
                        </p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                    <ChevronDown size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-none shadow-sm ${
                            msg.role === 'user' ? 'bg-slate-200' : 'bg-white border border-emerald-100 text-emerald-600'
                        }`}>
                            {msg.role === 'user' ? <User size={14} className="text-slate-500"/> : <Sparkles size={14} />}
                        </div>
                        <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[80%] ${
                            msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-none' 
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                        }`}>
                            {msg.text.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    {i < msg.text.split('\n').length - 1 && <br />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ))}
                {isThinking && (
                     <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-emerald-100 text-emerald-600 flex items-center justify-center flex-none shadow-sm">
                            <Sparkles size={14} />
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-emerald-500"/>
                            <span className="text-xs text-slate-400 font-medium">Analysiere Portfolio...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts (Only if list is short or empty input) */}
            {!input && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                    <QuickPrompt text="Fasse mein Portfolio zusammen" />
                    <QuickPrompt text="Welche Tickets sind kritisch?" />
                    <QuickPrompt text="Entwurf Mieterhöhung" />
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 flex-none">
                <form onSubmit={handleSend} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Fragen Sie etwas über Ihre Immobilien..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                        disabled={isThinking}
                    />
                    <button 
                        type="submit" 
                        disabled={!input.trim() || isThinking}
                        className="absolute right-2 top-2 p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-200"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
      )}
    </>
  );
};
