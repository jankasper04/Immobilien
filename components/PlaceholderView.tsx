import React from 'react';
import { Hammer, Sparkles, Construction, Cog } from 'lucide-react';

export const PlaceholderView = ({ title, description }: { title: string, description: string }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-teal-100 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="w-24 h-24 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-lg relative z-10">
          <Cog className="text-teal-500 animate-[spin_4s_linear_infinite]" size={40} />
        </div>
      </div>
      <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">{title}</h1>
      <p className="text-slate-500 max-w-md">{description}</p>
      
      <div className="mt-8 flex gap-4">
          <button className="bg-slate-900 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors">
              Feature anfragen
          </button>
          <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors">
              Zurück zum Dashboard
          </button>
      </div>
    </div>
  );
};
