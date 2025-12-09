import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { User, StoreSettings, SystemMessage } from '../types';
import { Users, UserPlus, Shield, LogOut, Settings, Upload, Save, Store, KeyRound, AlertCircle, Check, Bell, XCircle, Trash2, Search } from 'lucide-react';

interface AdminProps {
  onLogout: () => void;
}

export const Admin: React.FC<AdminProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Message Search State
  const [messageSearch, setMessageSearch] = useState('');

  // User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'pharmacist'>('pharmacist');
  const [userMsg, setUserMsg] = useState('');

  // Password Reset Modal State
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Settings Form State
  const [settings, setSettings] = useState<StoreSettings>(db.getSettings());
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    refreshData();
    setCurrentUser(authService.getCurrentUser());
  }, []);

  const refreshData = () => {
    setUsers(authService.getUsers());
    setMessages(db.getMessages());
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newName) return;

    const success = authService.register({
      username: newUsername,
      passwordHash: newPassword,
      name: newName,
      role: newRole
    });

    if (success) {
      setUserMsg('User created successfully');
      refreshData();
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      
      db.addMessage({
        type: 'user',
        title: 'Admin User Created',
        content: `Admin created new user: ${newUsername} as ${newRole}`
      });
      refreshData(); // Refresh messages
    } else {
      setUserMsg('Username already exists');
    }
    setTimeout(() => setUserMsg(''), 3000);
  };

  const handleRoleChange = (userId: string, newRole: 'admin' | 'pharmacist') => {
    if (userId === 'admin_01' && newRole !== 'admin') {
      alert("Cannot demote the root admin.");
      return;
    }
    const user = users.find(u => u.id === userId);
    authService.updateUser(userId, { role: newRole });
    
    // Log activity
    db.addMessage({
      type: 'system',
      title: 'User Role Updated',
      content: `User @${user?.username} role was changed to ${newRole} by admin.`
    });
    
    refreshData();
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === 'admin_01') {
      alert("Cannot delete the root admin account.");
      return;
    }
    if (confirm(`Are you sure you want to delete user @${user.username}? This action cannot be undone.`)) {
      authService.deleteUser(user.id);
      
      // Log activity
      db.addMessage({
        type: 'security',
        title: 'User Deleted',
        content: `User @${user.username} was deleted by admin.`
      });

      refreshData();
    }
  };

  const openResetModal = (user: User) => {
    setResetModalUser(user);
    setResetNewPassword('');
  };

  const handlePasswordResetConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetModalUser && resetNewPassword) {
      authService.updateUser(resetModalUser.id, { 
        passwordHash: resetNewPassword,
        resetRequested: false // Clear the flag
      });
      
      // Update the associated message if it exists (by finding messages related to this user)
      const userMessages = messages.filter(m => m.relatedUserId === resetModalUser.username && m.type === 'security');
      userMessages.forEach(m => db.markMessageRead(m.id));

      // Log activity
      db.addMessage({
        type: 'security',
        title: 'Password Reset',
        content: `Password for user @${resetModalUser.username} was manually reset by admin.`
      });

      setResetModalUser(null);
      refreshData();
      alert(`Password for ${resetModalUser.username} updated successfully.`);
    }
  };

  const handleSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to save the new store configuration?")) {
      return;
    }

    db.saveSettings(settings);
    
    // Log activity
    db.addMessage({
      type: 'system',
      title: 'Store Settings Updated',
      content: `Store configuration updated by ${currentUser?.username}.`
    });

    refreshData(); // To show the new message
    setSettingsMsg('Store settings saved successfully');
    setTimeout(() => setSettingsMsg(''), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Message Actions
  const handleMessageAction = (msg: SystemMessage) => {
    db.markMessageRead(msg.id);
    refreshData();

    if (msg.type === 'security' && msg.relatedUserId) {
      // Find the user object
      const user = users.find(u => u.username === msg.relatedUserId);
      if (user) {
        openResetModal(user);
      } else {
        alert('User not found. They may have been deleted.');
      }
    }
  };

  const handleClearMessages = () => {
    if (confirm("Clear all messages?")) {
      db.clearMessages();
      refreshData();
    }
  };

  const handleDeleteMessage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    db.deleteMessage(id);
    refreshData();
  };

  const filteredMessages = messages.filter(m => 
    m.title.toLowerCase().includes(messageSearch.toLowerCase()) || 
    m.content.toLowerCase().includes(messageSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">System Administration</h2>
        <div className="flex items-center gap-2">
           <span className="text-sm text-slate-500">Logged in as {currentUser?.username}</span>
           <button 
             onClick={onLogout}
             className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
           >
             <LogOut size={16} /> Logout
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Message Board / Activity Log (Takes 1/3 space on large screens) */}
        <div className="xl:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-800">Activity Log</h3>
            </div>
            {messages.length > 0 && (
              <button onClick={handleClearMessages} className="text-xs text-slate-400 hover:text-red-500">
                Clear All
              </button>
            )}
          </div>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                <Bell size={48} className="opacity-20 mb-2" />
                <p>No matching messages.</p>
              </div>
            ) : (
              filteredMessages.map(msg => (
                <div 
                  key={msg.id} 
                  onClick={() => handleMessageAction(msg)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${
                    msg.read ? 'bg-slate-50 border-slate-100' : 'bg-white border-blue-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      {msg.type === 'security' && <AlertCircle size={14} className="text-red-500" />}
                      {msg.type === 'user' && <UserPlus size={14} className="text-blue-500" />}
                      {msg.type === 'system' && <Settings size={14} className="text-slate-500" />}
                      <span className={`text-xs font-bold ${msg.read ? 'text-slate-600' : 'text-slate-800'}`}>
                        {msg.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className={`text-xs ${msg.read ? 'text-slate-500' : 'text-slate-700'}`}>
                    {msg.content}
                  </p>
                  {!msg.read && <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-3 right-3"></div>}
                  
                  <button 
                    onClick={(e) => handleDeleteMessage(e, msg.id)}
                    className="absolute bottom-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: User Management & Settings (Takes 2/3 space) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* User List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-800">Authorized Users</h3>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-100 max-h-64 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-sm font-semibold text-slate-600">User Details</th>
                    <th className="p-3 text-sm font-semibold text-slate-600">Access Permission</th>
                    <th className="p-3 text-sm font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className={u.resetRequested ? "bg-amber-50" : ""}>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-800">{u.name}</span>
                          <span className="text-xs text-slate-500">@{u.username}</span>
                          {u.resetRequested && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mt-1">
                              <AlertCircle size={10} /> Password Reset Requested
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                          disabled={u.id === 'admin_01'}
                          className="text-xs p-1 border rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          <option value="pharmacist">Pharmacist</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => openResetModal(u)}
                             className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors flex items-center gap-1"
                           >
                             <KeyRound size={12} /> {u.resetRequested ? "Resolve" : "Reset"}
                           </button>
                           {u.id !== 'admin_01' && (
                             <button
                               onClick={() => handleDeleteUser(u)}
                               className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                               title="Delete User"
                             >
                               <Trash2 size={12} />
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Create User */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-800">Create New Account</h3>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <input 
                      required
                      type="text" 
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select 
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as any)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      <option value="pharmacist">Pharmacist</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input 
                    required
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Shield size={16} /> Create User
                </button>
                {userMsg && <p className="text-center text-sm text-emerald-600 font-medium">{userMsg}</p>}
              </form>
            </div>

            {/* Quick Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                 <Settings className="text-slate-600" />
                 <h3 className="text-lg font-semibold text-slate-800">Receipt Configuration</h3>
              </div>
              <form onSubmit={handleSettingsSave} className="space-y-4 flex-1 flex flex-col">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
                  <input 
                    required
                    type="text" 
                    value={settings.storeName}
                    onChange={e => setSettings({...settings, storeName: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                    <input 
                        type="text" 
                        value={settings.addressLine1}
                        onChange={e => setSettings({...settings, addressLine1: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="e.g. 123 Health Ave"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                    <input 
                        type="text" 
                        value={settings.addressLine2}
                        onChange={e => setSettings({...settings, addressLine2: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="e.g. Lagos, Nigeria"
                    />
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                  <input 
                    type="text" 
                    value={settings.contactNumber}
                    onChange={e => setSettings({...settings, contactNumber: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="e.g. +234 800 123 4567"
                  />
                </div>

                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Receipt Logo</label>
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                       {settings.logo ? <img src={settings.logo} className="w-full h-full object-contain" /> : <Upload size={16} className="text-slate-400" />}
                     </div>
                     <label className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs py-2 px-3 rounded-lg text-center transition-colors">
                       Change Logo
                       <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                     </label>
                  </div>
                </div>

                <div className="mt-auto pt-2">
                   <button 
                    type="submit"
                    className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Save Config
                  </button>
                  {settingsMsg && <p className="text-center text-sm text-emerald-600 font-medium mt-2">{settingsMsg}</p>}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Reset Password</h3>
              <p className="text-xs text-slate-500">For user: @{resetModalUser.username}</p>
            </div>
            <form onSubmit={handlePasswordResetConfirm} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input 
                  required
                  type="text" 
                  value={resetNewPassword}
                  onChange={e => setResetNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setResetModalUser(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!resetNewPassword}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};