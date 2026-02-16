export type RoomStatus = "vacant-clean" | "vacant-dirty" | "occupied" | "out-of-order" | "maintenance";
export type RoomType = "standard" | "deluxe" | "suite" | "family" | "king" | "twin";
export type ReservationStatus = "confirmed" | "checked-in" | "checked-out" | "cancelled" | "no-show" | "pending";
export type HousekeepingStatus = "clean" | "dirty" | "inspected" | "in-progress" | "out-of-service";
export type PaymentMethod = "cash" | "credit-card" | "bank-transfer" | "online";
export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";
export type UserRole = "admin" | "front-desk" | "housekeeping" | "manager" | "accounting";

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  maxOccupancy: number;
  baseRate: number;
  amenities: string[];
  currentGuest?: Guest;
  currentReservation?: Reservation;
}

export type IdDocumentType = "tc-kimlik" | "passport" | "driver-license" | "other";
export type Gender = "male" | "female" | "other";
export type GuestTitle = "mr" | "mrs" | "ms" | "dr" | "prof" | "sir" | "lady" | "";
export type GuestCategory = "regular" | "vip" | "corporate" | "group" | "loyalty" | "blacklist";
export type CommunicationChannel = "email" | "sms" | "whatsapp" | "phone" | "none";

export interface IdDocument {
  type: IdDocumentType;
  number: string;
  issuedBy?: string;
  issueDate?: string;
  expiryDate?: string;
  scanUrl?: string;
}

export interface CreditCardInfo {
  cardHolder: string;
  lastFour: string;
  brand: "visa" | "mastercard" | "amex" | "troy" | "other";
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface StayHistory {
  id: string;
  checkIn: string;
  checkOut: string;
  roomNumber: string;
  roomType: RoomType;
  nights: number;
  totalAmount: number;
  status: "completed" | "in-house" | "cancelled" | "no-show";
  source: string;
  rating?: number;
  feedback?: string;
  ratePerNight?: number;
  paidAmount?: number;
}

export interface GuestAddress {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isPrimary: boolean;
}

export interface SpecialDate {
  label: string;
  date: string;
  reminder?: boolean;
}

export interface RoomPreferences {
  floorPreference?: "low" | "mid" | "high" | "any";
  bedType?: "single" | "double" | "twin" | "king" | "any";
  smokingPreference?: "smoking" | "non-smoking" | "any";
  viewPreference?: "sea" | "garden" | "city" | "pool" | "any";
  pillow?: "soft" | "firm" | "memory-foam" | "any";
  roomTemperature?: "cool" | "warm" | "standard";
  minibarStocking?: string[];
  quietRoom?: boolean;
  connectingRoom?: boolean;
  accessibilityNeeds?: boolean;
  extraBed?: boolean;
  earlyCheckIn?: boolean;
  lateCheckOut?: boolean;
}

export interface DietaryInfo {
  restrictions: string[];
  allergies: string[];
  specialRequests?: string;
}

export interface LinkedProfile {
  guestId: string;
  name: string;
  relation: "spouse" | "child" | "parent" | "colleague" | "assistant" | "travel-agent" | "other";
}

export interface GuestActivityLog {
  id: string;
  date: string;
  action: string;
  details: string;
  performedBy?: string;
}

export interface GuestCommunicationPref {
  marketingConsent: boolean;
  preferredChannel: CommunicationChannel;
  preferredLanguage: string;
  doNotDisturb?: boolean;
  newsletterSubscribed?: boolean;
  smsNotifications?: boolean;
  emailNotifications?: boolean;
}

export interface Guest {
  id: string;
  title?: GuestTitle;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  secondaryEmail?: string;
  phone: string;
  secondaryPhone?: string;
  idNumber: string;
  nationality: string;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  language?: string;
  category?: GuestCategory;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  addresses?: GuestAddress[];
  vipLevel?: number;
  notes?: string;
  internalNotes?: string;
  preferences?: string[];
  roomPreferences?: RoomPreferences;
  dietaryInfo?: DietaryInfo;
  allergies?: string[];
  idDocument?: IdDocument;
  additionalDocuments?: IdDocument[];
  creditCards?: CreditCardInfo[];
  stayHistory?: StayHistory[];
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  companyName?: string;
  companyAddress?: string;
  taxNumber?: string;
  companyContact?: string;
  loyaltyNumber?: string;
  loyaltyTier?: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  loyaltyPoints?: number;
  specialDates?: SpecialDate[];
  linkedProfiles?: LinkedProfile[];
  activityLog?: GuestActivityLog[];
  communicationPref?: GuestCommunicationPref;
  totalStays: number;
  totalNights?: number;
  totalSpent: number;
  avgSpendPerStay?: number;
  noShowCount?: number;
  cancellationCount?: number;
  lastRoomNumber?: string;
  lastRoomType?: RoomType;
  createdAt: string;
  updatedAt?: string;
  lastStayDate?: string;
  profileCompleteness?: number;
  tags?: string[];
  blacklistReason?: string;
}

export type MealPlan = "RO" | "BB" | "HB" | "FB" | "AI";

export interface Reservation {
  id: string;
  confirmationNumber: string;
  guest: Guest;
  room?: Room;
  roomType: RoomType;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  ratePerNight: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  source: string;
  mealPlan?: MealPlan;
  specialRequests?: string;
  groupId?: string;
  groupName?: string;
  createdAt: string;
}

export interface ReservationGroup {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  companyName?: string;
  reservationIds: string[];
  totalRooms: number;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  createdAt: string;
}

export interface FolioItem {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "charge" | "payment" | "adjustment";
}

export interface Folio {
  id: string;
  reservationId: string;
  guestName: string;
  roomNumber: string;
  items: FolioItem[];
  totalCharges: number;
  totalPayments: number;
  balance: number;
}

export interface HousekeepingTask {
  id: string;
  roomNumber: string;
  floor: number;
  status: HousekeepingStatus;
  assignedTo?: string;
  priority: "low" | "medium" | "high" | "urgent";
  notes?: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  outOfOrder: number;
  occupancyRate: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  todayRevenue: number;
  monthlyRevenue: number;
  pendingArrivals: number;
  pendingDepartures: number;
  inHouseGuests: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
}

export interface NavigationItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavigationItem[];
}

