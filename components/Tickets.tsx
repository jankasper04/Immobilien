import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { TicketStatus, Ticket } from '../types';
import { AlertCircle, CheckCircle, Clock, MapPin, Calendar, Plus, Save, MessageSquare, User, Send, Trash2, Edit2 } from 'lucide-react';
import { FancySelect, FancyButton, FancyInput, Modal, ConfirmDialog } from './ui/Shared';

export const Tickets = () => {
  const { tickets, updateTicketStatus, properties, searchQuery, addTicket, updateTicket, deleteTicket, addTicketComment } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTicket, setNewTicket] = useState<Partial<Ticket>>({ priority: 'MITTEL', status: TicketStatus.OPEN });
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Detail Modal State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);
  const getAddress = (id: string) => properties.find(p => p.id === id)?.address || 'Unbekannt';

  // Filter tickets by search query
  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getAddress(t.propertyId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (ticket?: Ticket) => {
    if (ticket) {
      setEditingId(ticket.id);
      setNewTicket(ticket);
    } else {
      setEditingId(null);
      setNewTicket({ priority: 'MITTEL', status: TicketStatus.OPEN });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.propertyId) return;

    const payload: Ticket = {
      id: editingId || Date.now().toString(),
      propertyId: newTicket.propertyId,
      title: newTicket.title,
      description: newTicket.description || '',
      status: newTicket.status || TicketStatus.OPEN,
      priority: newTicket.priority as any || 'MITTEL',
      createdAt: newTicket.createdAt || new Date().toISOString(),
      comments: newTicket.comments || []
    };

    if (editingId) {
      updateTicket(payload);
    } else {
      addTicket(payload);
    }

    setIsModalOpen(false);
    setNewTicket({ priority: 'MITTEL', status: TicketStatus.OPEN });
  };

  const handleAddComment = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedTicketId || !commentText.trim()) return;
      addTicketComment(selectedTicketId, commentText);
      setCommentText('');
  };

  const KanbanColumn = ({ status, title, icon }: { status: TicketStatus, title: string, icon: React.ReactNode }) => {
    const colTickets = filteredTickets.filter(t => t.status === status);
    
    return (
      <div className="flex-1 min-w-[300px] bg-slate-50/80 rounded-2xl p-4 flex flex-col gap-4 h-full border border-slate-100">
        <div className="flex items-center justify-between text-slate-800 font-bold mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                {icon}
            </div>
            {title}
          </div>
          <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm">
            {colTickets.length}
          </span>
        </div>
        
        <div className="space-y-3 overflow-y-auto h-full pr-2 scrollbar-hide">
          {colTickets.map(ticket => (
            <div 
                key={ticket.id} 
                onClick={() => setSelectedTicketId(ticket.id)}
                className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 animate-in fade-in zoom-in-95 cursor-pointer"
            >
               <div className="flex justify-between items-start mb-3 gap-2">
                 <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                    ticket.priority === 'HOCH' ? 'bg-red-50 text-red-700 border-red-100' :
                    ticket.priority === 'MITTEL' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                 }`}>
                   {ticket.priority}
                 </span>
                 <div className="w-32" onClick={(e) => e.stopPropagation()}>
                    <FancySelect
                        className="py-1 text-xs pl-2"
                        value={ticket.status}
                        onChange={(e) => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}
                    >
                        <option value={TicketStatus.OPEN}>Offen</option>
                        <option value={TicketStatus.IN_PROGRESS}>In Arbeit</option>
                        <option value={TicketStatus.DONE}>Erledigt</option>
                    </FancySelect>
                 </div>
               </div>
               
               <h4 className="font-bold text-slate-900 mb-1.5 leading-snug">{ticket.title}</h4>
               <p className="text-sm text-slate-500 mb-4 line-clamp-3 leading-relaxed">{ticket.description}</p>
               
               <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                   <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <MapPin size={12} className="text-slate-400"/>
                            {getAddress(ticket.propertyId)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar size={12}/>
                            {new Date(ticket.createdAt).toLocaleDateString('de-DE')}
                        </div>
                   </div>
                   {ticket.comments && ticket.comments.length > 0 && (
                       <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                           <MessageSquare size={12}/> {ticket.comments.length}
                       </div>
                   )}
               </div>
            </div>
          ))}
          {colTickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p>Keine Tickets</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-end mb-6 flex-none">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Wartung & Tickets</h1>
            <p className="text-slate-500 mt-1">Verfolgung von Reparaturen und Mieteranfragen.</p>
        </div>
        <FancyButton onClick={() => setIsModalOpen(true)} icon={<Plus size={16} />}>
            Neues Ticket
        </FancyButton>
      </div>
      
      <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
        <KanbanColumn 
            title="Gemeldet" 
            status={TicketStatus.OPEN} 
            icon={<AlertCircle size={18} className="text-red-500" />} 
        />
        <KanbanColumn 
            title="In Arbeit" 
            status={TicketStatus.IN_PROGRESS} 
            icon={<Clock size={18} className="text-amber-500" />} 
        />
        <KanbanColumn 
            title="Erledigt" 
            status={TicketStatus.DONE} 
            icon={<CheckCircle size={18} className="text-emerald-500" />} 
        />
      </div>

      {/* Create Modal */}
      <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={editingId ? 'Ticket bearbeiten' : 'Neues Ticket erstellen'}
       >
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <FancySelect 
                label="Betroffenes Objekt"
                value={newTicket.propertyId || ''}
                onChange={e => setNewTicket({...newTicket, propertyId: e.target.value})}
                required
              >
                  <option value="">Objekt wählen...</option>
                  {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
              </FancySelect>

              <FancyInput 
                  label="Titel" 
                  placeholder="z.B. Heizung defekt" 
                  value={newTicket.title || ''} 
                  onChange={e => setNewTicket({...newTicket, title: e.target.value})} 
                  required 
              />

              <FancySelect 
                label="Priorität"
                value={newTicket.priority} 
                onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}
              >
                  <option value="NIEDRIG">Niedrig</option>
                  <option value="MITTEL">Mittel</option>
                  <option value="HOCH">Hoch</option>
              </FancySelect>
              
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Beschreibung</label>
                  <textarea 
                    rows={4}
                    placeholder="Details zum Schaden..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all text-sm text-slate-900 shadow-sm font-medium"
                    value={newTicket.description || ''}
                    onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                  />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-4">
                <FancyButton variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Abbrechen
                </FancyButton>
                <FancyButton type="submit" icon={<Save size={16} />}>
                  {editingId ? 'Speichern' : 'Erstellen'}
                </FancyButton>
              </div>
            </form>
       </Modal>

       {/* Detail Modal */}
       <Modal
          isOpen={!!selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          title={selectedTicket?.title || 'Details'}
       >
          {selectedTicket && (
              <div className="flex flex-col h-[500px]">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4 flex-none object-contain">
                      <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-2">
                              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${selectedTicket.priority === 'HOCH' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {selectedTicket.priority}
                               </div>
                               <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                    <MapPin size={12}/> {getAddress(selectedTicket.propertyId)}
                               </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                              <button onClick={() => { setSelectedTicketId(null); handleOpenModal(selectedTicket); }} className="text-slate-400 hover:text-blue-600 p-1 rounded-sm transition-colors" title="Bearbeiten">
                                  <Edit2 size={16} />
                              </button>
                              <button onClick={() => { setSelectedTicketId(null); setDeleteId(selectedTicket.id); }} className="text-slate-400 hover:text-red-600 p-1 rounded-sm transition-colors" title="Löschen">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{selectedTicket.description}</p>
                  </div>

                  {/* Chat / Comments Section */}
                  <div className="flex-1 overflow-y-auto p-6 bg-white space-y-4">
                      {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                          selectedTicket.comments.map(c => (
                              <div key={c.id} className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-none">
                                      <User size={14} />
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100 max-w-[85%]">
                                      <div className="flex justify-between items-center gap-4 mb-1">
                                          <span className="text-xs font-bold text-slate-700">{c.author}</span>
                                          <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                      </div>
                                      <p className="text-sm text-slate-600">{c.text}</p>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-8 text-slate-400 text-sm italic">
                              Noch keine Kommentare.
                          </div>
                      )}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-slate-100 bg-white flex-none">
                      <form onSubmit={handleAddComment} className="relative">
                          <input 
                            type="text" 
                            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Schreiben Sie einen Kommentar..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                          />
                          <button 
                            type="submit" 
                            disabled={!commentText.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                              <Send size={16} />
                          </button>
                      </form>
                  </div>
              </div>
          )}
       </Modal>
       <ConfirmDialog
           isOpen={!!deleteId}
           onClose={() => setDeleteId(null)}
           onConfirm={() => {
               if (deleteId) {
                   deleteTicket(deleteId);
                   setDeleteId(null);
               }
           }}
           title="Vorgang löschen"
           description="Möchten Sie diesen Vorgang wirklich endgültig löschen?"
       />
    </div>
  );
};
