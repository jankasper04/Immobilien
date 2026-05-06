import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { TransactionType, TicketStatus } from '../types';
import { formatEUR } from '../utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut, Search, Hand, Home, Menu } from 'lucide-react';

export const Dashboard = () => {
  const { properties, transactions, tickets, tenants, setActiveTab } = useApp();
  
  const [alleVorgaengeOpen, setAlleVorgaengeOpen] = useState(true);

  // KPIs
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthName = new Date().toLocaleString('de-DE', { month: 'long' });
  const currentMonthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

  const monthlyIncome = transactions
    .filter(t => t.date.startsWith(currentMonthPrefix) && t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
  const activeTenants = tenants.filter(t => t.status === 'AKTIV');
  const rentedUnits = activeTenants.length;

  const paidTenantsCount = activeTenants.filter(t => 
      transactions.some(tx => tx.description.includes(`Tenant:${t.id}|${currentMonthPrefix}`))
  ).length;

  const mieteingaengeValue = `${paidTenantsCount}/${activeTenants.length}`;

  // Ticket metrics
  const openTicketsCount = tickets.filter(t => t.status === TicketStatus.OPEN).length;
  const inProgressTicketsCount = tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length;
  const doneTicketsCount = tickets.filter(t => t.status === TicketStatus.DONE).length;

  // Real chart data
  const chartData = [];
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  
  for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mLabel = monthNames[d.getMonth()];
      const prefix = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const monTx = transactions.filter(t => t.date.startsWith(prefix));
      const einnahmen = monTx.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      const ausgaben = monTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
      
      chartData.push({
          name: mLabel,
          einnahmen,
          ausgaben,
          ueberschuss: einnahmen - ausgaben
      });
  }

  // Find max value in chartData to scale YAxis if necessary, though Recharts handles it mostly.
  const maxVal = Math.max(...chartData.flatMap(d => [d.einnahmen, d.ausgaben]));
  const yDomainMax = maxVal === 0 ? 500 : 'auto';

  return (
    <div className="space-y-8 pb-8 text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Deine Objekte im Überblick</h1>
        <button onClick={() => setActiveTab('portfolio')} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            Zur Objektübersicht
        </button>
      </div>
      
      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ValueCard 
            value={formatEUR(monthlyIncome)}
            label={`Mieteinnahmen ${monthName}`}
            linkText="Zur Finanzübersicht >"
            onClick={() => setActiveTab('finance')}
        />
        <ValueCard 
            value={mieteingaengeValue}
            label={`Mieteingänge ${monthName}`}
            linkText="Offene Mieten anzeigen >"
            onClick={() => setActiveTab('finance')}
        />
        <ValueCard 
            value={`${rentedUnits}/${totalUnits}`}
            label="Einheiten vermietet"
            linkText="Zur Leerstandsübersicht >"
            onClick={() => setActiveTab('portfolio')}
        />
      </div>

      {/* Alle Vorgänge */}
      <div>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-[15px] font-medium text-slate-500">Alle Vorgänge</h2>
              <button 
                onClick={() => setAlleVorgaengeOpen(!alleVorgaengeOpen)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
              >
                  {alleVorgaengeOpen ? 'Einklappen' : 'Ausklappen'} {alleVorgaengeOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
          </div>
          {alleVorgaengeOpen && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <TicketCard title="Offen" count={openTicketsCount} subtext="Neu erstellt, unbearbeitet" accent="none" onClick={() => setActiveTab('tickets')} />
                  <TicketCard title="In Bearbeitung" count={inProgressTicketsCount} subtext="Aktuell in Klärung" accent="yellow" onClick={() => setActiveTab('tickets')} />
                  <TicketCard title="Erledigt" count={doneTicketsCount} subtext="Erfolgreich abgeschlossen" accent="emerald" onClick={() => setActiveTab('tickets')} />
              </div>
          )}
      </div>

      {/* Cashflow Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-8">
              <h2 className="text-[15px] font-medium text-slate-700">Cashflow-Übersicht</h2>
              <div className="flex items-center gap-3 text-slate-400">
                  <button className="hover:text-slate-600"><ZoomIn size={16}/></button>
                  <button className="hover:text-slate-600"><ZoomOut size={16}/></button>
                  <button className="hover:text-slate-600"><Search size={16}/></button>
                  <button className="hover:text-slate-600"><Hand size={16}/></button>
                  <button className="hover:text-slate-600"><Home size={16}/></button>
                  <button className="hover:text-slate-600"><Menu size={16}/></button>
              </div>
          </div>
          
          <div className="flex justify-end items-center gap-6 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-sm bg-teal-600"></div> Einnahmen</div>
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-sm bg-purple-700"></div> Ausgaben</div>
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-sm bg-amber-400"></div> Überschuss</div>
          </div>

          <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12}} 
                        tickFormatter={(val) => `${val.toLocaleString('de-DE')} €`}
                        domain={[0, yDomainMax]}
                      />
                      <Tooltip />
                      <Line type="linear" dataKey="einnahmen" stroke="#0d9488" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line type="linear" dataKey="ausgaben" stroke="#7e22ce" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line type="linear" dataKey="ueberschuss" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
              </ResponsiveContainer>
          </div>
          
          <div className="mt-6 flex">
              <button onClick={() => setActiveTab('finance')} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                  Zur detaillierten Finanzübersicht
              </button>
          </div>
      </div>

    </div>
  );
};

const ValueCard = ({ value, label, linkText, onClick }: { value: string, label: string, linkText: string, onClick?: () => void }) => (
    <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-6 flex flex-col justify-between min-h-[140px]">
        <div className="flex items-center gap-6">
            <div className="w-[80px] h-[80px] relative flex-shrink-0">
                {/* SVG Progress Ring matching screenshot */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" stroke="#f1f5f9" strokeWidth="6"
                    />
                    {/* Add a colored stroke if there is a value, for now just empty matching screenshot */}
                </svg>
            </div>
            <div>
                <div className="text-[32px] font-light text-slate-800 tracking-tight leading-none mb-1">{value}</div>
                <div className="text-[14px] font-medium text-slate-500">{label}</div>
            </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center">
            <button onClick={onClick} className="text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center">
                {linkText}
            </button>
        </div>
    </div>
);

const TicketCard = ({ title, count, subtext, accent, onClick }: { title: string, count: number, subtext?: string, accent: 'none' | 'red' | 'yellow' | 'emerald', onClick?: () => void }) => {
    let accentClass = '';
    if (accent === 'red') accentClass = 'border-l-4 border-l-red-600';
    if (accent === 'yellow') accentClass = 'border-l-4 border-l-amber-500';
    if (accent === 'emerald') accentClass = 'border-l-4 border-l-emerald-500';

    return (
        <div onClick={onClick} className={`bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-5 cursor-pointer hover:shadow-md transition-shadow ${accentClass}`}>
            <h3 className="text-[15px] font-medium text-slate-800 mb-4">{title}</h3>
            <div className="flex items-baseline gap-6 mb-2">
                <div className="flex items-baseline gap-2">
                    <span className="text-[34px] font-light text-slate-700 leading-none">{count}</span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Vorgänge</span>
                </div>
            </div>
            {subtext && <p className="text-[13px] text-slate-400 mt-2">{subtext}</p>}
        </div>
    );
};