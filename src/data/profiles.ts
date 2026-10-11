import type { Aircraft } from "./aircraft";

/**
 * Per-type geometry that the spec table doesn't carry: where the door is, how high the
 * sill sits, how wide the floor really is, where the seats go, and enough of the airframe
 * to draw it. Values come from public sources (listed per profile); anything marked
 * `approx` is inferred from published overall dimensions rather than quoted directly.
 * Types without a profile fall back to class defaults (`geometryFor`).
 */

export type Side = "left" | "right";

export interface DoorSpec {
  role: "main" | "cargo" | "pilot" | "emergency";
  side: Side;
  widthIn: number;
  heightIn: number;
  type: "airstair" | "clamshell" | "plug" | "upward-hinged" | "gull" | "hinged";
  /** Door center, inches aft of the forward end of the passenger cabin. */
  stationIn: number;
  sillIn: number;
  approx?: boolean;
}

export interface SeatSpec {
  /** Seat center, inches aft of the forward end of the passenger cabin. */
  stationIn: number;
  side: Side;
  facing: "fwd" | "aft" | "side";
  removable: boolean;
}

export interface AirframeSpec {
  overallLengthIn: number;
  wingspanIn: number;
  wing: "low" | "high" | "mid";
  wingStrut: boolean;
  wingSweep?: "straight" | "moderate" | "swept";
  tail: "conventional" | "T" | "cruciform";
  engines: "wing-props" | "nose-prop" | "aft-jets";
  /** Length of nose/cockpit ahead of the passenger cabin. */
  noseToCabinFrontIn: number;
  fuselageMaxWidthIn: number;
  gear: "retractable" | "fixed";
}

/** Exterior 3D model for the loading scene (see public/models/ATTRIBUTION.md). */
export interface ModelRef {
  file: string;
  name: string;
  /** A related type standing in for this one; said so in the scene label. */
  standIn?: boolean;
}

export interface AircraftProfile {
  id: string;
  model?: ModelRef;
  /** Usable width at floor level; the spec's cabinWidth is the max width higher up. */
  floorWidthIn?: number;
  doors: DoorSpec[];
  /** Seat map. Only drawn and used as floor obstacles when `seatsVerified` is true. */
  seats: SeatSpec[];
  /** True when the seat stations come from a W&B manual or interior drawing, not inferred. */
  seatsVerified?: boolean;
  airframe: AirframeSpec;
  sources: string[];
  notes?: string;
}

