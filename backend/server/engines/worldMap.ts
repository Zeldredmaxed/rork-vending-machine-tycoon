/**
 * VendFX World Map — Procedural Generation Engine
 * 
 * Hybrid approach:
 *   - PERMANENT LAYER: Road grid + district type derived from a location seed (lat/lng).
 *     This never changes — the "bones" of the city are always the same for a given coordinate.
 *   - SEASONAL LAYER: Building details, vendor shop locations, black market alleys, NPC density
 *     are derived from a season seed (location seed + season ID). These rotate each season.
 *   - PLAYER LAYER: Vending machine placements, claimed spots, turf domes are stored in the DB.
 *     These persist across sessions and are overlaid on top of the procedural world.
 * 
 * Seed Algorithm:
 *   We use a deterministic hash (MurmurHash3-like) so the same input always produces
 *   the same output. No randomness — pure math from coordinates.
 * 
 * Grid System:
 *   The world is divided into "blocks" at a fixed zoom level. Each block is roughly
 *   ~100m x 100m in real-world terms (0.001 degrees lat/lng). When a player zooms in,
 *   we generate a 5x5 grid of blocks centered on their view.
 */

// ============================================================================
// SEED & HASH FUNCTIONS
// ============================================================================

/**
 * Deterministic 32-bit hash from a string.
 * Based on MurmurHash3 — fast, well-distributed, zero external deps.
 */
export function hashString(str: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0; // Ensure unsigned 32-bit
}

/**
 * Create a seeded pseudo-random number generator.
 * Returns a function that produces deterministic floats in [0, 1).
 * Each call advances the internal state.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0x100000000;
  };
}

/**
 * Generate the permanent location seed from lat/lng.
 * Quantizes coordinates to block-level precision (~100m).
 */
export function locationSeed(lat: number, lng: number): number {
  const blockLat = Math.floor(lat * 1000);
  const blockLng = Math.floor(lng * 1000);
  return hashString(`vendfx:${blockLat}:${blockLng}`);
}

/**
 * Generate the seasonal seed from lat/lng + season ID.
 * Same location, different season = different details.
 */
export function seasonalSeed(lat: number, lng: number, seasonId: number): number {
  const blockLat = Math.floor(lat * 1000);
  const blockLng = Math.floor(lng * 1000);
  return hashString(`vendfx:${blockLat}:${blockLng}:season${seasonId}`);
}

// ============================================================================
// DISTRICT TYPES
// ============================================================================

export type DistrictType =
  | "downtown"
  | "residential"
  | "retail"
  | "industrial"
  | "transit"
  | "park";

export interface DistrictConfig {
  type: DistrictType;
  label: string;
  /** Weight for random selection (higher = more common) */
  weight: number;
  /** Foot traffic multiplier (1.0 = baseline) */
  footTrafficMultiplier: number;
  /** Monthly rent cost multiplier */
  rentMultiplier: number;
  /** Vending demand multiplier */
  vendingDemandMultiplier: number;
  /** NPC density (NPCs per block) */
  npcDensityRange: [number, number];
  /** Vehicle density (vehicles per road tile) */
  vehicleDensityRange: [number, number];
  /** Building pool — which building types can appear */
  buildingPool: BuildingType[];
  /** Prop density (props per sidewalk tile) */
  propDensityRange: [number, number];
}

