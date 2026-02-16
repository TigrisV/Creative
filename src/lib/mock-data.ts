import {
  Room,
  Guest,
  Reservation,
  HousekeepingTask,
  User,
} from "./types";

export const currentUser: User = {
  id: "u1",
  name: "Ahmet Yılmaz",
  email: "ahmet@otel.com",
  role: "admin",
  isActive: true,
};

export const guests: Guest[] = [];

const roomTypes: Array<{ type: Room["type"]; baseRate: number; maxOccupancy: number; amenities: string[] }> = [
  { type: "standard", baseRate: 1800, maxOccupancy: 2, amenities: ["WiFi", "TV", "Minibar", "Klima"] },
  { type: "deluxe", baseRate: 2500, maxOccupancy: 2, amenities: ["WiFi", "TV", "Minibar", "Klima", "Balkon", "Küvet"] },
  { type: "suite", baseRate: 3500, maxOccupancy: 3, amenities: ["WiFi", "TV", "Minibar", "Klima", "Balkon", "Jakuzi", "Oturma Odası"] },
  { type: "family", baseRate: 2800, maxOccupancy: 4, amenities: ["WiFi", "TV", "Minibar", "Klima", "Çocuk Yatağı", "Geniş Oda"] },
  { type: "king", baseRate: 2200, maxOccupancy: 2, amenities: ["WiFi", "TV", "Minibar", "Klima", "King Yatak", "Balkon"] },
  { type: "twin", baseRate: 1800, maxOccupancy: 2, amenities: ["WiFi", "TV", "Minibar", "Klima", "İki Tek Kişilik Yatak"] },
];

function generateRooms(): Room[] {
  const rooms: Room[] = [];
  for (let floor = 1; floor <= 5; floor++) {
    for (let room = 1; room <= 10; room++) {
      const roomNum = floor * 100 + room;
      const typeIndex = (floor + room) % roomTypes.length;
      const rt = roomTypes[typeIndex];

      rooms.push({
        id: `r${roomNum}`,
        number: roomNum.toString(),
        floor,
        type: rt.type,
        status: "vacant-clean",
        housekeepingStatus: "clean",
        maxOccupancy: rt.maxOccupancy,
        baseRate: rt.baseRate,
        amenities: rt.amenities,
      });
    }
  }
  return rooms;
}

export const rooms: Room[] = generateRooms();

export const reservations: Reservation[] = [];

export const housekeepingTasks: HousekeepingTask[] = [];
