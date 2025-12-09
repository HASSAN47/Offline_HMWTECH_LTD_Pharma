import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Sale, Medicine } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Printer, TrendingUp, CreditCard, Banknote, Smartphone, Calendar, FileText } from 'lucide-react';

export const Summary: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'all'>('all');
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    paymentMethods: [] as any[],
    topProducts: [] as any[]
  });

  useEffect(() => {
    const allSales = db.getSales();
    filterAndProcess(allSales, timeRange);
  }, [timeRange]);

  const filterAndProcess = (allSales: Sale[], range: string) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();

    let filtered = allSales;
    if (range === 'today') {
      filtered = allSales.filter(s => s.timestamp >= startOfDay);
    } else if (range === 'week') {
      filtered = allSales.filter(s => s.timestamp >= startOfWeek);
    }
    
    // Sort by newest first
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Metrics
    const totalRevenue = filtered.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTransactions = filtered.length;
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Payment Methods
    const methods = filtered.reduce((acc: any, curr) => {
      acc[curr.paymentMethod] = (acc[curr.paymentMethod] || 0) + curr.totalAmount;
      return acc;
    }, {});
    
    const paymentData = [
      { name: 'Cash', value: methods['cash'] || 0, color: '#10b981' }, // Emerald
      { name: 'Card', value: methods['card'] || 0, color: '#3b82f6' }, // Blue
      { name: 'Digital', value: methods['digital'] || 0, color: '#8b5cf6' }, // Violet
    ].filter(d => d.value > 0);

    // Top Products
    const productMap = new Map<string, number>();
    filtered.forEach(sale => {
      sale.items.forEach(item => {
        productMap.set(item.name, (productMap.get(item.name) || 0) + item.quantity);
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    setSales(filtered);
    setMetrics({
      totalRevenue,
      totalTransactions,
      avgTransactionValue,
      paymentMethods: paymentData,
      topProducts
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Business Summary</h2>
          <p className="text-slate-500 text-sm">Comprehensive report of your pharmacy's performance</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button 
            onClick={() => setTimeRange('today')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === 'today' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Today
          </button>
          <button 
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === 'week' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            This Week
          </button>
          <button 
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            All Time
          </button>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
        >
          <Printer size={18} /> Print Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <span className="text-slate-500 font-medium text-sm">Total Revenue</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">₦{metrics.totalRevenue.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1">Based on {metrics.totalTransactions} transactions</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Calendar size={24} />
            </div>
            <span className="text-slate-500 font-medium text-sm">Avg. Transaction</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">₦{metrics.avgTransactionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
          <p className="text-xs text-slate-400 mt-1">Per customer visit</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
              <Smartphone size={24} />
            </div>
            <span className="text-slate-500 font-medium text-sm">Transactions</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{metrics.totalTransactions}</h3>
          <p className="text-xs text-slate-400 mt-1">Total checkout events</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-72 md:h-80 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Revenue by Payment Method</h3>
          <div className="flex-1 w-full min-h-0">
             {metrics.paymentMethods.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {metrics.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-slate-400">No data available</div>
             )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-72 md:h-80 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Top Selling Products (Qty)</h3>
          <div className="flex-1 w-full min-h-0">
            {metrics.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data available</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Transaction Detailed Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <FileText className="text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800">Detailed Transaction Report</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">ID</th>
                <th className="p-4">Items Summary</th>
                <th className="p-4">Method</th>
                <th className="p-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No transactions found for this period.</td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600 whitespace-nowrap">
                      {new Date(sale.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-xs">#{sale.id.slice(-6)}</td>
                    <td className="p-4 text-slate-800">
                      {sale.items.length === 1 
                        ? `${sale.items[0].name} (x${sale.items[0].quantity})`
                        : `${sale.items[0].name} and ${sale.items.length - 1} others`
                      }
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase
                        ${sale.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700' : 
                          sale.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">
                      ₦{sale.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Area Specifics (Hidden unless printing) */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 z-50">
        <h1 className="text-3xl font-bold text-center mb-8">HMWTECH.LTD Pharma Summary Report</h1>
        <div className="text-center mb-8">
          <p>Generated: {new Date().toLocaleString()}</p>
          <p>Period: {timeRange.toUpperCase()}</p>
        </div>
        
        <div className="mb-8 border-b pb-4">
          <h3 className="font-bold text-xl mb-4">Key Metrics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold">₦{metrics.totalRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-xl font-bold">{metrics.totalTransactions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Value</p>
              <p className="text-xl font-bold">₦{metrics.avgTransactionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
        
        <h3 className="font-bold mb-4 text-lg">Transaction Details</h3>
        <table className="w-full border-collapse border border-slate-300 text-sm mb-8">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2">Time</th>
              <th className="border p-2">ID</th>
              <th className="border p-2">Items</th>
              <th className="border p-2">Method</th>
              <th className="border p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id}>
                <td className="border p-2">{new Date(sale.timestamp).toLocaleTimeString()}</td>
                <td className="border p-2">#{sale.id.slice(-6)}</td>
                <td className="border p-2">
                  {sale.items.map(i => `${i.name} (${i.quantity})`).join(', ')}
                </td>
                <td className="border p-2 uppercase">{sale.paymentMethod}</td>
                <td className="border p-2 text-right">₦{sale.totalAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};