export const DISTRICT_CONFIGS: Record<DistrictType, DistrictConfig> = {
  downtown: {
    type: "downtown",
    label: "Downtown / Commercial",
    weight: 20,
    footTrafficMultiplier: 2.0,
    rentMultiplier: 2.5,
    vendingDemandMultiplier: 1.8,
    npcDensityRange: [8, 15],
    vehicleDensityRange: [3, 6],
    buildingPool: ["office_skyscraper", "office_skyscraper", "retail_strip_mall", "subway_station"],
    propDensityRange: [3, 6],
  },
  residential: {
    type: "residential",
    label: "Residential",
    weight: 30,
    footTrafficMultiplier: 1.0,
    rentMultiplier: 1.0,
    vendingDemandMultiplier: 1.0,
    npcDensityRange: [3, 8],
    vehicleDensityRange: [1, 3],
    buildingPool: ["residential_apartment", "residential_apartment", "public_park", "retail_strip_mall"],
    propDensityRange: [2, 5],
  },
  retail: {
    type: "retail",
    label: "Retail / Entertainment",
    weight: 20,
    footTrafficMultiplier: 1.8,
    rentMultiplier: 2.0,
    vendingDemandMultiplier: 2.2,
    npcDensityRange: [6, 12],
    vehicleDensityRange: [2, 5],
    buildingPool: ["retail_strip_mall", "retail_strip_mall", "office_skyscraper", "subway_station"],
    propDensityRange: [4, 7],
  },
  industrial: {
    type: "industrial",
    label: "Industrial",
    weight: 15,
    footTrafficMultiplier: 0.5,
    rentMultiplier: 0.6,
    vendingDemandMultiplier: 0.4,
    npcDensityRange: [1, 4],
    vehicleDensityRange: [2, 4],
    buildingPool: ["industrial_factory", "industrial_factory", "residential_apartment"],
    propDensityRange: [1, 3],
  },
  transit: {
    type: "transit",
    label: "Transit Hub",
    weight: 10,
    footTrafficMultiplier: 2.5,
    rentMultiplier: 3.0,
    vendingDemandMultiplier: 2.5,
    npcDensityRange: [10, 20],
    vehicleDensityRange: [4, 8],
    buildingPool: ["subway_station", "office_skyscraper", "retail_strip_mall"],
    propDensityRange: [3, 5],
  },
  park: {
    type: "park",
    label: "Park / Green Space",
    weight: 5,
    footTrafficMultiplier: 0.8,
    rentMultiplier: 0.3,
    vendingDemandMultiplier: 0.6,
    npcDensityRange: [2, 6],
    vehicleDensityRange: [0, 1],
    buildingPool: ["public_park"],
    propDensityRange: [5, 10],
  },
};

/**
 * Determine district type from the permanent location seed.
 * Uses weighted random selection — downtown and residential are most common.
 */
export function getDistrictType(lat: number, lng: number): DistrictType {
  const seed = locationSeed(lat, lng);
  const rng = createSeededRng(seed);
  
  const types = Object.values(DISTRICT_CONFIGS);
  const totalWeight = types.reduce((sum, d) => sum + d.weight, 0);
  
  let roll = rng() * totalWeight;
  for (const district of types) {
    roll -= district.weight;
    if (roll <= 0) return district.type;
  }
  return "residential"; // fallback
}

// ============================================================================
// BUILDING TYPES & SPRITES
// ============================================================================

export type BuildingType =
  | "office_skyscraper"
  | "residential_apartment"
  | "retail_strip_mall"
  | "subway_station"
  | "industrial_factory"
  | "public_park";

export interface BuildingSprite {
  type: BuildingType;
  spriteKey: string;
  widthTiles: number;
  heightTiles: number;
  footTrafficBonus: number;
}

export const BUILDING_SPRITES: Record<BuildingType, BuildingSprite> = {
  office_skyscraper: {
    type: "office_skyscraper",
    spriteKey: "city-buildings/01_office_skyscraper",
    widthTiles: 2,
    heightTiles: 2,
    footTrafficBonus: 30,
  },
  residential_apartment: {
    type: "residential_apartment",
    spriteKey: "city-buildings/02_residential_apartment",
    widthTiles: 2,
    heightTiles: 2,
    footTrafficBonus: 10,
  },
  retail_strip_mall: {
    type: "retail_strip_mall",
    spriteKey: "city-buildings/03_neon_retail_strip_mall",
    widthTiles: 3,
    heightTiles: 2,
    footTrafficBonus: 25,
  },
  subway_station: {
    type: "subway_station",
    spriteKey: "city-buildings/04_subway_transit_station",
    widthTiles: 2,
    heightTiles: 2,
    footTrafficBonus: 50,
  },
  industrial_factory: {
    type: "industrial_factory",
    spriteKey: "city-buildings/05_industrial_factory",
    widthTiles: 3,
    heightTiles: 3,
    footTrafficBonus: 5,
  },
  public_park: {
    type: "public_park",
    spriteKey: "city-buildings/06_public_park_plaza",
    widthTiles: 3,
    heightTiles: 3,
    footTrafficBonus: 15,
  },
};

// ============================================================================
// ROAD TILE TYPES
// ============================================================================

export type RoadTileType =
  | "straight_h"     // horizontal straight
  | "straight_v"     // vertical straight
  | "intersection_4" // 4-way intersection
  | "intersection_t" // T-junction
  | "corner"         // 90-degree corner
  | "empty";         // no road (building/prop space)

export interface RoadTile {
  type: RoadTileType;
  spriteKey: string;
  rotation: number; // degrees (0, 90, 180, 270)
}

export const ROAD_SPRITES: Record<string, string> = {
  straight: "city-props/01_road_straight",
  intersection_4: "city-props/02_road_4way",
  intersection_t: "city-props/03_road_tjunction",
  corner: "city-props/04_road_corner",
};

