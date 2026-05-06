import React, { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp } from './AppContext';
import { Dashboard } from './components/Dashboard';
import { Portfolio } from './components/Portfolio';
import { Finance } from './components/Finance';
import { Tickets } from './components/Tickets';
import { Tenants } from './components/Tenants';
import { Documents } from './components/Documents';
import { Reports } from './components/Reports';
import { AIAssistant } from './components/AIAssistant';
import { LayoutDashboard, Building2, Receipt, Wrench, Bell, UserCircle, PieChart, Search, Menu, Plus, Check, Users, FileText, BarChart3, Zap, Landmark, BookOpen, Mail, FileSignature, ChevronLeft, ChevronRight, ListTodo, TrendingUp } from 'lucide-react';
import { FancyInput, Toast } from './components/ui/Shared';
import { AppNotification } from './types';

import { PlaceholderView } from './components/PlaceholderView';

// Main App Component
const AppContent = () => {
  const { activeTab, setActiveTab, searchQuery, setSearchQuery, notifications, markNotificationRead, activeToast } = useApp();
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const notiRef = useRef<HTMLDivElement>(null);

  // Click outside to close notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setIsNotiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'tickets': return <Tickets />;
      case 'portfolio': return <Portfolio />;
      case 'tenants': return <Tenants />;
      case 'finance': return <Finance />;
      case 'documents': return <Documents />;
      default: return <Dashboard />;
    }
  };

  const getHeaderTitle = () => {
       switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'tickets': return 'Vorgänge';
      case 'portfolio': return 'Objekte';
      case 'tenants': return 'Mietverhältnisse';
      case 'finance': return 'Finanzen';
      case 'documents': return 'Dokumente';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] text-slate-900 font-sans overflow-hidden selection:bg-teal-100 selection:text-teal-900">
      
      {/* Global Toast */}
      <Toast notification={activeToast} />
      
      {/* AI Assistant - Global Component (hidden/mini icon or floating widget) */}
      <AIAssistant />

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0 opacity-0 pointer-events-none'} bg-white border-r border-[#e5e7eb] flex flex-col z-30 transition-all duration-300 relative shrink-0`}>
        
        {/* Toggle Button */}
        <button 
           onClick={() => setIsSidebarOpen(!isSidebarOpen)}
           className="absolute -right-3 top-6 bg-teal-50 border border-teal-200 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center hover:bg-teal-100 z-50 shadow-sm"
        >
            <ChevronLeft size={14} />
        </button>

        {/* Suchen & Vorgang */}
        <div className="p-4 flex flex-col gap-3">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Suchen" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                />
            </div>
            
            <button 
                onClick={() => setActiveTab('tickets')}
                className="flex items-center justify-center gap-2 w-full bg-teal-50 text-teal-700 hover:bg-teal-100 px-4 py-2 rounded-full font-medium text-sm transition-colors border border-teal-100"
            >
                <Plus size={16} /> Vorgang erstellen
            </button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto mb-4 custom-scrollbar">
          <SidebarItem icon={<LayoutDashboard />} label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<ListTodo />} label="Vorgänge" isActive={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} />
          <SidebarItem icon={<Building2 />} label="Objekte" isActive={activeTab === 'portfolio'} onClick={() => setActiveTab('portfolio')} />
          <SidebarItem icon={<Users />} label="Mietverhältnisse" isActive={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')} />
          
          <div className="my-2" />
          <SidebarItem icon={<TrendingUp />} label="Finanzen" isActive={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
          <SidebarItem icon={<FileText />} label="Dokumente" isActive={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent relative">
        {/* Toggle Button when collapsed */}
        {!isSidebarOpen && (
             <button 
                 onClick={() => setIsSidebarOpen(true)}
                 className="absolute left-0 top-6 bg-teal-50 border border-teal-200 text-teal-700 w-8 h-8 rounded-r-full flex items-center justify-center hover:bg-teal-100 z-50 shadow-sm transition-all"
             >
                 <ChevronRight size={16} className="-ml-1" />
             </button>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, isActive, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-6 py-[10px] text-[15px] transition-colors relative group ${
      isActive 
        ? 'bg-slate-800 text-white font-medium shadow-md mx-2 w-[calc(100%-16px)] rounded-md' 
        : 'text-slate-600 hover:text-slate-900 bg-transparent'
    }`}
  >
    <div className="flex items-center gap-3">
        {React.cloneElement(icon, { 
            className: `${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`,
            size: 18,
            strokeWidth: isActive ? 2.5 : 2
        })}
        {label}
    </div>
    {badge !== undefined && (
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${isActive ? 'bg-white text-slate-800' : 'bg-slate-500 text-white'}`}>
            {badge}
        </span>
    )}
  </button>
);

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
