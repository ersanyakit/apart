import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Smile, Paperclip, MoreVertical, Search, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

const MOCK_MESSAGES: Message[] = [
  { id: '1', sender: 'Resepsiyon', text: 'Merhaba, 301 nolu oda için temizlik talebi geldi mi?', time: '10:30', isMe: false },
  { id: '2', sender: 'Kat Şefi Ayşe', text: 'Evet, listeye ekledim. 15 dakika içinde başlanacak.', time: '10:32', isMe: true },
  { id: '3', sender: 'Resepsiyon', text: 'Teşekkürler, misafir lobide bekliyor. Bilginize.', time: '10:35', isMe: false },
  { id: '4', sender: 'Teknik Servis Murat', text: '204 nolu odadaki klima sorunu giderildi.', time: '11:05', isMe: false },
];

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'Siz',
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };
    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6">
      {/* Channels / Users List */}
      <div className="w-80 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Sohbet ara..."
              className="uni-input w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          <ChatItem label="Genel Sohbet" sub="Herkes burada" active />
          <ChatItem label="Resepsiyon" sub="Oda giriş/çıkış" />
          <ChatItem label="Temizlik Ekibi" sub="Sıradaki odalar" />
          <ChatItem label="Teknik Servis" sub="Arıza bildirimleri" />
          <ChatItem label="Yönetim" sub="Duyurular" />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-blue-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-blue-100">
               GS
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Genel Sohbet</h3>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Çevrimiçi (12 Kişi)</p>
            </div>
          </div>
          <button className="uni-control p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] group`}>
                  {!msg.isMe && <p className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1">{msg.sender}</p>}
                  <div className={`
                    px-4 py-3 rounded-2xl shadow-sm text-sm relative
                    ${msg.isMe ? 'bg-brand-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'}
                  `}>
                    {msg.text}
                    <div className={`flex items-center gap-1 mt-1 text-[9px] ${msg.isMe ? 'text-brand-blue-200' : 'text-slate-400'}`}>
                      {msg.time}
                      {msg.isMe && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
          <div className="uni-card bg-white p-2 rounded-2xl shadow-lg shadow-slate-200/50 flex items-center gap-2 border border-slate-200">
             <button className="uni-control p-2 text-slate-400 hover:text-brand-blue-600   ">
                <Paperclip className="w-5 h-5" />
             </button>
             <input
                type="text"
                placeholder="Mesajınızı yazın..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="uni-input flex-1 bg-transparent px-2 text-sm focus:outline-none"
             />
             <button className="uni-control p-2 text-slate-400 hover:text-brand-blue-600   ">
                <Smile className="w-5 h-5" />
             </button>
             <button
                onClick={handleSend}
                className="uni-control uni-button-primary text-white p-2.5 rounded-xl       shadow-brand-blue-100  cursor-pointer"
             >
                <Send className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatItem = ({ label, sub, active = false }: { label: string, sub: string, active?: boolean }) => (
  <button className={`uni-control
    w-full flex items-center gap-3 p-3 rounded-2xl  group
    ${active ? 'bg-brand-blue-50' : 'hover:bg-slate-50'}
  `}>
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ring-4 ring-white shadow-sm ${active ? 'bg-brand-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
       {label.substring(0, 2).toUpperCase()}
    </div>
    <div className="text-left overflow-hidden">
      <p className={`text-xs font-black truncate ${active ? 'text-brand-blue-800' : 'text-slate-700'}`}>{label}</p>
      <p className="text-[10px] text-slate-400 font-medium truncate">{sub}</p>
    </div>
    {active && <div className="ml-auto w-1.5 h-1.5 bg-brand-blue-500 rounded-full"></div>}
  </button>
);