// ============================================================================
// PROP TYPES
// ============================================================================

export type PropType =
  | "streetlight"
  | "tree"
  | "bus_stop"
  | "bench"
  | "claim_marker"
  | "turf_dome";

export interface PropSprite {
  type: PropType;
  spriteKey: string;
  /** Weight for random placement (higher = more common) */
  spawnWeight: number;
  /** Can this prop appear on sidewalks? */
  sidewalkOnly: boolean;
}

export const PROP_SPRITES: PropSprite[] = [
  { type: "streetlight", spriteKey: "city-props/05_streetlight", spawnWeight: 30, sidewalkOnly: true },
  { type: "tree", spriteKey: "city-props/06_tree_planter", spawnWeight: 25, sidewalkOnly: false },
  { type: "bus_stop", spriteKey: "city-props/07_bus_stop", spawnWeight: 8, sidewalkOnly: true },
  { type: "bench", spriteKey: "city-props/08_park_bench", spawnWeight: 20, sidewalkOnly: true },
];

// ============================================================================
// NPC TYPES
// ============================================================================

export type NpcType =
  | "delivery_worker"
  | "mechanic"
  | "angry_worker"
  | "npc_male_trenchcoat"
  | "npc_female_neon"
  | "npc_purchasing"
  | "npc_crowd"
  | "npc_businessman"
  | "npc_jogger"
  | "npc_street_musician"
  | "npc_security_guard";

export interface NpcSprite {
  type: NpcType;
  spriteKey: string;
  /** Weight for random spawning */
  spawnWeight: number;
  /** Is this an ambient NPC (walks around) or stationary? */
  isAmbient: boolean;
  /** Can only appear in certain district types? null = any */
  districtRestriction: DistrictType[] | null;
}

export const NPC_SPRITES: NpcSprite[] = [
  { type: "npc_male_trenchcoat", spriteKey: "characters/04_npc_male_trenchcoat", spawnWeight: 20, isAmbient: true, districtRestriction: null },
  { type: "npc_female_neon", spriteKey: "characters/05_npc_female_neon", spawnWeight: 20, isAmbient: true, districtRestriction: null },
  { type: "npc_businessman", spriteKey: "characters/08_npc_businessman", spawnWeight: 15, isAmbient: true, districtRestriction: ["downtown", "retail", "transit"] },
  { type: "npc_jogger", spriteKey: "characters/09_npc_jogger", spawnWeight: 10, isAmbient: true, districtRestriction: ["park", "residential"] },
  { type: "npc_crowd", spriteKey: "characters/07_npc_crowd", spawnWeight: 8, isAmbient: false, districtRestriction: ["downtown", "retail", "transit"] },
  { type: "npc_purchasing", spriteKey: "characters/06_npc_purchasing", spawnWeight: 12, isAmbient: false, districtRestriction: null },
  { type: "npc_street_musician", spriteKey: "characters/10_npc_street_musician", spawnWeight: 5, isAmbient: false, districtRestriction: ["retail", "park", "transit"] },
  { type: "npc_security_guard", spriteKey: "characters/11_npc_security_guard", spawnWeight: 6, isAmbient: false, districtRestriction: ["downtown", "retail", "transit"] },
  // Worker NPCs — these are player-specific, spawned near player machines
  { type: "delivery_worker", spriteKey: "characters/01_delivery_worker", spawnWeight: 0, isAmbient: false, districtRestriction: null },
  { type: "mechanic", spriteKey: "characters/02_mechanic", spawnWeight: 0, isAmbient: false, districtRestriction: null },
  { type: "angry_worker", spriteKey: "characters/03_angry_worker", spawnWeight: 0, isAmbient: false, districtRestriction: null },
];

// ============================================================================
// VEHICLE TYPES
// ============================================================================

export type VehicleType =
  | "hr_compact_car"
  | "hr_delivery_van"
  | "fleet_box_truck"
  | "civilian_sedan"
  | "civilian_coupe"
  | "drone_active"
  | "drone_broken";

export interface VehicleSprite {
  type: VehicleType;
  spriteKey: string;
  spawnWeight: number;
  /** Is this a player vehicle or ambient traffic? */
  isPlayerVehicle: boolean;
}

