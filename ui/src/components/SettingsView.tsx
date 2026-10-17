import { RoomCondition } from './RoomCondition';
import { roomStatusKey, statusStyle } from '../lib/status-palette';
import { RoomStatus as RoomState } from '../lib/statuses.generated';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Plus,
  Trash2,
  Monitor,
  Wind,
  Coffee,
  Wifi,
  Lock,
  Wind as HairDryer,
  Sun,
  Waves,
  X,
  PlusCircle,
  LayoutGrid,
  Box,
  CheckCircle2,
  ListRestart,
  Edit,
  UserPlus,
  Users,
  Shield,
  Phone,
  Mail,
  User
} from 'lucide-react';
import { Room, RoomStatus, InventoryItem } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface SettingsViewProps {
  rooms: Room[];
  inventory: InventoryItem[];
  allFeatures: string[];
  onAddRoom: (room: Room) => void;
  onUpdateRoom: (room: Room) => void;
  onDeleteRoom: (id: string) => void;
  onUpdateInventory: (items: InventoryItem[]) => void;
  initialTab?: 'rooms' | 'inventory';
}

const ALL_FEATURES = [
  { id: 'tv', label: 'TV', icon: <Monitor className="w-4 h-4" /> },
  { id: 'ac', label: 'Klima', icon: <Wind className="w-4 h-4" /> },
  { id: 'minibar', label: 'Minibar', icon: <Coffee className="w-4 h-4" /> },
  { id: 'wifi', label: 'WiFi', icon: <Wifi className="w-4 h-4" /> },
  { id: 'safe', label: 'Kasa', icon: <Lock className="w-4 h-4" /> },
  { id: 'hairdryer', label: 'Saç Kurutma', icon: <HairDryer className="w-4 h-4" /> },
  { id: 'balcony', label: 'Balkon', icon: <Sun className="w-4 h-4" /> },
  { id: 'view', label: 'Deniz Manzaralı', icon: <Waves className="w-4 h-4" /> },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  rooms,
  inventory,
  allFeatures,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onUpdateInventory,
  initialTab = 'rooms'
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'inventory'>(initialTab as any);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    number: '',
    type: '1+1',
    status: RoomState.Clean,
    features: [],
    inventoryIds: [],
    imageUrls: [],
    description: ''
  });

  const [newItemName, setNewItemName] = useState('');

  const handleStartEdit = (room: Room) => {
    setNewRoom({
      number: room.number,
      type: room.type,
      status: room.status,
      features: room.features || [],
      inventoryIds: room.inventoryIds || [],
      imageUrls: room.imageUrls || [],
      description: room.description || ''
    });
    setEditingRoomId(room.id);
    setIsAdding(true);
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.number) return;

    if (editingRoomId) {
      const room: Room = {
        ...rooms.find(r => r.id === editingRoomId)!,
        number: newRoom.number,
        status: newRoom.status as RoomStatus,
        type: newRoom.type || '1+1',
        features: newRoom.features || [],
        inventoryIds: newRoom.inventoryIds || [],
        imageUrls: newRoom.imageUrls || [],
        description: newRoom.description || ''
      };
      onUpdateRoom(room);
    } else {
      const room: Room = {
        id: Math.random().toString(36).substr(2, 9),
        number: newRoom.number,
        name: '',
        status: newRoom.status as RoomStatus,
        type: newRoom.type || '1+1',
        features: newRoom.features || [],
        inventoryIds: newRoom.inventoryIds || [],
        imageUrls: newRoom.imageUrls || [],
        description: newRoom.description || ''
      };
      onAddRoom(room);
    }

    setIsAdding(false);
    setEditingRoomId(null);
    setNewRoom({ number: '', type: '1+1', status: RoomState.Clean, features: [], inventoryIds: [], imageUrls: [], description: '' });
  };

  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: newItemName.trim()
    };
    onUpdateInventory([...inventory, newItem]);
    setNewItemName('');
  };

  const removeInventory = (id: string) => {
    onUpdateInventory(inventory.filter(i => i.id !== id));
  };

  const toggleFeature = (featureId: string) => {
    setNewRoom(prev => ({
      ...prev,
      features: prev.features?.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...(prev.features || []), featureId]
    }));
  };

  const toggleInventory = (id: string) => {
    setNewRoom(prev => ({
      ...prev,
      inventoryIds: prev.inventoryIds?.includes(id)
        ? prev.inventoryIds.filter(f => f !== id)
        : [...(prev.inventoryIds || []), id]
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Navigation Tabs */}
        <div className="uni-card flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`uni-control px-6 py-2.5 rounded-xl text-xs     ${
              activeTab === 'rooms' ? 'uni-button-primary text-white  shadow-brand-blue-100' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Oda Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`uni-control px-6 py-2.5 rounded-xl text-xs     ${
              activeTab === 'inventory' ? 'uni-button-primary text-white  shadow-brand-blue-100' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Demirbaş Tanımları
          </button>
        </div>

        {activeTab === 'rooms' ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Oda Listesi</h2>
                <p className="text-sm text-slate-400 font-medium italic mt-1">Odaları ve oda bazlı demirbaşları yönetin.</p>
              </div>
              <motion.button
                onClick={() => setIsAdding(true)}
                className="uni-control flex items-center gap-2 px-6 py-3 uni-button-primary text-white rounded-2xl text-xs     shadow-brand-blue-100       cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Yeni Oda Ekle
              </motion.button>
            </div>

            <AnimatePresence>
              {isAdding && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="uni-card bg-white border-2 border-brand-blue-100 rounded-[32px] p-8 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                      {editingRoomId ? `ODA #${newRoom.number} GÜNCELLE` : 'YENİ ODA KAYDI'}
                    </h3>
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setEditingRoomId(null);
                        setNewRoom({ number: '', type: '1+1', status: RoomState.Clean, features: [], inventoryIds: [], imageUrls: [] });
                      }}
                      className="uni-control p-2 text-slate-400 hover:bg-slate-50 rounded-xl"
                    >
                      <X />
                    </button>
                  </div>

                  <form onSubmit={handleAddRoom} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ODA NUMARASI</label>
                          <input
                            required
                            value={newRoom.number}
                            onChange={e => setNewRoom(prev => ({ ...prev, number: e.target.value }))}
                            className="uni-input w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black outline-none focus:border-neutral-400 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TİP</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['1+0', '1+1', '2+1', 'Suit', 'Kral'].map(t => (
                              <button key={t} type="button" onClick={() => setNewRoom(prev => ({ ...prev, type: t }))} className={`uni-control py-3 rounded-xl text-[10px]   border ${newRoom.type === t ? 'uni-button-primary text-white' : 'text-slate-400 border-slate-200'}`}>{t}</button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DURUM</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([RoomState.Vacant, RoomState.Clean, RoomState.Dirty, RoomState.OutOfOrder] as RoomStatus[]).map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setNewRoom(prev => ({ ...prev, status: s }))}
                                aria-pressed={newRoom.status === s}
                                style={newRoom.status === s ? statusStyle(roomStatusKey(s)) : undefined}
                                className="uni-control py-2 rounded-lg text-[9px] border border-slate-200"
                              >
                                <RoomCondition status={s}/>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            ODA GÖRSEL YÖNETİMİ
                            <span className="text-[8px] italic normal-case text-slate-300 font-medium">URL girip Enter'a basın</span>
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                             {newRoom.imageUrls?.map((url, idx) => (
                               <div key={idx} className="relative group aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                                  <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => setNewRoom(prev => ({ ...prev, imageUrls: prev.imageUrls?.filter((_, i) => i !== idx) }))}
                                    className="uni-control absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-5 h-5 text-white" />
                                  </button>
                               </div>
                             ))}
                             {newRoom.imageUrls && newRoom.imageUrls.length < 6 && (
                               <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center relative">
                                  <PlusCircle className="w-6 h-6 text-slate-200" />
                                  <input
                                    type="text"
                                    placeholder="Link..."
                                    className="uni-input absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = (e.target as HTMLInputElement).value;
                                        if (val) {
                                          setNewRoom(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), val] }));
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }
                                    }}
                                  />
                               </div>
                             )}
                          </div>
                        </div>
                              <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            ÖZELLİKLER VE DEMİRBAŞLAR
                            <span className="text-[8px] italic normal-case text-slate-300 font-medium">Merkezi listeden seçim yapın</span>
                          </label>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 no-scrollbar">
                            {/* Standard Features */}
                            {(allFeatures || []).map(f => (
                              <button
                                key={`feat-${f}`}
                                type="button"
                                onClick={() => {
                                  setNewRoom(prev => ({
                                    ...prev,
                                    features: prev.features?.includes(f)
                                      ? prev.features.filter(x => x !== f)
                                      : [...(prev.features || []), f]
                                  }));
                                }}
                                className={`uni-control px-3 py-2.5 rounded-xl border text-[9px]   tracking-tight  text-left truncate flex items-center justify-between group ${
                                  newRoom.features?.includes(f)
                                    ? 'uni-button-primary border-brand-blue-600 text-white '
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-brand-blue-200'
                                }`}
                                title={f}
                              >
                                {f}
                                {newRoom.features?.includes(f) && <CheckCircle2 className="w-3 h-3" />}
                              </button>
                            ))}

                            {/* Inventory Items */}
                            {inventory.map(item => (
                              <button
                                key={`inv-${item.id}`}
                                type="button"
                                onClick={() => toggleInventory(item.id)}
                                className={`uni-control px-3 py-2.5 rounded-xl border text-[9px]   tracking-tight  text-left truncate flex items-center justify-between group ${
                                  newRoom.inventoryIds?.includes(item.id)
                                    ? 'bg-brand-blue-500 border-brand-blue-500 text-white '
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-brand-blue-200'
                                }`}
                                title={item.name}
                              >
                                {item.name}
                                {newRoom.inventoryIds?.includes(item.id) && <Box className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ODA AÇIKLAMASI</label>
                          <textarea
                            value={newRoom.description}
                            onChange={e => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Oda hakkında kısa bilgi, manzara durumu vb..."
                            className="uni-input w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-neutral-400 transition-all min-h-[80px] resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(false);
                          setEditingRoomId(null);
                        }}
                        className="uni-control px-6 py-3 text-slate-400 font-bold  text-[10px]"
                      >
                        İPTAL
                      </button>
                      <button type="submit" className="uni-control px-10 py-3 uni-button-primary text-white rounded-2xl   text-[10px] ">
                        {editingRoomId ? 'GÜNCELLE' : 'ODA EKLE'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map(room => (
                <div key={room.id} className="uni-card bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm group hover:border-brand-blue-200 transition-all">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden group/thumb">
                        {room.imageUrls && room.imageUrls.length > 0 ? (
                          <>
                            <img src={room.imageUrls[0]} alt={room.number} className="w-full h-full object-cover" />
                            {room.imageUrls.length > 1 && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-black text-white">
                                +{room.imageUrls.length - 1}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-black text-slate-800 bg-slate-100">
                             {room.number}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase">ODA {room.number}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{room.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(room)}
                        className="uni-control p-2 text-slate-300 hover:text-brand-blue-600   "
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setRoomToDelete(room);
                        }}
                        className="uni-control p-2 text-red-100 hover:text-red-500   "
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                       <Box className="w-3 h-3 text-brand-blue-600" />
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Odaya Ait Demirbaşlar</span>
                    </div>
                    {room.description && (
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic line-clamp-2">
                        {room.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {room.inventoryIds && room.inventoryIds.length > 0 ? room.inventoryIds.map(invId => (
                        <span key={invId} className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-bold border border-slate-100">
                          {inventory.find(i => i.id === invId)?.name || 'Tanımsız'}
                        </span>
                      )) : (
                        <span className="text-[9px] text-slate-300 italic font-medium">Demirbaş atanmamış</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'inventory' ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Demirbaş Tanımları</h2>
              <p className="text-sm text-slate-400 font-medium italic mt-1">Otelinizdeki standart demirbaş tiplerini belirleyin.</p>
            </div>

            <div className="uni-card bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
              <form onSubmit={handleAddInventory} className="flex gap-4 mb-8">
                <div className="flex-1">
                  <input
                    placeholder="Yeni demirbaş adı... (Örn: Klima)"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="uni-input w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-neutral-400 transition-all"
                  />
                </div>
                <button type="submit" className="uni-control px-8 py-4 uni-button-primary text-white rounded-2xl   text-[10px]  shadow-brand-blue-100">EKLE</button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {inventory.map(item => (
                  <motion.div
                    layout
                    key={item.id}
                    className="uni-card flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:bg-white hover:border-brand-blue-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-blue-600 shadow-sm border border-slate-50"><Box className="w-4 h-4" /></div>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.name}</span>
                    </div>
                    <button onClick={() => removeInventory(item.id)} className="uni-control p-2 text-slate-300 hover:text-red-500   "><X className="w-4 h-4" /></button>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-brand-blue-50/50 p-6 rounded-3xl border border-brand-blue-100">
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0"><ListRestart className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-xs font-black text-brand-blue-700 uppercase tracking-widest mb-1">NASIL ÇALIŞIR?</h4>
                    <p className="text-[11px] text-brand-blue-600/80 font-medium leading-relaxed italic">
                      Burada tanımladığınız demirbaşlar, oda eklerken veya düzenlerken seçim listesinde otomatik olarak görünecektir. Bu sayede her oda için tekrar tekrar isim yazmanıza gerek kalmaz.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        ) : null}
      </div>

      {roomToDelete && (
        <ConfirmDialog
          isOpen={!!roomToDelete}
          onClose={() => setRoomToDelete(null)}
          onConfirm={() => onDeleteRoom(roomToDelete.id)}
          title="Odayı Sil"
          message={`${roomToDelete.number} nolu odayı ve odaya ait olan tüm kayıtları sistemden silmek istediğinize emin misiniz?`}
          confirmText="Sil"
          cancelText="Vazgeç"
          type="danger"
        />
      )}
    </div>
  );
};