// ═══════════════════════════════════════════════════════════════
// Staff App Types
// ═══════════════════════════════════════════════════════════════
export type StaffRole = "housekeeping" | "bar" | "maintenance" | "admin" | "front-desk" | "manager";
export type TaskType = "checkout" | "stayover" | "deep-clean" | "turndown" | "inspection" | "custom";
export type TaskStatus = "pending" | "in_progress" | "completed" | "inspected" | "skipped";
export type BarOrderStatus = "new" | "preparing" | "ready" | "delivered" | "cancelled";
export type BarOrderType = "room-service" | "bar" | "pool" | "restaurant";
export type MaintenanceCategory = "elektrik" | "tesisat" | "klima" | "mobilya" | "boya" | "asansor" | "havuz" | "bahce" | "genel" | "diger";
export type MaintenanceStatus = "new" | "assigned" | "in_progress" | "waiting_parts" | "completed" | "cancelled";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  pin: string;
  phone?: string;
  isActive: boolean;
  floorAssigned?: number;
  createdAt: string;
}

export interface HousekeepingTaskFull {
  id: string;
  roomNumber: string;
  floor: number;
  taskType: TaskType;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  durationMinutes?: number;
  issuesFound?: string;
  createdAt: string;
}

export interface BarMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
  sortOrder: number;
}

export interface BarOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface BarOrder {
  id: string;
  roomNumber?: string;
  tableNumber?: string;
  guestName?: string;
  orderType: BarOrderType;
  status: BarOrderStatus;
  items: BarOrderItem[];
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface MaintenanceOrder {
  id: string;
  title: string;
  description?: string;
  category: MaintenanceCategory;
  location: string;
  roomNumber?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: MaintenanceStatus;
  assignedTo?: string;
  assignedToName?: string;
  reportedBy?: string;
  notes?: string;
  estimatedMinutes?: number;
  startedAt?: string;
  completedAt?: string;
  partsUsed?: string;
  cost?: number;
  photos?: string[];
  createdAt: string;
}
