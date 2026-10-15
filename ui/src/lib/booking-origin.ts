/** These labels describe stored provenance, not enabled integrations. */
export const bookingSourceLabels: Record<string,string> = {
 manual:'Manuel / resepsiyon', unknown:'Kaynak kaydedilmemiş', booking_com:'Booking.com',
 agoda:'Agoda', expedia:'Expedia', airbnb:'Airbnb', otelz:'Otelz',
 hostelworld:'Hostelworld', website:'İşletmenin web sitesi', agency:'Acente',
};
export const bookingSourceLabel = (source?:string) => bookingSourceLabels[source || 'unknown'] || source!;
