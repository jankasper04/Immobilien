import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Property } from '../types';
import { calculateMonthlyCashflow, calculatePurchaseCosts, formatEUR } from '../utils';
import { Plus, MapPin, Trash2, Edit2, X, Bed, Maximize, TrendingUp, Grid, List as ListIcon, Calculator, Building, Banknote, Save, Search, Home, LayoutList, LayoutGrid, ArrowUpDown, ChevronDown } from 'lucide-react';
import { PropertyDetail } from './PropertyDetail';
import { FancyInput, FancySelect, FancyButton, Modal } from './ui/Shared';

// Default Financials for new properties
const DEFAULT_FINANCIALS = {
  transferTaxPercent: 6.5,
  notaryPercent: 1.5,
  registryPercent: 0.5,
  agentPercent: 3.57,
  landValuePercent: 20,
  personalTaxRate: 42,
  loanInterestRate: 3.85,
  loanRepaymentRate: 2.0,
  operatingCostsRecoverable: 100,
  operatingCostsNonRecoverable: 50,
  maintenanceReserve: 20,
  coldRent: 800,
  loanAmount: 0
};

type SortOption = 'date_desc' | 'price_desc' | 'yield_desc' | 'cashflow_desc';

export const Portfolio = () => {
  const { filteredProperties, addProperty, deleteProperty, updateProperty, searchQuery } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'financials' | 'analysis'>('general');
  
  // View State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Selected Property for Detail View
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Property>>({ financials: DEFAULT_FINANCIALS });

  // Update loan amount automatically when price changes if it wasn't manually set
  useEffect(() => {
    if (formData.purchasePrice && (!formData.financials?.loanAmount || formData.financials.loanAmount === 0)) {
        setFormData(prev => ({
            ...prev,
            financials: {
                ...prev.financials!,
                loanAmount: prev.purchasePrice! // Default 100% financing
            }
        }));
    }
  }, [formData.purchasePrice]);

  const handleOpenModal = (property?: Property) => {
    if (property) {
      setEditingId(property.id);
      setFormData(JSON.parse(JSON.stringify(property))); // Deep copy
    } else {
      setEditingId(null);
      setFormData({ 
        financials: DEFAULT_FINANCIALS,
        purchaseDate: new Date().toISOString().split('T')[0]
      });
    }
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleFinancialChange = (key: keyof Property['financials'], value: number) => {
    setFormData(prev => ({
        ...prev,
        financials: {
            ...prev.financials!,
            [key]: value
        }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address || !formData.city || !formData.purchasePrice) {
        alert("Bitte Adresse, Stadt und Kaufpreis ausfüllen.");
        return;
    }

    const payload: Property = {
      id: editingId || Date.now().toString(),
      address: formData.address!,
      city: formData.city || '',
      zipCode: formData.zipCode || '',
      yearBuilt: Number(formData.yearBuilt) || 2000,
      purchasePrice: Number(formData.purchasePrice) || 0,
      renovationCost: Number(formData.renovationCost) || 0,
      area: Number(formData.area) || 0,
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      units: Number(formData.units) || 1,
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
      financials: formData.financials as Property['financials']
    };

    if (editingId) updateProperty(payload);
    else addProperty(payload);
    
    setIsModalOpen(false);
  };

  if (selectedProperty) {
      return <PropertyDetail property={selectedProperty} onBack={() => setSelectedProperty(null)} />;
  }

  // Live Analysis Calculations
  const calcData = formData.purchasePrice && formData.financials ? calculateMonthlyCashflow(formData as Property) : null;
  const purchaseCosts = formData.purchasePrice && formData.financials ? calculatePurchaseCosts(formData.purchasePrice, formData.renovationCost || 0, formData.financials) : null;

  // Sorting Logic
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch(sortBy) {
        case 'price_desc': return b.purchasePrice - a.purchasePrice;
        case 'yield_desc':
            return calculateMonthlyCashflow(b).netYield - calculateMonthlyCashflow(a).netYield;
        case 'cashflow_desc':
            return calculateMonthlyCashflow(b).postTaxCashflow - calculateMonthlyCashflow(a).postTaxCashflow;
        default: // date_desc
            return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
    }
  });

  // Aggregate Stats for Current View
  const totalValue = sortedProperties.reduce((sum, p) => sum + p.purchasePrice, 0);
  const totalCashflow = sortedProperties.reduce((sum, p) => sum + calculateMonthlyCashflow(p).postTaxCashflow, 0);
  const avgYield = sortedProperties.length > 0 
    ? sortedProperties.reduce((sum, p) => sum + calculateMonthlyCashflow(p).netYield, 0) / sortedProperties.length 
    : 0;

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Immobilienbestand</h1>
            <p className="text-slate-500 mt-1">Verwalten Sie Ihr Portfolio und überwachen Sie die Performance.</p>
        </div>
        <div className="flex items-center gap-3">
             {/* View Toggle */}
             <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Rasteransicht"
                >
                    <LayoutGrid size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Listenansicht"
                >
                    <LayoutList size={18} />
                </button>
             </div>

             {/* Sort Dropdown */}
             <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <ArrowUpDown size={16} />
                </div>
                <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                    <option value="date_desc">Neueste zuerst</option>
                    <option value="price_desc">Höchster Preis</option>
                    <option value="yield_desc">Höchste Rendite</option>
                    <option value="cashflow_desc">Höchster Cashflow</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                </div>
             </div>

             <FancyButton 
                onClick={() => handleOpenModal()}
                icon={<Plus size={18} />}
             >
                Neues Objekt
            </FancyButton>
        </div>
      </div>

      {/* Portfolio Aggregates Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Objekte</p>
              <p className="text-xl font-bold text-slate-900">{sortedProperties.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Portfoliowert</p>
              <p className="text-xl font-bold text-slate-900">{formatEUR(totalValue)}</p>
          </div>
           <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ø Nettorendite</p>
              <p className="text-xl font-bold text-emerald-600">{avgYield.toFixed(2)}%</p>
          </div>
           <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gesamt-Cashflow</p>
              <p className={`text-xl font-bold ${totalCashflow > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatEUR(totalCashflow)}</p>
          </div>
      </div>

      {searchQuery && (
          <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl flex items-center gap-2 animate-in fade-in">
              <Search size={18} />
              <span className="text-sm font-medium">Suchergebnisse für "{searchQuery}" ({filteredProperties.length})</span>
          </div>
      )}

      {/* Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in">
            {sortedProperties.map(property => (
                <div key={property.id} onClick={() => setSelectedProperty(property)} className="cursor-pointer">
                    <PropertyCard 
                        property={property} 
                        onEdit={(e) => { e.stopPropagation(); handleOpenModal(property); }}
                        onDelete={(e) => {
                            e.stopPropagation();
                            if(confirm('Möchten Sie dieses Objekt wirklich löschen?')) deleteProperty(property.id);
                        }}
                    />
                </div>
            ))}
            {!searchQuery && (
                <button 
                    onClick={() => handleOpenModal()}
                    className="group flex flex-col items-center justify-center min-h-[340px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer bg-slate-50/50"
                >
                    <div className="w-16 h-16 rounded-full bg-white group-hover:bg-emerald-500 flex items-center justify-center mb-4 shadow-sm group-hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1">
                        <Plus size={32} className="text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">Objekt hinzufügen</span>
                </button>
            )}
        </div>
      ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <th className="p-5 w-20">Bild</th>
                              <th className="p-5">Adresse / Stadt</th>
                              <th className="p-5">Daten</th>
                              <th className="p-5 text-right">Kaufpreis</th>
                              <th className="p-5 text-right">Rendite</th>
                              <th className="p-5 text-right">Cashflow</th>
                              <th className="p-5 text-center">Aktionen</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {sortedProperties.map(property => {
                              const stats = calculateMonthlyCashflow(property);
                              return (
                                  <tr 
                                    key={property.id} 
                                    onClick={() => setSelectedProperty(property)} 
                                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                  >
                                      <td className="p-4">
                                          <div className="w-16 h-12 rounded-lg bg-slate-200 overflow-hidden">
                                              <img src={property.imageUrl} alt="" className="w-full h-full object-cover" />
                                          </div>
                                      </td>
                                      <td className="p-4">
                                          <div className="font-bold text-slate-900">{property.address}</div>
                                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={10}/> {property.city}, {property.zipCode}</div>
                                      </td>
                                      <td className="p-4">
                                          <div className="text-xs space-y-1 text-slate-600">
                                              <span className="flex items-center gap-1"><Bed size={12}/> {property.units} Einheiten</span>
                                              <span className="flex items-center gap-1"><Maximize size={12}/> {property.area} m²</span>
                                          </div>
                                      </td>
                                      <td className="p-4 text-right font-medium text-slate-900">
                                          {formatEUR(property.purchasePrice)}
                                      </td>
                                      <td className="p-4 text-right">
                                          <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold">
                                              {stats.netYield.toFixed(2)}%
                                          </span>
                                      </td>
                                      <td className={`p-4 text-right font-bold text-sm ${stats.postTaxCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                          {formatEUR(stats.postTaxCashflow)}
                                      </td>
                                      <td className="p-4">
                                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                              <button onClick={(e) => {e.stopPropagation(); handleOpenModal(property)}} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                  <Edit2 size={16}/>
                                              </button>
                                              <button onClick={(e) => {e.stopPropagation(); deleteProperty(property.id)}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                  <Trash2 size={16}/>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Calculator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-slate-900/5">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white flex-none z-10">
              <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {editingId ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={20} className="text-emerald-600"/>}
                    {editingId ? 'Objekt bearbeiten' : 'Ankaufsrechner'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Deutscher Immobilien Rechenkern</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-all"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-1 min-h-0 bg-slate-50/50">
                {/* Sidebar Tabs */}
                <div className="w-64 bg-white border-r border-slate-200 p-4 space-y-2 overflow-y-auto hidden md:block">
                    <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<Building size={18}/>} label="Basisdaten" />
                    <TabButton active={activeTab === 'financials'} onClick={() => setActiveTab('financials')} icon={<Banknote size={18}/>} label="Finanzen & Kosten" />
                    <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<Calculator size={18}/>} label="Analyse / Cashflow" />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 relative">
                    <form id="propertyForm" onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
                        
                        {/* Mobile Tabs */}
                        <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
                             <TabButton mobile active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<Building size={18}/>} label="Basis" />
                             <TabButton mobile active={activeTab === 'financials'} onClick={() => setActiveTab('financials')} icon={<Banknote size={18}/>} label="Finanzen" />
                             <TabButton mobile active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<Calculator size={18}/>} label="Analyse" />
                        </div>

                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <FancyInput label="Bild URL" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://..." />
                                    </div>
                                    <div className="md:col-span-2">
                                        <FancyInput label="Straße & Hausnummer" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required autoFocus placeholder="Musterstraße 1" icon={<MapPin size={16}/>} />
                                    </div>
                                    <FancyInput label="Stadt" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required placeholder="Stadt" icon={<Building size={16}/>} />
                                    <FancyInput label="PLZ" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} placeholder="12345" />
                                    <FancyInput label="Baujahr" type="number" value={formData.yearBuilt} onChange={e => setFormData({...formData, yearBuilt: Number(e.target.value)})} />
                                    <FancyInput label="Einheiten" type="number" value={formData.units} onChange={e => setFormData({...formData, units: Number(e.target.value)})} icon={<Bed size={16}/>}/>
                                    <FancyInput label="Wohnfläche (m²)" type="number" value={formData.area} onChange={e => setFormData({...formData, area: Number(e.target.value)})} icon={<Maximize size={16}/>} />
                                    <FancyInput label="Kaufdatum" type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <SectionHeader title="Kaufpreis & Investition" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FancyInput label="Kaufpreis (€)" type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} required />
                                    <FancyInput label="Sanierungskosten (€)" type="number" value={formData.renovationCost} onChange={e => setFormData({...formData, renovationCost: Number(e.target.value)})} />
                                    <FancyInput label="Darlehenshöhe (€)" type="number" value={formData.financials?.loanAmount} onChange={e => handleFinancialChange('loanAmount', Number(e.target.value))} />
                                </div>
                                {purchaseCosts && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm grid grid-cols-2 gap-4 shadow-inner">
                                        <div>
                                            <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider mb-1">Kaufnebenkosten</span>
                                            <span className="font-bold text-slate-900">{formatEUR(purchaseCosts.purchasingCosts)}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block uppercase text-[10px] font-bold tracking-wider mb-1">Gesamtinvestition</span>
                                            <span className="font-bold text-emerald-700">{formatEUR(purchaseCosts.totalInvest)}</span>
                                        </div>
                                    </div>
                                )}

                                <SectionHeader title="Laufende Einnahmen & Kosten (Monat)" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FancyInput label="Kaltmiete (€)" type="number" value={formData.financials?.coldRent} onChange={e => handleFinancialChange('coldRent', Number(e.target.value))} />
                                    <FancyInput label="Umlagefähige Kosten (€)" type="number" value={formData.financials?.operatingCostsRecoverable} onChange={e => handleFinancialChange('operatingCostsRecoverable', Number(e.target.value))} />
                                    <FancyInput label="Nicht Umlagefähig (€)" type="number" value={formData.financials?.operatingCostsNonRecoverable} onChange={e => handleFinancialChange('operatingCostsNonRecoverable', Number(e.target.value))} />
                                    <FancyInput label="Eigene IH-Rücklage (€)" type="number" value={formData.financials?.maintenanceReserve} onChange={e => handleFinancialChange('maintenanceReserve', Number(e.target.value))} />
                                </div>

                                <SectionHeader title="Finanzierung & Steuer" />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <FancyInput label="Zinssatz (%)" type="number" step="0.01" value={formData.financials?.loanInterestRate} onChange={e => handleFinancialChange('loanInterestRate', Number(e.target.value))} />
                                    <FancyInput label="Tilgung (%)" type="number" step="0.01" value={formData.financials?.loanRepaymentRate} onChange={e => handleFinancialChange('loanRepaymentRate', Number(e.target.value))} />
                                    <FancyInput label="Pers. Steuersatz (%)" type="number" value={formData.financials?.personalTaxRate} onChange={e => handleFinancialChange('personalTaxRate', Number(e.target.value))} />
                                    <FancyInput label="Grunderwerbsteuer (%)" type="number" step="0.1" value={formData.financials?.transferTaxPercent} onChange={e => handleFinancialChange('transferTaxPercent', Number(e.target.value))} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'analysis' && calcData && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                {/* Cashflow Waterfall Visualization */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-sm shadow-sm">
                                    <div className="p-4 bg-slate-900 text-white font-bold flex justify-between items-center">
                                        <span className="flex items-center gap-2"><TrendingUp size={16}/> Cashflow Wasserfall (Mtl.)</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${calcData.postTaxCashflow >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                            Netto: {formatEUR(calcData.postTaxCashflow)}
                                        </span>
                                    </div>
                                    <WaterfallRow label="Kaltmiete" value={formData.financials?.coldRent || 0} isPositive />
                                    <WaterfallRow label="- Nicht umlagefähige Kosten" value={-(formData.financials?.operatingCostsNonRecoverable || 0)} />
                                    <WaterfallRow label="- Eigene IH-Rücklage" value={-(formData.financials?.maintenanceReserve || 0)} />
                                    <WaterfallRow label="- Zinsen" value={-calcData.monthlyInterest} />
                                    <WaterfallRow label="- Tilgung (Vermögensaufbau)" value={-calcData.monthlyRepayment} isBold />
                                    <div className="bg-slate-50 p-3 px-4 font-bold border-y border-slate-200 flex justify-between">
                                        <span>= Cashflow (vor Steuer)</span>
                                        <span className={calcData.preTaxCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatEUR(calcData.preTaxCashflow)}</span>
                                    </div>
                                    <WaterfallRow label="- Steuern (geschätzt)" value={-calcData.estimatedTax} subtext={`(Basis: ${formatEUR(calcData.taxableIncome)})`} />
                                    <div className="bg-slate-900 text-white p-4 px-4 font-bold flex justify-between items-center">
                                        <span className="text-slate-300">= Cashflow (nach Steuer)</span>
                                        <span className={`text-lg ${calcData.postTaxCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatEUR(calcData.postTaxCashflow)}</span>
                                    </div>
                                </div>
                                
                                {/* Wealth Accumulation Box */}
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-100 shadow-sm">
                                    <h4 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
                                        <TrendingUp size={18}/> Vermögenszuwachs
                                    </h4>
                                    <p className="text-sm text-emerald-700 mb-4 leading-relaxed">
                                        Ihre Mieter zahlen Ihr Darlehen ab. Dies ist Ihre "versteckte" monatliche Sparrate (Tilgung), die Ihr Nettovermögen direkt erhöht.
                                    </p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-bold text-emerald-900">+ {formatEUR(calcData.monthlyAmortization)}</span>
                                        <span className="text-emerald-600 mb-1 font-medium">/ Monat</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 flex-none z-10">
                 <FancyButton variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Abbrechen
                </FancyButton>
                <FancyButton 
                  type="submit"
                  form="propertyForm"
                  icon={<Save size={18} />}
                >
                  {editingId ? 'Änderungen speichern' : 'Objekt anlegen'}
                </FancyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Subcomponents ---

const TabButton = ({ active, onClick, icon, label, mobile }: any) => (
    <button 
        type="button"
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${mobile ? 'whitespace-nowrap flex-1 justify-center' : 'w-full'} ${
            active 
                ? 'bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        }`}
    >
        {React.cloneElement(icon, { size: 18, className: active ? 'text-blue-600' : 'text-slate-400' })} 
        {label}
    </button>
);

const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 pb-2 border-b border-slate-200 pt-2">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
    </div>
);

