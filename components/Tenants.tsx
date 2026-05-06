import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Tenant } from '../types';
import { Search, Filter, Mail, Phone, AlertCircle, CheckCircle, Clock, MapPin, Building, FileText, User, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { FancyInput, FancySelect, FancyButton, Toast, Modal } from './ui/Shared';
import { formatEUR } from '../utils';

export const Tenants = () => {
  const { tenants, properties, searchQuery, addTenant, updateTenant, deleteTenant, addNotification } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Tenant>>({});
  
  // Helper to get Property Address
  const getPropertyInfo = (propertyId: string) => {
      const prop = properties.find(p => p.id === propertyId);
      return prop ? `${prop.address}, ${prop.city}` : 'Unbekanntes Objekt';
  };

  // Filter Logic
  const filteredTenants = tenants.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getPropertyInfo(t.propertyId).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

      return matchesSearch && matchesStatus;
  });

  const handleContact = (type: 'email' | 'phone', tenant: Tenant) => {
      addNotification({
          title: type === 'email' ? 'E-Mail Entwurf' : 'Anruf gestartet',
          message: `Kontakt zu ${tenant.name} wird hergestellt...`,
          type: 'INFO'
      });
  };

  const handleOpenModal = (tenant?: Tenant) => {
    if (tenant) {
      setEditingId(tenant.id);
      setFormData(tenant);
    } else {
      setEditingId(null);
      setFormData({
        status: 'AKTIV',
        leaseStart: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.propertyId || !formData.rent) {
        alert("Bitte Name, Objekt und Miete ausfüllen.");
        return;
    }

    const payload: Tenant = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      propertyId: formData.propertyId,
      unit: formData.unit || '',
      leaseStart: formData.leaseStart || new Date().toISOString().split('T')[0],
      leaseEnd: formData.leaseEnd,
      rent: Number(formData.rent),
      deposit: Number(formData.deposit) || 0,
      status: formData.status as any || 'AKTIV',
      email: formData.email,
      phone: formData.phone
    };

    if (editingId && updateTenant) {
        updateTenant(payload);
    } else {
        addTenant(payload);
    }
    
    setIsModalOpen(false);
  };

  // Stats
  const totalRent = filteredTenants.reduce((sum, t) => sum + t.rent, 0);
  const latePayers = tenants.filter(t => t.status === 'ZAHLUNGSVERZUG').length;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mietverhältnisse</h1>
           <p className="text-slate-500 mt-1">Verwaltung aller Mietverhältnisse über das gesamte Portfolio.</p>
        </div>
        <div className="flex gap-4">
            {/* Action Button */}
            <FancyButton onClick={() => handleOpenModal()} icon={<Plus size={18} />}>
                Mieter anlegen
            </FancyButton>
            
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <User size={18} />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Miete Soll (Mtl.)</p>
                    <p className="font-bold text-slate-900">{formatEUR(totalRent)}</p>
                </div>
            </div>
            {latePayers > 0 && (
                <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm flex items-center gap-3 animate-pulse">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <AlertCircle size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Zahlungsverzug</p>
                        <p className="font-bold text-red-700">{latePayers} Mieter</p>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Filter size={18} />
                Filter
            </div>
            <div className="w-full md:w-64">
                <FancySelect 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    icon={<CheckCircle size={14}/>}
                >
                    <option value="ALL">Alle Status</option>
                    <option value="AKTIV">Aktiv</option>
                    <option value="ZAHLUNGSVERZUG">Zahlungsverzug</option>
                    <option value="GEKÜNDIGT">Gekündigt</option>
                </FancySelect>
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-5">Name / Kontakt</th>
                        <th className="p-5">Objekt & Einheit</th>
                        <th className="p-5">Vertragsdaten</th>
                        <th className="p-5">Vertrag</th>
                        <th className="p-5">Status</th>
                        <th className="p-5 text-right">Miete (Kalt)</th>
                        <th className="p-5 text-center">Aktionen</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                    {filteredTenants.length > 0 ? filteredTenants.map(tenant => (
                        <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                        {tenant.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{tenant.name}</p>
                                        <p className="text-xs text-slate-400">{tenant.email || 'Keine E-Mail'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5">
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                        <Building size={14} className="text-slate-400"/>
                                        {getPropertyInfo(tenant.propertyId)}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                                        <MapPin size={12}/>
                                        {tenant.unit}
                                    </span>
                                </div>
                            </td>
                            <td className="p-5">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Clock size={14} className="text-slate-400"/>
                                        Seit: {new Date(tenant.leaseStart).toLocaleDateString('de-DE')}
                                    </div>
                                    {tenant.leaseEnd ? (
                                        <div className="flex items-center gap-2 text-amber-600 font-medium">
                                            <AlertCircle size={14}/>
                                            Bis: {new Date(tenant.leaseEnd).toLocaleDateString('de-DE')}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-100">Unbefristet</span>
                                    )}
                                </div>
                            </td>
                            <td className="p-5">
                                <button 
                                    onClick={() => addNotification({ title: 'PDF Download', message: 'Vertrag wird heruntergeladen...', type: 'INFO' })}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors border border-blue-100"
                                >
                                    <FileText size={14} />
                                    PDF ansehen
                                </button>
                            </td>
                            <td className="p-5">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                    tenant.status === 'AKTIV' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    tenant.status === 'ZAHLUNGSVERZUG' ? 'bg-red-50 text-red-700 border-red-100 animate-pulse' :
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                    {tenant.status === 'ZAHLUNGSVERZUG' && <AlertCircle size={12}/>}
                                    {tenant.status}
                                </span>
                            </td>
                            <td className="p-5 text-right font-mono font-bold text-slate-800">
                                {formatEUR(tenant.rent)}
                            </td>
                            <td className="p-5">
                                <div className="flex justify-center gap-2">
                                    {/* Action items hidden until hover (except contact) */}
                                    <button 
                                        onClick={() => handleContact('email', tenant)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="E-Mail senden"
                                    >
                                        <Mail size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(tenant); }}
                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Bearbeiten"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (window.confirm('Mieter wirklich löschen?')) deleteTenant(tenant.id); 
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Löschen"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={7} className="p-12 text-center">
                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                    <User size={48} className="opacity-20" />
                                    <p className="font-medium">Keine Mieter gefunden.</p>
                                    <p className="text-xs">Passen Sie Ihre Suche oder Filter an.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal for creating/editing tenants */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {editingId ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={20} className="text-emerald-600"/>}
                    {editingId ? 'Mieter bearbeiten' : 'Mieter anlegen'}
                  </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-full transition-all border border-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[70vh]">
                <form id="tenantForm" onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <FancyInput label="Name des Mieters" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required autoFocus />
                        </div>
                        <div className="md:col-span-2">
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-slate-700">Objekt auswählen</label>
                                <select 
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={formData.propertyId || ''} 
                                    onChange={e => setFormData({...formData, propertyId: e.target.value})} 
                                    required
                                >
                                    <option value="">-- Objekt wählen --</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <FancyInput label="Einheit (z.B. WE 1.2)" value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})} />
                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-slate-700">Status</label>
                            <select 
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={formData.status || 'AKTIV'} 
                                onChange={e => setFormData({...formData, status: e.target.value as any})}
                            >
                                <option value="AKTIV">Aktiv</option>
                                <option value="ZAHLUNGSVERZUG">Zahlungsverzug</option>
                                <option value="GEKÜNDIGT">Gekündigt</option>
                            </select>
                        </div>

                        <FancyInput label="E-Mail" type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <FancyInput label="Telefon" type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />

                        <FancyInput label="Kaltmiete (€)" type="number" value={formData.rent || ''} onChange={e => setFormData({...formData, rent: Number(e.target.value)})} required />
                        <FancyInput label="Kaution (€)" type="number" value={formData.deposit || ''} onChange={e => setFormData({...formData, deposit: Number(e.target.value)})} />

                        <FancyInput label="Mietbeginn" type="date" value={formData.leaseStart || ''} onChange={e => setFormData({...formData, leaseStart: e.target.value})} required />
                        <FancyInput label="Mietende" type="date" value={formData.leaseEnd || ''} onChange={e => setFormData({...formData, leaseEnd: e.target.value})} />
                    </div>
                </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
                 <FancyButton variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Abbrechen
                </FancyButton>
                <FancyButton type="submit" form="tenantForm" icon={<Save size={18} />}>
                  {editingId ? 'Änderungen speichern' : 'Mieter anlegen'}
                </FancyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
