import React, { useState } from 'react';
import { Property, Tenant, PropertyDocument } from '../types';
import { calculateMonthlyCashflow, calculateProjection, formatEUR } from '../utils';
import { useApp } from '../AppContext';
import { 
  ArrowLeft, MapPin, Building, Bed, Users, FileText, 
  TrendingUp, Download, AlertCircle, BadgeEuro,
  Plus, Trash2, X, Sparkles, User, Euro, Calendar
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { AIStrategy } from './AIStrategy';
import { FancyButton, FancyInput, FancySelect, Modal, ConfirmDialog } from './ui/Shared';

interface PropertyDetailProps {
  property: Property;
  onBack: () => void;
}

export const PropertyDetail: React.FC<PropertyDetailProps> = ({ property, onBack }) => {
  const { tickets, tenants, documents, addTenant, deleteTenant, addDocument, deleteDocument } = useApp();
  const [activeTab, setActiveTab] = useState<'uebersicht' | 'strategy' | 'finanzen' | 'mieter' | 'dokumente'>('uebersicht');
  
  // Modal States
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState<Partial<Tenant>>({ status: 'AKTIV' });

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState<Partial<PropertyDocument>>({ type: 'SONSTIGES' });

  // Delete Confirmation States
  const [deleteItem, setDeleteItem] = useState<{ type: 'TENANT' | 'DOC', id: string } | null>(null);

  const stats = calculateMonthlyCashflow(property);
  const projectionData = calculateProjection(property, 15);
  const propertyTickets = tickets.filter(t => t.propertyId === property.id);
  const propertyTenants = tenants.filter(t => t.propertyId === property.id);
  const propertyDocs = documents.filter(d => d.propertyId === property.id);

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.name || !newTenant.rent) return;
    
    addTenant({
        id: Date.now().toString(),
        propertyId: property.id,
        name: newTenant.name,
        unit: newTenant.unit || 'Standard',
        rent: Number(newTenant.rent),
        leaseStart: newTenant.leaseStart || new Date().toISOString().split('T')[0],
        leaseEnd: newTenant.leaseEnd,
        status: newTenant.status as any || 'AKTIV',
        email: newTenant.email
    });
    setIsTenantModalOpen(false);
    setNewTenant({ status: 'AKTIV' });
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name) return;

    addDocument({
        id: Date.now().toString(),
        propertyId: property.id,
        name: newDoc.name,
        type: newDoc.type as any || 'SONSTIGES',
        date: new Date().toISOString().split('T')[0],
        size: '1.5 MB' // Simulated
    });
    setIsDocModalOpen(false);
    setNewDoc({ type: 'SONSTIGES' });
  };

  const confirmDelete = () => {
      if (!deleteItem) return;
      if (deleteItem.type === 'TENANT') {
          deleteTenant(deleteItem.id);
      } else {
          deleteDocument(deleteItem.id);
      }
      setDeleteItem(null);
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'uebersicht':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* Linke Hauptspalte: KPIs wie im Screenshot */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Kennzahlen Box */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Kennzahlen heute</h3>
                    <span className="text-xs text-slate-500">Basis: Monatlich</span>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Bruttorendite</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.grossYield.toFixed(1)}%</p>
                        <p className="text-xs text-slate-400">Faktor: {stats.factor.toFixed(1)}x</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Nettorendite</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.netYield.toFixed(1)}%</p>
                        <p className="text-xs text-slate-400">EK-Rendite: {stats.equityYield.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cashflow (n. Steuer)</p>
                        <p className={`text-2xl font-bold ${stats.postTaxCashflow > 0 ? 'text-slate-900' : 'text-red-500'}`}>
                           {formatEUR(stats.postTaxCashflow)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Vermögensaufbau</p>
                        <p className="text-2xl font-bold text-blue-600">+{formatEUR(stats.monthlyAmortization)}</p>
                        <p className="text-xs text-slate-400">durch Tilgung</p>
                    </div>
                </div>
              </div>

              {/* Cashflow Detail Tabelle (Wie Screenshot unten rechts) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                 <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800">Cashflow & Überschussrechnung (Monatlich)</h3>
                </div>
                <div className="text-sm">
                    <div className="flex justify-between px-6 py-3 border-b border-slate-100">
                        <span className="text-slate-600">Kaltmiete (Soll)</span>
                        <span className="font-medium text-slate-900">{formatEUR(property.financials.coldRent)}</span>
                    </div>
                    <div className="flex justify-between px-6 py-3 border-b border-slate-100">
                        <span className="text-slate-600">- Bewirtschaftung (nicht umlagefähig + Rücklage)</span>
                        <span className="text-red-500">-{formatEUR(property.financials.operatingCostsNonRecoverable + (property.financials.maintenanceReserve || 0))}</span>
                    </div>
                    <div className="flex justify-between px-6 py-3 border-b border-slate-100">
                        <span className="text-slate-600">- Zinsen (Bank)</span>
                        <span className="text-red-500">-{formatEUR(stats.monthlyInterest)}</span>
                    </div>
                    <div className="flex justify-between px-6 py-3 border-b border-slate-100">
                        <span className="text-slate-600">- Tilgung (Bank)</span>
                        <span className="text-red-500">-{formatEUR(stats.monthlyRepayment)}</span>
                    </div>
                    <div className="flex justify-between px-6 py-3 bg-slate-50 font-bold border-b border-slate-200">
                        <span>= Cashflow operativ (vor Steuer)</span>
                        <span className={stats.preTaxCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatEUR(stats.preTaxCashflow)}</span>
                    </div>
                     <div className="flex justify-between px-6 py-3 border-b border-slate-100">
                        <span className="text-slate-600">- Steuern (geschätzt)</span>
                        <span className="text-red-500">-{formatEUR(stats.estimatedTax)}</span>
                    </div>
                    <div className="flex justify-between px-6 py-4 bg-slate-900 text-white font-bold">
                        <span>= Cashflow nach Steuer</span>
                        <span>{formatEUR(stats.postTaxCashflow)}</span>
                    </div>
                </div>
              </div>

            </div>

            {/* Rechte Spalte: Objekt & Finanzierungsdetails */}
            <div className="space-y-6">
                
                {/* Objekt Info */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                     <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Building size={18}/> Objekt Daten</h3>
                     <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Kaufdatum</span>
                            <span className="font-medium text-slate-800">{new Date(property.purchaseDate).toLocaleDateString('de-DE')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Baujahr</span>
                            <span className="font-medium text-slate-800">{property.yearBuilt}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Wohnfläche</span>
                            <span className="font-medium text-slate-800">{property.area} m²</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                            <span className="text-slate-500">Kaufpreis</span>
                            <span className="font-bold text-slate-800">{formatEUR(property.purchasePrice)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-slate-500">Investitionskosten gesamt</span>
                            <span className="font-bold text-slate-800">{formatEUR(stats.costs.totalInvest)}</span>
                        </div>
                     </div>
                </div>

                {/* Finanzierung Snapshot */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><BadgeEuro size={18}/> Finanzierung</h3>
                     <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Darlehenssumme</span>
                            <span className="font-medium text-slate-800">{formatEUR(property.financials.loanAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Eigenkapital</span>
                            <span className="font-medium text-slate-800">{formatEUR(stats.equity)}</span>
                        </div>
                        <div className="h-px bg-slate-100 my-2"></div>
                         <div className="flex justify-between">
                            <span className="text-slate-500">Zinssatz</span>
                            <span className="font-medium text-slate-800">{property.financials.loanInterestRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tilgung (anfänglich)</span>
                            <span className="font-medium text-slate-800">{property.financials.loanRepaymentRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-2 mt-2 font-bold text-slate-900">
                            <span>Bankrate (mtl.)</span>
                            <span>{formatEUR(stats.monthlyDebtService)}</span>
                        </div>
                     </div>
                </div>

                {/* Wartung */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertCircle size={18} className="text-slate-400"/> Offene Tickets
                    </h3>
                    <div className="space-y-3">
                        {propertyTickets.length > 0 ? propertyTickets.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{t.title}</p>
                                    <p className="text-xs text-slate-500 capitalize">{t.status.toLowerCase().replace('_', ' ')}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.priority === 'HOCH' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {t.priority}
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-400 text-sm italic">Keine offenen Tickets.</p>
                        )}
                    </div>
                </div>
            </div>
          </div>
        );
      
      case 'strategy':
        return <AIStrategy property={property} />;
      
      case 'finanzen':
        return (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-slate-900">15-Jahre Vermögensprojektion</h3>
                        <p className="text-slate-500 text-sm">Simulierter Vermögensaufbau basierend auf 2% Wertsteigerung und aktuellem Tilgungsplan.</p>
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorLoan" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `€${val/1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`${formatEUR(value)}`, '']}
                                />
                                <Area type="monotone" dataKey="propertyValue" stackId="1" stroke="#10b981" fill="url(#colorValue)" name="Immobilienwert" />
                                <Area type="monotone" dataKey="loanBalance" stackId="2" stroke="#f43f5e" fill="url(#colorLoan)" name="Restschuld" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );

      case 'mieter':
        return (
             <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-end">
                    <FancyButton onClick={() => setIsTenantModalOpen(true)} icon={<Plus size={16}/>}>
                         Mieter hinzufügen
                    </FancyButton>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Einheit</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Kontakt</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Vertragsbeginn</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Miete</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Aktion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {propertyTenants.length > 0 ? propertyTenants.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                                <td className="p-4 font-semibold text-slate-700">{t.unit}</td>
                                <td className="p-4 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {t.name.charAt(0)}
                                    </div>
                                    {t.name}
                                </td>
                                <td className="p-4 text-sm text-slate-500">{t.email || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        t.status === 'AKTIV' ? 'bg-emerald-100 text-emerald-700' : 
                                        t.status === 'ZAHLUNGSVERZUG' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {t.status}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-500 text-sm">{new Date(t.leaseStart).toLocaleDateString('de-DE')}</td>
                                <td className="p-4 text-right font-mono font-bold text-slate-700">{formatEUR(t.rent)}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => setDeleteItem({ type: 'TENANT', id: t.id })} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 italic">Noch keine Mieter angelegt.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
             </div>
        );

      case 'dokumente':
        return (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                 <div className="flex justify-end">
                    <FancyButton onClick={() => setIsDocModalOpen(true)} icon={<Plus size={16}/>}>
                        Dokument ablegen
                    </FancyButton>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {propertyDocs.map((doc) => (
                        <div key={doc.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center gap-3 relative">
                            <button onClick={(e) => { e.stopPropagation(); setDeleteItem({ type: 'DOC', id: doc.id }); }} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                <Trash2 size={14}/>
                            </button>
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                                <FileText size={24} className="text-slate-400 group-hover:text-emerald-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-700 text-sm">{doc.name}</p>
                                <p className="text-[10px] uppercase text-slate-400 font-bold mt-1">{doc.type}</p>
                            </div>
                            <span className="text-xs text-slate-400">{doc.size} • {new Date(doc.date).toLocaleDateString('de-DE')}</span>
                        </div>
                    ))}
                    <div onClick={() => setIsDocModalOpen(true)} className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-600 cursor-pointer p-6 transition-all min-h-[200px]">
                        <Download size={24} className="mb-2"/>
                        <span className="text-xs font-bold uppercase">Upload</span>
                    </div>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Detail Header */}
      <div className="relative h-64 w-full bg-slate-900 group">
        <img 
            src={property.imageUrl} 
            className="w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-opacity"
            alt={property.address}
        />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-slate-900 to-transparent"></div>
        
        <div className="absolute top-6 left-6">
            <button 
                onClick={onBack}
                className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/20 transition-all text-sm font-medium border border-white/10"
            >
                <ArrowLeft size={16} /> Zurück
            </button>
        </div>

        <div className="absolute bottom-8 left-8 text-white">
            <h1 className="text-4xl font-bold tracking-tight mb-2">{property.address}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-300 font-medium">
                <span className="flex items-center gap-1"><MapPin size={14}/> {property.city}, {property.zipCode}</span>
                <span className="flex items-center gap-1"><Building size={14}/> Baujahr {property.yearBuilt}</span>
                <span className="flex items-center gap-1"><Bed size={14}/> {property.units} Einheiten</span>
                <span className="flex items-center gap-1"><Users size={14}/> {propertyTenants.length} Mieter</span>
            </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8">
        <div className="flex gap-8">
            {[
                {id: 'uebersicht', label: 'Übersicht & Kennzahlen'}, 
                {id: 'strategy', label: 'Strategie & Szenarien', icon: <Sparkles size={16} className="text-yellow-500 mr-2"/>}, 
                {id: 'finanzen', label: 'Prognose'}, 
                {id: 'mieter', label: `Mieter (${propertyTenants.length})`}, 
                {id: 'dokumente', label: `Dokumente (${propertyDocs.length})`}
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center ${
                        activeTab === tab.id 
                        ? 'border-emerald-500 text-slate-900' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {tab.icon && tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-[1600px] mx-auto p-8">
        {renderContent()}
      </div>

      {/* Tenant Modal */}
      <Modal 
        isOpen={isTenantModalOpen} 
        onClose={() => setIsTenantModalOpen(false)} 
        title="Neuer Mieter"
      >
          <form onSubmit={handleAddTenant} className="p-6 space-y-4">
              <FancyInput 
                  label="Name" 
                  value={newTenant.name || ''} 
                  onChange={e => setNewTenant({...newTenant, name: e.target.value})} 
                  autoFocus 
                  required 
                  icon={<User size={16}/>}
              />
              <div className="grid grid-cols-2 gap-4">
                  <FancyInput 
                    label="Einheit" 
                    placeholder="z.B. EG" 
                    value={newTenant.unit || ''} 
                    onChange={e => setNewTenant({...newTenant, unit: e.target.value})} 
                    required 
                  />
                  <FancyInput 
                    label="Miete (€)" 
                    type="number" 
                    value={newTenant.rent || ''} 
                    onChange={e => setNewTenant({...newTenant, rent: Number(e.target.value)})} 
                    required 
                    icon={<Euro size={16}/>}
                  />
              </div>
              <FancyInput 
                label="Vertragsbeginn" 
                type="date" 
                value={newTenant.leaseStart} 
                onChange={e => setNewTenant({...newTenant, leaseStart: e.target.value})} 
                icon={<Calendar size={16}/>}
              />
              <div className="mt-6">
                <FancyButton type="submit" className="w-full">Speichern</FancyButton>
              </div>
          </form>
      </Modal>

      {/* Document Modal */}
      <Modal 
        isOpen={isDocModalOpen} 
        onClose={() => setIsDocModalOpen(false)} 
        title="Neues Dokument"
      >
          <form onSubmit={handleAddDoc} className="p-6 space-y-4">
              <FancyInput 
                  label="Name" 
                  value={newDoc.name || ''} 
                  onChange={e => setNewDoc({...newDoc, name: e.target.value})} 
                  autoFocus 
                  required 
                  icon={<FileText size={16}/>}
              />
              <FancySelect 
                label="Typ"
                value={newDoc.type} 
                onChange={e => setNewDoc({...newDoc, type: e.target.value as any})}
              >
                  <option value="VERTRAG">Vertrag</option>
                  <option value="RECHNUNG">Rechnung</option>
                  <option value="GRUNDRISS">Grundriss</option>
                  <option value="SONSTIGES">Sonstiges</option>
              </FancySelect>
              <div className="mt-6">
                 <FancyButton type="submit" className="w-full">Hinzufügen</FancyButton>
              </div>
          </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog 
        isOpen={!!deleteItem} 
        onClose={() => setDeleteItem(null)} 
        onConfirm={confirmDelete}
        title={deleteItem?.type === 'TENANT' ? "Mieter löschen?" : "Dokument löschen?"}
        description={deleteItem?.type === 'TENANT' ? "Dieser Vorgang entfernt den Mieter und die Historie unwiderruflich." : "Möchten Sie dieses Dokument wirklich aus der Akte entfernen?"}
      />
    </div>
  );
};
