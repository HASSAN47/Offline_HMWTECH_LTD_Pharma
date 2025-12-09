import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Stats, Sale, Medicine } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { ShoppingBag, AlertTriangle, Package, Layers } from 'lucide-react';

const NairaSign = ({ size = 24, color = "currentColor", ...props }: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M4 20V4L20 20V4" />
    <path d="M2 10h20" />
    <path d="M2 14h20" />
  </svg>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5 z-50">
        <p className="text-sm font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
          Revenue: ₦{payload[0].value.toLocaleString()}
        </p>
        {payload[0].payload.orders !== undefined && (
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {payload[0].payload.orders} {payload[0].payload.orders === 1 ? 'Transaction' : 'Transactions'}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stockCategoryData, setStockCategoryData] = useState<any[]>([]);
  const [stockValueData, setStockValueData] = useState<any[]>([]);

  useEffect(() => {
    const currentStats = db.getStats();
    setStats(currentStats);

    const sales = db.getSales();
    const medicines = db.getMedicines();

    // 1. Prepare Last 7 Days Range (Continuous)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i)); // -6, -5, ... 0 (today)
      d.setHours(0, 0, 0, 0);
      return d;
    });

    // 2. Aggregate Sales by Date Key
    const salesMap = sales.reduce((acc, sale) => {
      const dateKey = new Date(sale.timestamp).setHours(0,0,0,0).toString();
      if (!acc[dateKey]) acc[dateKey] = { revenue: 0, orders: 0 };
      acc[dateKey].revenue += sale.totalAmount;
      acc[dateKey].orders += 1;
      return acc;
    }, {} as Record<string, { revenue: number, orders: number }>);

    // 3. Map to Chart Data (Filling zeros)
    const chartData = last7Days.map(date => {
      const dateKey = date.getTime().toString();
      const data = salesMap[dateKey] || { revenue: 0, orders: 0 };
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }), // Mon, Tue
        fullDate: date.toLocaleDateString(),
        revenue: data.revenue,
        orders: data.orders
      };
    });

    setSalesData(chartData);

    // Prepare Stock Analytics Data
    const categoryCounts: Record<string, number> = {};
    const categoryValues: Record<string, number> = {};

    medicines.forEach((m: Medicine) => {
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + m.stock;
      categoryValues[m.category] = (categoryValues[m.category] || 0) + (m.stock * m.price);
    });

    const stockCountChart = Object.keys(categoryCounts).map(cat => ({
      name: cat,
      value: categoryCounts[cat]
    }));
    
    const stockValueChart = Object.keys(categoryValues).map(cat => ({
      name: cat,
      value: categoryValues[cat]
    }));

    setStockCategoryData(stockCountChart);
    setStockValueData(stockValueChart);

  }, []);

  if (!stats) return <div>Loading...</div>;

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-transform hover:scale-[1.02]">
      <div className={`p-3 rounded-lg ${color} text-white`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₦${stats.totalRevenue.toLocaleString()}`} 
          icon={NairaSign} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders} 
          icon={ShoppingBag} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Low Stock Items" 
          value={stats.lowStockCount} 
          icon={AlertTriangle} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Total Products" 
          value={stats.totalProducts} 
          icon={Package} 
          color="bg-indigo-500" 
        />
      </div>

      {/* Sales Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 md:h-96 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">Revenue Trends</h3>
            <p className="text-xs text-slate-500">Last 7 days performance</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 11}} 
                  tickFormatter={(value) => value >= 1000 ? `₦${(value/1000).toFixed(0)}k` : `₦${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 md:h-96 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">Daily Sales Volume</h3>
            <p className="text-xs text-slate-500">Revenue per day</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 11}} 
                  tickFormatter={(value) => value >= 1000 ? `₦${(value/1000).toFixed(0)}k` : `₦${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Bar 
                  dataKey="revenue" 
                  fill="#6366f1" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Inventory Analytics Section */}
      <h2 className="text-2xl font-bold text-slate-800 mt-8 flex items-center gap-2">
        <Layers className="text-blue-600" /> Inventory Visualization
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Stock Volume by Category */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 md:h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Stock Count by Category</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockCategoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stockCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Value by Category */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 md:h-96 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Inventory Value by Category (₦)</h3>
           <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockValueData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{fontSize: 11, fill: '#64748b'}} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Value']} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};