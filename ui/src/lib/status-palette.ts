/** Semantic colors are independent of the user's decorative theme.
 * Room condition and reservation state are separate dimensions. */
export const STATUS_PALETTE = {
 occupied: { accent:'#267cff', background:'#ecf1fc', text:'#23568b', label:'Giriş yapıldı' },
 reserved: { accent:'#ff8514', background:'#fbf2da', text:'#815219', label:'Rezervasyon' },
 dirty: { accent:'#a57643', background:'#f4ece3', text:'#77502c', label:'Kirli' },
 clean: { accent:'#20a477', background:'#eaf7f0', text:'#176b4d', label:'Temiz' },
 available: { accent:'#9a9eaa', background:'#f3f4f6', text:'#606571', label:'Boş' },
 completed: { accent:'#888391', background:'#f0f0f3', text:'#55515e', label:'Çıkış yapıldı' },
 cancelled: { accent:'#d35c6b', background:'#fbecef', text:'#9d3544', label:'İptal edildi' },
 fault: { accent:'#d63e3e', background:'#fdecec', text:'#a32929', label:'Arızalı' },
 maintenance: { accent:'#8665c6', background:'#f0ebfa', text:'#67439c', label:'Tadilatta' },
 departure: { accent:'#ec00d3', background:'#f8e9f8', text:'#984776', label:'Çıkış işlemi' },
} as const;
export type SemanticStatus = keyof typeof STATUS_PALETTE;
export const statusVariables = Object.fromEntries(Object.entries(STATUS_PALETTE).flatMap(([key, value]) =>
 ['accent','background','text'].map(part => [`--status-${key}-${part}`,value[part as 'accent'|'background'|'text']])
));
export const roomStatusKey = (status:string): SemanticStatus => ({Dolu:'occupied',Rezervli:'reserved',Kirli:'dirty',Temiz:'clean',Bos:'available',Arizali:'fault',Tadilat:'maintenance'} as Record<string,SemanticStatus>)[status] || 'available';
export const bookingStatusKey = (status:string): SemanticStatus => ({checked_in:'occupied',confirmed:'reserved',completed:'completed',cancelled:'cancelled'} as Record<string,SemanticStatus>)[status] || 'available';
export const statusStyle = (key:SemanticStatus) => ({backgroundColor:STATUS_PALETTE[key].background,color:STATUS_PALETTE[key].text,borderColor:STATUS_PALETTE[key].accent});
export const boardStatusKey = (state:{tone:string;operationalStatus:string}): SemanticStatus => state.tone==='occupied'?'occupied':state.tone==='reserved'?'reserved':state.tone==='warning'?roomStatusKey(state.operationalStatus):state.tone==='neutral'?'completed':'available';
