import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Transaction, TransactionType } from '../types';
import { Plus, ArrowUpRight, ArrowDownLeft, X, Filter, DollarSign, PieChart as PieIcon, Wallet, Save, Download, Calendar, Tag, FileText, Building2, CheckCircle, Circle, UserCircle } from 'lucide-react';
import { formatEUR } from '../utils';
import { FancyButton, FancyInput, FancySelect, Modal } from './ui/Shared';

export const Finance = () => {
  const { transactions, properties, addTransaction, deleteTransaction, tenants } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter States
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // Default to current month YYYY-MM
  
  // New Transaction State
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: TransactionType.INCOME, date: new Date().toISOString().split('T')[0] });

  // Filter Logic
  const filteredTransactions = transactions.filter(t => {
      const matchProp = selectedPropertyId === 'ALL' || t.propertyId === selectedPropertyId;
      const matchMonth = !selectedMonth || t.date.startsWith(selectedMonth);
      return matchProp && matchMonth;
  });

  // Calculate stats based on FILTERED view
  const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.propertyId) return;

    addTransaction({
      id: Date.now().toString(),
      propertyId: newTx.propertyId,
      amount: Number(newTx.amount),
      type: newTx.type || TransactionType.INCOME,
      category: newTx.category || 'Allgemein',
      date: newTx.date || new Date().toISOString(),
      description: newTx.description || '',
    });
    setIsModalOpen(false);
    setNewTx({ type: TransactionType.INCOME, date: new Date().toISOString().split('T')[0] });
  };

  const handleToggleRent = (tenantId: string, propertyId: string, amount: number) => {
      if (!selectedMonth) return;
      const matchLabel = `Mieteingang Tenant:${tenantId}|${selectedMonth}`;
      const existingTx = transactions.find(t => t.description.includes(matchLabel));
      
      if (existingTx) {
          deleteTransaction(existingTx.id);
      } else {
          addTransaction({
              id: Date.now().toString(),
              propertyId,
              amount,
              type: TransactionType.INCOME,
              category: 'Miete',
              date: `${selectedMonth}-03`, // Defaulting to the 3rd of the month for rent
              description: matchLabel,
          });
      }
  };

  const exportToCSV = () => {
    const headers = ['Datum', 'Objekt', 'Typ', 'Kategorie', 'Beschreibung', 'Betrag'];
    const rows = filteredTransactions.map(t => [
        t.date,
        getPropertyAddress(t.propertyId),
        t.type,
        t.category,
        t.description,
        t.type === TransactionType.INCOME ? t.amount : -t.amount
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finanzdaten_${selectedMonth || 'gesamt'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPropertyAddress = (id: string) => properties.find(p => p.id === id)?.address || 'Unbekanntes Objekt';

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Finanzbuchhaltung</h1>
           <p className="text-slate-500 mt-1">Vollständige Erfassung aller Transaktionen.</p>
        </div>
        <div className="flex gap-3">
             <FancyButton variant="outline" onClick={exportToCSV} icon={<Download size={18} />}>
                Export CSV
            </FancyButton>
            <FancyButton onClick={() => setIsModalOpen(true)} icon={<Plus size={18} />}>
                Buchung hinzufügen
            </FancyButton>
        </div>
      </div>

      {/* Finance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <ArrowDownLeft size={24} />
            </div>
            <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Einnahmen</p>
                <p className="text-2xl font-bold text-slate-900">{formatEUR(totalIncome)}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-lg text-red-600">
                <ArrowUpRight size={24} />
            </div>
             <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Ausgaben</p>
                <p className="text-2xl font-bold text-slate-900">{formatEUR(totalExpense)}</p>
            </div>
        </div>
         <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm flex items-center gap-4 text-white">
            <div className="p-3 bg-white/10 rounded-lg text-emerald-400">
                <Wallet size={24} />
            </div>
             <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Netto Gewinn</p>
                <p className="text-2xl font-bold text-white">{formatEUR(netProfit)}</p>
            </div>
        </div>
      </div>

      {/* Rent Checkoff Table */}
      {selectedMonth && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                      <h3 className="font-bold text-slate-800">Mieteingänge abhaken</h3>
                      <p className="text-xs text-slate-500">Gefilterter Monat: {selectedMonth}</p>
                  </div>
              </div>
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                  {tenants.map(tenant => {
                      const matchLabel = `Mieteingang Tenant:${tenant.id}|${selectedMonth}`;
                      const isPaid = transactions.some(t => t.description.includes(matchLabel));
                      const property = properties.find(p => p.id === tenant.propertyId);
                      
                      return (
                          <div key={tenant.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                      <UserCircle size={24} />
                                  </div>
                                  <div>
                                      <p className="font-semibold text-slate-900 text-sm">{tenant.name}</p>
                                      <p className="text-xs text-slate-500">{property?.address} &bull; {tenant.unit}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-6">
                                  <span className="font-medium text-slate-900">{formatEUR(tenant.rent)}</span>
                                  <button 
                                      onClick={() => handleToggleRent(tenant.id, tenant.propertyId, tenant.rent)}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500 shadow-sm'}`}
                                  >
                                      {isPaid ? <CheckCircle size={20} /> : <Circle size={20} />}
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
        
        {/* Active Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/50 justify-between items-center">
            <h3 className="font-semibold text-slate-700 pl-2">Transaktionsliste</h3>
            <div className="flex gap-3 w-full md:w-auto">
                <div className="w-full md:w-48">
                    <FancySelect 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)}
                        icon={<Calendar size={14}/>}
                        className="py-2 text-xs"
                    >
                        <option value="">Alle Zeiträume</option>
                        {/* Dynamically generate last 12 months options could be added here, simplified for now */}
                        <option value={new Date().toISOString().slice(0, 7)}>Aktueller Monat</option>
                        <option value="2024-01">Januar 2024</option>
                        <option value="2024-02">Februar 2024</option>
                        <option value="2024-03">März 2024</option>
                        <option value="2023">2023</option>
                    </FancySelect>
                </div>
                <div className="w-full md:w-48">
                    <FancySelect 
                        value={selectedPropertyId} 
                        onChange={e => setSelectedPropertyId(e.target.value)}
                        icon={<Building2 size={14}/>}
                        className="py-2 text-xs"
                    >
                        <option value="ALL">Alle Objekte</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.address}</option>
                        ))}
                    </FancySelect>
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</th>
              <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Objekt</th>
              <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategorie</th>
              <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Betrag</th>
              <th className="p-5 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTransactions.length > 0 ? filteredTransactions.map(tx => (
              <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="p-5 text-sm text-slate-500 font-mono">
                  {new Date(tx.date).toLocaleDateString('de-DE')}
                </td>
                <td className="p-5">
                   <div className="font-medium text-slate-900 text-sm">{getPropertyAddress(tx.propertyId)}</div>
                </td>
                <td className="p-5">
                   <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${tx.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                             {tx.type === TransactionType.INCOME ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">{tx.category}</p>
                            <p className="text-xs text-slate-400">{tx.description}</p>
                        </div>
                   </div>
                </td>
                <td className={`p-5 text-right font-mono font-bold text-sm ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {tx.type === TransactionType.INCOME ? '+' : '-'}{formatEUR(tx.amount)}
                </td>
                <td className="p-5 w-16 text-right">
                    <button onClick={() => { if(window.confirm('Transaktion löschen?')) deleteTransaction(tx.id); }} className="text-slate-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <X size={16} />
                    </button>
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">Keine Transaktionen für diesen Filter gefunden.</td>
                </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

       {/* Modal */}
       <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Buchung erfassen"
       >
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <FancySelect 
                label="Objekt"
                value={newTx.propertyId || ''}
                onChange={e => setNewTx({...newTx, propertyId: e.target.value})}
                required
              >
                  <option value="">Objekt wählen...</option>
                  {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
              </FancySelect>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Typ</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setNewTx({...newTx, type: TransactionType.INCOME})}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${newTx.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                             Einnahme
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewTx({...newTx, type: TransactionType.EXPENSE})}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${newTx.type === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                             Ausgabe
                        </button>
                    </div>
                </div>
                <FancyInput 
                  label="Datum"
                  type="date" 
                  value={newTx.date}
                  onChange={e => setNewTx({...newTx, date: e.target.value})}
                  icon={<Calendar size={16}/>}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FancyInput 
                  label="Betrag (€)"
                  type="number"
                  step="0.01" 
                  placeholder="0.00"
                  value={newTx.amount || ''}
                  onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})}
                  required
                  icon={<DollarSign size={16}/>}
                />
                <FancyInput 
                  label="Kategorie"
                  type="text"
                  placeholder="z.B. Miete"
                  value={newTx.category || ''}
                  onChange={e => setNewTx({...newTx, category: e.target.value})}
                  required
                  icon={<Tag size={16}/>}
                />
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Beschreibung</label>
                  <div className="relative">
                      <div className="absolute left-3 top-3 text-slate-400 pointer-events-none">
                          <FileText size={16} />
                      </div>
                      <textarea 
                        rows={2}
                        placeholder="Details zur Buchung..."
                        className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all text-sm text-slate-900 shadow-sm font-medium"
                        value={newTx.description || ''}
                        onChange={e => setNewTx({...newTx, description: e.target.value})}
                      />
                  </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-4">
                <FancyButton variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Abbrechen
                </FancyButton>
                <FancyButton type="submit" icon={<Save size={16} />}>
                  Speichern
                </FancyButton>
              </div>
            </form>
       </Modal>
    </div>
  );
};
