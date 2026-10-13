import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  UserMinus,
  Phone,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  User,
  Calendar,
  Hash,
  MapPin,
  X,
  History,
  Clock,
  Printer
} from 'lucide-react';
import { Room, HotelConfig } from '../types';
import { DocumentPreview } from './DocumentPreview';

interface StayingListProps {
  rooms: Room[];
  hotel: HotelConfig;
  isArchive?: boolean;
  onOperation?: (type: 'reserve' | 'sale' | 'checkout' | 'exchange', roomId: string) => void;
  onPrint?: (type: 'sales' | 'reservation' | 'cancellation', roomId: string) => void;
  handleContextMenu?: (e: React.MouseEvent, roomId: string) => void;
}

const columnHelper = createColumnHelper<Room>();

export const StayingList: React.FC<StayingListProps> = ({ rooms, hotel, isArchive, onOperation, onPrint, handleContextMenu }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedGuest, setSelectedGuest] = useState<Room | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });

  const displayData = useMemo(() => {
    if (isArchive) {
      // Archive shows everyone who has data
      return rooms.filter(r => r.name && r.name !== 'BOŞ' && r.name !== 'TEMİZ ODA' && r.name !== 'KİRLİ ODA');
    }
    // Staying list only shows current
    return rooms.filter(r => r.status === 'Dolu' || r.status === 'Rezervli');
  }, [rooms, isArchive]);

  const columns = useMemo(() => {
    const cols = [];

    // Only show Room column if NOT in Archive mode
    if (!isArchive) {
      cols.push(
        columnHelper.accessor('number', {
          header: () => <div className="flex items-center gap-2"><Hash className="w-3 h-3"/> ODA</div>,
          cell: info => <span className="font-black text-brand-blue-600">{info.getValue()}</span>,
          size: 80,
        })
      );
    }

    cols.push(
      columnHelper.accessor(row => row.guests?.[0]?.name || row.name, {
        id: 'guestName',
        header: () => <div className="flex items-center gap-2"><User className="w-3 h-3"/> MÜŞTERİ</div>,
        cell: info => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 uppercase tracking-tight">{info.getValue()}</span>
            {info.row.original.guests && info.row.original.guests.length > 1 && (
              <span className="text-[9px] text-brand-blue-500 font-bold">+{info.row.original.guests.length - 1} EK MİSAFİR</span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor(row => row.guests?.[0]?.phone || '', {
        id: 'phone',
        header: () => <div className="flex items-center gap-2"><Phone className="w-3 h-3"/> TELEFON</div>,
        cell: info => <span className="text-slate-500 font-medium">{info.getValue() || '---'}</span>,
      })
    );

    if (isArchive) {
      cols.push(
        columnHelper.accessor(row => row.guests?.[0]?.address || '', {
          id: 'address',
          header: () => <div className="flex items-center gap-2"><MapPin className="w-3 h-3"/> ADRES</div>,
          cell: info => <span className="text-slate-500 font-medium line-clamp-1">{info.getValue() || '---'}</span>,
        })
      );
    } else {
      cols.push(
        columnHelper.accessor('checkIn', {
          header: () => <div className="flex items-center gap-2"><Calendar className="w-3 h-3"/> GİRİŞ</div>,
          cell: info => <span className="text-slate-600 font-bold">{info.getValue()?.split(' ')[0] || '---'}</span>,
        }),
        columnHelper.accessor('checkOut', {
          header: () => <div className="flex items-center gap-2 text-red-500"><Calendar className="w-3 h-3"/> ÇIKIŞ</div>,
          cell: info => <span className="text-red-500 font-black">{info.getValue()?.split(' ')[0] || '---'}</span>,
        }),
        columnHelper.accessor('status', {
          header: 'DURUM',
          cell: info => (
            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
              info.getValue() === 'Dolu' ? 'bg-red-50 text-red-600 ring-1 ring-red-100' : 'bg-brand-blue-50 text-brand-blue-600 ring-1 ring-brand-blue-100'
            }`}>
              {info.getValue()}
            </span>
          ),
          size: 100,
        })
      );
    }

    cols.push(
      columnHelper.display({
        id: 'actions',
        header: 'İŞLEM',
        cell: info => (
          <div className="flex items-center gap-2">
            {!isArchive && (
              <>
                <button
                  onClick={() => onOperation?.('checkout', info.row.original.id)}
                  className="uni-control p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg "
                  title="Çıkış Yap"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-100 mx-1" />
              </>
            )}

            {/* Quick Print Actions */}
            <div className="flex items-center bg-slate-50/50 rounded-lg p-0.5 border border-slate-100">
               <button
                onClick={() => onPrint?.('reservation', info.row.original.id)}
                className="uni-control p-1.5 hover:bg-white text-slate-400 hover:text-brand-blue-600 rounded-md "
                title="Rezervasyon Dekontu"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onPrint?.('sales', info.row.original.id)}
                className="uni-control p-1.5 hover:bg-white text-slate-400 hover:text-emerald-600 rounded-md "
                title="Satış Dekontu"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onPrint?.('cancellation', info.row.original.id)}
                className="uni-control p-1.5 hover:bg-white text-slate-400 hover:text-rose-600 rounded-md "
                title="İptal Dekontu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onContextMenu={(e) => handleContextMenu?.(e, info.row.original.id)}
              className="uni-control p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg "
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        ),
        size: 140,
      })
    );

    return cols;
  }, [onOperation, handleContextMenu, isArchive]);

  const guestHistory = useMemo(() => {
    if (!selectedGuest) return [];

    const guestName = selectedGuest.guests?.[0]?.name || selectedGuest.name;

    // Sort history by check-in date descending
    return rooms
      .filter(r => (r.guests?.[0]?.name === guestName || r.name === guestName) && r.checkIn)
      .sort((a, b) => new Date(b.checkIn!).getTime() - new Date(a.checkIn!).getTime());
  }, [selectedGuest, rooms]);

  const table = useReactTable({
    data: displayData,
    columns,
    state: {
      globalFilter: searchTerm,
      sorting,
      pagination,
    },
    onGlobalFilterChange: setSearchTerm,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex-1 flex flex-col p-3 md:p-6 space-y-4 overflow-hidden bg-slate-50/30">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative group flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-blue-500 transition-all" />
          <input
            type="text"
            placeholder={isArchive ? "Binlerce kayıt arasında akıllı arama..." : "Konaklayanlar listesinde ara..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="uni-input w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-4 focus:ring-neutral-300/5 focus:border-neutral-400/40 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-4 px-2">
           <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Kayıt Sayısı</span>
              <span className="text-sm font-black text-slate-700 tracking-tight leading-none">{table.getFilteredRowModel().rows.length}</span>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 border-b border-slate-200">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={header.column.getCanSort() ? 'cursor-pointer select-none flex items-center gap-1.5 hover:text-slate-900 transition-colors group' : ''}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.map(row => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => isArchive && setSelectedGuest(row.original)}
                  className={`transition-colors group ${isArchive ? 'cursor-pointer hover:bg-brand-blue-50/40' : 'hover:bg-slate-50/50'}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2.5">
                      <div className="truncate text-[12px]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>

          {table.getRowModel().rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <Search className="w-8 h-8 mb-3 opacity-20" />
              <p className="font-bold text-[11px] tracking-widest uppercase">Eşleşen kayıt bulunamadı</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
             <select
               value={table.getState().pagination.pageSize}
               onChange={e => table.setPageSize(Number(e.target.value))}
               className="uni-input text-[10px] font-black bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-neutral-400"
             >
               {[15, 30, 50, 100].map(size => (
                 <option key={size} value={size}>{size} SATIR</option>
               ))}
             </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="uni-control p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-400 disabled:opacity-20 "
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-black text-slate-600 px-2">
              SAYFA {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="uni-control p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-400 disabled:opacity-20 "
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guest History Side Panel */}
      <AnimatePresence>
        {selectedGuest && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGuest(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue-50 flex items-center justify-center text-brand-blue-600">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase leading-none mb-1">KONAKLAMA GEÇMİŞİ</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedGuest.guests?.[0]?.name || selectedGuest.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGuest(null)}
                  className="uni-control p-3 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl "
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-6">
                  {guestHistory.map((stay, idx) => (
                    <motion.div
                      key={stay.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative pl-8 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-slate-100 last:before:hidden"
                    >
                      <div className={`absolute left-[-4px] top-2 w-2 h-2 rounded-full border-2 border-white ring-2 ${stay.status === 'Dolu' ? 'ring-red-500 bg-red-500' : 'ring-slate-300 bg-slate-300'}`} />

                      <div className="uni-card bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-slate-800 tracking-tighter">{stay.number}</span>
                            <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded-lg font-black uppercase tracking-widest">ODA</span>
                          </div>
                          {stay.status === 'Dolu' && (
                            <span className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse">AKTİF</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> GİRİŞ
                            </p>
                            <p className="text-xs font-bold text-slate-700">{stay.checkIn}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> ÇIKIŞ
                            </p>
                            <p className="text-xs font-bold text-red-500">{stay.checkOut}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {guestHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                      <History className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-bold text-sm uppercase tracking-widest">Kayıt Bulunamadı</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">TOPLAM KONAKLAMA</span>
                  <span className="text-lg font-black text-slate-900 tracking-tighter">{guestHistory.length}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
