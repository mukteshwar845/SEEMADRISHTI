import React, { useState } from 'react';
import {
  User,
  Shield,
  Clock,
  MapPin,
  Mail,
  Key,
  Save,
  CheckCircle,
  AlertCircle,
  X,
  Lock,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const ProfileModal: React.FC = () => {
  const { user, updateProfile, isProfileModalOpen, setIsProfileModalOpen, logout } = useAuth();
  const { isDaylight } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [shift, setShift] = useState(user?.shift || 'Day Shift (0600 - 1800)');
  const [assignedSector, setAssignedSector] = useState(user?.assigned_sector || 'Sector Alpha - Main Gate');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isProfileModalOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword && newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        name,
        email,
        shift,
        assigned_sector: assignedSector,
        password: newPassword ? newPassword : undefined,
      });
      setSuccessMsg('Operator credentials and sector profile updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleClearanceBadges: Record<string, { label: string; color: string; border: string; bg: string }> = {
    Commander: { label: 'LVL-4 SUPREME COMMAND', color: 'text-pink-400', border: 'border-pink-500/40', bg: 'bg-pink-950/40' },
    'Surveillance Operator': { label: 'LVL-3 TACTICAL OPERATOR', color: 'text-cyan-400', border: 'border-cyan-500/40', bg: 'bg-cyan-950/40' },
    'Patrol Officer': { label: 'LVL-2 RAPID PATROL', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-950/40' },
    'AI Analyst': { label: 'LVL-3 NEURAL ANALYST', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-950/40' },
  };

  const badge = roleClearanceBadges[user.role] || {
    label: `CLEARANCE: ${user.role.toUpperCase()}`,
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/40',
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono text-slate-200">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] ${
          isDaylight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#080d1a] border-cyan-500/40 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                Operator Profile Setup
              </h2>
              <p className="text-xs text-slate-400">
                Manage operational clearance, assigned sector, and security credentials
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Identity & Clearance Tag */}
          <div className="p-4 rounded-xl bg-black/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                AUTHENTICATED OPERATOR ID
              </span>
              <span className="text-sm font-black text-white font-mono">{user.username}</span>
              <span className="text-[10px] text-slate-500 block font-mono">
                SYS-ID: {user.id} &bull; ACTIVE STATUS: {user.status.toUpperCase()}
              </span>
            </div>

            <div className={`px-3 py-1.5 rounded-lg border text-xs font-black font-mono flex items-center gap-1.5 ${badge.bg} ${badge.border} ${badge.color}`}>
              <Shield size={14} />
              <span>{badge.label}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-cyan-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-cyan-400 text-white text-xs outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-cyan-400" />
                <span>Gov / Department Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-cyan-400 text-white text-xs outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-cyan-400" />
                <span>Assigned Border Sector</span>
              </label>
              <select
                value={assignedSector}
                onChange={(e) => setAssignedSector(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-cyan-400 text-white text-xs outline-none transition-colors font-mono"
              >
                <option value="All Border Sectors (HQ)">All Border Sectors (HQ)</option>
                <option value="Sector Alpha - Main Gate">Sector Alpha - Main Gate</option>
                <option value="Sector Bravo - Exclusion Fence">Sector Bravo - Exclusion Fence</option>
                <option value="Sector Charlie - Vehicle Checkpoint">Sector Charlie - Vehicle Checkpoint</option>
                <option value="Sector Delta - Tactical Outpost 4">Sector Delta - Tactical Outpost 4</option>
                <option value="Sector Echo - Dense Forest Canopy">Sector Echo - Dense Forest Canopy</option>
                <option value="Sector Foxtrot - Mountain Ridge Pass">Sector Foxtrot - Mountain Ridge Pass</option>
                <option value="Sector Golf - Desert Perimeter">Sector Golf - Desert Perimeter</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-cyan-400" />
                <span>Active Shift</span>
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-cyan-400 text-white text-xs outline-none transition-colors font-mono"
              >
                <option value="Day Shift (0600 - 1800)">Day Shift (0600 - 1800)</option>
                <option value="Night Shift (1800 - 0600)">Night Shift (1800 - 0600)</option>
                <option value="24/7 Command Standby">24/7 Command Standby</option>
              </select>
            </div>
          </div>

          {/* Change Security Password */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key size={13} className="text-cyan-400" />
              <span>Update Passphrase / Password (Optional)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-cyan-400 text-white text-xs outline-none transition-colors font-mono"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-cyan-400 text-white text-xs outline-none transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={async () => {
                setIsProfileModalOpen(false);
                await logout();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/40 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Logout & Terminate</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                <span>{isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
