import { Property, Ticket, Transaction, TicketStatus, TransactionType, Tenant, PropertyDocument } from './types';

const DEFAULT_FINANCIALS = {
  transferTaxPercent: 6.5, // NRW Standard
  notaryPercent: 1.5,
  registryPercent: 0.5,
  agentPercent: 3.57,
  landValuePercent: 20,
  personalTaxRate: 42,
  loanInterestRate: 3.85,
  loanRepaymentRate: 2.0,
  operatingCostsRecoverable: 0, 
  operatingCostsNonRecoverable: 0,
  maintenanceReserve: 0,
  coldRent: 0,
  loanAmount: 0
};

export const SEED_PROPERTIES: Property[] = [
  {
    id: 'p1',
    address: 'Adenauerallee 120',
    city: 'Bonn',
    zipCode: '53113',
    yearBuilt: 1995,
    purchasePrice: 450000,
    renovationCost: 15000,
    purchaseDate: '2023-01-15',
    lastRentIncreaseDate: '2023-01-15', // Bei Kauf
    units: 3,
    area: 120,
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    financials: {
      ...DEFAULT_FINANCIALS,
      coldRent: 2200,
      operatingCostsRecoverable: 350,
      operatingCostsNonRecoverable: 120,
      maintenanceReserve: 50,
      loanAmount: 360000
    }
  },
  {
    id: 'p2',
    address: 'Torstraße 45',
    city: 'Berlin',
    zipCode: '10119',
    yearBuilt: 1910,
    purchasePrice: 850000,
    renovationCost: 0,
    purchaseDate: '2020-06-01',
    lastRentIncreaseDate: '2021-06-01',
    units: 4,
    area: 180,
    imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
    financials: {
      ...DEFAULT_FINANCIALS,
      transferTaxPercent: 6.0, // Berlin
      coldRent: 4100,
      operatingCostsRecoverable: 600,
      operatingCostsNonRecoverable: 250,
      maintenanceReserve: 100,
      loanAmount: 600000
    }
  },
  {
    id: 'p3',
    address: 'Leopoldstraße 202',
    city: 'München',
    zipCode: '80804',
    yearBuilt: 2018,
    purchasePrice: 1200000,
    renovationCost: 5000,
    purchaseDate: '2024-03-10',
    lastRentIncreaseDate: '2022-01-01', // Schon länger her beim Voreigentümer
    units: 2,
    area: 110,
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-2495db98dada?auto=format&fit=crop&w=800&q=80',
    financials: {
      ...DEFAULT_FINANCIALS,
      transferTaxPercent: 3.5, // Bayern
      coldRent: 3800,
      operatingCostsRecoverable: 400,
      operatingCostsNonRecoverable: 300,
      maintenanceReserve: 80,
      loanAmount: 900000
    }
  }
];

export const SEED_TICKETS: Ticket[] = [
  {
    id: 't1',
    propertyId: 'p1',
    title: 'Heizungsausfall',
    description: 'Mieter in Whg 2 meldet kalte Heizkörper.',
    status: TicketStatus.OPEN,
    priority: 'HOCH',
    createdAt: new Date().toISOString(),
    comments: [
        { id: 'c1', text: 'Hausmeister ist informiert.', author: 'System', createdAt: new Date(Date.now() - 1000000).toISOString() }
    ]
  },
  {
    id: 't2',
    propertyId: 'p3',
    title: 'Tropfender Wasserhahn',
    description: 'Küche, Dichtung muss getauscht werden.',
    status: TicketStatus.IN_PROGRESS,
    priority: 'NIEDRIG',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    comments: []
  }
];

const generateTransactions = (): Transaction[] => {
  const txs: Transaction[] = [];
  const today = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1).toISOString();
    
    // Mieteinnahmen
    txs.push({
      id: `inc-p1-${i}`, propertyId: 'p1', amount: 2200, type: TransactionType.INCOME, category: 'Miete', date, description: 'Mieteingang Januar'
    });
    
    // Ausgaben
    if (i === 1) {
       txs.push({
        id: `renov-p2`, propertyId: 'p2', amount: 4500, type: TransactionType.EXPENSE, category: 'Renovierung', date, description: 'Badrenovierung'
      });
    }
  }
  return txs;
};

export const SEED_TRANSACTIONS = generateTransactions();

export const SEED_TENANTS: Tenant[] = [
  { id: 'tn1', propertyId: 'p1', name: 'Dr. Markus Weber', unit: 'EG Links', rent: 850, leaseStart: '2021-04-01', status: 'AKTIV', email: 'markus@weber.de' },
  { id: 'tn2', propertyId: 'p1', name: 'Sabine Kurz', unit: '1. OG', rent: 920, leaseStart: '2022-09-15', status: 'ZAHLUNGSVERZUG' },
  { id: 'tn3', propertyId: 'p2', name: 'Startup GmbH', unit: 'Gewerbe EG', rent: 2500, leaseStart: '2020-06-01', status: 'AKTIV' },
];

export const SEED_DOCUMENTS: PropertyDocument[] = [
  { id: 'd1', propertyId: 'p1', name: 'Kaufvertrag Notar', type: 'VERTRAG', date: '2023-01-15', size: '4.2 MB' },
  { id: 'd2', propertyId: 'p1', name: 'Energieausweis', type: 'SONSTIGES', date: '2023-01-20', size: '1.1 MB' },
  { id: 'd3', propertyId: 'p1', name: 'Grundriss EG', type: 'GRUNDRISS', date: '2023-02-01', size: '2.4 MB' },
];
