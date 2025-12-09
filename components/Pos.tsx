import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Medicine, CartItem, Sale } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash, CreditCard, Banknote, Smartphone, CheckCircle, Printer, ArrowRight } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { jsPDF } from "jspdf";

export const Pos: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  // Initialize cart from persistent storage
  const [cart, setCart] = useState<CartItem[]>(db.getCart());
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'digital' | null>(null);
  
  // State for Cash Transaction Receipt Modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  useEffect(() => {
    setMedicines(db.getMedicines());
  }, [success, completedSale]);

  // Persist cart changes to DB whenever cart state updates
  useEffect(() => {
    db.saveCart(cart);
  }, [cart]);

  const addToCart = (medicine: Medicine) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === medicine.id);
      if (existing) {
        if (existing.quantity >= medicine.stock) return prev; // Check stock limit
        return prev.map(item => 
          item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        const stock = medicines.find(m => m.id === id)?.stock || 0;
        if (newQty > 0 && newQty <= stock) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const initiateCheckout = (method: 'cash' | 'card' | 'digital') => {
    if (cart.length === 0) return;

    if (method === 'cash') {
      completeTransaction('cash');
    } else {
      setPaymentType(method);
      setShowPaymentModal(true);
    }
  };

  const completeTransaction = (method: 'cash' | 'card' | 'digital') => {
    const sale: Sale = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      items: cart,
      totalAmount: calculateTotal(),
      paymentMethod: method
    };

    db.addSale(sale);
    setCart([]); // This triggers useEffect to clear DB cart
    setShowPaymentModal(false);
    setPaymentType(null);
    
    // For Cash, show the specific receipt modal. 
    // For others, the PaymentModal likely handled the user interaction, but we show a small success toast.
    if (method === 'cash') {
      setCompletedSale(sale);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handlePrintReceipt = (sale: Sale) => {
    const settings = db.getSettings();
    // Create a new PDF document optimized for receipts (80mm width)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 250]
    });

    const centerX = 40;
    let y = 10;
    const lineHeight = 5;

    // Logo if available
    if (settings.logo) {
       try {
         doc.addImage(settings.logo, 'JPEG', 25, y, 30, 30); // Centered approx
         y += 35;
       } catch (e) {
         console.error("Logo print error", e);
       }
    }

    const addCenteredText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("courier", isBold ? "bold" : "normal");
      doc.text(text, centerX, y, { align: 'center' });
      y += lineHeight;
    };

    const addRow = (label: string, value: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("courier", isBold ? "bold" : "normal");
      doc.text(label, 5, y);
      doc.text(value, 75, y, { align: 'right' });
      y += lineHeight;
    };

    const addSeparator = () => {
      y += 2;
      doc.setLineDash([1, 1], 0);
      doc.line(5, y, 75, y);
      y += lineHeight;
      doc.setLineDash([], 0);
    };

    // Header
    addCenteredText(settings.storeName, 16, true);
    addCenteredText(settings.addressLine1, 10);
    if (settings.addressLine2) addCenteredText(settings.addressLine2, 10);
    addCenteredText(settings.contactNumber, 10);

    addSeparator();

    // Transaction Details
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text(`Date: ${new Date(sale.timestamp).toLocaleDateString()}`, 5, y);
    y += lineHeight;
    doc.text(`Time: ${new Date(sale.timestamp).toLocaleTimeString()}`, 5, y);
    y += lineHeight;
    doc.text(`Txn ID: #${sale.id.slice(-6)}`, 5, y);
    y += lineHeight;
    doc.text(`Cashier: Terminal 1`, 5, y);

    addSeparator();

    // Items
    addRow("ITEM", "AMT (NGN)", 10, true);
    addSeparator();
    
    doc.setFont("courier", "normal");
    sale.items.forEach(item => {
      doc.text(item.name.substring(0, 20), 5, y);
      y += lineHeight;
      const priceStr = `${item.quantity} x ${item.price.toFixed(2)}`;
      const totalStr = (item.quantity * item.price).toFixed(2);
      doc.text(priceStr, 5, y);
      doc.text(totalStr, 75, y, { align: 'right' });
      y += lineHeight;
    });

    addSeparator();

    // Total
    addRow("TOTAL", `NGN ${sale.totalAmount.toFixed(2)}`, 14, true);

    addSeparator();

    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text(`Paid via: ${sale.paymentMethod.toUpperCase()}`, 5, y);
    y += lineHeight * 2;

    addCenteredText("Thank you for your visit!", 10, true);
    addCenteredText("Keep Receipt for Returns", 8);

    doc.save(`Receipt-${sale.id}.pdf`);
  };

  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.genericName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 relative">
      {/* Product List */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar p-1">
          {filteredMedicines.map(medicine => (
            <button 
              key={medicine.id}
              disabled={medicine.stock === 0}
              onClick={() => addToCart(medicine)}
              className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                medicine.stock === 0 
                  ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' 
                  : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md'
              }`}
            >
              <div className="font-bold text-slate-800 truncate w-full">{medicine.name}</div>
              <div className="text-xs text-slate-500 truncate w-full mb-2">{medicine.genericName}</div>
              <div className="mt-auto flex justify-between items-center w-full">
                <span className="font-bold text-blue-600">₦{medicine.price.toLocaleString()}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${medicine.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                  {medicine.stock} left
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full lg:h-auto lg:min-h-full">
        <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart size={20} />
            Current Order
          </h3>
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
            {cart.length} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="font-medium text-slate-800 truncate">{item.name}</div>
                  <div className="text-xs text-slate-500">₦{item.price.toLocaleString()} each</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 px-1 py-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <div className="font-bold text-slate-800">₦{(item.price * item.quantity).toLocaleString()}</div>
                    <button onClick={() => removeFromCart(item.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl space-y-4">
          <div className="flex justify-between items-center text-lg font-bold text-slate-800">
            <span>Total</span>
            <span>₦{calculateTotal().toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => initiateCheckout('cash')}
              disabled={cart.length === 0}
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Banknote size={20} className="mb-1" />
              <span className="text-xs font-medium">Cash</span>
            </button>
            <button 
              onClick={() => initiateCheckout('card')}
              disabled={cart.length === 0}
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard size={20} className="mb-1" />
              <span className="text-xs font-medium">Card</span>
            </button>
            <button 
              onClick={() => initiateCheckout('digital')}
              disabled={cart.length === 0}
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Smartphone size={20} className="mb-1" />
              <span className="text-xs font-medium">Digital</span>
            </button>
          </div>
        </div>
      </div>
      
      {showPaymentModal && (
        <PaymentModal 
          total={calculateTotal()}
          items={cart}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={completeTransaction}
        />
      )}

      {/* Cash Payment Success Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-center p-8 space-y-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={48} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Cash Received</h2>
              <p className="text-slate-500">Transaction #{completedSale.id.slice(-6)} Successful</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center text-lg font-bold text-slate-800">
                <span>Total Collected</span>
                <span>₦{completedSale.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => handlePrintReceipt(completedSale)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Printer size={20} />
                <span>Print Receipt</span>
              </button>
              <button 
                onClick={() => setCompletedSale(null)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
              >
                <span>New Sale</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {success && !completedSale && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce flex items-center space-x-2 z-50">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span>Transaction Successful!</span>
        </div>
      )}
    </div>
  );
};