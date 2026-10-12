import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Trash2,
  Lock,
  ListRestart,
  Edit,
  UserPlus,
  Users,
  Shield,
  Phone,
  Mail,
  User,
  X,
  Box
} from 'lucide-react';
import { Staff, StaffRole, StaffPermissions } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

const PERMISSION_LABELS = [
  { key: 'manageRooms', label: 'Oda Yönetimi', icon: <Building2 className="w-4 h-4" /> },
  { key: 'manageInventory', label: 'Demirbaş Yönetimi', icon: <Box className="w-4 h-4" /> },
  { key: 'manageStaff', label: 'Personel Yönetimi', icon: <Users className="w-4 h-4" /> },
  { key: 'manageHotel', label: 'Tesis Ayarları', icon: <Shield className="w-4 h-4" /> },
  { key: 'manageBlacklist', label: 'Kara Liste', icon: <Lock className="w-4 h-4" /> },
  { key: 'viewLogs', label: 'Sistem Logları', icon: <ListRestart className="w-4 h-4" /> },
  { key: 'manageGuests', label: 'Misafir İşlemleri', icon: <User className="w-4 h-4" /> },
];

const INITIAL_PERMISSIONS: StaffPermissions = {
  manageRooms: false,
  manageInventory: false,
  manageStaff: false,
  manageHotel: false,
  manageBlacklist: false,
  viewLogs: false,
  manageGuests: false
};

interface StaffSettingsViewProps {
  staff: Staff[];
  onUpdateStaff: (items: Staff[]) => void;
}

