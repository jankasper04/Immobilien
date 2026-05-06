import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { Property, Ticket, Transaction, TicketStatus, Tenant, PropertyDocument, AppNotification, TicketComment } from './types';
import { SEED_PROPERTIES, SEED_TICKETS, SEED_TRANSACTIONS, SEED_TENANTS, SEED_DOCUMENTS } from './constants';

interface AppContextType {
  properties: Property[];
  tickets: Ticket[];
  transactions: Transaction[];
  tenants: Tenant[];
  documents: PropertyDocument[];
  notifications: AppNotification[];
  activeToast: AppNotification | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  filteredProperties: Property[];
  addProperty: (property: Property) => void;
  updateProperty: (property: Property) => void;
  deleteProperty: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (ticket: Ticket) => void;
  deleteTicket: (id: string) => void;
  addTicketComment: (ticketId: string, text: string) => void;
  addTenant: (tenant: Tenant) => void;
  updateTenant: (tenant: Tenant) => void;
  deleteTenant: (id: string) => void;
  addDocument: (doc: PropertyDocument) => void;
  deleteDocument: (id: string) => void;
  markNotificationRead: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren<{}>) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load data from LocalStorage or Seed on mount
  useEffect(() => {
    const storedProps = localStorage.getItem('pm_properties');
    const storedTickets = localStorage.getItem('pm_tickets');
    const storedTx = localStorage.getItem('pm_transactions');
    const storedTenants = localStorage.getItem('pm_tenants');
    const storedDocs = localStorage.getItem('pm_documents');

    if (storedProps && storedTickets && storedTx) {
      setProperties(JSON.parse(storedProps));
      setTickets(JSON.parse(storedTickets));
      setTransactions(JSON.parse(storedTx));
      setTenants(storedTenants ? JSON.parse(storedTenants) : SEED_TENANTS);
      setDocuments(storedDocs ? JSON.parse(storedDocs) : SEED_DOCUMENTS);
    } else {
      // Seed Data
      setProperties(SEED_PROPERTIES);
      setTickets(SEED_TICKETS);
      setTransactions(SEED_TRANSACTIONS);
      setTenants(SEED_TENANTS);
      setDocuments(SEED_DOCUMENTS);
      
      localStorage.setItem('pm_properties', JSON.stringify(SEED_PROPERTIES));
      localStorage.setItem('pm_tickets', JSON.stringify(SEED_TICKETS));
      localStorage.setItem('pm_transactions', JSON.stringify(SEED_TRANSACTIONS));
      localStorage.setItem('pm_tenants', JSON.stringify(SEED_TENANTS));
      localStorage.setItem('pm_documents', JSON.stringify(SEED_DOCUMENTS));
    }
    
    // Seed initial notifications
    setNotifications([
      { id: 'n1', title: 'System Update', message: 'PropMaster Enterprise v2.0 ist live.', type: 'INFO', isRead: false, createdAt: new Date().toISOString() },
      { id: 'n2', title: 'Mieteingang fehlt', message: 'Miete für Torstraße 45 überfällig.', type: 'WARNING', isRead: false, createdAt: new Date(Date.now() - 86400000).toISOString() }
    ]);

    setIsLoading(false);
  }, []);

  // Filter Logic
  const filteredProperties = properties.filter(p => 
    p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.zipCode.includes(searchQuery)
  );

  const saveProperties = (newProps: Property[] | ((prev: Property[]) => Property[])) => {
    setProperties(prev => {
      const updated = typeof newProps === 'function' ? newProps(prev) : newProps;
      localStorage.setItem('pm_properties', JSON.stringify(updated));
      return updated;
    });
  };

  const saveTickets = (newTickets: Ticket[] | ((prev: Ticket[]) => Ticket[])) => {
    setTickets(prev => {
      const updated = typeof newTickets === 'function' ? newTickets(prev) : newTickets;
      localStorage.setItem('pm_tickets', JSON.stringify(updated));
      return updated;
    });
  };

  const saveTransactions = (newTx: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    setTransactions(prev => {
      const updated = typeof newTx === 'function' ? newTx(prev) : newTx;
      localStorage.setItem('pm_transactions', JSON.stringify(updated));
      return updated;
    });
  };

  const saveTenants = (newTenants: Tenant[] | ((prev: Tenant[]) => Tenant[])) => {
    setTenants(prev => {
      const updated = typeof newTenants === 'function' ? newTenants(prev) : newTenants;
      localStorage.setItem('pm_tenants', JSON.stringify(updated));
      return updated;
    });
  };

  const saveDocuments = (newDocs: PropertyDocument[] | ((prev: PropertyDocument[]) => PropertyDocument[])) => {
    setDocuments(prev => {
      const updated = typeof newDocs === 'function' ? newDocs(prev) : newDocs;
      localStorage.setItem('pm_documents', JSON.stringify(updated));
      return updated;
    });
  };

  // Actions
  const addNotification = (n: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => {
    const newNote: AppNotification = {
      ...n,
      id: Date.now().toString(),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNote, ...prev]);
    setActiveToast(newNote);
    setTimeout(() => setActiveToast(null), 3500); // Hide Toast after 3.5s
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const addProperty = (property: Property) => {
    saveProperties(prev => [...prev, property]);
    addNotification({ title: 'Objekt angelegt', message: `${property.address} wurde hinzugefügt.`, type: 'SUCCESS' });
  };

  const updateProperty = (updated: Property) => {
    saveProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    addNotification({ title: 'Objekt aktualisiert', message: `${updated.address} wurde gespeichert.`, type: 'SUCCESS' });
  };

  const deleteProperty = (id: string) => {
    saveProperties(prev => prev.filter(p => p.id !== id));
    addNotification({ title: 'Objekt gelöscht', message: `Objekt entfernt.`, type: 'INFO' });
  };

  const addTransaction = (transaction: Transaction) => {
    saveTransactions(prev => [transaction, ...prev]);
    addNotification({ title: 'Buchung erfasst', message: `${transaction.amount}€ gebucht.`, type: 'SUCCESS' });
  };

  const deleteTransaction = (id: string) => {
    saveTransactions(prev => prev.filter(t => t.id !== id));
    addNotification({ title: 'Buchung entfernt', message: `Buchung wurde gelöscht.`, type: 'INFO' });
  };

  const updateTicketStatus = (id: string, status: TicketStatus) => {
    saveTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const addTicket = (ticket: Ticket) => {
    saveTickets(prev => [ticket, ...prev]);
    addNotification({ title: 'Neues Ticket', message: ticket.title, type: 'WARNING' });
  };

  const updateTicket = (updated: Ticket) => {
    saveTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    addNotification({ title: 'Ticket aktualisiert', message: updated.title, type: 'SUCCESS' });
  };

  const deleteTicket = (id: string) => {
    saveTickets(prev => prev.filter(t => t.id !== id));
    addNotification({ title: 'Ticket gelöscht', message: 'Vorgang entfernt.', type: 'INFO' });
  };

  const addTicketComment = (ticketId: string, text: string) => {
    saveTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          comments: [
            ...(t.comments || []),
            { id: Date.now().toString(), text, author: 'Sie', createdAt: new Date().toISOString() }
          ]
        };
      }
      return t;
    }));
    addNotification({ title: 'Kommentar hinzugefügt', message: 'Ticket Notiz gespeichert.', type: 'SUCCESS' });
  };

  const addTenant = (tenant: Tenant) => {
    saveTenants(prev => [...prev, tenant]);
    addNotification({ title: 'Mieter angelegt', message: tenant.name, type: 'SUCCESS' });
  };

  const updateTenant = (updated: Tenant) => {
    saveTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
    addNotification({ title: 'Mieter aktualisiert', message: updated.name, type: 'SUCCESS' });
  };

  const deleteTenant = (id: string) => {
    saveTenants(prev => prev.filter(t => t.id !== id));
     addNotification({ title: 'Mieter gelöscht', message: 'Datensatz entfernt.', type: 'INFO' });
  };

  const addDocument = (doc: PropertyDocument) => {
    saveDocuments(prev => [...prev, doc]);
    addNotification({ title: 'Dokument hochgeladen', message: doc.name, type: 'SUCCESS' });
  };

  const deleteDocument = (id: string) => {
    saveDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <AppContext.Provider value={{
      properties,
      tickets,
      transactions,
      tenants,
      documents,
      notifications,
      activeToast,
      searchQuery,
      setSearchQuery,
      activeTab,
      setActiveTab,
      filteredProperties,
      addProperty,
      updateProperty,
      deleteProperty,
      addTransaction,
      deleteTransaction,
      updateTicketStatus,
      addTicket,
      updateTicket,
      deleteTicket,
      addTicketComment,
      addTenant,
      updateTenant,
      deleteTenant,
      addDocument,
      deleteDocument,
      markNotificationRead,
      addNotification,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
