export type AircraftCategory = "Piston" | "Turboprop" | "Jet" | "Other";

/** All dimensions in inches, weights in lbs. */
export interface Aircraft {
  id: string;
  name: string;
  /** Alternate names / type codes used for search. */
  aliases?: string[];
  category: AircraftCategory;
  doorWidth: number;
  doorHeight: number;
  cabinLength: number;
  cabinWidth: number;
  cabinHeight: number;
  maxPayload: number;
  seats: number;
  removableSeats: number;
  seatWeight: number;
}

/** A line on the manifest. `quantity` identical units. Dimensions in inches, weight in lbs per unit. */
export interface CargoItem {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
  /** When true the height axis stays vertical ("this side up"); only L/W may swap. */
  upright: boolean;
}

export interface PresetPart {
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  notes: string;
}

export const AIRCRAFT_DB: Aircraft[] = [
  { id: "king-air-90", name: "King Air 90", aliases: ["C90", "King Air C90", "BE9L"], category: "Turboprop", doorWidth: 28, doorHeight: 51, cabinLength: 149, cabinWidth: 54, cabinHeight: 58, maxPayload: 3535, seats: 7, removableSeats: 2, seatWeight: 35 },
  { id: "king-air-200", name: "King Air 200", aliases: ["B200", "BE20"], category: "Turboprop", doorWidth: 27, doorHeight: 51, cabinLength: 200, cabinWidth: 54, cabinHeight: 57, maxPayload: 1850, seats: 8, removableSeats: 2, seatWeight: 30 },
  { id: "king-air-350", name: "King Air 350", aliases: ["B350", "BE30"], category: "Turboprop", doorWidth: 27, doorHeight: 51, cabinLength: 230, cabinWidth: 54, cabinHeight: 58, maxPayload: 2500, seats: 10, removableSeats: 2, seatWeight: 30 },
  { id: "pc-12", name: "PC-12", aliases: ["Pilatus"], category: "Turboprop", doorWidth: 24, doorHeight: 53, cabinLength: 202, cabinWidth: 60, cabinHeight: 58, maxPayload: 2257, seats: 8, removableSeats: 6, seatWeight: 30 },
  { id: "caravan-208", name: "Caravan 208", aliases: ["C208", "Cessna Caravan"], category: "Turboprop", doorWidth: 50, doorHeight: 49, cabinLength: 153, cabinWidth: 63, cabinHeight: 52, maxPayload: 2860, seats: 10, removableSeats: 0, seatWeight: 20 },
  { id: "tbm", name: "TBM", aliases: ["TBM 700", "TBM 850", "TBM 900"], category: "Turboprop", doorWidth: 26, doorHeight: 47, cabinLength: 159, cabinWidth: 47, cabinHeight: 48, maxPayload: 1443, seats: 6, removableSeats: 2, seatWeight: 20 },
  { id: "cheyenne-pa31t2", name: "Cheyenne (PA-31T2)", aliases: ["Cheyanne", "Cheyenne IIXL"], category: "Turboprop", doorWidth: 28, doorHeight: 46, cabinLength: 131, cabinWidth: 51, cabinHeight: 52, maxPayload: 3800, seats: 8, removableSeats: 2, seatWeight: 25 },
  { id: "cheyenne-ii", name: "Cheyenne II (PAY2)", aliases: ["PAY2", "Chey II"], category: "Turboprop", doorWidth: 28, doorHeight: 46, cabinLength: 131, cabinWidth: 50, cabinHeight: 52, maxPayload: 3800, seats: 8, removableSeats: 2, seatWeight: 25 },
  { id: "cheyenne-i", name: "Cheyenne I (PA-31T)", aliases: ["PA-31T", "Chey I"], category: "Turboprop", doorWidth: 28, doorHeight: 46, cabinLength: 101, cabinWidth: 50, cabinHeight: 51.5, maxPayload: 3840, seats: 6, removableSeats: 1, seatWeight: 28 },
  { id: "c404", name: "C404 Titan", aliases: ["Cessna 404", "Titan"], category: "Piston", doorWidth: 25, doorHeight: 52, cabinLength: 177, cabinWidth: 53, cabinHeight: 60, maxPayload: 2765, seats: 8, removableSeats: 2, seatWeight: 20 },
  { id: "c310", name: "C310", aliases: ["Cessna 310"], category: "Piston", doorWidth: 26, doorHeight: 50, cabinLength: 147, cabinWidth: 53, cabinHeight: 48, maxPayload: 1736, seats: 6, removableSeats: 2, seatWeight: 20 },
  { id: "c319", name: "C319", aliases: [], category: "Other", doorWidth: 28, doorHeight: 50, cabinLength: 180, cabinWidth: 52, cabinHeight: 55, maxPayload: 2000, seats: 8, removableSeats: 0, seatWeight: 30 },
  { id: "c340", name: "C340", aliases: ["Cessna 340"], category: "Piston", doorWidth: 26, doorHeight: 50, cabinLength: 112, cabinWidth: 46.5, cabinHeight: 49, maxPayload: 1848, seats: 6, removableSeats: 2, seatWeight: 20 },
  { id: "aerostar", name: "Aerostar", aliases: ["AEST", "Piper Aerostar"], category: "Piston", doorWidth: 28, doorHeight: 45, cabinLength: 154, cabinWidth: 46, cabinHeight: 47, maxPayload: 2000, seats: 6, removableSeats: 2, seatWeight: 25 },
  { id: "navajo", name: "Navajo (PA-31)", aliases: ["PA-31", "Piper Navajo"], category: "Piston", doorWidth: 24, doorHeight: 43, cabinLength: 131, cabinWidth: 50, cabinHeight: 51, maxPayload: 2070, seats: 8, removableSeats: 2, seatWeight: 20 },
  { id: "seneca", name: "Seneca (PA-34)", aliases: ["PA-34", "Piper Seneca"], category: "Piston", doorWidth: 24, doorHeight: 50, cabinLength: 125, cabinWidth: 49, cabinHeight: 42, maxPayload: 1380, seats: 6, removableSeats: 0, seatWeight: 15 },
  { id: "baron-58", name: "Baron 58", aliases: ["BE58", "B58"], category: "Piston", doorWidth: 36, doorHeight: 36, cabinLength: 151, cabinWidth: 42, cabinHeight: 50, maxPayload: 1464, seats: 6, removableSeats: 2, seatWeight: 15 },
  { id: "da-20", name: "DA-20 Katana", aliases: ["DA20", "Diamond"], category: "Piston", doorWidth: 24, doorHeight: 45, cabinLength: 90, cabinWidth: 45, cabinHeight: 44, maxPayload: 499, seats: 2, removableSeats: 0, seatWeight: 10 },
  { id: "cj1", name: "CJ1", aliases: ["Citation CJ1", "C525"], category: "Jet", doorWidth: 24, doorHeight: 52, cabinLength: 132, cabinWidth: 57, cabinHeight: 56, maxPayload: 1350, seats: 7, removableSeats: 0, seatWeight: 40 },
  { id: "phenom-100", name: "Phenom 100", aliases: ["E50P", "Embraer"], category: "Jet", doorWidth: 24, doorHeight: 52, cabinLength: 132, cabinWidth: 61, cabinHeight: 57, maxPayload: 1312, seats: 6, removableSeats: 0, seatWeight: 30 },
  { id: "beechjet-400a", name: "Beechjet 400A", aliases: ["BE40", "Hawker 400"], category: "Jet", doorWidth: 29, doorHeight: 50, cabinLength: 187, cabinWidth: 59, cabinHeight: 58, maxPayload: 2085, seats: 11, removableSeats: 0, seatWeight: 50 },
  { id: "learjet-35", name: "Learjet 35", aliases: ["LJ35", "Lear"], category: "Jet", doorWidth: 36, doorHeight: 50, cabinLength: 155, cabinWidth: 59, cabinHeight: 52, maxPayload: 3190, seats: 8, removableSeats: 0, seatWeight: 50 },
  { id: "falcon-10", name: "Falcon 10", aliases: ["FA10", "Dassault"], category: "Jet", doorWidth: 36, doorHeight: 60, cabinLength: 155, cabinWidth: 60, cabinHeight: 58, maxPayload: 1975, seats: 8, removableSeats: 0, seatWeight: 50 },
  { id: "falcon-20", name: "Falcon 20", aliases: ["FA20", "Dassault"], category: "Jet", doorWidth: 36, doorHeight: 60, cabinLength: 288, cabinWidth: 73, cabinHeight: 67, maxPayload: 1700, seats: 11, removableSeats: 0, seatWeight: 60 },
];

export const PARTS_DB: PresetPart[] = [
  { name: "PSA Inflatable Tent", length: 54, width: 48, height: 43.2, weight: 400, notes: "Caravan — will fit" },
  { name: "PSA Inflatable Tent Dims 2", length: 29, width: 32, height: 31, weight: 400, notes: "Caravan — will fit" },
  { name: "3 Pieces Inflatable Tent: Black Bag", length: 69, width: 59, height: 46, weight: 400, notes: "" },
  { name: "3 Pieces Inflatable Tent: Cardboard Box", length: 30, width: 25, height: 17, weight: 50, notes: "" },
  { name: "3 Pieces Inflatable Tent: Gray Box", length: 32, width: 25, height: 33, weight: 50, notes: "" },
  { name: "Pilot Seat", length: 31.63, width: 24, height: 44, weight: 54, notes: "Fit in King Air 90 before" },
  { name: "Unboxed CRJ Winglet", length: 60, width: 19.2, height: 96, weight: 100, notes: "Fit in CJ1 before" },
];

export const DEFAULT_MECHANIC_WEIGHT = 180;

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
