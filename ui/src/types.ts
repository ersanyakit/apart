import type { MediaAsset, FeatureAssignment, LocalizedString } from './lib/api';
export type RoomStatus = import('./lib/statuses.generated').RoomStatus | 'Rezervli' | 'Dolu';

export interface Guest {
  gender?: '' | 'female' | 'male' | 'unspecified';
  relationship?: string;
  /** Uyruk: ISO 3166-1 alpha-2 ülke kodu (örn. "TR"). */
  nationality?: string;
  id: string;
  name: string;
  tcNo?: string;
  phone?: string;
  address?: string;
  note?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon?: string;
}

export interface BlacklistItem {
  id: string;
  name: string;
  idNumber?: string;
  reason: string;
  addedBy: string;
  addedAt: string;
  note?: string;
}

export interface SystemLog {
  id: string;
  date: string;
  action: string;
  performer: string;
  description: string;
}

export interface Room {
  branchId?: string;
  assets?: MediaAsset[];
  featureAssignments?: FeatureAssignment[];
  localizedDescription?: LocalizedString;
  id: string;
  number: string;
  name: string;
  status: RoomStatus;
  checkIn?: string;
  checkOut?: string;
  type: string;
  guests?: Guest[];
  features?: string[];
  inventoryIds?: string[];
  imageUrls?: string[];
  description?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: any;
  subItems?: MenuItem[];
}

export interface HotelConfig {
  hotelId?: string;
  branchId?: string;
  assets?: MediaAsset[];
  featureAssignments?: FeatureAssignment[];
  localizedDescription?: LocalizedString;
  name: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  address: string;
  phone: string;
  email: string;
  taxNumber?: string;
  taxOffice?: string;
}

export type StaffRole = 'Yönetici' | 'Resepsiyon' | 'Muhasebe' | 'Kat Hizmetleri' | 'Teknik Servis';

export interface StaffPermissions {
  manageRooms: boolean;
  manageInventory: boolean;
  manageStaff: boolean;
  manageHotel: boolean;
  manageBlacklist: boolean;
  viewLogs: boolean;
  manageGuests: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  email: string;
  username: string;
  status: 'Aktif' | 'Pasif';
  permissions: StaffPermissions;
}