export const VEHICLE_SPRITES: VehicleSprite[] = [
  { type: "civilian_sedan", spriteKey: "vehicles/04_civilian_sedan", spawnWeight: 35, isPlayerVehicle: false },
  { type: "civilian_coupe", spriteKey: "vehicles/05_civilian_coupe", spawnWeight: 25, isPlayerVehicle: false },
  { type: "hr_compact_car", spriteKey: "vehicles/01_hr_compact_car", spawnWeight: 0, isPlayerVehicle: true },
  { type: "hr_delivery_van", spriteKey: "vehicles/02_hr_delivery_van", spawnWeight: 0, isPlayerVehicle: true },
  { type: "fleet_box_truck", spriteKey: "vehicles/03_fleet_box_truck", spawnWeight: 0, isPlayerVehicle: true },
  { type: "drone_active", spriteKey: "vehicles/06_drone_active", spawnWeight: 0, isPlayerVehicle: true },
  { type: "drone_broken", spriteKey: "vehicles/07_drone_broken", spawnWeight: 0, isPlayerVehicle: true },
];

// ============================================================================
// VENDING MACHINE SPRITE MAPPING
// ============================================================================

export type VendingMachineType =
  | "classic_beverage"
  | "glass_front_snack"
  | "combo_unit"
  | "healthy_organic"
  | "coffee_espresso"
  | "hot_food_noodle"
  | "ice_cream_frozen"
  | "electronics"
  | "pharmacy_otc"
  | "gacha_capsule"
  | "mega_vendor"
  | "abandoned_rusted";

export const VENDING_MACHINE_SPRITES: Record<VendingMachineType, string> = {
  classic_beverage: "vending-machines/01_classic_beverage",
  glass_front_snack: "vending-machines/02_glass_front_snack",
  combo_unit: "vending-machines/03_combo_unit",
  healthy_organic: "vending-machines/04_healthy_organic",
  coffee_espresso: "vending-machines/05_coffee_espresso",
  hot_food_noodle: "vending-machines/06_hot_food_noodle",
  ice_cream_frozen: "vending-machines/07_ice_cream_frozen",
  electronics: "vending-machines/08_electronics",
  pharmacy_otc: "vending-machines/09_pharmacy_otc",
  gacha_capsule: "vending-machines/10_gacha_capsule",
  mega_vendor: "vending-machines/11_mega_vendor",
  abandoned_rusted: "vending-machines/12_abandoned_rusted",
};

// ============================================================================
// SUPPLIER & BLACK MARKET
// ============================================================================

export type SupplierType =
  | "sugar_rush"
  | "liquid_oasis"
  | "fresh_farm"
  | "tech_mech"
  | "arctic_chill"
  | "mega_mart_hq"
  | "black_market_alley";

export interface SupplierConfig {
  type: SupplierType;
  spriteKey: string;
  label: string;
  /** Is this a black market (illegal) shop? */
  isBlackMarket: boolean;
  /** Spawn probability per block (0.0 - 1.0) */
  spawnProbability: number;
  /** Discount multiplier (lower = cheaper goods) */
  priceMultiplier: number;
  /** Fine amount if caught with stolen goods (black market only) */
  fineAmount?: number;
  /** Chance of getting caught per purchase (black market only) */
  caughtChance?: number;
}

export const SUPPLIER_CONFIGS: SupplierConfig[] = [
  { type: "sugar_rush", spriteKey: "suppliers/01_sugar_rush", label: "Sugar Rush Sweets", isBlackMarket: false, spawnProbability: 0.04, priceMultiplier: 0.85 },
  { type: "liquid_oasis", spriteKey: "suppliers/02_liquid_oasis", label: "Liquid Oasis Beverages", isBlackMarket: false, spawnProbability: 0.04, priceMultiplier: 0.80 },
  { type: "fresh_farm", spriteKey: "suppliers/03_fresh_farm", label: "Fresh Farm Organic", isBlackMarket: false, spawnProbability: 0.03, priceMultiplier: 0.90 },
  { type: "tech_mech", spriteKey: "suppliers/04_tech_mech", label: "Tech-Mech Scrapyard", isBlackMarket: false, spawnProbability: 0.03, priceMultiplier: 0.75 },
  { type: "arctic_chill", spriteKey: "suppliers/05_arctic_chill", label: "Arctic Chill Frozen", isBlackMarket: false, spawnProbability: 0.03, priceMultiplier: 0.88 },
  { type: "mega_mart_hq", spriteKey: "suppliers/06_mega_mart_hq", label: "Mega-Mart Corporate", isBlackMarket: false, spawnProbability: 0.01, priceMultiplier: 0.70 },
  {
    type: "black_market_alley",
    spriteKey: "suppliers/07_black_market_alley",
    label: "???",
    isBlackMarket: true,
    spawnProbability: 0.015, // 1.5% per block — very rare
    priceMultiplier: 0.40,  // 60% discount — amazing prices
    fineAmount: 5000,       // $5,000 fine if caught
    caughtChance: 0.25,     // 25% chance per purchase
  },
];