export const PROFILES: Record<string, AircraftProfile> = {
  /* ---------- turboprops ---------- */
  "king-air-90": {
    id: "king-air-90",
    model: { file: "kingair.glb", name: "Beechcraft Super King Air (200-series)", standIn: true },
    floorWidthIn: 42,
    doors: [{ role: "main", side: "left", widthIn: 27, heightIn: 51, type: "airstair", stationIn: 132, sillIn: 44, approx: true }],
    seats: [
      { stationIn: 30, side: "left", facing: "aft", removable: true }, { stationIn: 30, side: "right", facing: "aft", removable: true },
      { stationIn: 82, side: "left", facing: "fwd", removable: true }, { stationIn: 82, side: "right", facing: "fwd", removable: true },
      { stationIn: 120, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 426, wingspanIn: 603, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 150, fuselageMaxWidthIn: 66, gear: "retractable" },
    sources: ["https://www.flyradius.com/beechcraft-king-air-c90gtx/interior-cabin", "https://www.globalair.com/aircraft-specifications/beechcraft/king-air-c90b-specifications/71"],
    notes: "Aft-left airstair; club 4 + 1 aft. Seat stations and sill inferred from cabin length and club pitch.",
  },
  "king-air-200": {
    id: "king-air-200",
    model: { file: "kingair.glb", name: "Beechcraft Super King Air" },
    floorWidthIn: 49,
    doors: [
      { role: "main", side: "left", widthIn: 27, heightIn: 51.75, type: "airstair", stationIn: 168, sillIn: 47, approx: true },
    ],
    seats: [
      { stationIn: 30, side: "left", facing: "aft", removable: true }, { stationIn: 30, side: "right", facing: "aft", removable: true },
      { stationIn: 82, side: "left", facing: "fwd", removable: true }, { stationIn: 82, side: "right", facing: "fwd", removable: true },
      { stationIn: 128, side: "left", facing: "aft", removable: true }, { stationIn: 128, side: "right", facing: "aft", removable: true },
      { stationIn: 185, side: "right", facing: "side", removable: false },
    ],
    airframe: { overallLengthIn: 525, wingspanIn: 654, wing: "low", wingStrut: false, tail: "T", engines: "wing-props", noseToCabinFrontIn: 165, fuselageMaxWidthIn: 66, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/beechcraft/king-air-b200-specifications/63", "https://www.elliottjets.com/wp-content/uploads/2018/06/BB-1765-Spec-Brochure.pdf"],
    notes: "Aft-left airstair 27×51.75. The 52×52 cargo door exists only on 200C/B200C. Belted lav seat aft of the door is not removable.",
  },
  "king-air-350": {
    id: "king-air-350",
    model: { file: "kingair.glb", name: "Beechcraft Super King Air (200-series)", standIn: true },
    floorWidthIn: 49,
    doors: [{ role: "main", side: "left", widthIn: 26, heightIn: 51.7, type: "airstair", stationIn: 203, sillIn: 47, approx: true }],
    seats: [
      { stationIn: 30, side: "left", facing: "aft", removable: true }, { stationIn: 30, side: "right", facing: "aft", removable: true },
      { stationIn: 82, side: "left", facing: "fwd", removable: true }, { stationIn: 82, side: "right", facing: "fwd", removable: true },
      { stationIn: 128, side: "left", facing: "aft", removable: true }, { stationIn: 128, side: "right", facing: "aft", removable: true },
      { stationIn: 180, side: "left", facing: "fwd", removable: true }, { stationIn: 180, side: "right", facing: "fwd", removable: true },
      { stationIn: 222, side: "right", facing: "side", removable: false },
    ],
    airframe: { overallLengthIn: 560, wingspanIn: 695, wing: "low", wingStrut: false, tail: "T", engines: "wing-props", noseToCabinFrontIn: 165, fuselageMaxWidthIn: 66, gear: "retractable" },
    sources: ["https://www.paramountbusinessjets.com/private-jet-charter/aircraft/king-air-350", "https://www.globalair.com/aircraft-specifications/beechcraft/king-air-350-specifications/57"],
    notes: "Double club 8 + belted lav. 52×52 cargo door only on 350C/CER. Floor width 49 in (Paramount).",
  },
  "pc-12": {
    id: "pc-12",
    model: { file: "pc12.glb", name: "Pilatus PC-12/47" },
    floorWidthIn: 51,
    doors: [
      { role: "cargo", side: "left", widthIn: 53, heightIn: 52, type: "upward-hinged", stationIn: 168, sillIn: 52, approx: true },
      { role: "main", side: "left", widthIn: 24, heightIn: 53, type: "airstair", stationIn: 18, sillIn: 52, approx: true },
    ],
    seats: [
      { stationIn: 55, side: "left", facing: "aft", removable: true }, { stationIn: 55, side: "right", facing: "aft", removable: true },
      { stationIn: 105, side: "left", facing: "fwd", removable: true }, { stationIn: 105, side: "right", facing: "fwd", removable: true },
      { stationIn: 150, side: "left", facing: "fwd", removable: true }, { stationIn: 150, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 567, wingspanIn: 640, wing: "low", wingStrut: false, tail: "T", engines: "nose-prop", noseToCabinFrontIn: 190, fuselageMaxWidthIn: 70, gear: "retractable" },
    sources: ["https://www.pilatus-aircraft.com/data/document/Pilatus-Aircraft-Ltd-PC-12NGX-Factsheet.pdf", "https://www.keewatinair.ca/pilatus-pc-12"],
    notes: "Cargo goes through the 53×52 aft-left cargo door; pax airstair forward-left. Floor width 51 in (Pilatus). All seats quick-release.",
  },
  "caravan-208": {
    id: "caravan-208",
    model: { file: "caravan.glb", name: "Cessna 208 Caravan" },
    floorWidthIn: 58,
    doors: [
      { role: "cargo", side: "left", widthIn: 49, heightIn: 50, type: "clamshell", stationIn: 172, sillIn: 47, approx: true },
      { role: "main", side: "right", widthIn: 24, heightIn: 50, type: "airstair", stationIn: 172, sillIn: 47, approx: true },
    ],
    seats: [20, 52, 84, 116, 148].flatMap((st) => [
      { stationIn: st, side: "left" as const, facing: "fwd" as const, removable: true },
      { stationIn: st, side: "right" as const, facing: "fwd" as const, removable: true },
    ]),
    airframe: { overallLengthIn: 499, wingspanIn: 625, wing: "high", wingStrut: true, tail: "conventional", engines: "nose-prop", noseToCabinFrontIn: 150, fuselageMaxWidthIn: 66, gear: "fixed" },
    sources: ["https://cessna.txtav.com/en/turboprop/grand-caravan-ex", "https://airtindi.com/fleets/cessna-caravan/"],
    notes: "Two-piece cargo door aft-left, airstair aft-right. Commuter rows at ~32 in pitch, all quick-removable.",
  },
  tbm: {
    id: "tbm",
    floorWidthIn: 38,
    doors: [{ role: "main", side: "left", widthIn: 44, heightIn: 48, type: "upward-hinged", stationIn: 82, sillIn: 42, approx: true }],
    seats: [
      { stationIn: 22, side: "left", facing: "aft", removable: true }, { stationIn: 22, side: "right", facing: "aft", removable: true },
      { stationIn: 62, side: "left", facing: "fwd", removable: true }, { stationIn: 62, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 423, wingspanIn: 505, wing: "low", wingStrut: false, tail: "conventional", engines: "nose-prop", noseToCabinFrontIn: 155, fuselageMaxWidthIn: 52, gear: "retractable" },
    sources: ["https://planeandpilotmag.com/daher-tmb-900/", "https://www.airport-technology.com/projects/tbm-900-business-jet/"],
    notes: "Upward-hinged aft-left door with integral steps; opening dims not published, estimated. Club 4 behind the crew seats.",
  },
  "cheyenne-i": {
    id: "cheyenne-i",
    floorWidthIn: 38,
    doors: [{ role: "main", side: "left", widthIn: 24, heightIn: 48, type: "airstair", stationIn: 115, sillIn: 36, approx: true }],
    seats: [
      { stationIn: 25, side: "left", facing: "aft", removable: true }, { stationIn: 25, side: "right", facing: "aft", removable: true },
      { stationIn: 70, side: "left", facing: "fwd", removable: true }, { stationIn: 70, side: "right", facing: "fwd", removable: true },
      { stationIn: 105, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 416, wingspanIn: 512, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 150, fuselageMaxWidthIn: 58, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/piper/cheyenne-ia-pa-31t1-specifications/590", "https://www.avbuyer.com/aircraft/turboprops/piper/cheyenne-i"],
    notes: "Navajo-derived fuselage, aft-left airstair. Door opening estimated.",
  },
  "cheyenne-ii": {
    id: "cheyenne-ii",
    floorWidthIn: 38,
    doors: [{ role: "main", side: "left", widthIn: 24, heightIn: 48, type: "airstair", stationIn: 115, sillIn: 36, approx: true }],
    seats: [
      { stationIn: 25, side: "left", facing: "aft", removable: true }, { stationIn: 25, side: "right", facing: "aft", removable: true },
      { stationIn: 70, side: "left", facing: "fwd", removable: true }, { stationIn: 70, side: "right", facing: "fwd", removable: true },
      { stationIn: 105, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 416, wingspanIn: 512, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 150, fuselageMaxWidthIn: 58, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/piper/cheyenne-ii-pa-31t-620-specifications/247"],
    notes: "Same cabin as Cheyenne I.",
  },
  "cheyenne-pa31t2": {
    id: "cheyenne-pa31t2",
    floorWidthIn: 38,
    doors: [{ role: "main", side: "left", widthIn: 24, heightIn: 48, type: "airstair", stationIn: 135, sillIn: 36, approx: true }],
    seats: [
      { stationIn: 30, side: "left", facing: "aft", removable: true }, { stationIn: 30, side: "right", facing: "aft", removable: true },
      { stationIn: 82, side: "left", facing: "fwd", removable: true }, { stationIn: 82, side: "right", facing: "fwd", removable: true },
      { stationIn: 122, side: "left", facing: "fwd", removable: true }, { stationIn: 122, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 440, wingspanIn: 512, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 154, fuselageMaxWidthIn: 58, gear: "retractable" },
    sources: ["https://www.ggarchives.com/BangorPunta/PiperAircraft/CheyenneIIXL-SpecificationsDiagramsPhoto-1981.html"],
    notes: "IIXL: 20 in longer cabin than the II; same aft-left airstair.",
  },
  /* ---------- piston twins & singles ---------- */
  c404: {
    id: "c404",
    floorWidthIn: 42,
    doors: [{ role: "main", side: "left", widthIn: 25, heightIn: 50, type: "airstair", stationIn: 190, sillIn: 38, approx: true }],
    seats: [
      { stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false },
      ...[70, 105, 140].flatMap((st) => [
        { stationIn: st, side: "left" as const, facing: "fwd" as const, removable: true },
        { stationIn: st, side: "right" as const, facing: "fwd" as const, removable: true },
      ]),
      { stationIn: 175, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 474, wingspanIn: 560, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 84, fuselageMaxWidthIn: 62, gear: "retractable" },
    sources: ["https://en.wikipedia.org/wiki/Cessna_404_Titan", "https://aerocorner.com/aircraft/cessna-404-titan/"],
    notes: "Aft-left airstair (400-series opening ~25×51). The optional extra-large cargo door is not assumed. Crew row counted as non-removable.",
  },
  c310: {
    id: "c310",
    model: { file: "c310.glb", name: "Cessna 310" },
    floorWidthIn: 36,
    doors: [{ role: "main", side: "right", widthIn: 37, heightIn: 36, type: "plug", stationIn: 32, sillIn: 36, approx: true }],
    seats: [
      { stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false },
      { stationIn: 59, side: "left", facing: "fwd", removable: true }, { stationIn: 59, side: "right", facing: "fwd", removable: true },
      { stationIn: 90, side: "left", facing: "fwd", removable: true }, { stationIn: 90, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 384, wingspanIn: 441, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 72, fuselageMaxWidthIn: 52, gear: "retractable" },
    sources: ["https://www.aopa.org/go-fly/aircraft-and-ownership/aircraft-guide/aircraft/cessna-310r", "https://metarcentral.com/aircraft/c310"],
    notes: "Single over-wing door at the front right; opening estimated. Loading means passing cargo over the front seats.",
  },
  c340: {
    id: "c340",
    model: { file: "c310.glb", name: "Cessna 310", standIn: true },
    floorWidthIn: 32,
    doors: [{ role: "main", side: "left", widthIn: 21, heightIn: 49, type: "airstair", stationIn: 98, sillIn: 40, approx: true }],
    seats: [
      { stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false },
      { stationIn: 62, side: "left", facing: "aft", removable: true }, { stationIn: 62, side: "right", facing: "aft", removable: true },
      { stationIn: 95, side: "left", facing: "fwd", removable: true }, { stationIn: 95, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 412, wingspanIn: 457, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 80, fuselageMaxWidthIn: 54, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/cessna/cessna-340-specifications/410", "https://twinandturbine.com/issue/Aug12/files/basic-html/page11.html"],
    notes: "Small aft-left split airstair, 21×49 per GlobalAir. Pressurized round tube: narrow floor.",
  },
  aerostar: {
    id: "aerostar",
    floorWidthIn: 34,
    doors: [{ role: "main", side: "left", widthIn: 28, heightIn: 45, type: "clamshell", stationIn: 32, sillIn: 42, approx: true }],
    seats: [
      { stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false },
      { stationIn: 62, side: "left", facing: "fwd", removable: true }, { stationIn: 62, side: "right", facing: "fwd", removable: true },
      { stationIn: 100, side: "left", facing: "fwd", removable: true }, { stationIn: 100, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 418, wingspanIn: 440, wing: "mid", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 60, fuselageMaxWidthIn: 50, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/aerostar/aerostar-601b-specifications/589", "https://en.wikipedia.org/wiki/Piper_Aerostar"],
    notes: "One forward-left split door beside the pilot seat; everything goes past the folded pilot seat.",
  },
  navajo: {
    id: "navajo",
    floorWidthIn: 40,
    doors: [{ role: "main", side: "left", widthIn: 27, heightIn: 41, type: "airstair", stationIn: 136, sillIn: 42, approx: true }],
    seats: [
      { stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false },
      ...[58, 89, 120].flatMap((st) => [
        { stationIn: st, side: "left" as const, facing: "fwd" as const, removable: true },
        { stationIn: st, side: "right" as const, facing: "fwd" as const, removable: true },
      ]),
      { stationIn: 150, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 415, wingspanIn: 488, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 78, fuselageMaxWidthIn: 56, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/piper/chieftain-pa-31-350-specifications/119", "https://www.airfreight.com/air-charter/piper-pa-31"],
    notes: "Aft-left airstair 27×41 (Chieftain stations). The optional second cargo panel (combined ~75×55) is not assumed.",
  },
  seneca: {
    id: "seneca",
    floorWidthIn: 38,
    doors: [
      { role: "cargo", side: "left", widthIn: 45, heightIn: 36, type: "clamshell", stationIn: 105, sillIn: 30, approx: true },
      { role: "pilot", side: "right", widthIn: 37, heightIn: 37, type: "plug", stationIn: 32, sillIn: 33, approx: true },
    ],
    seats: [
      { stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false },
      { stationIn: 62, side: "left", facing: "fwd", removable: true }, { stationIn: 62, side: "right", facing: "fwd", removable: true },
      { stationIn: 97, side: "left", facing: "fwd", removable: true }, { stationIn: 97, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 344, wingspanIn: 467, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 60, fuselageMaxWidthIn: 52, gear: "retractable" },
    sources: ["https://en.wikipedia.org/wiki/Piper_PA-34_Seneca", "https://aerocorner.com/aircraft/piper-seneca/"],
    notes: "Aft-left passenger + utility doors open together (~45×36 combined, estimated). Sits low.",
  },
  "baron-58": {
    id: "baron-58",
    floorWidthIn: 32,
    doors: [
      { role: "cargo", side: "right", widthIn: 45, heightIn: 36, type: "clamshell", stationIn: 68, sillIn: 32, approx: true },
      { role: "pilot", side: "right", widthIn: 36, heightIn: 36, type: "plug", stationIn: 30, sillIn: 34, approx: true },
    ],
    seats: [
      { stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false },
      { stationIn: 58, side: "left", facing: "aft", removable: true }, { stationIn: 58, side: "right", facing: "aft", removable: true },
      { stationIn: 84, side: "left", facing: "fwd", removable: true }, { stationIn: 84, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 358, wingspanIn: 454, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 60, fuselageMaxWidthIn: 48, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-for-sale/Specifications?specid=9", "https://www.aviationconsumer.com/?p=64079"],
    notes: "Aft double doors on the right open onto the club area (~45×36 combined, estimated). Row stations from TCDS arms.",
  },
  "da-20": {
    id: "da-20",
    model: { file: "katana.glb", name: "Diamond DA20 Katana" },
    floorWidthIn: 30,
    doors: [{ role: "main", side: "left", widthIn: 44, heightIn: 50, type: "upward-hinged", stationIn: 28, sillIn: 28, approx: true }],
    seats: [{ stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false }],
    airframe: { overallLengthIn: 282, wingspanIn: 428, wing: "low", wingStrut: false, tail: "T", engines: "nose-prop", noseToCabinFrontIn: 60, fuselageMaxWidthIn: 46, gear: "fixed" },
    sources: ["https://www.aopa.org/go-fly/aircraft-and-ownership/aircraft-fact-sheets/diamond-da20"],
    notes: "No door: the 'door' is the rear-hinged canopy opening (estimated). Two seats, 44 lb baggage shelf. Not a cargo aircraft.",
  },
  c319: {
    id: "c319",
    floorWidthIn: 42,
    doors: [{ role: "main", side: "left", widthIn: 25, heightIn: 51, type: "airstair", stationIn: 160, sillIn: 38, approx: true }],
    seats: [
      { stationIn: 25, side: "left", facing: "fwd", removable: false }, { stationIn: 25, side: "right", facing: "fwd", removable: false },
      ...[62, 94, 126].flatMap((st) => [
        { stationIn: st, side: "left" as const, facing: "fwd" as const, removable: true },
        { stationIn: st, side: "right" as const, facing: "fwd" as const, removable: true },
      ]),
      { stationIn: 158, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 437, wingspanIn: 535, wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", noseToCabinFrontIn: 80, fuselageMaxWidthIn: 62, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/cessna/cessna-402-specifications/474", "https://aeropedia.com.au/content/cessna-401-and-402/"],
    notes: "Listed as 'C319', which is not a real type. Its numbers match a Cessna 402B/C (panel-to-bulkhead ~180 in, 55×51 section, ~25×51 airstair, 8–9 seats, ~2,100 lb payload). Treated as a 402; the optional 45×40 cargo door is not assumed. Verify against TCDS A7CE.",
  },
  /* ---------- light jets ---------- */
  cj1: {
    id: "cj1",
    model: { file: "bravo.glb", name: "Cessna Citation Bravo (550)", standIn: true },
    floorWidthIn: 36,
    doors: [{ role: "main", side: "left", widthIn: 24, heightIn: 52, type: "plug", stationIn: 16, sillIn: 40, approx: true }],
    seats: [
      { stationIn: 22, side: "right", facing: "side", removable: true },
      { stationIn: 52, side: "left", facing: "aft", removable: true }, { stationIn: 52, side: "right", facing: "aft", removable: true },
      { stationIn: 92, side: "left", facing: "fwd", removable: true }, { stationIn: 92, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 511, wingspanIn: 562, wing: "low", wingStrut: false, wingSweep: "straight", tail: "T", engines: "aft-jets", noseToCabinFrontIn: 130, fuselageMaxWidthIn: 66, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-for-sale/specifications?specid=193", "https://blog.le-parnass.com/catalogue_pdf/citation_cj1_spec.pdf"],
    notes: "Forward-left plug door with fold-out step. Dropped center aisle: floor width ~36 in is seat-rail to seat-rail.",
  },
  "phenom-100": {
    id: "phenom-100",
    floorWidthIn: 43,
    doors: [{ role: "main", side: "left", widthIn: 24, heightIn: 58, type: "airstair", stationIn: 18, sillIn: 48, approx: true }],
    seats: [
      { stationIn: 24, side: "right", facing: "side", removable: true },
      { stationIn: 52, side: "left", facing: "aft", removable: true }, { stationIn: 52, side: "right", facing: "aft", removable: true },
      { stationIn: 92, side: "left", facing: "fwd", removable: true }, { stationIn: 92, side: "right", facing: "fwd", removable: true },
      { stationIn: 122, side: "right", facing: "fwd", removable: false },
    ],
    airframe: { overallLengthIn: 505, wingspanIn: 484, wing: "low", wingStrut: false, wingSweep: "straight", tail: "T", engines: "aft-jets", noseToCabinFrontIn: 125, fuselageMaxWidthIn: 70, gear: "retractable" },
    sources: ["https://www.flyradius.com/embraer-phenom-100/specifications-dimensions", "https://www.quantumjets.com/aircraft/embraer-phenom-100-original-specs-performance-guide"],
    notes: "Forward-left airstair 24×58. Flat floor 43 in wide (Embraer). Aft seat is the belted lav.",
  },
  "beechjet-400a": {
    id: "beechjet-400a",
    floorWidthIn: 40,
    doors: [{ role: "main", side: "left", widthIn: 29, heightIn: 50, type: "airstair", stationIn: 20, sillIn: 44, approx: true }],
    seats: [
      { stationIn: 30, side: "right", facing: "aft", removable: true },
      { stationIn: 62, side: "left", facing: "aft", removable: true }, { stationIn: 62, side: "right", facing: "aft", removable: true },
      { stationIn: 104, side: "left", facing: "fwd", removable: true }, { stationIn: 104, side: "right", facing: "fwd", removable: true },
      { stationIn: 142, side: "left", facing: "fwd", removable: true }, { stationIn: 142, side: "right", facing: "fwd", removable: true },
      { stationIn: 175, side: "right", facing: "side", removable: false },
    ],
    airframe: { overallLengthIn: 581, wingspanIn: 522, wing: "low", wingStrut: false, wingSweep: "moderate", tail: "T", engines: "aft-jets", noseToCabinFrontIn: 140, fuselageMaxWidthIn: 68, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-for-sale/specifications?specid=33", "https://www.aopa.org/news-and-media/all-news/1992/march/pilot/beechjet-400a"],
    notes: "Forward-left airstair 29×50. Forward single + club 4 + two aft seats + belted lav.",
  },
  "learjet-35": {
    id: "learjet-35",
    floorWidthIn: 36,
    doors: [{ role: "main", side: "left", widthIn: 36, heightIn: 50, type: "clamshell", stationIn: 22, sillIn: 40, approx: true }],
    seats: [
      { stationIn: 40, side: "left", facing: "aft", removable: true }, { stationIn: 40, side: "right", facing: "aft", removable: true },
      { stationIn: 80, side: "left", facing: "aft", removable: true }, { stationIn: 80, side: "right", facing: "aft", removable: true },
      { stationIn: 120, side: "left", facing: "fwd", removable: true }, { stationIn: 120, side: "right", facing: "fwd", removable: true },
      { stationIn: 145, side: "left", facing: "side", removable: false },
    ],
    airframe: { overallLengthIn: 584, wingspanIn: 474, wing: "low", wingStrut: false, wingSweep: "moderate", tail: "T", engines: "aft-jets", noseToCabinFrontIn: 150, fuselageMaxWidthIn: 66, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/learjet/learjet-35a-specifications/25", "https://www.bjtonline.com/business-jet-news/learjet-35a-an-appealing-choice-for-the-right-buyer"],
    notes: "Forward-left two-piece clamshell door 36×50 (why it carries stretchers). Round fuselage with dropped aisle: ~36 in usable floor.",
  },
  "falcon-10": {
    id: "falcon-10",
    floorWidthIn: 44,
    doors: [{ role: "main", side: "left", widthIn: 31, heightIn: 58, type: "airstair", stationIn: 20, sillIn: 50, approx: true }],
    seats: [
      { stationIn: 45, side: "left", facing: "aft", removable: true }, { stationIn: 45, side: "right", facing: "aft", removable: true },
      { stationIn: 85, side: "left", facing: "fwd", removable: true }, { stationIn: 85, side: "right", facing: "fwd", removable: true },
      { stationIn: 130, side: "left", facing: "fwd", removable: true }, { stationIn: 130, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 545, wingspanIn: 515, wing: "low", wingStrut: false, wingSweep: "swept", tail: "cruciform", engines: "aft-jets", noseToCabinFrontIn: 140, fuselageMaxWidthIn: 72, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/dassault-falcon-jet/falcon-10-specifications/200", "https://www.bjtonline.com/sites/default/files/pdfs/falcon_10_100_additional_info.pdf"],
    notes: "Forward-left airstair 31×58. Aft row is a 3-place bench.",
  },
  "falcon-20": {
    id: "falcon-20",
    floorWidthIn: 60,
    doors: [{ role: "main", side: "left", widthIn: 30, heightIn: 58, type: "airstair", stationIn: 22, sillIn: 60, approx: true }],
    seats: [
      { stationIn: 70, side: "left", facing: "aft", removable: true }, { stationIn: 70, side: "right", facing: "aft", removable: true },
      { stationIn: 112, side: "left", facing: "fwd", removable: true }, { stationIn: 112, side: "right", facing: "fwd", removable: true },
      { stationIn: 165, side: "left", facing: "aft", removable: true }, { stationIn: 165, side: "right", facing: "aft", removable: true },
      { stationIn: 200, side: "left", facing: "side", removable: true },
      { stationIn: 205, side: "right", facing: "fwd", removable: true },
    ],
    airframe: { overallLengthIn: 675, wingspanIn: 642, wing: "low", wingStrut: false, wingSweep: "swept", tail: "cruciform", engines: "aft-jets", noseToCabinFrontIn: 165, fuselageMaxWidthIn: 80, gear: "retractable" },
    sources: ["https://www.globalair.com/aircraft-specifications/dassault-falcon-jet/falcon-20f-specifications/207", "https://jetav.com/dassault-falcon-20f-performance-specs/", "https://aviationcargo.dhl.com/sites/default/files/aircraft_dimension_sheets/falcon20.pdf"],
    notes: "Passenger aircraft: forward-left airstair only (width estimated). The 74×55 cargo door exists only on freighter conversions. Floor ~60 in from cargo sheets.",
  },
};

/* ---------- resolved geometry with class defaults ---------- */

export interface ResolvedGeometry {
  profile: AircraftProfile | null;
  /** The door cargo goes through: the `cargo` door if there is one, else the largest. */
  door: DoorSpec;
  floorWidthIn: number;
  airframe: AirframeSpec;
}

const CLASS_DEFAULTS: Record<Aircraft["category"], { sill: number; doorFrac: number; airframe: Omit<AirframeSpec, "overallLengthIn" | "wingspanIn" | "noseToCabinFrontIn" | "fuselageMaxWidthIn"> }> = {
  Piston: { sill: 26, doorFrac: 0.75, airframe: { wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", gear: "retractable" } },
  Turboprop: { sill: 40, doorFrac: 0.8, airframe: { wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", gear: "retractable" } },
  Jet: { sill: 44, doorFrac: 0.1, airframe: { wing: "low", wingStrut: false, wingSweep: "moderate", tail: "T", engines: "aft-jets", gear: "retractable" } },
  Other: { sill: 36, doorFrac: 0.5, airframe: { wing: "low", wingStrut: false, tail: "conventional", engines: "wing-props", gear: "retractable" } },
};

export function geometryFor(ac: Aircraft): ResolvedGeometry {
  const profile = PROFILES[ac.id] ?? null;
  const d = CLASS_DEFAULTS[ac.category];
  const door: DoorSpec =
    profile?.doors.find((x) => x.role === "cargo") ??
    (profile?.doors.length ? [...profile.doors].sort((a, b) => b.widthIn * b.heightIn - a.widthIn * a.heightIn)[0] : undefined) ?? {
      role: "main",
      side: "left",
      widthIn: ac.doorWidth,
      heightIn: ac.doorHeight,
      type: "airstair",
      stationIn: ac.cabinLength * d.doorFrac,
      sillIn: d.sill,
      approx: true,
    };
  const airframe: AirframeSpec = profile?.airframe ?? {
    ...d.airframe,
    overallLengthIn: ac.cabinLength * 2.4,
    wingspanIn: ac.cabinLength * 3.2,
    noseToCabinFrontIn: ac.cabinLength * 0.45,
    fuselageMaxWidthIn: ac.cabinWidth + 8,
  };
  return {
    profile,
    door,
    floorWidthIn: Math.min(ac.cabinWidth, profile?.floorWidthIn ?? ac.cabinWidth),
    airframe,
  };
}
