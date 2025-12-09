import React, { useState, useEffect } from 'react';
import { Page, User } from './types';
import { authService } from './services/auth';
import { LayoutDashboard, Package, ShoppingCart, History, MessageSquareText, Pill, Users, LogOut, WifiOff, FileBarChart, Download, Lock, ChevronDown, RefreshCw } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Pos } from './components/Pos';
import { Sales } from './components/Sales';
import { Summary } from './components/Summary';
import { AiConsultant } from './components/AiConsultant';
import { Admin } from './components/Admin';
import { Sync } from './components/Sync';
import { Auth } from './components/Auth';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    authService.init();
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      console.log("Install prompt captured");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleLogin = () => {
    setCurrentUser(authService.getCurrentUser());
    setCurrentPage(Page.DASHBOARD);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentPage(Page.DASHBOARD);
    setIsUserMenuOpen(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const NavItem = ({ page, icon: Icon, label }: { page: Page; icon: any; label: string }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        currentPage === page
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  if (loading) return null;

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Network Offline Indicator */}
      {!isOnline && (
        <div className="absolute top-0 left-0 w-full bg-slate-800 text-white text-xs py-1 z-50 text-center font-medium flex justify-center items-center gap-2">
          <WifiOff size={12} />
          <span>You are currently working offline. Changes are saved locally.</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col z-10 no-print ${!isOnline ? 'mt-6' : ''}`}>
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Pill size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">HMWTECH.LTD Pharma</h1>
            <p className="text-xs text-slate-400 font-medium">Store Manager v1.0</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem page={Page.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem page={Page.INVENTORY} icon={Package} label="Inventory" />
          <NavItem page={Page.POS} icon={ShoppingCart} label="Point of Sale" />
          <NavItem page={Page.SALES} icon={History} label="Sales History" />
          
          {isAdmin && (
            <NavItem page={Page.SUMMARY} icon={FileBarChart} label="Reports & Summary" />
          )}
          
          <div className="pt-4 mt-4 border-t border-slate-100">
             <p className="px-4 text-xs font-semibold text-slate-400 uppercase mb-2">Intelligence</p>
             <NavItem page={Page.AI_CONSULTANT} icon={MessageSquareText} label="AI Consultant" />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
             <p className="px-4 text-xs font-semibold text-slate-400 uppercase mb-2">System</p>
             {isAdmin && <NavItem page={Page.ADMIN} icon={Users} label="Administration" />}
             <NavItem page={Page.SYNC} icon={RefreshCw} label="System Sync" />
          </div>

          {/* Install App Button - Only shows if browser supports it and event fired */}
          {deferredPrompt && (
            <div className="pt-4 mt-4 border-t border-slate-100 animate-fade-in">
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all duration-200"
              >
                <Download size={20} />
                <span className="font-bold">Install App</span>
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
              <span className="text-xs font-medium text-slate-600">
                {isOnline ? 'System Online' : 'System Offline'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              User: {currentUser.username}<br/>
              Role: <span className="capitalize">{currentUser.role}</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden relative ${!isOnline ? 'mt-6' : ''}`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-20 no-print">
          <h2 className="text-xl font-semibold text-slate-800">
            {currentPage === Page.DASHBOARD && 'Overview'}
            {currentPage === Page.INVENTORY && 'Inventory Control'}
            {currentPage === Page.POS && 'New Transaction'}
            {currentPage === Page.SALES && 'Sales Records'}
            {currentPage === Page.SUMMARY && 'Reports & Summary'}
            {currentPage === Page.AI_CONSULTANT && 'AI Assistant'}
            {currentPage === Page.ADMIN && 'Administration Panel'}
            {currentPage === Page.SYNC && 'System Synchronization'}
          </h2>
          
          <div className="relative">
             <button 
               onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
               className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/50 transition-colors focus:outline-none"
             >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{currentUser.role} Terminal</p>
                </div>
                <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-bold">
                  {currentUser.username[0].toUpperCase()}
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
             </button>

             {isUserMenuOpen && (
               <>
                 <div className="fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)} />
                 <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-40 animate-in fade-in zoom-in-95 duration-200">
                    <div className="sm:hidden px-4 py-2 border-b border-slate-100">
                       <p className="text-sm font-medium text-slate-800">{currentUser.name}</p>
                       <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-3 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                 </div>
               </>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto h-full">
            {currentPage === Page.DASHBOARD && <Dashboard />}
            {currentPage === Page.INVENTORY && <Inventory userRole={currentUser.role} />}
            {currentPage === Page.POS && <Pos />}
            {currentPage === Page.SALES && <Sales />}
            
            {/* Restricted Pages */}
            {currentPage === Page.SUMMARY && (
              isAdmin ? <Summary /> : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Lock size={48} className="mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-600">Access Restricted</h3>
                  <p>You do not have permission to view financial reports.</p>
                </div>
              )
            )}
            {currentPage === Page.AI_CONSULTANT && <AiConsultant />}
            {currentPage === Page.ADMIN && (
              isAdmin ? <Admin onLogout={handleLogout} /> : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Lock size={48} className="mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-600">Access Restricted</h3>
                  <p>You do not have permission to access administration.</p>
                </div>
              )
            )}
            {currentPage === Page.SYNC && <Sync />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;