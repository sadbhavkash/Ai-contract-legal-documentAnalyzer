import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { FileText, Plus, ArrowRight, ShieldCheck, Clock, FileSearch } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await api.get('/chats');
        setRecentChats(res.data.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch chats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user?.name.split(' ')[0]}</h1>
        <p className="text-slate-600">Select an existing analysis or upload a new contract to get started.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">New Contract Analysis</h2>
              <p className="text-sm text-slate-600 mb-6">Upload a PDF or DOCX file to extract key clauses, summarize obligations, and identify potential risks.</p>
              <button 
                onClick={() => navigate('/chat/new')}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-md font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Upload Contract
              </button>
            </div>
            <div className="hidden sm:flex w-24 h-24 bg-indigo-50 rounded-full items-center justify-center shrink-0">
              <FileSearch className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4 text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
            <span className="font-medium">Secure Workspace</span>
          </div>
          <p className="text-sm text-slate-600">Your documents are isolated and privately analyzed. No other users can access your contracts or history.</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Recent Analyses</h2>
        </div>
        
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white border border-slate-200 rounded-lg"></div>
            ))}
          </div>
        ) : recentChats.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl p-10 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-900 font-medium mb-1">No contracts analyzed yet</h3>
            <p className="text-sm text-slate-500 mb-4">Upload your first document to begin.</p>
            <button 
              onClick={() => navigate('/chat/new')}
              className="text-indigo-600 font-medium hover:text-indigo-700 text-sm inline-flex items-center gap-1"
            >
              Start new analysis <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <ul className="divide-y divide-slate-200">
              {recentChats.map((chat) => (
                <li key={chat.id}>
                  <button 
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{chat.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(chat.created_at).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
