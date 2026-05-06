export enum TicketStatus {
  OPEN = 'OFFEN',
  IN_PROGRESS = 'IN_BEARBEITUNG',
  DONE = 'ERLEDIGT',
}

export enum TransactionType {
  INCOME = 'EINNAHME',
  EXPENSE = 'AUSGABE',
}

export interface PropertyFinancials {
  // Kaufnebenkosten %
  transferTaxPercent: number; // Grunderwerbsteuer (z.B. 3.5 - 6.5%)
  notaryPercent: number;      // Notar (ca. 1.5%)
  registryPercent: number;    // Grundbuchamt (ca. 0.5%)
  agentPercent: number;       // Makler (3.57 - 7.14%)
  
  // Laufende Kosten (Monatlich)
  coldRent: number;           // Kaltmiete (Wohnfläche + Stellplätze)
  operatingCostsRecoverable: number; // Umlagefähige Nebenkosten (Hausgeld Mieteranteil + Grundsteuer)
  operatingCostsNonRecoverable: number; // Nicht-umlagefähig (Verwaltung + Instandhaltungsrücklage)
  maintenanceReserve: number; // Optionale zusätzliche eigene Instandhaltungsrücklage
  
  // Finanzierung
  loanInterestRate: number;   // Sollzins %
  loanRepaymentRate: number;  // Tilgung % (anfänglich)
  loanAmount: number;         // Darlehenshöhe
  
  // Steuer
  landValuePercent: number;   // Bodenrichtwertanteil (Standard 20%, Gebäude 80%)
  personalTaxRate: number;    // Persönlicher Grenzsteuersatz (z.B. 42%)
}

export interface Property {
  id: string;
  address: string;
  city: string;
  zipCode: string;
  yearBuilt: number;
  purchasePrice: number; // Kaufpreis (Netto)
  renovationCost: number; // Anfängliche Investitionen (Küche, Sanierung)
  purchaseDate: string;  // Kaufdatum
  lastRentIncreaseDate?: string; // NEU: Datum der letzten Mieterhöhung
  units: number;
  area: number; // Wohnfläche in m²
  imageUrl?: string;
  financials: PropertyFinancials;
}

export interface TicketComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'NIEDRIG' | 'MITTEL' | 'HOCH';
  createdAt: string;
  comments?: TicketComment[];
}

export interface Transaction {
  id: string;
  propertyId: string;
  amount: number;
  type: TransactionType;
  category: string; 
  date: string;
  description: string;
}

export interface Tenant {
  id: string;
  propertyId: string;
  name: string;
  unit: string; // z.B. "1. OG Links"
  rent: number; // Warm or Cold, usually Cold here
  leaseStart: string;
  leaseEnd?: string; // Optional
  email?: string;
  phone?: string;
  status: 'AKTIV' | 'GEKÜNDIGT' | 'ZAHLUNGSVERZUG';
}

export interface PropertyDocument {
  id: string;
  propertyId: string;
  name: string; // z.B. "Kaufvertrag"
  type: 'VERTRAG' | 'RECHNUNG' | 'GRUNDRISS' | 'SONSTIGES';
  date: string;
  size?: string; // Mock size
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

// Interface for AI Insights
export interface StrategicInsight {
  type: 'RENT' | 'TAX' | 'ENERGY' | 'FINANCE';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionLabel?: string;
  value?: string; // z.B. "+ 120€ / Monat"
}
