import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Medicine } from '../types';
import { Plus, Search, Trash2, Edit2, X, Save, CheckSquare, Square, Layers, Printer, FileText, ShoppingCart, CheckCircle, Upload, Download, FileSpreadsheet, Lock, ScanBarcode, ArrowRight, PackagePlus } from 'lucide-react';
import { jsPDF } from "jspdf";

interface InventoryProps {
  userRole: string;
}

export const Inventory: React.FC<InventoryProps> = ({ userRole }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Bulk Modal State
  const [isBulkStockOpen, setIsBulkStockOpen] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState<number | ''>('');

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scannedItem, setScannedItem] = useState<Medicine | null>(null);
  const [scanQty, setScanQty] = useState<number | ''>('');
  const [scanStep, setScanStep] = useState<'scan' | 'action' | 'not-found'>('scan');
  const scanInputRef = useRef<HTMLInputElement>(null);

  // File Input for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback State
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isAdmin = userRole === 'admin';

  const emptyForm: Medicine = {
    id: '',
    name: '',
    genericName: '',
    category: '',
    price: 0,
    stock: 0,
    expiryDate: '',
    batchNumber: ''
  };
  
  const [formData, setFormData] = useState<Medicine>(emptyForm);

  useEffect(() => {
    loadMedicines();
  }, []);

  // Auto-focus scanner input when modal opens or step changes to scan
  useEffect(() => {
    if (isScannerOpen && scanStep === 'scan') {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [isScannerOpen, scanStep]);

  const loadMedicines = () => {
    setMedicines(db.getMedicines());
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAddToCart = (medicine: Medicine) => {
    if (db.addToCart(medicine)) {
      showToast(`Added ${medicine.name} to POS Cart`);
    } else {
      showToast(`Cannot add ${medicine.name}. Stock limit reached.`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newMedicine = { ...formData, id: editingId || formData.id || Date.now().toString() };
    db.saveMedicine(newMedicine);
    loadMedicines(); // Reload to ensure sync
    closeModal();
    showToast(editingId ? "Medicine updated" : "Medicine added");
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      db.deleteMedicine(id);
      // Real-time update: filter local state instead of reloading from DB
      setMedicines(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      showToast("Medicine deleted");
    }
  };

  // Bulk Actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredItems: Medicine[]) => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(m => m.id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} items? This cannot be undone.`)) {
      db.deleteMedicines(selectedIds);
      // Real-time update
      setMedicines(prev => prev.filter(m => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      showToast("Items deleted");
    }
  };

  const handleBulkStockUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof bulkStockValue === 'number' && bulkStockValue >= 0) {
      // Confirmation Dialog
      if (window.confirm(`Are you sure you want to set the stock to ${bulkStockValue} for ${selectedIds.length} selected items?`)) {
        db.setStock(selectedIds, bulkStockValue);
        loadMedicines();
        setIsBulkStockOpen(false);
        setBulkStockValue('');
        setSelectedIds([]);
        showToast("Stock updated");
      }
    }
  };

  // Scanner Logic
  const processScan = (code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    // Search for medicine by ID (barcode) or Batch Number
    const found = medicines.find(m => m.id === trimmedCode || m.batchNumber === trimmedCode);

    if (found) {
      setScannedItem(found);
      setScanStep('action');
      setScanQty(1); // Default add 1
    } else {
      setScanStep('not-found');
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScan(scanCode);
  };

  // Auto-scan detection (Debounce)
  useEffect(() => {
    // Only auto-scan if modal is open, we are in scan step, and code has content
    // Use a short debounce to wait for scanner to finish typing or user to pause
    if (isScannerOpen && scanStep === 'scan' && scanCode.length > 0) {
      const timer = setTimeout(() => {
        processScan(scanCode);
      }, 400); // 400ms delay
      return () => clearTimeout(timer);
    }
  }, [scanCode, isScannerOpen, scanStep]);

  const handleScannerAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (scannedItem && typeof scanQty === 'number' && scanQty > 0) {
      // Calculate new stock
      const newStock = scannedItem.stock + scanQty;
      const updatedItem = { ...scannedItem, stock: newStock };
      
      db.saveMedicine(updatedItem);
      loadMedicines();
      
      showToast(`Added ${scanQty} units to ${scannedItem.name}`);
      // Reset to scan next item
      setScanCode('');
      setScanStep('scan');
      setScannedItem(null);
      setScanQty('');
      // Focus back to input is handled by useEffect
    }
  };

  const handleRegisterFromScan = () => {
    // Open Add Modal with pre-filled ID/Batch
    setFormData({
      ...emptyForm,
      id: scanCode, // Use barcode as ID
      batchNumber: scanCode // Pre-fill batch too
    });
    setEditingId(null);
    setIsScannerOpen(false);
    setIsModalOpen(true);
    setScanCode('');
    setScanStep('scan');
  };

  // Import / Export Logic
  const handleExportCSV = () => {
    const headers = ["ID", "Name", "Generic Name", "Category", "Price", "Stock", "Expiry Date", "Batch Number"];
    const csvContent = [
      headers.join(","),
      ...medicines.map(m => 
        [
          m.id,
          `"${m.name.replace(/"/g, '""')}"`,
          `"${m.genericName.replace(/"/g, '""')}"`,
          `"${m.category.replace(/"/g, '""')}"`,
          m.price,
          m.stock,
          m.expiryDate,
          `"${m.batchNumber.replace(/"/g, '""')}"`
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Inventory exported to CSV");
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // Basic check to skip header if it exists
        const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
        
        let importedCount = 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV parsing (regex to handle quotes)
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          // Fallback split if simple match fails or for simple CSVs
          const cols = matches ? matches.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"')) : line.split(',');

          // Need at least name, price, stock (assumes index based on our export)
          // Format expected: ID, Name, Generic, Category, Price, Stock, Expiry, Batch
          if (cols.length >= 5) {
             const medicine: Medicine = {
                id: cols[0] || Date.now().toString() + Math.random().toString().slice(2,5),
                name: cols[1] || 'Unknown',
                genericName: cols[2] || '',
                category: cols[3] || 'General',
                price: parseFloat(cols[4]) || 0,
                stock: parseInt(cols[5]) || 0,
                expiryDate: cols[6] || '',
                batchNumber: cols[7] || ''
             };
             // Validate critical fields
             if(medicine.name && !isNaN(medicine.price)) {
                db.saveMedicine(medicine);
                importedCount++;
             }
          }
        }
        
        loadMedicines();
        showToast(`Successfully imported ${importedCount} items`);
      } catch (err) {
        console.error(err);
        showToast("Error parsing CSV file");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Report Generation (Receipt Preview)
  const handleDownloadReport = () => {
    const doc = new jsPDF();
    const settings = db.getSettings();
    const itemsToPrint = selectedIds.length > 0 
      ? medicines.filter(m => selectedIds.includes(m.id))
      : medicines; // Print all if none selected

    // Header
    doc.setFontSize(18);
    doc.text(settings.storeName + " Inventory Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Items Listed: ${itemsToPrint.length}`, 14, 34);

    // Table Header
    let y = 45;
    const headers = ["Name", "Category", "Stock", "Price (NGN)", "Value (NGN)"];
    doc.setFont("helvetica", "bold");
    doc.text(headers[0], 14, y);
    doc.text(headers[1], 80, y);
    doc.text(headers[2], 130, y);
    doc.text(headers[3], 155, y);
    doc.text(headers[4], 180, y);
    
    doc.line(14, y + 2, 196, y + 2);
    y += 8;

    // Items
    doc.setFont("helvetica", "normal");
    let totalValue = 0;

    itemsToPrint.forEach((item) => {
      if (y > 280) { // New Page
        doc.addPage();
        y = 20;
      }
      
      const itemValue = item.price * item.stock;
      totalValue += itemValue;

      doc.text(item.name.substring(0, 30), 14, y);
      doc.text(item.category.substring(0, 20), 80, y);
      doc.text(item.stock.toString(), 130, y);
      doc.text(item.price.toFixed(2), 155, y);
      doc.text(itemValue.toFixed(2), 180, y);
      y += 6;
    });

    // Footer Total
    y += 5;
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Total Inventory Value:", 130, y);
    doc.text(`NGN ${totalValue.toFixed(2)}`, 180, y);

    // Save directly
    doc.save(`Inventory_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const openModal = (medicine?: Medicine) => {
    if (medicine) {
      setFormData(medicine);
      setEditingId(medicine.id);
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setEditingId(null);
  };

  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.genericName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
        
        <div className="flex flex-wrap gap-2">
          {/* File Input Hidden */}
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".csv"
            onChange={handleImportCSV}
          />
          
          {isAdmin && (
            <>
              <button 
                onClick={() => setIsScannerOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm"
              >
                <ScanBarcode size={18} />
                <span>Stock Scanner</span>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm"
              >
                <Upload size={18} />
                <span>Import CSV</span>
              </button>
              
              <button 
                onClick={handleExportCSV}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm"
              >
                <FileSpreadsheet size={18} />
                <span>Export CSV</span>
              </button>
            </>
          )}

          <button 
            onClick={handleDownloadReport}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm"
          >
            <Printer size={18} />
            <span>PDF Report</span>
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => openModal()}
              className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm"
            >
              <Plus size={18} />
              <span>Manual Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search medicines by name or generic name..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Bulk Action Bar - Only for Admins */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="bg-blue-600 text-white p-3 rounded-xl shadow-md flex justify-between items-center animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckSquare size={20} />
            <span className="font-semibold">{selectedIds.length} items selected</span>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => setIsBulkStockOpen(true)}
               className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
             >
               <Layers size={16} /> Update Stock
             </button>
             <button 
               onClick={handleBulkDelete}
               className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
             >
               <Trash2 size={16} /> Delete Selected
             </button>
             <button 
               onClick={() => setSelectedIds([])}
               className="bg-transparent hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
             >
               Cancel
             </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 w-12 border-b">
                  {isAdmin ? (
                    <button 
                      onClick={() => toggleSelectAll(filteredMedicines)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {selectedIds.length === filteredMedicines.length && filteredMedicines.length > 0 
                        ? <CheckSquare size={20} className="text-blue-600" /> 
                        : <Square size={20} />
                      }
                    </button>
                  ) : (
                    <Lock size={16} className="text-slate-300" />
                  )}
                </th>
                <th className="p-4 font-semibold text-slate-600 border-b">Name</th>
                <th className="p-4 font-semibold text-slate-600 border-b">Generic</th>
                <th className="p-4 font-semibold text-slate-600 border-b">Category</th>
                <th className="p-4 font-semibold text-slate-600 border-b">Price (₦)</th>
                <th className="p-4 font-semibold text-slate-600 border-b">Stock</th>
                <th className="p-4 font-semibold text-slate-600 border-b">Expiry</th>
                <th className="p-4 font-semibold text-slate-600 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.map(m => (
                <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(m.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-4">
                    {isAdmin ? (
                      <button 
                        onClick={() => toggleSelect(m.id)}
                        className="text-slate-400 hover:text-blue-600"
                      >
                        {selectedIds.includes(m.id) 
                          ? <CheckSquare size={20} className="text-blue-600" /> 
                          : <Square size={20} />
                        }
                      </button>
                    ) : (
                       <span className="w-5 h-5 block"></span>
                    )}
                  </td>
                  <td className="p-4 font-medium text-slate-800">{m.name}</td>
                  <td className="p-4 text-slate-500">{m.genericName}</td>
                  <td className="p-4 text-slate-500">
                    <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                      {m.category}
                    </span>
                  </td>
                  <td className="p-4 text-emerald-600 font-medium">₦{m.price.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.stock < 20 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {m.stock}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{m.expiryDate}</td>
                  <td className="p-4 text-right space-x-2 flex justify-end">
                    <button 
                      onClick={() => handleAddToCart(m)} 
                      disabled={m.stock === 0}
                      className={`p-2 rounded-lg transition-colors ${m.stock === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      title={m.stock === 0 ? "Out of Stock" : "Add to POS Cart"}
                    >
                      <ShoppingCart size={18} />
                    </button>
                    
                    {isAdmin && (
                      <>
                        <button onClick={() => openModal(m)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMedicines.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No medicines found. Try adjusting your search {isAdmin && "or add a new item"}.
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg animate-fade-in flex items-center gap-2 z-50">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Add/Edit Modal - Only render if admin */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Medicine' : 'Add New Medicine'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand Name</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Generic Name</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.genericName} onChange={e => setFormData({...formData, genericName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.batchNumber} onChange={e => setFormData({...formData, batchNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price (₦)</label>
                  <input required type="number" step="0.01" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
                  <input required type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                  <input required type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Save size={18} />
                  <span>Save Medicine</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isAdmin && isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
             {/* Scanner Header */}
             <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
               <div>
                 <h3 className="text-xl font-bold flex items-center gap-2">
                   <ScanBarcode className="text-blue-400" /> Stock Scanner
                 </h3>
                 <p className="text-slate-400 text-sm mt-1">Works with USB Scanners & Mobile Cameras</p>
               </div>
               <button onClick={() => { setIsScannerOpen(false); setScanStep('scan'); setScanCode(''); }} className="text-slate-400 hover:text-white">
                 <X size={24} />
               </button>
             </div>

             {/* Scanner Content */}
             <div className="p-6 space-y-6">
                
                {/* Step 1: Scanning */}
                {scanStep === 'scan' && (
                  <div className="space-y-4">
                    <form onSubmit={handleScanSubmit}>
                      <div className="relative">
                        <input
                          ref={scanInputRef}
                          autoFocus
                          type="text"
                          value={scanCode}
                          onChange={(e) => setScanCode(e.target.value)}
                          placeholder="Click here and scan barcode..."
                          className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg shadow-inner bg-slate-50"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping absolute"></div>
                          <ScanBarcode className="text-blue-600 relative z-10" />
                        </div>
                      </div>
                    </form>
                    <p className="text-center text-sm text-slate-500">
                      Auto-detects code or press <kbd className="bg-slate-100 px-1 rounded border border-slate-300">Enter</kbd>
                    </p>
                  </div>
                )}

                {/* Step 2: Found Item Action */}
                {scanStep === 'action' && scannedItem && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                       <CheckCircle className="text-blue-600 shrink-0 mt-0.5" />
                       <div>
                         <h4 className="font-bold text-slate-800 text-lg">{scannedItem.name}</h4>
                         <p className="text-sm text-slate-600">Generic: {scannedItem.genericName}</p>
                         <div className="flex gap-4 mt-2 text-sm">
                           <span className="font-medium text-slate-500">Current Stock: <strong className="text-slate-800">{scannedItem.stock}</strong></span>
                           <span className="font-medium text-slate-500">Price: <strong className="text-slate-800">₦{scannedItem.price}</strong></span>
                         </div>
                       </div>
                    </div>

                    <form onSubmit={handleScannerAddStock} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Quantity to Add</label>
                        <input 
                           autoFocus
                           type="number" 
                           min="1"
                           value={scanQty}
                           onChange={(e) => setScanQty(parseInt(e.target.value))}
                           className="w-full p-3 border rounded-xl text-lg font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="Enter quantity"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button 
                          type="button"
                          onClick={() => { setScanStep('scan'); setScanCode(''); }}
                          className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                        >
                          Confirm Update
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 3: Not Found */}
                {scanStep === 'not-found' && (
                  <div className="text-center space-y-6 animate-fade-in">
                     <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                        <PackagePlus size={32} />
                     </div>
                     <div>
                       <h4 className="text-xl font-bold text-slate-800">Product Not Found</h4>
                       <p className="text-slate-500 mt-1">Barcode: <code className="bg-slate-100 px-1 py-0.5 rounded">{scanCode}</code></p>
                       <p className="text-sm text-slate-400 mt-2">This item does not exist in inventory yet.</p>
                     </div>
                     <div className="flex gap-3">
                        <button 
                          onClick={() => { setScanStep('scan'); setScanCode(''); }}
                          className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium border border-slate-200"
                        >
                          Try Again
                        </button>
                        <button 
                          onClick={handleRegisterFromScan}
                          className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2"
                        >
                          <span>Register Item</span>
                          <ArrowRight size={16} />
                        </button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Bulk Stock Modal - Only render if admin */}
      {isAdmin && isBulkStockOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Update Stock Level</h3>
              <p className="text-sm text-slate-500">Set new quantity for {selectedIds.length} items</p>
            </div>
            <form onSubmit={handleBulkStockUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Quantity</label>
                <input 
                  required 
                  type="number" 
                  min="0"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg" 
                  value={bulkStockValue} 
                  onChange={e => setBulkStockValue(parseInt(e.target.value))} 
                  placeholder="e.g. 100"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsBulkStockOpen(false)} 
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update All
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};