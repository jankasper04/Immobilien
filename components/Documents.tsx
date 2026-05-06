import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { PropertyDocument } from '../types';
import { FileText, Search, Filter, Download, Trash2, Plus, Building, Calendar, File, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { FancyInput, FancySelect, FancyButton, Modal, ConfirmDialog } from './ui/Shared';

export const Documents = () => {
  const { documents, properties, searchQuery, deleteDocument, addDocument, addNotification } = useApp();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterProperty, setFilterProperty] = useState<string>('ALL');
  
  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newDoc, setNewDoc] = useState<Partial<PropertyDocument>>({ type: 'SONSTIGES' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Helper to get Property Name
  const getPropName = (id: string) => properties.find(p => p.id === id)?.address || 'Unbekanntes Objekt';

  // Filter Logic
  const filteredDocs = documents.filter(doc => {
      const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          getPropName(doc.propertyId).toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'ALL' || doc.type === filterType;
      const matchProp = filterProperty === 'ALL' || doc.propertyId === filterProperty;
      
      return matchSearch && matchType && matchProp;
  });

  const handleUpload = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newDoc.name || !newDoc.propertyId) return;

      addDocument({
          id: Date.now().toString(),
          propertyId: newDoc.propertyId,
          name: newDoc.name,
          type: newDoc.type as any || 'SONSTIGES',
          date: new Date().toISOString().split('T')[0],
          size: (Math.random() * 5 + 0.5).toFixed(1) + ' MB'
      });
      setIsUploadOpen(false);
      setNewDoc({ type: 'SONSTIGES' });
  };

  const getFileIcon = (type: string) => {
      switch(type) {
          case 'VERTRAG': return <FileText size={20} className="text-blue-500"/>;
          case 'RECHNUNG': return <FileSpreadsheet size={20} className="text-emerald-500"/>;
          case 'GRUNDRISS': return <ImageIcon size={20} className="text-purple-500"/>;
          default: return <File size={20} className="text-slate-400"/>;
      }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dokumenten Center</h1>
           <p className="text-slate-500 mt-1">Zentrale Verwaltung aller Verträge, Rechnungen und Nachweise.</p>
        </div>
        <FancyButton onClick={() => setIsUploadOpen(true)} icon={<Plus size={18} />}>
            Dokument hochladen
        </FancyButton>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Filter size={18} />
                Filter
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="w-full md:w-48">
                    <FancySelect value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="ALL">Alle Typen</option>
                        <option value="VERTRAG">Verträge</option>
                        <option value="RECHNUNG">Rechnungen</option>
                        <option value="GRUNDRISS">Grundrisse</option>
                        <option value="SONSTIGES">Sonstiges</option>
                    </FancySelect>
                </div>
                <div className="w-full md:w-64">
                    <FancySelect value={filterProperty} onChange={e => setFilterProperty(e.target.value)} icon={<Building size={14}/>}>
                        <option value="ALL">Alle Objekte</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.address}</option>
                        ))}
                    </FancySelect>
                </div>
            </div>
        </div>

        {/* List View */}
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-5">Name</th>
                        <th className="p-5">Objekt</th>
                        <th className="p-5">Typ</th>
                        <th className="p-5">Datum</th>
                        <th className="p-5 text-right">Größe</th>
                        <th className="p-5 text-center">Aktion</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                    {filteredDocs.length > 0 ? filteredDocs.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        {getFileIcon(doc.type)}
                                    </div>
                                    <span className="font-semibold text-slate-700">{doc.name}</span>
                                </div>
                            </td>
                            <td className="p-5 text-slate-600">
                                {getPropName(doc.propertyId)}
                            </td>
                            <td className="p-5">
                                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    {doc.type}
                                </span>
                            </td>
                            <td className="p-5 text-slate-500 font-mono text-xs">
                                {new Date(doc.date).toLocaleDateString('de-DE')}
                            </td>
                            <td className="p-5 text-right text-slate-400 text-xs">
                                {doc.size}
                            </td>
                            <td className="p-5">
                                <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => addNotification({ title: 'Download läuft', message: 'Datei wird heruntergeladen...', type: 'INFO' })}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button onClick={() => setDeleteId(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Löschen">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                         <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400 italic">Keine Dokumente gefunden.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Dokument hochladen">
          <form onSubmit={handleUpload} className="p-6 space-y-4">
              <FancySelect 
                label="Objekt Zuordnung" 
                value={newDoc.propertyId || ''} 
                onChange={e => setNewDoc({...newDoc, propertyId: e.target.value})}
                required
              >
                  <option value="">Bitte wählen...</option>
                  {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
              </FancySelect>
               <FancyInput 
                  label="Dateiname" 
                  value={newDoc.name || ''} 
                  onChange={e => setNewDoc({...newDoc, name: e.target.value})} 
                  placeholder="z.B. Abrechnung 2023"
                  required 
              />
              <FancySelect 
                label="Kategorie"
                value={newDoc.type} 
                onChange={e => setNewDoc({...newDoc, type: e.target.value as any})}
              >
                  <option value="VERTRAG">Vertrag</option>
                  <option value="RECHNUNG">Rechnung</option>
                  <option value="GRUNDRISS">Grundriss</option>
                  <option value="SONSTIGES">Sonstiges</option>
              </FancySelect>
               <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 text-slate-400 mt-2 hover:bg-slate-50 transition-colors cursor-pointer">
                    <Download size={24} className="mb-2"/>
                    <span className="text-xs">Hier Datei ablegen oder klicken (Simulation)</span>
               </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <FancyButton variant="ghost" onClick={() => setIsUploadOpen(false)}>Abbrechen</FancyButton>
                  <FancyButton type="submit">Speichern</FancyButton>
              </div>
          </form>
      </Modal>

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={() => { if(deleteId) deleteDocument(deleteId); }} 
        title="Dokument löschen?" 
        description="Die Datei wird endgültig entfernt." 
      />
    </div>
  );
};