// ============================================================================
// WAREHOUSE SPRITE MAPPING
// ============================================================================

export const WAREHOUSE_SPRITES = {
  tier1: "warehouses/01_basic_storage_locker",
  tier2: "warehouses/02_commercial_warehouse",
  tier3: "warehouses/03_regional_distribution_center",
  refrigerator: "warehouses/04_industrial_refrigerator",
  deep_freeze: "warehouses/05_deep_freeze_unit",
  generator: "warehouses/06_backup_generator",
};

// ============================================================================
// BLOCK GENERATION — THE CORE ENGINE
// ============================================================================

/** Grid size for a single block (tiles) */
export const BLOCK_GRID_SIZE = 8;

/** How many blocks to generate for a viewport */
export const VIEWPORT_BLOCKS = 5; // 5x5 = 25 blocks

export interface BlockCoord {
  blockLat: number;
  blockLng: number;
}

export interface GeneratedRoadTile {
  x: number;
  y: number;
  type: RoadTileType;
  spriteKey: string;
  rotation: number;
}

export interface GeneratedBuilding {
  x: number;
  y: number;
  type: BuildingType;
  spriteKey: string;
  widthTiles: number;
  heightTiles: number;
  /** Seasonal variant index — changes which specific building skin is used */
  variantIndex: number;
}

export interface GeneratedProp {
  x: number;
  y: number;
  type: PropType;
  spriteKey: string;
}

export interface GeneratedNpc {
  x: number;
  y: number;
  type: NpcType;
  spriteKey: string;
  isAmbient: boolean;
  /** Walking direction for ambient NPCs (degrees) */
  walkDirection: number;
}

export interface GeneratedVehicle {
  x: number;
  y: number;
  type: VehicleType;
  spriteKey: string;
  /** Direction of travel (degrees) */
  direction: number;
}

export interface GeneratedSupplier {
  x: number;
  y: number;
  type: SupplierType;
  spriteKey: string;
  label: string;
  isBlackMarket: boolean;
  priceMultiplier: number;
  fineAmount?: number;
  caughtChance?: number;
}

export interface GeneratedBlock {
  /** Block coordinates (quantized lat/lng * 1000) */
  blockLat: number;
  blockLng: number;
  /** Real-world center coordinates */
  centerLat: number;
  centerLng: number;
  /** District type (permanent) */
  districtType: DistrictType;
  districtConfig: DistrictConfig;
  /** Layer 1: Road grid (permanent) */
  roads: GeneratedRoadTile[];
  /** Layer 2: Buildings (seasonal) */
  buildings: GeneratedBuilding[];
  /** Layer 3: Props (permanent) */
  props: GeneratedProp[];
  /** Layer 4: Ambient NPCs (seasonal, client-side animated) */
  npcs: GeneratedNpc[];
  /** Layer 5: Ambient vehicles (seasonal, client-side animated) */
  vehicles: GeneratedVehicle[];
  /** Supplier shops in this block (seasonal) */
  suppliers: GeneratedSupplier[];
  /** Calculated foot traffic for this block */
  footTraffic: number;
}

/**
 * Generate the permanent road grid for a block.
 * Uses a simple pattern: roads on every 4th row/column, creating city blocks.
 */
export function generateRoadGrid(lat: number, lng: number): GeneratedRoadTile[] {
  const seed = locationSeed(lat, lng);
  const rng = createSeededRng(seed + 1); // offset to avoid correlation with district
  const roads: GeneratedRoadTile[] = [];

  for (let y = 0; y < BLOCK_GRID_SIZE; y++) {
    for (let x = 0; x < BLOCK_GRID_SIZE; x++) {
      const isHorizontalRoad = y === 0 || y === BLOCK_GRID_SIZE - 1 || y === Math.floor(BLOCK_GRID_SIZE / 2);
      const isVerticalRoad = x === 0 || x === BLOCK_GRID_SIZE - 1 || x === Math.floor(BLOCK_GRID_SIZE / 2);

      if (isHorizontalRoad && isVerticalRoad) {
        // Intersection
        roads.push({
          x, y,
          type: "intersection_4",
          spriteKey: ROAD_SPRITES.intersection_4,
          rotation: 0,
        });
      } else if (isHorizontalRoad) {
        roads.push({
          x, y,
          type: "straight_h",
          spriteKey: ROAD_SPRITES.straight,
          rotation: 0,
        });
      } else if (isVerticalRoad) {
        roads.push({
          x, y,
          type: "straight_v",
          spriteKey: ROAD_SPRITES.straight,
          rotation: 90,
        });
      } else {
        roads.push({
          x, y,
          type: "empty",
          spriteKey: "",
          rotation: 0,
        });
      }
    }
  }

  // Add some variation — occasionally convert a 4-way to a T-junction
  for (const road of roads) {
    if (road.type === "intersection_4" && rng() < 0.3) {
      road.type = "intersection_t";
      road.spriteKey = ROAD_SPRITES.intersection_t;
      road.rotation = Math.floor(rng() * 4) * 90;
    }
  }

  return roads;
}

