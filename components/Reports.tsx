import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { FileBarChart, Download, Calendar, Briefcase, Landmark, Printer, CheckCircle, Loader2 } from 'lucide-react';
import { FancyButton, FancySelect } from './ui/Shared';

export const Reports = () => {
  const { addNotification } = useApp();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const generateReport = (type: string) => {
      setIsGenerating(type);
      
      // Simulate API delay
      setTimeout(() => {
          setIsGenerating(null);
          addNotification({
              title: 'Report erstellt',
              message: `Der Bericht "${type}" wurde erfolgreich generiert.`,
              type: 'SUCCESS'
          });
      }, 2000);
  };

  const ReportCard = ({ title, description, icon, type, color }: any) => (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform duration-300`}>
              {icon}
          </div>
          <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6 flex-1 leading-relaxed">{description}</p>
          
          <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PDF Export</span>
              <FancyButton 
                variant="outline" 
                size="sm" 
                isLoading={isGenerating === type}
                onClick={() => generateReport(title)}
                icon={isGenerating === type ? undefined : <Download size={14} />}
              >
                  {isGenerating === type ? 'Generiere...' : 'Erstellen'}
              </FancyButton>
          </div>
      </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reporting Center</h1>
        <p className="text-slate-500 mt-1">Professionelle Berichte für Banken, Steuerberater und Investoren.</p>
      </div>

      <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                  <h2 className="text-2xl font-bold mb-2">Jahresabschluss 2024</h2>
                  <p className="text-slate-400 max-w-lg">
                      Erstellen Sie mit einem Klick das vollständige Reporting-Paket für das laufende Geschäftsjahr. 
                      Inklusive Cashflow-Statement, Mieterliste und Leerstandsanalysen.
                  </p>
              </div>
              <button 
                onClick={() => generateReport('Jahresabschluss Gesamt')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/50 transition-all hover:scale-105 active:scale-95"
              >
                  {isGenerating === 'Jahresabschluss Gesamt' ? <Loader2 className="animate-spin"/> : <Printer size={20} />}
                  Gesamtpaket generieren
              </button>
          </div>
          {/* Decorative BG */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportCard 
            title="Banken-Reporting" 
            description="Bonitätsunterlagen inkl. Objektbewertung, LTV-Berechnung und aktueller Mieterliste für Finanzierungsgespräche."
            icon={<Landmark size={24} className="text-blue-600"/>}
            type="BANK"
            color="bg-blue-50"
          />
          <ReportCard 
            title="Steuer-Vorbericht" 
            description="Vorbereitete Einnahmen-Überschuss-Rechnung (EÜR) sortiert nach Objekten und Kostenkategorien für den Steuerberater."
            icon={<FileBarChart size={24} className="text-amber-600"/>}
            type="TAX"
            color="bg-amber-50"
          />
          <ReportCard 
            title="Leerstands-Analyse" 
            description="Detaillierte Aufstellung aller Leerstände, Fluktuationsraten und auslaufender Verträge der nächsten 12 Monate."
            icon={<Briefcase size={24} className="text-purple-600"/>}
            type="VACANCY"
            color="bg-purple-50"
          />
           <ReportCard 
            title="Betriebskosten" 
            description="Entwurf der Betriebskostenabrechnung für Mieter basierend auf den erfassten umlagefähigen Ausgaben."
            icon={<Calendar size={24} className="text-emerald-600"/>}
            type="BK"
            color="bg-emerald-50"
          />
      </div>
    </div>
  );
};
