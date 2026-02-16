export interface Aircraft {
  name: string;
  doorWidth: number;
  doorHeight: number;
  cabinLength: number;
  cabinWidth: number;
  cabinHeight: number;
  maxPayload: number;
  seats: number;
  removableSeats: number;
  seatWeight: number;
  seatLength: number;
  seatWidth: number;
  seatHeight: number;
}

export interface CargoPart {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  rotated: boolean;
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
  { name: "King Air 90", doorWidth: 28, doorHeight: 51, cabinLength: 149, cabinWidth: 54, cabinHeight: 58, maxPayload: 3535, seats: 7, removableSeats: 2, seatWeight: 35, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "PC-12", doorWidth: 24, doorHeight: 53, cabinLength: 202, cabinWidth: 60, cabinHeight: 58, maxPayload: 2257, seats: 8, removableSeats: 6, seatWeight: 30, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "C404 (Titan)", doorWidth: 25, doorHeight: 52, cabinLength: 177, cabinWidth: 53, cabinHeight: 60, maxPayload: 2765, seats: 8, removableSeats: 2, seatWeight: 20, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "CJ1", doorWidth: 24, doorHeight: 52, cabinLength: 132, cabinWidth: 57, cabinHeight: 56, maxPayload: 1350, seats: 7, removableSeats: 0, seatWeight: 40, seatLength: 22, seatWidth: 20, seatHeight: 38 },
  { name: "C310", doorWidth: 26, doorHeight: 50, cabinLength: 147, cabinWidth: 53, cabinHeight: 48, maxPayload: 1736, seats: 6, removableSeats: 2, seatWeight: 20, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "Aerostar", doorWidth: 28, doorHeight: 45, cabinLength: 154, cabinWidth: 46, cabinHeight: 47, maxPayload: 2000, seats: 6, removableSeats: 2, seatWeight: 25, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "Caravan 208", doorWidth: 50, doorHeight: 49, cabinLength: 153, cabinWidth: 63, cabinHeight: 52, maxPayload: 2860, seats: 10, removableSeats: 0, seatWeight: 20, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "Seneca (PA-34)", doorWidth: 24, doorHeight: 50, cabinLength: 125, cabinWidth: 49, cabinHeight: 42, maxPayload: 1380, seats: 6, removableSeats: 0, seatWeight: 15, seatLength: 18, seatWidth: 16, seatHeight: 34 },
  { name: "C90 (King Air C90)", doorWidth: 28, doorHeight: 51, cabinLength: 149, cabinWidth: 54, cabinHeight: 58, maxPayload: 3535, seats: 7, removableSeats: 2, seatWeight: 35, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "Falcon 10", doorWidth: 36, doorHeight: 60, cabinLength: 155, cabinWidth: 60, cabinHeight: 58, maxPayload: 1975, seats: 8, removableSeats: 0, seatWeight: 50, seatLength: 22, seatWidth: 20, seatHeight: 38 },
  { name: "Cheyenne (PA-31T2)", doorWidth: 28, doorHeight: 46, cabinLength: 131, cabinWidth: 51, cabinHeight: 52, maxPayload: 3800, seats: 8, removableSeats: 2, seatWeight: 25, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "AEST (Aerostar)", doorWidth: 28, doorHeight: 45, cabinLength: 154, cabinWidth: 46, cabinHeight: 47, maxPayload: 2000, seats: 6, removableSeats: 2, seatWeight: 25, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "Piper Aerostar", doorWidth: 28, doorHeight: 45, cabinLength: 154, cabinWidth: 46, cabinHeight: 47, maxPayload: 2000, seats: 6, removableSeats: 2, seatWeight: 25, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "C404 Titan", doorWidth: 25, doorHeight: 52, cabinLength: 177, cabinWidth: 53, cabinHeight: 60, maxPayload: 2765, seats: 8, removableSeats: 2, seatWeight: 20, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "PA-31T (Chey. I)", doorWidth: 28, doorHeight: 46, cabinLength: 101, cabinWidth: 50, cabinHeight: 51.5, maxPayload: 3840, seats: 6, removableSeats: 1, seatWeight: 28, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "BE58 (Baron 58)", doorWidth: 36, doorHeight: 36, cabinLength: 151, cabinWidth: 42, cabinHeight: 50, maxPayload: 1464, seats: 6, removableSeats: 2, seatWeight: 15, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "Phenom 100", doorWidth: 24, doorHeight: 52, cabinLength: 132, cabinWidth: 61, cabinHeight: 57, maxPayload: 1312, seats: 6, removableSeats: 0, seatWeight: 30, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "Beechjet 400A", doorWidth: 29, doorHeight: 50, cabinLength: 187, cabinWidth: 59, cabinHeight: 58, maxPayload: 2085, seats: 11, removableSeats: 0, seatWeight: 50, seatLength: 22, seatWidth: 20, seatHeight: 38 },
  { name: "Falcon 20", doorWidth: 36, doorHeight: 60, cabinLength: 288, cabinWidth: 73, cabinHeight: 67, maxPayload: 1700, seats: 11, removableSeats: 0, seatWeight: 60, seatLength: 22, seatWidth: 20, seatHeight: 38 },
  { name: "C340", doorWidth: 26, doorHeight: 50, cabinLength: 112, cabinWidth: 46.5, cabinHeight: 49, maxPayload: 1848, seats: 6, removableSeats: 2, seatWeight: 20, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "DA-20 Katana", doorWidth: 24, doorHeight: 45, cabinLength: 90, cabinWidth: 45, cabinHeight: 44, maxPayload: 499, seats: 2, removableSeats: 0, seatWeight: 10, seatLength: 18, seatWidth: 16, seatHeight: 34 },
  { name: "Learjet 35", doorWidth: 36, doorHeight: 50, cabinLength: 155, cabinWidth: 59, cabinHeight: 52, maxPayload: 3190, seats: 8, removableSeats: 0, seatWeight: 50, seatLength: 22, seatWidth: 20, seatHeight: 38 },
  { name: "Cheyanne (PA-31T2)", doorWidth: 28, doorHeight: 46, cabinLength: 131, cabinWidth: 51, cabinHeight: 52, maxPayload: 3800, seats: 8, removableSeats: 2, seatWeight: 25, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "King Air (350)", doorWidth: 27, doorHeight: 51, cabinLength: 230, cabinWidth: 54, cabinHeight: 58, maxPayload: 2500, seats: 10, removableSeats: 2, seatWeight: 30, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "Navajo PA-31", doorWidth: 24, doorHeight: 43, cabinLength: 131, cabinWidth: 50, cabinHeight: 51, maxPayload: 2070, seats: 8, removableSeats: 2, seatWeight: 20, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "TBM", doorWidth: 26, doorHeight: 47, cabinLength: 159, cabinWidth: 47, cabinHeight: 48, maxPayload: 1443, seats: 6, removableSeats: 2, seatWeight: 20, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "PAY2 (Chey. II)", doorWidth: 28, doorHeight: 46, cabinLength: 131, cabinWidth: 50, cabinHeight: 52, maxPayload: 3800, seats: 8, removableSeats: 2, seatWeight: 25, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "B200 (King Air 200)", doorWidth: 27, doorHeight: 51, cabinLength: 200, cabinWidth: 54, cabinHeight: 57, maxPayload: 1850, seats: 8, removableSeats: 2, seatWeight: 30, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "C319", doorWidth: 28, doorHeight: 50, cabinLength: 180, cabinWidth: 52, cabinHeight: 55, maxPayload: 2000, seats: 8, removableSeats: 0, seatWeight: 30, seatLength: 20, seatWidth: 18, seatHeight: 36 },
  { name: "B58 (Baron 58)", doorWidth: 36, doorHeight: 36, cabinLength: 151, cabinWidth: 42, cabinHeight: 50, maxPayload: 1464, seats: 6, removableSeats: 2, seatWeight: 15, seatLength: 20, seatWidth: 18, seatHeight: 36 },
];

export const PARTS_DB: PresetPart[] = [
  { name: "PSA Inflatable Tent", length: 54, width: 48, height: 43.2, weight: 400, notes: "Cessna Caravan - will fit" },
  { name: "PSA Inflatable Tent Dims 2", length: 29, width: 32, height: 31, weight: 400, notes: "Cessna Caravan - will fit" },
  { name: "3 Pieces Inflatable Tent: Black Bag", length: 69, width: 59, height: 46, weight: 400, notes: "" },
  { name: "3 Pieces Inflatable Tent: Cardboard Box", length: 30, width: 25, height: 17, weight: 50, notes: "" },
  { name: "3 Pieces Inflatable Tent: Gray Box", length: 32, width: 25, height: 33, weight: 50, notes: "" },
  { name: "Pilot Seat", length: 31.63, width: 24, height: 44, weight: 54, notes: "We have fit in King Air 90" },
  { name: "Unboxed CRJ Winglet", length: 60, width: 19.2, height: 96, weight: 100, notes: "We have fit this in CJ1 before" },
];

export const MECHANIC_WEIGHT = 180;

export function generatePartId(): string {
  return Math.random().toString(36).substring(2, 9);
}