/**
 * Generate buildings for a block (seasonal layer).
 * Places buildings in the empty spaces between roads.
 */
export function generateBuildings(
  lat: number,
  lng: number,
  seasonId: number,
  districtConfig: DistrictConfig,
  roads: GeneratedRoadTile[]
): GeneratedBuilding[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed);
  const buildings: GeneratedBuilding[] = [];

  // Find empty (non-road) areas
  const occupied = new Set<string>();
  for (const road of roads) {
    if (road.type !== "empty") {
      occupied.add(`${road.x},${road.y}`);
    }
  }

  // Try to place buildings in empty spaces
  const pool = districtConfig.buildingPool;
  
  for (let y = 1; y < BLOCK_GRID_SIZE - 1; y++) {
    for (let x = 1; x < BLOCK_GRID_SIZE - 1; x++) {
      if (occupied.has(`${x},${y}`)) continue;
      
      // Pick a random building from the pool
      const buildingType = pool[Math.floor(rng() * pool.length)];
      const sprite = BUILDING_SPRITES[buildingType];
      
      // Check if building fits (simplified — just check if the cell is free)
      if (!occupied.has(`${x},${y}`)) {
        buildings.push({
          x, y,
          type: buildingType,
          spriteKey: sprite.spriteKey,
          widthTiles: 1, // Simplified to 1 tile for grid placement
          heightTiles: 1,
          variantIndex: Math.floor(rng() * 4),
        });
        occupied.add(`${x},${y}`);
      }
    }
  }

  return buildings;
}

/**
 * Generate props for a block (permanent layer).
 * Scatters streetlights, trees, benches along road edges.
 */
export function generateProps(
  lat: number,
  lng: number,
  districtConfig: DistrictConfig,
  roads: GeneratedRoadTile[]
): GeneratedProp[] {
  const seed = locationSeed(lat, lng);
  const rng = createSeededRng(seed + 2);
  const props: GeneratedProp[] = [];

  const [minProps, maxProps] = districtConfig.propDensityRange;
  const propCount = Math.floor(rng() * (maxProps - minProps + 1)) + minProps;

  // Find sidewalk positions (adjacent to roads but not on roads)
  const roadSet = new Set<string>();
  for (const road of roads) {
    if (road.type !== "empty") {
      roadSet.add(`${road.x},${road.y}`);
    }
  }

  const sidewalkPositions: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < BLOCK_GRID_SIZE; y++) {
    for (let x = 0; x < BLOCK_GRID_SIZE; x++) {
      if (roadSet.has(`${x},${y}`)) continue;
      // Check if adjacent to a road
      const neighbors = [
        `${x - 1},${y}`, `${x + 1},${y}`,
        `${x},${y - 1}`, `${x},${y + 1}`,
      ];
      if (neighbors.some((n) => roadSet.has(n))) {
        sidewalkPositions.push({ x, y });
      }
    }
  }

  // Place props on sidewalks
  const totalWeight = PROP_SPRITES.reduce((sum, p) => sum + p.spawnWeight, 0);
  
  for (let i = 0; i < Math.min(propCount, sidewalkPositions.length); i++) {
    const posIdx = Math.floor(rng() * sidewalkPositions.length);
    const pos = sidewalkPositions.splice(posIdx, 1)[0];

    // Weighted random prop selection
    let roll = rng() * totalWeight;
    let selectedProp = PROP_SPRITES[0];
    for (const prop of PROP_SPRITES) {
      roll -= prop.spawnWeight;
      if (roll <= 0) {
        selectedProp = prop;
        break;
      }
    }

    props.push({
      x: pos.x,
      y: pos.y,
      type: selectedProp.type,
      spriteKey: selectedProp.spriteKey,
    });
  }

  return props;
}

/**
 * Generate ambient NPCs for a block (seasonal layer).
 */
