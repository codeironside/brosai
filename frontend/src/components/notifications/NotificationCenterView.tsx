import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Mail, MessageCircle, Bell, Send, Smartphone, ShieldCheck, CheckCheck } from 'lucide-react';

export const NotificationCenterView: React.FC = () => {
  const { notifications, setNotifications, addLog } = useApp();
  const [whatsappChat, setWhatsappChat] = useState([
    { id: 1, sender: 'ai', text: 'Good evening Jeremiah. Your AI Social Manager daily report is ready. Today I published 4 posts and identified 2 potential leads. Reply "DETAILS" for summary.', time: '06:00 PM' }
  ]);
  const [waInput, setWaInput] = useState('');

  const handleWaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waInput.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: waInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setWhatsappChat(prev => [...prev, userMsg]);
    setWaInput('');

    setTimeout(() => {
      setWhatsappChat(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: '📊 Daily Summary: 4 Posts Published, 12 Scheduled, 2 Qualified Leads.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      addLog('AI Social Manager', 'WHATSAPP_COMMAND', `Processed WhatsApp input: "${waInput}"`, 'success');
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <Mail className="w-4 h-4 text-brand-400" />
            <span>Multi-Channel Outreach & Alerts</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            WhatsApp, Email & In-App Reporting System
          </h1>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Official WhatsApp Business API Verified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Bell className="w-4 h-4 text-brand-400" />
            <span>Preferences & Triggers</span>
          </h2>
          <div className="bg-slate-950 p-3.5 rounded-xl space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between"><span>Email Digest Reports</span><input type="checkbox" defaultChecked /></div>
            <div className="flex items-center justify-between"><span>WhatsApp Business AI Alerts</span><input type="checkbox" defaultChecked /></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
            <Smartphone className="w-4 h-4" />
            <span>Live WhatsApp Assistant Simulator</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl h-64 overflow-y-auto space-y-2 text-xs">
            {whatsappChat.map(msg => (
              <div key={msg.id} className={`p-2.5 rounded-xl max-w-[85%] ${msg.sender === 'user' ? 'bg-emerald-600 text-white ml-auto' : 'bg-slate-800 text-slate-200'}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleWaSubmit} className="flex space-x-2">
            <input type="text" value={waInput} onChange={(e) => setWaInput(e.target.value)} placeholder="Text WhatsApp commands..." className="flex-1 bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white rounded-xl" />
            <button type="submit" className="p-2 bg-emerald-600 rounded-xl text-white"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      </div>
    </div>
  );
};
