import { Medicine, Sale, Stats, CartItem, StoreSettings, SystemMessage, User } from '../types';

const STORAGE_KEYS = {
  MEDICINES: 'pharmacore_medicines',
  SALES: 'pharmacore_sales',
  CART: 'pharmacore_cart',
  SETTINGS: 'pharmacore_settings',
  MESSAGES: 'pharmacore_messages',
  USERS: 'pharmacore_users',
};

// Seed data if empty - Prices updated to Nigerian Naira (NGN)
const INITIAL_MEDICINES: Medicine[] = [
  { id: '1', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotics', price: 2500, stock: 150, expiryDate: '2025-12-01', batchNumber: 'AMX001' },
  { id: '2', name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Pain Relief', price: 500, stock: 500, expiryDate: '2026-06-15', batchNumber: 'PAR002' },
  { id: '3', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'Pain Relief', price: 850, stock: 320, expiryDate: '2025-08-20', batchNumber: 'IBU003' },
  { id: '4', name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Allergy', price: 1200, stock: 80, expiryDate: '2024-11-30', batchNumber: 'CET004' },
  { id: '5', name: 'Metformin 500mg', genericName: 'Metformin', category: 'Diabetes', price: 1800, stock: 200, expiryDate: '2025-10-10', batchNumber: 'MET005' },
  { id: '6', name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'Gastrointestinal', price: 3500, stock: 120, expiryDate: '2025-05-05', batchNumber: 'OME006' },
  { id: '7', name: 'Aspirin 81mg', genericName: 'Acetylsalicylic Acid', category: 'Cardiovascular', price: 1500, stock: 300, expiryDate: '2026-01-01', batchNumber: 'ASP007' },
  { id: '8', name: 'Loratadine 10mg', genericName: 'Loratadine', category: 'Allergy', price: 2200, stock: 45, expiryDate: '2024-12-25', batchNumber: 'LOR008' },
];

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'HMWTECH.LTD Pharma',
  addressLine1: '123 Medical Plaza',
  addressLine2: 'Lagos, Nigeria',
  contactNumber: 'Tel: (234) 123-4567',
  logo: '',
  currencySymbol: '₦'
};

export const db = {
  getMedicines: (): Medicine[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MEDICINES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(INITIAL_MEDICINES));
      return INITIAL_MEDICINES;
    }
    return JSON.parse(data);
  },

  saveMedicine: (medicine: Medicine): void => {
    const medicines = db.getMedicines();
    const existingIndex = medicines.findIndex(m => m.id === medicine.id);
    if (existingIndex >= 0) {
      medicines[existingIndex] = medicine;
    } else {
      medicines.push(medicine);
    }
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
  },

  deleteMedicine: (id: string): void => {
    const medicines = db.getMedicines().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
  },

  // Bulk Delete
  deleteMedicines: (ids: string[]): void => {
    const medicines = db.getMedicines().filter(m => !ids.includes(m.id));
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
  },

  // Update stock (subtracting)
  updateStock: (id: string, quantitySold: number): void => {
    const medicines = db.getMedicines();
    const medicine = medicines.find(m => m.id === id);
    if (medicine) {
      medicine.stock = Math.max(0, medicine.stock - quantitySold);
      localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
    }
  },

  // Set absolute stock for bulk updates
  setStock: (ids: string[], quantity: number): void => {
    const medicines = db.getMedicines();
    medicines.forEach(m => {
      if (ids.includes(m.id)) {
        m.stock = quantity;
      }
    });
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
  },

  getSales: (): Sale[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SALES);
    return data ? JSON.parse(data) : [];
  },

  addSale: (sale: Sale): void => {
    const sales = db.getSales();
    sales.push(sale);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    
    // Update inventory
    sale.items.forEach(item => {
      db.updateStock(item.id, item.quantity);
    });
  },

  getStats: (): Stats => {
    const sales = db.getSales();
    const medicines = db.getMedicines();
    
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalOrders = sales.length;
    const lowStockCount = medicines.filter(m => m.stock < 20).length;
    const totalProducts = medicines.length;

    return { totalRevenue, totalOrders, lowStockCount, totalProducts };
  },

  // Cart Management
  getCart: (): CartItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CART);
    return data ? JSON.parse(data) : [];
  },

  saveCart: (cart: CartItem[]): void => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  },

  addToCart: (medicine: Medicine): boolean => {
    const cart = db.getCart();
    const existingItem = cart.find(item => item.id === medicine.id);
    
    if (existingItem) {
      if (existingItem.quantity < medicine.stock) {
        existingItem.quantity += 1;
        db.saveCart(cart);
        return true;
      }
      return false; // Stock limit reached
    } else {
      if (medicine.stock > 0) {
        cart.push({ ...medicine, quantity: 1 });
        db.saveCart(cart);
        return true;
      }
      return false; // Out of stock
    }
  },

  clearCart: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CART);
  },

  // Settings Management
  getSettings: (): StoreSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },

  saveSettings: (settings: StoreSettings): void => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Message Board System
  getMessages: (): SystemMessage[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  addMessage: (message: Omit<SystemMessage, 'id' | 'timestamp' | 'read'>): void => {
    const messages = db.getMessages();
    const newMessage: SystemMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      read: false
    };
    messages.unshift(newMessage); // Add to top
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  markMessageRead: (id: string): void => {
    const messages = db.getMessages();
    const msg = messages.find(m => m.id === id);
    if (msg) {
      msg.read = true;
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  },

  deleteMessage: (id: string): void => {
    const messages = db.getMessages().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  clearMessages: (): void => {
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  },

  // SYNC UTILITIES
  getAllData: () => {
    return {
      medicines: db.getMedicines(),
      sales: db.getSales(),
      settings: db.getSettings(),
      // We also sync users for consistency across devices in admin mode
      users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
    };
  },

  mergeData: (remoteData: any) => {
    if (!remoteData) return;

    // 1. Merge Sales (Union by ID)
    const currentSales = db.getSales();
    const remoteSales: Sale[] = remoteData.sales || [];
    const salesMap = new Map(currentSales.map(s => [s.id, s]));
    
    let newSalesCount = 0;
    remoteSales.forEach(s => {
      if (!salesMap.has(s.id)) {
        salesMap.set(s.id, s);
        newSalesCount++;
      }
    });
    const mergedSales = Array.from(salesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(mergedSales));

    // 2. Merge Medicines (Overwrite local with remote for simplicity/master-slave sync)
    // In a P2P sync, "last write wins" is hard without timestamps on fields.
    // We assume the incoming data is from a peer we want to sync *to* us.
    const currentMedicines = db.getMedicines();
    const remoteMedicines: Medicine[] = remoteData.medicines || [];
    const medMap = new Map(currentMedicines.map(m => [m.id, m]));

    remoteMedicines.forEach(m => {
       // Logic: Always overwrite local with remote to ensure consistency with host
       medMap.set(m.id, m);
    });
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(Array.from(medMap.values())));

    // 3. Merge Users (Union by Username)
    const currentUsers: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const remoteUsers: User[] = remoteData.users || [];
    const userMap = new Map(currentUsers.map(u => [u.username, u]));
    
    remoteUsers.forEach(u => {
      if (!userMap.has(u.username)) {
        userMap.set(u.username, u);
      }
    });
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(Array.from(userMap.values())));

    // 4. Settings (Keep Local or Overwrite? Let's keep local to avoid store name changes if distinct)
    
    return { newSalesCount };
  },

  resetData: () => {
    localStorage.clear();
    window.location.reload();
  }
};