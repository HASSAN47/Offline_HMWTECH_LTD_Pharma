import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Sale } from '../types';
import { Clock, Package, Printer } from 'lucide-react';
import { jsPDF } from "jspdf";

export const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    // Load and reverse to show newest first
    const data = db.getSales();
    setSales([...data].reverse());
  }, []);

  const handlePrintReceipt = (sale: Sale) => {
    const settings = db.getSettings();
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
    doc.text(`Date: ${new Date(sale.timestamp).toLocaleDateString()}`, 5, y);
    y += lineHeight;
    doc.text(`Time: ${new Date(sale.timestamp).toLocaleTimeString()}`, 5, y);
    y += lineHeight;
    doc.text(`Txn ID: #${sale.id.slice(-6)}`, 5, y);
    y += lineHeight;
    doc.text(`Cashier: Terminal 1`, 5, y);

    addSeparator();

    // Items Header
    addRow("ITEM", "AMT (NGN)", 10, true);
    addSeparator();
    
    // Items Content
    doc.setFont("courier", "normal");
    sale.items.forEach(item => {
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
    addRow("TOTAL", `NGN ${sale.totalAmount.toFixed(2)}`, 14, true);

    addSeparator();

    // Footer Info
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text(`Paid via: ${sale.paymentMethod.toUpperCase()}`, 5, y);
    y += lineHeight * 2;

    addCenteredText("Thank you for your visit!", 10, true);
    addCenteredText("Keep Receipt for Returns", 8);

    // Save
    doc.save(`Receipt-${sale.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Transaction History</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Transaction ID</th>
                <th className="p-4 font-semibold text-slate-600">Date & Time</th>
                <th className="p-4 font-semibold text-slate-600">Items</th>
                <th className="p-4 font-semibold text-slate-600">Method</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Total (₦)</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-xs text-slate-500">#{sale.id.slice(-6)}</td>
                    <td className="p-4 text-slate-700 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock size={14} className="text-slate-400" />
                        <span>{new Date(sale.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col space-y-1">
                        {sale.items.map((item, idx) => (
                          <div key={idx} className="text-sm text-slate-600 flex justify-between max-w-xs">
                            <span className="truncate mr-2">{item.name}</span>
                            <span className="text-slate-400">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 uppercase">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-600">
                      ₦{sale.totalAmount.toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handlePrintReceipt(sale)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Print Receipt"
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};