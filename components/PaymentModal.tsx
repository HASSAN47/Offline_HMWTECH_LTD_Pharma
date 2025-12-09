import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { jsPDF } from "jspdf";
import { X, Smartphone, CreditCard, CheckCircle, Wifi, WifiOff, Loader2, ShieldCheck, Globe, Lock, User, Receipt, FileText, Printer, Wallet } from 'lucide-react';
import { CartItem } from '../types';
import { db } from '../services/db';

interface PaymentModalProps {
  total: number;
  items: CartItem[];
  onClose: () => void;
  onSuccess: (method: 'cash' | 'card' | 'digital') => void;
}

type Gateway = 'Stripe' | 'PayPal' | 'Square';

export const PaymentModal: React.FC<PaymentModalProps> = ({ total, items, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'digital' | 'card'>('digital');
  const [isOnline, setIsOnline] = useState(true);
  const [gateway, setGateway] = useState<Gateway>('Stripe');
  const [settings, setSettings] = useState(db.getSettings());
  
  // Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // Processing State
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [txnId, setTxnId] = useState('');

  const simulateStep = (msg: string, delay: number): Promise<void> => {
    return new Promise(resolve => {
      setStatusMessage(msg);
      setTimeout(resolve, delay);
    });
  };

  const handleCardPayment = async () => {
    if (gateway !== 'PayPal' && (!cardNumber || !expiry || !cvc || !cardName)) {
      alert("Please fill in all card details.");
      return;
    }

    setStatus('processing');

    if (gateway === 'PayPal') {
      await simulateStep('Connecting to PayPal Secure...', 1500);
      await simulateStep('Authenticating User...', 1500);
      await simulateStep('Payment Authorized by User...', 1000);
    } else {
      await simulateStep(`Connecting to ${gateway} Gateway...`, 1000);
      await simulateStep('Tokenizing Card Data...', 1200);
      await simulateStep('Verifying 3D Secure...', 1500);
      await simulateStep('Capturing Funds...', 1000);
    }

    setTxnId(`TXN-${Date.now().toString().slice(-8)}`);
    setStatus('success');
  };

  const handleDigitalScan = async () => {
    setStatus('processing');
    await simulateStep('Waiting for Customer Scan...', 2000);
    if (isOnline) {
      await simulateStep('Receiving Webhook Callback...', 1000);
    } else {
      await simulateStep('Verifying Offline Signature...', 1000);
      await simulateStep('Deciphering Cryptographic Proof...', 1200);
    }
    setTxnId(`QR-${Date.now().toString().slice(-8)}`);
    setStatus('success');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = () => {
    // Create a new PDF document optimized for receipts (80mm width)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 250] // 80mm width, sufficient height
    });

    const centerX = 40; // Center of 80mm
    let y = 10;
    const lineHeight = 5;

    // Logo
    if (settings.logo) {
       try {
         doc.addImage(settings.logo, 'JPEG', 25, y, 30, 30);
         y += 35;
       } catch (e) {
         console.error("Logo print error", e);
       }
    }

    // Helper for centered text
    const addCenteredText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("courier", isBold ? "bold" : "normal");
      doc.text(text, centerX, y, { align: 'center' });
      y += lineHeight;
    };

    // Helper for left-right aligned text
    const addRow = (label: string, value: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("courier", isBold ? "bold" : "normal");
      doc.text(label, 5, y);
      doc.text(value, 75, y, { align: 'right' });
      y += lineHeight;
    };

    // Helper for line separator
    const addSeparator = () => {
      y += 2;
      doc.setLineDash([1, 1], 0);
      doc.line(5, y, 75, y);
      y += lineHeight;
      doc.setLineDash([], 0); // Reset dash
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
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 5, y);
    y += lineHeight;
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, 5, y);
    y += lineHeight;
    doc.text(`Txn ID: ${txnId}`, 5, y);
    y += lineHeight;
    doc.text(`Cashier: Terminal 1`, 5, y);

    addSeparator();

    // Items Header
    addRow("ITEM", "AMT (NGN)", 10, true);
    addSeparator();
    
    // Items Content
    doc.setFont("courier", "normal");
    items.forEach(item => {
      doc.text(item.name.substring(0, 20), 5, y); // Truncate name if too long
      y += lineHeight;
      const priceStr = `${item.quantity} x ${item.price.toFixed(2)}`;
      const totalStr = (item.quantity * item.price).toFixed(2);
      
      doc.text(priceStr, 5, y);
      doc.text(totalStr, 75, y, { align: 'right' });
      y += lineHeight;
    });

    addSeparator();

    // Total
    addRow("TOTAL", `NGN ${total.toFixed(2)}`, 14, true);

    addSeparator();

    // Footer Info
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text(`Paid via: ${activeTab === 'card' ? gateway : 'QR Code'}`, 5, y);
    y += lineHeight;
    const authCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    doc.text(`Auth Code: ${authCode}`, 5, y);
    y += lineHeight * 2;

    addCenteredText("Thank you for your visit!", 10, true);
    addCenteredText("Keep Receipt for Returns", 8);

    // Save
    doc.save(`Receipt-${txnId}.pdf`);
  };

  const finishTransaction = () => {
    onSuccess(activeTab === 'card' ? 'card' : 'digital');
  };

  // Generate QR Value based on connectivity mode
  const qrValue = isOnline 
    ? `https://pay.hmwtech.ltd/checkout?amt=${total.toFixed(2)}&ref=${Date.now()}`
    : JSON.stringify({
        app: 'HMWTECH_OFFLINE',
        store: 'STORE_001',
        amt: total,
        ts: Date.now(),
        nonce: Math.random().toString(36).substring(7)
      });

  return (
    <>
    {/* Hidden Printable Receipt (Optimized for 80mm Thermal Printer) */}
    <div id="printable-receipt" className="hidden">
      <div className="text-center">
        {settings.logo && <img src={settings.logo} className="w-16 h-16 mx-auto mb-2 object-contain" alt="Logo" />}
        <h1 className="font-bold uppercase">{settings.storeName}</h1>
        <p>{settings.addressLine1}</p>
        <p>{settings.addressLine2}</p>
        <p>{settings.contactNumber}</p>
      </div>
      
      <div className="separator"></div>
      
      <div>
        <p>Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
        <p>Txn ID: {txnId || 'PENDING'}</p>
        <p>Cashier: Terminal 1</p>
      </div>

      <div className="separator"></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
        <span>ITEM</span>
        <span>AMT (₦)</span>
      </div>
      <div className="separator" style={{ margin: '5px 0' }}></div>
      
      <div style={{ fontSize: '12px' }}>
        {items.map((item) => (
          <div key={item.id} style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.quantity} x ₦{item.price.toLocaleString()}</span>
              <span>₦{(item.quantity * item.price).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="separator"></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
        <span>TOTAL</span>
        <span>₦{total.toLocaleString()}</span>
      </div>
      
      <div className="separator"></div>

      <div className="text-center">
        <p>Paid via: {activeTab === 'card' ? gateway : 'QR Code'}</p>
        <p>Auth Code: {Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
        <br/>
        <p>Thank you for your visit!</p>
        <p>Keep Receipt for Returns</p>
      </div>
    </div>

    {/* Main Modal UI */}
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Secure Payment</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Lock size={12} className="text-emerald-500" />
              Encrypted Transaction
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Success View */}
        {status === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 animate-fade-in">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle size={48} className="text-emerald-500" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-slate-800">Payment Approved</h2>
              <p className="text-slate-500">Transaction ID: <span className="font-mono text-slate-700">{txnId}</span></p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl w-full border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 text-sm">Amount Paid</span>
                <span className="text-xl font-bold text-slate-800">₦{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Method</span>
                <span className="font-medium text-slate-700 uppercase">{activeTab === 'card' ? gateway : `QR (${isOnline ? 'Online' : 'Offline'})`}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button 
                onClick={handleSavePdf}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                aria-label="Save Receipt as PDF"
              >
                <FileText size={18} /> Save as PDF
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                aria-label="Print Receipt"
              >
                <Printer size={18} /> Print Receipt
              </button>
            </div>

            <button 
              onClick={finishTransaction}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center space-x-2"
            >
              <span>Close Register</span>
            </button>
          </div>
        ) : (
          /* Payment Form View */
          <>
            {/* Tabs */}
            <div className="flex p-2 gap-2 border-b border-slate-100">
              <button
                disabled={status === 'processing'}
                onClick={() => setActiveTab('digital')}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 font-medium transition-all ${
                  activeTab === 'digital' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone size={18} />
                <span>QR Pay</span>
              </button>
              <button
                disabled={status === 'processing'}
                onClick={() => setActiveTab('card')}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 font-medium transition-all ${
                  activeTab === 'card' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard size={18} />
                <span>Card / PayPal</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {status === 'processing' ? (
                <div className="h-full flex flex-col items-center justify-center space-y-8 py-8">
                   <div className="relative">
                     <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
                     <div className="w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <ShieldCheck size={24} className="text-blue-600" />
                     </div>
                   </div>
                   <div className="text-center space-y-2">
                     <h4 className="text-lg font-bold text-slate-700">{statusMessage}</h4>
                     <p className="text-xs text-slate-400">Please do not close this window</p>
                   </div>
                </div>
              ) : (
                <>
                  {/* Digital / QR Mode */}
                  {activeTab === 'digital' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex justify-center">
                         <div className="bg-slate-100 p-1.5 rounded-xl flex">
                           <button
                             onClick={() => setIsOnline(true)}
                             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isOnline ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                           >
                             <Wifi size={16} /> Online Link
                           </button>
                           <button
                             onClick={() => setIsOnline(false)}
                             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${!isOnline ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                           >
                             <WifiOff size={16} /> Offline Code
                           </button>
                         </div>
                      </div>

                      <div className="flex flex-col items-center space-y-4">
                        <div className={`relative p-4 rounded-2xl border-2 shadow-sm overflow-hidden ${isOnline ? 'border-blue-100 bg-blue-50/50' : 'border-emerald-100 bg-emerald-50/50'}`}>
                          {/* QR Scanning Animation */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan_2s_linear_infinite] z-10 pointer-events-none"></div>
                          <style>{`@keyframes scan { 0% { top: 0; } 50% { top: 100%; opacity: 0; } 51% { top: 0; opacity: 0; } 100% { top: 0; opacity: 1; } }`}</style>
                          
                          <QRCode 
                            value={qrValue} 
                            size={180} 
                            level="M"
                            fgColor={isOnline ? "#2563eb" : "#059669"}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-800">
                            {isOnline ? 'Scan to pay via Web' : 'Scan with Pharmacy Wallet App'}
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={handleDigitalScan}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                         <Smartphone size={18} />
                         <span>Simulate Customer Scan</span>
                      </button>
                    </div>
                  )}

                  {/* Card / Gateway Mode */}
                  {activeTab === 'card' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Select Gateway</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Stripe', 'PayPal', 'Square'] as Gateway[]).map((gw) => (
                            <button
                              key={gw}
                              onClick={() => setGateway(gw)}
                              className={`py-2 px-1 rounded-lg border text-sm font-semibold transition-all flex flex-col items-center gap-1 ${
                                gateway === gw
                                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 hover:border-blue-300 text-slate-600'
                              }`}
                            >
                               {/* Logos Removed - Using Text Only */}
                               <span className="font-bold my-1">{gw}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {gateway === 'PayPal' ? (
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center space-y-4">
                           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-blue-600 font-bold text-2xl">
                             <Wallet size={32} />
                           </div>
                           <div>
                             <h4 className="font-bold text-slate-800">Pay with PayPal</h4>
                             <p className="text-xs text-slate-500">You will be redirected to a secure window</p>
                           </div>
                           <button 
                             onClick={handleCardPayment}
                             className="w-full bg-[#0070ba] text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-blue-500/20"
                           >
                             Log In & Pay
                           </button>
                        </div>
                      ) : (
                        /* Credit Card Form */
                        <div className="space-y-4">
                           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative overflow-hidden">
                              {/* Card background styling */}
                              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                              <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="text-xs font-semibold text-slate-400 uppercase">Virtual Card</div>
                                <div className="flex gap-2">
                                   <CreditCard className="text-slate-400" />
                                </div>
                              </div>
                              <div className="space-y-4 relative z-10">
                                <div>
                                   <input 
                                     type="text" 
                                     value={cardNumber}
                                     onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19))}
                                     placeholder="0000 0000 0000 0000"
                                     className="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-xl font-mono text-slate-700 placeholder-slate-300 pb-1 transition-colors"
                                   />
                                </div>
                                <div className="flex gap-4">
                                   <div className="flex-1">
                                      <label className="text-[10px] text-slate-400 uppercase">Expiry</label>
                                      <input 
                                        type="text" 
                                        value={expiry}
                                        onChange={(e) => {
                                          let val = e.target.value.replace(/\D/g, '');
                                          if (val.length >= 2) val = val.slice(0,2) + '/' + val.slice(2,4);
                                          setExpiry(val);
                                        }}
                                        placeholder="MM/YY"
                                        maxLength={5}
                                        className="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-sm font-mono text-slate-700 pb-1"
                                      />
                                   </div>
                                   <div className="flex-1">
                                      <label className="text-[10px] text-slate-400 uppercase">CVC</label>
                                      <input 
                                        type="password" 
                                        value={cvc}
                                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="123"
                                        maxLength={4}
                                        className="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-sm font-mono text-slate-700 pb-1"
                                      />
                                   </div>
                                </div>
                                <div>
                                   <label className="text-[10px] text-slate-400 uppercase">Cardholder</label>
                                   <input 
                                     type="text"
                                     value={cardName}
                                     onChange={(e) => setCardName(e.target.value)}
                                     placeholder="NAME ON CARD"
                                     className="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 uppercase pb-1"
                                   />
                                </div>
                              </div>
                           </div>
                           
                           <button 
                             onClick={handleCardPayment}
                             className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                           >
                             <span>Pay ₦{total.toLocaleString()}</span>
                           </button>
                        </div>
                      )}
                      
                      <div className="flex justify-center items-center gap-2 text-[10px] text-slate-400 uppercase tracking-wider">
                        <ShieldCheck size={12} />
                        <span>Powered by {gateway}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};