export function generateNpcs(
  lat: number,
  lng: number,
  seasonId: number,
  districtConfig: DistrictConfig,
  roads: GeneratedRoadTile[]
): GeneratedNpc[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed + 3);
  const npcs: GeneratedNpc[] = [];

  const [minNpcs, maxNpcs] = districtConfig.npcDensityRange;
  const npcCount = Math.floor(rng() * (maxNpcs - minNpcs + 1)) + minNpcs;

  // Filter NPCs that can appear in this district
  const eligibleNpcs = NPC_SPRITES.filter((npc) => {
    if (npc.spawnWeight === 0) return false; // Player-specific NPCs
    if (npc.districtRestriction === null) return true;
    return npc.districtRestriction.includes(districtConfig.type);
  });

  const totalWeight = eligibleNpcs.reduce((sum, n) => sum + n.spawnWeight, 0);

  // Find walkable positions (roads and sidewalks)
  const walkablePositions: Array<{ x: number; y: number }> = [];
  for (const road of roads) {
    walkablePositions.push({ x: road.x, y: road.y });
  }

  for (let i = 0; i < npcCount && walkablePositions.length > 0; i++) {
    const posIdx = Math.floor(rng() * walkablePositions.length);
    const pos = walkablePositions[posIdx];

    // Weighted random NPC selection
    let roll = rng() * totalWeight;
    let selectedNpc = eligibleNpcs[0];
    for (const npc of eligibleNpcs) {
      roll -= npc.spawnWeight;
      if (roll <= 0) {
        selectedNpc = npc;
        break;
      }
    }

    npcs.push({
      x: pos.x + rng() * 0.8 - 0.4, // Slight offset for natural look
      y: pos.y + rng() * 0.8 - 0.4,
      type: selectedNpc.type,
      spriteKey: selectedNpc.spriteKey,
      isAmbient: selectedNpc.isAmbient,
      walkDirection: rng() * 360,
    });
  }

  return npcs;
}

/**
 * Generate ambient vehicles for a block (seasonal layer).
 */
export function generateVehicles(
  lat: number,
  lng: number,
  seasonId: number,
  districtConfig: DistrictConfig,
  roads: GeneratedRoadTile[]
): GeneratedVehicle[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed + 4);
  const vehicles: GeneratedVehicle[] = [];

  const [minVehicles, maxVehicles] = districtConfig.vehicleDensityRange;
  const vehicleCount = Math.floor(rng() * (maxVehicles - minVehicles + 1)) + minVehicles;

  // Only civilian vehicles spawn as ambient traffic
  const ambientVehicles = VEHICLE_SPRITES.filter((v) => !v.isPlayerVehicle);
  const totalWeight = ambientVehicles.reduce((sum, v) => sum + v.spawnWeight, 0);

  // Find road positions for vehicles
  const roadPositions = roads.filter((r) => r.type !== "empty");

  for (let i = 0; i < vehicleCount && roadPositions.length > 0; i++) {
    const posIdx = Math.floor(rng() * roadPositions.length);
    const pos = roadPositions[posIdx];

    let roll = rng() * totalWeight;
    let selectedVehicle = ambientVehicles[0];
    for (const vehicle of ambientVehicles) {
      roll -= vehicle.spawnWeight;
      if (roll <= 0) {
        selectedVehicle = vehicle;
        break;
      }
    }

    // Direction based on road orientation
    const direction = pos.type === "straight_h" ? (rng() > 0.5 ? 0 : 180) : (rng() > 0.5 ? 90 : 270);

    vehicles.push({
      x: pos.x + rng() * 0.4 - 0.2,
      y: pos.y + rng() * 0.4 - 0.2,
      type: selectedVehicle.type,
      spriteKey: selectedVehicle.spriteKey,
      direction,
    });
  }

  return vehicles;
}

/**
 * Check if a supplier shop spawns in this block (seasonal layer).
 */
export function generateSuppliers(
  lat: number,
  lng: number,
  seasonId: number
): GeneratedSupplier[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed + 5);
  const suppliers: GeneratedSupplier[] = [];

  for (const config of SUPPLIER_CONFIGS) {
    if (rng() < config.spawnProbability) {
      suppliers.push({
        x: 1 + Math.floor(rng() * (BLOCK_GRID_SIZE - 2)),
        y: 1 + Math.floor(rng() * (BLOCK_GRID_SIZE - 2)),
        type: config.type,
        spriteKey: config.spriteKey,
        label: config.label,
        isBlackMarket: config.isBlackMarket,
        priceMultiplier: config.priceMultiplier,
        fineAmount: config.fineAmount,
        caughtChance: config.caughtChance,
      });
    }
  }

  return suppliers;
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate a complete block with all layers.
 * This is the main entry point for the world map renderer.
 */
