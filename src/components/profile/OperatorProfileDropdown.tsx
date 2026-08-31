import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Shield,
  ChevronRight,
  Settings,
  Lock,
  LogOut,
  Bell,
  MessageSquare,
  MapPin,
  Clock,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSecurity } from '../../context/SecurityContext';

interface OperatorProfileDropdownProps {
  onOpenSettings?: () => void;
  onOpenAlerts?: () => void;
}

export const OperatorProfileDropdown: React.FC<OperatorProfileDropdownProps> = ({
  onOpenSettings,
  onOpenAlerts,
}) => {
  const { user, logout, setIsProfileModalOpen } = useAuth();
  const { isDaylight } = useTheme();
  const { lockNow } = useSecurity();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  // Custom clearance styling
  const roleBadges: Record<string, { label: string; ringColor: string; textColor: string }> = {
    Commander: { label: 'SUPREME COMMAND (LVL-4)', ringColor: '#10b981', textColor: 'text-emerald-400' },
    'Surveillance Operator': { label: 'OPERATOR (LVL-3)', ringColor: '#00f0ff', textColor: 'text-cyan-400' },
    'Patrol Officer': { label: 'PATROL LEAD (LVL-2)', ringColor: '#10b981', textColor: 'text-emerald-400' },
    'AI Analyst': { label: 'AI ANALYST (LVL-3)', ringColor: '#a855f7', textColor: 'text-purple-400' },
  };

  const badge = roleBadges[user.role] || {
    label: user.role.toUpperCase(),
    ringColor: '#00f0ff',
    textColor: 'text-cyan-400',
  };

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      {/* Top Header Trigger Button matching reference (Bell, Chat/Feedback, Avatar with green status ring) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Alerts Notification Bell */}
        <button
          type="button"
          onClick={onOpenAlerts}
          title="Tactical Threat Notifications"
          className={`p-2 rounded-full border transition-all cursor-pointer relative ${
            isDaylight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-black/50 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 border-slate-800'
          }`}
        >
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {/* Quick Intel Comms / Feedback */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Tactical Comms & Intelligence Feed"
          className={`p-2 rounded-full border transition-all cursor-pointer ${
            isDaylight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-black/50 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 border-slate-800'
          }`}
        >
          <MessageSquare size={16} />
        </button>

        {/* Profile Avatar Pill with Glowing Status Ring */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-0.5 rounded-full transition-transform active:scale-95 cursor-pointer flex items-center gap-2 group ${
            isOpen ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''
          }`}
        >
          <div className="relative">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-emerald-400 shadow-md bg-slate-800 flex items-center justify-center">
              <img
                src="/operator_avatar.jpg"
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <User size={18} className="text-slate-400" />
            </div>
            {/* Verified Green Tick Badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-black flex items-center justify-center shadow-xs">
              <Check size={9} className="text-black stroke-[3.5]" />
            </div>
          </div>
        </button>
      </div>

      {/* DROPDOWN MENU CARD (Matching Reference Design, Upper Right Corner) */}
      {isOpen && (
        <div
          className={`absolute right-0 top-12 sm:top-14 w-80 sm:w-88 rounded-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
            isDaylight
              ? 'bg-white border-slate-200 text-slate-800'
              : 'bg-[#0a0f1d] border-slate-800 text-slate-100 backdrop-blur-xl'
          }`}
        >
          {/* Top Section: Large Avatar, Full Name, Email, and 'Edit Profile >' Button */}
          <div className="p-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              {/* Profile Avatar with Circular Green Border */}
              <div className="relative shrink-0">
                <div className="w-18 h-18 rounded-full border-3 border-emerald-400 p-0.5 shadow-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img
                    src="/operator_avatar.jpg"
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <User size={30} className="text-slate-400" />
                </div>
                {/* Verified Green Badge */}
                <div className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm">
                  <Check size={11} className="text-black stroke-[3.5]" />
                </div>
              </div>

              {/* Edit Profile Button */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isDaylight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                }`}
              >
                <span>Edit Profile</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Name & Email Details */}
            <div className="mt-3">
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5 leading-snug">
                <span>{user.name}</span>
              </h3>
              <p className="text-xs text-slate-400 font-sans truncate">{user.email}</p>
            </div>
          </div>

          <div className="h-[1px] bg-slate-800/80 w-full" />

          {/* Quick Menu Options (Matching Layout from Reference) */}
          <div className="p-2 space-y-0.5 text-xs font-bold">
            {/* 1. Sector Clearance Info */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 text-slate-300 transition-colors">
              <MapPin size={16} className="text-cyan-400 shrink-0" />
              <div className="flex-1 truncate">
                <span className="text-slate-400 block text-[10px]">ASSIGNED SECTOR</span>
                <span className="text-white text-xs truncate block">{user.assigned_sector}</span>
              </div>
            </div>

            {/* 2. Operational Shift */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 text-slate-300 transition-colors">
              <Clock size={16} className="text-emerald-400 shrink-0" />
              <div className="flex-1 truncate">
                <span className="text-slate-400 block text-[10px]">CURRENT SHIFT</span>
                <span className="text-white text-xs truncate block">{user.shift}</span>
              </div>
            </div>

            {/* 3. Settings & Appearance */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenSettings) onOpenSettings();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
            >
              <Settings size={16} className="text-slate-400 shrink-0" />
              <span>Settings & Appearance</span>
            </button>

            {/* 4. Terminal Device Protection / PIN Lock */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                lockNow();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
            >
              <Lock size={16} className="text-amber-400 shrink-0" />
              <span>Lock Terminal Screen</span>
            </button>
          </div>

          <div className="h-[1px] bg-slate-800/80 w-full" />

          {/* Bottom Logout Button (Styled red/orange as in reference) */}
          <div className="p-2">
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-xs font-black uppercase tracking-wider text-left"
            >
              <LogOut size={16} className="shrink-0 text-rose-500" />
              <span>Logout & Terminate</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