const WaterfallRow = ({ label, value, isPositive, isBold, subtext }: any) => (
    <div className={`p-3 px-4 flex justify-between items-center border-b border-slate-50 ${isBold ? 'font-bold bg-slate-50' : ''}`}>
        <div>
            <span className="text-slate-600">{label}</span>
            {subtext && <span className="ml-2 text-xs text-slate-400">{subtext}</span>}
        </div>
        <span className={isPositive ? 'text-emerald-600' : value < 0 ? 'text-slate-600' : 'text-slate-900'}>
            {value > 0 ? '+' : ''}{formatEUR(value)}
        </span>
    </div>
);

interface PropertyCardProps {
    property: Property;
    onEdit: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onEdit, onDelete }) => {
    // Quick calculations for the card view
    const stats = calculateMonthlyCashflow(property);

    return (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 flex flex-col group h-full hover:-translate-y-1">
            <div className="h-48 bg-slate-200 relative overflow-hidden flex-none">
                <img 
                    src={property.imageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa'} 
                    alt={property.address}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-0 left-0 w-full h-full bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors"></div>
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                     <button onClick={onEdit} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-700 hover:text-blue-600 hover:bg-white shadow-sm transition-all hover:scale-110">
                        <Edit2 size={16} />
                     </button>
                     <button onClick={onDelete} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-700 hover:text-red-600 hover:bg-white shadow-sm transition-all hover:scale-110">
                        <Trash2 size={16} />
                     </button>
                </div>
                <div className="absolute bottom-3 left-3">
                    <span className="px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur text-xs font-bold text-slate-800 shadow-sm border border-slate-100">
                        {formatEUR(property.purchasePrice / 1000000)}M
                    </span>
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">{property.address}</h3>
                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                        <MapPin size={14} />
                        {property.city}, {property.zipCode}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Mietrendite (Netto)</p>
                        <p className="text-emerald-600 font-bold text-lg">{stats.netYield.toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Cashflow</p>
                        <p className={`font-bold text-lg ${stats.postTaxCashflow > 0 ? 'text-slate-900' : 'text-red-600'}`}>
                            {formatEUR(stats.postTaxCashflow)}
                        </p>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5"><Bed size={16} className="text-slate-400"/> {property.units} Einheiten</span>
                    <span className="flex items-center gap-1.5"><Maximize size={16} className="text-slate-400"/> {property.yearBuilt}</span>
                </div>
            </div>
        </div>
    )
}