export function generateBlock(lat: number, lng: number, seasonId: number): GeneratedBlock {
  const blockLat = Math.floor(lat * 1000);
  const blockLng = Math.floor(lng * 1000);
  const centerLat = (blockLat + 0.5) / 1000;
  const centerLng = (blockLng + 0.5) / 1000;

  // Permanent layer: district type
  const districtType = getDistrictType(lat, lng);
  const districtConfig = DISTRICT_CONFIGS[districtType];

  // Permanent layer: road grid
  const roads = generateRoadGrid(lat, lng);

  // Permanent layer: props
  const props = generateProps(lat, lng, districtConfig, roads);

  // Seasonal layer: buildings
  const buildings = generateBuildings(lat, lng, seasonId, districtConfig, roads);

  // Seasonal layer: NPCs
  const npcs = generateNpcs(lat, lng, seasonId, districtConfig, roads);

  // Seasonal layer: vehicles
  const vehicles = generateVehicles(lat, lng, seasonId, districtConfig, roads);

  // Seasonal layer: supplier shops
  const suppliers = generateSuppliers(lat, lng, seasonId);

  // Calculate foot traffic
  const buildingTraffic = buildings.reduce(
    (sum, b) => sum + BUILDING_SPRITES[b.type].footTrafficBonus,
    0
  );
  const footTraffic = Math.round(
    (buildingTraffic + npcs.length * 5) * districtConfig.footTrafficMultiplier
  );

  return {
    blockLat,
    blockLng,
    centerLat,
    centerLng,
    districtType,
    districtConfig,
    roads,
    buildings,
    props,
    npcs,
    vehicles,
    suppliers,
    footTraffic,
  };
}

/**
 * Generate a viewport of blocks (5x5 grid centered on coordinates).
 * This is what the client requests when the player zooms into an area.
 */
export function generateViewport(
  centerLat: number,
  centerLng: number,
  seasonId: number,
  radius: number = 2 // blocks in each direction from center
): GeneratedBlock[] {
  const blocks: GeneratedBlock[] = [];
  const blockStep = 0.001; // ~100m per block

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const lat = centerLat + dy * blockStep;
      const lng = centerLng + dx * blockStep;
      blocks.push(generateBlock(lat, lng, seasonId));
    }
  }

  return blocks;
}

/**
 * Get a summary of what a player would see at a location.
 * Useful for the map overview / preview before zooming in.
 */
export function getLocationSummary(lat: number, lng: number, seasonId: number): {
  districtType: DistrictType;
  districtLabel: string;
  footTrafficLevel: "very_low" | "low" | "medium" | "high" | "very_high";
  rentCostMultiplier: number;
  vendingDemandMultiplier: number;
  hasSupplier: boolean;
  hasBlackMarket: boolean;
  supplierNames: string[];
} {
  const block = generateBlock(lat, lng, seasonId);
  
  const trafficLevel =
    block.footTraffic < 20 ? "very_low" :
    block.footTraffic < 50 ? "low" :
    block.footTraffic < 100 ? "medium" :
    block.footTraffic < 200 ? "high" : "very_high";

  return {
    districtType: block.districtType,
    districtLabel: block.districtConfig.label,
    footTrafficLevel: trafficLevel,
    rentCostMultiplier: block.districtConfig.rentMultiplier,
    vendingDemandMultiplier: block.districtConfig.vendingDemandMultiplier,
    hasSupplier: block.suppliers.length > 0,
    hasBlackMarket: block.suppliers.some((s) => s.isBlackMarket),
    supplierNames: block.suppliers.filter((s) => !s.isBlackMarket).map((s) => s.label),
  };
}

/**
 * Simulate a black market purchase.
 * Returns whether the player got caught and the fine amount.
 */
export function attemptBlackMarketPurchase(
  supplierType: SupplierType,
  purchaseAmount: number
): {
  success: boolean;
  caught: boolean;
  fineAmount: number;
  discountedPrice: number;
} {
  const config = SUPPLIER_CONFIGS.find((s) => s.type === supplierType);
  if (!config || !config.isBlackMarket) {
    return { success: false, caught: false, fineAmount: 0, discountedPrice: purchaseAmount };
  }

  const discountedPrice = purchaseAmount * config.priceMultiplier;
  const caught = Math.random() < (config.caughtChance ?? 0);

  return {
    success: true,
    caught,
    fineAmount: caught ? (config.fineAmount ?? 0) : 0,
    discountedPrice,
  };
}
