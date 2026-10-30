import React, { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import { FileText, Plus, LogOut, MessageSquare, Shield, Menu, X } from 'lucide-react';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const [chats, setChats] = useState([]);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await api.get('/chats');
        setChats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchChats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navClasses = "flex flex-col w-64 bg-slate-900 text-slate-300 h-full border-r border-slate-800 transition-transform duration-200 ease-in-out";
  const mobileClasses = mobileOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 z-30 md:relative md:translate-x-0 ${navClasses} ${mobileClasses}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <Link 
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 text-white font-semibold text-lg cursor-pointer hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            <Shield className="w-6 h-6 text-indigo-500" />
            <span>LegalAnalyzer</span>
          </Link>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <NavLink 
            to="/chat/new"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Analysis
          </NavLink>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            Recent Documents
          </div>
          {chats.length === 0 ? (
            <div className="text-sm text-slate-500 px-3 py-2 italic">No chats yet.</div>
          ) : (
            chats.map(chat => (
              <NavLink
                key={chat.id}
                to={`/chat/${chat.id}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive 
                      ? "bg-slate-800 text-white" 
                      : "hover:bg-slate-800/50 hover:text-slate-100"
                  }`
                }
              >
                <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate">{chat.title}</span>
              </NavLink>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-white shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-sm">
                <p className="text-white truncate font-medium">{user?.name}</p>
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-800 shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