export const StaffSettingsView: React.FC<StaffSettingsViewProps> = ({
  staff = [],
  onUpdateStaff
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

  const [newStaff, setNewStaff] = useState<Partial<Staff>>({
    name: '',
    role: 'Resepsiyon',
    phone: '',
    email: '',
    username: '',
    status: 'Aktif',
    permissions: INITIAL_PERMISSIONS
  });

  const handleStartStaffEdit = (s: Staff) => {
    setNewStaff({ ...s });
    setEditingStaffId(s.id);
    setIsAdding(true);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.username) return;

    if (editingStaffId) {
      onUpdateStaff(staff.map(s => s.id === editingStaffId ? { ...s, ...newStaff } as Staff : s));
    } else {
      const s: Staff = {
        id: `staff-${Date.now()}`,
        name: newStaff.name || '',
        role: newStaff.role as StaffRole || 'Resepsiyon',
        phone: newStaff.phone || '',
        email: newStaff.email || '',
        username: newStaff.username || '',
        status: newStaff.status as 'Aktif' | 'Pasif' || 'Aktif',
        permissions: (newStaff.permissions || INITIAL_PERMISSIONS) as StaffPermissions
      };
      onUpdateStaff([...staff, s]);
    }

    setIsAdding(false);
    setEditingStaffId(null);
    setNewStaff({ name: '', role: 'Resepsiyon', phone: '', email: '', username: '', status: 'Aktif', permissions: INITIAL_PERMISSIONS });
  };

  const removeStaff = (id: string) => {
    onUpdateStaff(staff.filter(s => s.id !== id));
  };

  const togglePermission = (key: keyof StaffPermissions) => {
    setNewStaff(prev => ({
      ...prev,
      permissions: {
        ...(prev.permissions || INITIAL_PERMISSIONS),
        [key]: !prev.permissions?.[key]
      } as StaffPermissions
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Personel Yönetimi</h2>
            <p className="text-sm text-slate-400 font-medium italic mt-1">Sisteme erişimi olan personeli ve rollerini yönetin.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditingStaffId(null);
              setNewStaff({ name: '', role: 'Resepsiyon', phone: '', email: '', username: '', status: 'Aktif', permissions: INITIAL_PERMISSIONS });
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-brand-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-blue-100"
          >
            <UserPlus className="w-4 h-4" />
            Yeni Personel Ekle
          </motion.button>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white border-2 border-brand-blue-100 rounded-[32px] p-8 shadow-2xl"
            >
               <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                  {editingStaffId ? 'PERSONEL GÜNCELLE' : 'YENİ PERSONEL KAYDI'}
                </h3>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingStaffId(null);
                  }}
                  className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"
                >
                  <X />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PERSONEL ADI SOYADI</label>
                    <input
                      required
                      value={newStaff.name}
                      onChange={e => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SİSTEM KULLANICI ADI</label>
                    <input
                      required
                      value={newStaff.username}
                      onChange={e => setNewStaff(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ROL / YETKİ SEÇİMİ</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(['Yönetici', 'Resepsiyon', 'Muhasebe', 'Kat Hizmetleri', 'Teknik Servis'] as StaffRole[]).map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setNewStaff(prev => ({ ...prev, role }))}
                          className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${
                            newStaff.role === role
                              ? 'bg-brand-blue-600 border-brand-blue-600 text-white shadow-lg shadow-brand-blue-100'
                              : 'bg-white border-slate-200 text-slate-400 hover:border-brand-blue-200 hover:text-slate-600'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SİSTEM YETKİLERİ</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {PERMISSION_LABELS.map(({ key, label, icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePermission(key as keyof StaffPermissions)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                            newStaff.permissions?.[key as keyof StaffPermissions]
                              ? 'bg-brand-blue-50 border-brand-blue-200 shadow-sm'
                              : 'bg-white border-slate-100'
                          }`}
                        >
                           <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                             newStaff.permissions?.[key as keyof StaffPermissions] ? 'bg-brand-blue-600 text-white' : 'bg-slate-50 text-slate-300'
                           }`}>
                              {React.cloneElement(icon as React.ReactElement<{className?:string}>, { className: 'w-3.5 h-3.5' })}
                           </div>
                           <span className={`text-[9px] font-black uppercase tracking-tighter text-left leading-tight ${
                             newStaff.permissions?.[key as keyof StaffPermissions] ? 'text-brand-blue-800' : 'text-slate-400'
                           }`}>
                             {label}
                           </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DURUM</label>
                    <div className="flex gap-2">
                      {(['Aktif', 'Pasif'] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setNewStaff(prev => ({ ...prev, status }))}
                          className={`flex-1 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            newStaff.status === status
                              ? (status === 'Aktif' ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100' : 'bg-slate-600 border-slate-600 text-white shadow-lg shadow-slate-100')
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TELEFON</label>
                    <input
                      value={newStaff.phone}
                      onChange={e => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-brand-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingStaffId(null);
                    }}
                    className="px-6 py-3 text-slate-400 font-bold uppercase text-[10px]"
                  >
                    İPTAL
                  </button>
                  <button type="submit" className="px-10 py-3 bg-brand-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">
                    {editingStaffId ? 'GÜNCELLE' : 'PERSONEL EKLE'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PERSONEL</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ROL</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">İLETİŞİM</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">YETKİLER</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">DURUM</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {staff.map(s => (
                 <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                       <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-600 group-hover:text-white transition-all shadow-inner">
                          <User className="w-4 h-4" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{s.name}</span>
                         <span className="text-[10px] font-medium text-slate-400 tracking-tighter">@{s.username}</span>
                       </div>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <Shield className="w-3.5 h-3.5 text-brand-blue-400" />
                       <span className="text-[11px] font-black text-slate-600 uppercase italic">{s.role}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2 text-slate-400">
                           <Phone className="w-3 h-3" />
                           <span className="text-[10px] font-bold">{s.phone}</span>
                         </div>
                         <div className="flex items-center gap-2 text-slate-400">
                           <Mail className="w-3 h-3" />
                           <span className="text-[10px] font-bold lowercase">{s.email}</span>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex -space-x-1 items-center">
                       {PERMISSION_LABELS.map(p => (
                         <div
                           key={p.key}
                           className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-sm transition-all ${
                             s.permissions?.[p.key as keyof StaffPermissions] ? 'bg-brand-blue-600 text-white' : 'bg-slate-50 text-slate-200'
                           }`}
                           title={p.label}
                         >
                           {React.cloneElement(p.icon as React.ReactElement<{className?:string}>, { className: 'w-2.5 h-2.5' })}
                         </div>
                       ))}
                       <span className="ml-2 text-[10px] font-black text-slate-400">
                         ({Object.values(s.permissions || {}).filter(Boolean).length})
                       </span>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        s.status === 'Aktif' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {s.status}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleStartStaffEdit(s)} className="p-2 text-slate-400 hover:text-brand-blue-600 transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setStaffToDelete(s)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>

      {staffToDelete && (
        <ConfirmDialog
          isOpen={!!staffToDelete}
          onClose={() => setStaffToDelete(null)}
          onConfirm={() => removeStaff(staffToDelete.id)}
          title="Personeli Sil"
          message={`${staffToDelete.name} isimli personeli sistemden silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
          confirmText="Sil"
          cancelText="Vazgeç"
          type="danger"
        />
      )}
    </div>
  );
};
