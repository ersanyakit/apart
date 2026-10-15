import { createContext, useContext } from 'react';

export type GuestHistoryTarget = { id: string; name: string };
export const GuestHistoryNavigation = createContext<((guest: GuestHistoryTarget) => void) | null>(null);
export const useGuestHistoryNavigation = () => useContext(GuestHistoryNavigation);
