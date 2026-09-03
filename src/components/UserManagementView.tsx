import React, { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, Key, CheckCircle, Mail, Trash2, X, LogIn, LogOut, UserCheck } from 'lucide-react';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  loginOperator,
  getCurrentOperator,
  logoutOperator,
  getAuthToken,
  UserRecord,
} from '../services/api';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Current logged in operator
  const [currentOperator, setCurrentOperator] = useState<any>(null);

  // Login Modal Form State
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('Admin@123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form State for Add Operator Modal
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'Surveillance Operator',
    email: '',
    shift: 'Day Shift (0600 - 1800)',
    assigned_sector: 'Gate Alpha & Checkpoint 1',
    status: 'on_duty' as 'active' | 'on_duty' | 'off_duty',
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetchUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load users from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentOperator = async () => {
    if (!getAuthToken()) {
      setCurrentOperator(null);
      return;
    }
    try {
      const res = await getCurrentOperator();
      if (res.success && res.user) {
        setCurrentOperator(res.user);
      } else {
        setCurrentOperator(null);
      }
    } catch {
      setCurrentOperator(null);
    }
  };

  useEffect(() => {
    loadUsers();
    loadCurrentOperator();
  }, []);

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await loginOperator(loginUsername, loginPassword);
      if (res.success && res.user) {
        setCurrentOperator(res.user);
        setIsLoginModalOpen(false);
        setToastMessage(`Logged in as ${res.user.name} [${res.user.role}]`);
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        setLoginError('Authentication failed: check username and password');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutOperator();
    setCurrentOperator(null);
    setToastMessage('Operator session terminated.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleDuty = async (user: UserRecord) => {
    const nextStatus = user.status === 'on_duty' ? 'off_duty' : 'on_duty';
    try {
      const res = await updateUser(user.id, { status: nextStatus });
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
        setToastMessage(`Duty status for ${user.name} changed to ${nextStatus.toUpperCase()}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove operator ${name}?`)) return;
    try {
      const res = await deleteUser(id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setToastMessage(`Operator ${name} removed from roster`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Please provide operator name and valid email');
      return;
    }

    try {
      const res = await createUser({
        name: formData.name.trim(),
        username: formData.username.trim() || formData.email.split('@')[0],
        password: formData.password || 'Operator@123',
        role: formData.role,
        email: formData.email.trim(),
        shift: formData.shift,
        assigned_sector: formData.assigned_sector,
        status: formData.status,
      });

      if (res.success && res.data) {
        setUsers((prev) => [...prev, res.data]);
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          username: '',
          password: '',
          role: 'Surveillance Operator',
          email: '',
          shift: 'Day Shift (0600 - 1800)',
          assigned_sector: 'Gate Alpha & Checkpoint 1',
          status: 'on_duty',
        });
        setToastMessage(`Operator ${res.data.name} registered and saved to SQLite!`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto" id="user-management-view-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#070d1f] border border-cyan-400 text-cyan-300 px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(76,215,246,0.3)] flex items-center gap-2.5 font-mono text-xs font-bold animate-in fade-in">
          <CheckCircle size={16} className="text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Operator Session Banner */}
      <div className="p-4 bg-gradient-to-r from-[#0b1324] via-[#101b33] to-[#0b1324] border border-cyan-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <UserCheck size={20} />
            </span>
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0e1629] ${currentOperator ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {currentOperator ? currentOperator.name : 'UNAUTHENTICATED DASHBOARD (OBSERVER MODE)'}
              </span>
              {currentOperator && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {currentOperator.role.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {currentOperator
                ? `Active Sector: ${currentOperator.assigned_sector || 'All Border Sectors'} • JWT Token: Verified`
                : 'Connecting as read-only telemetry observer. Log in with operator credentials to sign mutating commands.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentOperator ? (
            <>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-all cursor-pointer border border-slate-700"
              >
                <Key size={14} />
                <span>Switch Operator</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-mono font-semibold transition-all cursor-pointer border border-rose-800/40"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all cursor-pointer border border-cyan-400/40"
            >
              <LogIn size={15} />
              <span>Operator Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Users size={18} />
            </span>
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              PERSONNEL ROSTER &amp; ACCESS CONTROL // LIVE SQLITE
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Border guard duty shifts, command privileges, and patrol dispatch units ({users.length} registered operators)
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Add Operator</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && users.length === 0 && (
        <div className="p-12 text-center text-slate-400 font-mono text-xs">
          Loading personnel records from SQLite database...
        </div>
      )}

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 bg-[#101726] border border-[#1e293b] rounded-xl space-y-3 shadow-md hover:border-blue-500/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-700/40 flex items-center justify-center font-bold text-blue-400 font-mono text-sm">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{user.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">#{user.id}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-blue-400">{user.role}</span>
                    {user.username && (
                      <span className="text-[10px] font-mono text-cyan-400/70">@{user.username}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleDuty(user)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase cursor-pointer border transition-all ${
                    user.status === 'on_duty'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="Click to toggle duty status"
                >
                  {user.status === 'on_duty' ? '● ON DUTY' : 'STANDBY'}
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id, user.name)}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                  title="Delete operator record"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-300 font-mono pt-2 border-t border-[#1c273c]">
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-slate-500" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={12} className="text-amber-400" />
                <span>Sector: {user.assigned_sector}</span>
              </div>
              <div className="flex items-center gap-2">
                <Key size={12} className="text-emerald-400" />
                <span>Shift: {user.shift}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Operator Login Modal Dialog */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0b1324] border border-cyan-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl shadow-cyan-900/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-mono font-bold text-sm uppercase">
                <LogIn size={18} className="text-cyan-400" />
                <span>Operator Authentication // JWT</span>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/50 border border-rose-700/50 rounded-lg text-rose-300 text-xs font-mono">
                {loginError}
              </div>
            )}

            {/* Quick Demo Credentials helper chips */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                TACTICAL RBAC OPERATOR PRESETS:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Major Vikram Sen', user: 'admin', pass: 'Admin@123', role: 'Commander' },
                  { label: 'Rajesh Kumar', user: 'operator', pass: 'Operator@123', role: 'Operator' },
                  { label: 'Amit Patel', user: 'patrol', pass: 'Patrol@123', role: 'Patrol' },
                  { label: 'Dr. Ananya Sharma', user: 'analyst', pass: 'Analyst@123', role: 'Analyst' },
                ].map((demo) => (
                  <button
                    key={demo.user}
                    type="button"
                    onClick={() => {
                      setLoginUsername(demo.user);
                      setLoginPassword(demo.pass);
                    }}
                    className="p-2 text-left rounded-lg bg-slate-800/80 hover:bg-cyan-950 hover:border-cyan-500/50 border border-slate-700 transition-all text-slate-300 hover:text-cyan-200 cursor-pointer"
                  >
                    <div className="font-mono text-[11px] font-bold text-white truncate">{demo.label}</div>
                    <div className="font-mono text-[10px] text-cyan-400/80">
                      {demo.user} // {demo.role}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 block">USERNAME / EMAIL:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block">PASSWORD:</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all cursor-pointer shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-1.5"
                >
                  {loginLoading ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Operator Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0e1629] border border-cyan-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-mono font-bold text-sm uppercase">
                <UserPlus size={18} className="text-cyan-400" />
                <span>Register Surveillance Operator</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 block">FULL NAME &amp; RANK:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Captain Sandeep Gill"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 block">USERNAME:</label>
                  <input
                    type="text"
                    placeholder="e.g. sgill"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 block">PASSWORD:</label>
                  <input
                    type="password"
                    placeholder="Defaults: Operator@123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block">ROLE / DUTY POSITION:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                >
                  <option value="Commander">Commander</option>
                  <option value="Surveillance Operator">Surveillance Operator</option>
                  <option value="Patrol Officer">Patrol Officer</option>
                  <option value="AI Analyst">AI Analyst</option>
                  <option value="Quick Reaction Team (QRT)">Quick Reaction Team (QRT)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block">GOVERNMENT EMAIL:</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. s.gill@surveillance.seemadrishti.gov"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block">ASSIGNED SECTOR:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector Delta Trench & Ridge"
                  value={formData.assigned_sector}
                  onChange={(e) => setFormData({ ...formData, assigned_sector: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block">OPERATIONAL SHIFT:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Night Zero-Shift (2200 - 0600)"
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all cursor-pointer shadow-lg"
                >
                  Save to SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
