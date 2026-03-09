import { useRef, useEffect, useState, useCallback } from "react";
import { SPRITE_URLS } from "@/lib/spriteUrls";

// ============================================================================
// INLINE PROCEDURAL ENGINE (mirrors server/engines/worldMap.ts)
// ============================================================================

function hashString(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createSeededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

function locationSeed(lat: number, lng: number): number {
  const bLat = Math.floor(lat * 1000);
  const bLng = Math.floor(lng * 1000);
  return hashString(`loc:${bLat}:${bLng}`);
}

function seasonalSeed(lat: number, lng: number, seasonId: number): number {
  const bLat = Math.floor(lat * 1000);
  const bLng = Math.floor(lng * 1000);
  return hashString(`season:${bLat}:${bLng}:${seasonId}`);
}

const GRID = 12;

type DistrictType = "downtown" | "residential" | "retail" | "industrial" | "transit" | "park";

interface DistrictConfig {
  weight: number;
  label: string;
  color: string;
  buildingPool: string[];
  npcRange: [number, number];
  vehicleRange: [number, number];
  propRange: [number, number];
  footTraffic: number;
  vendingDemand: number;
}

const DISTRICTS: Record<DistrictType, DistrictConfig> = {
  downtown: {
    weight: 20, label: "Downtown / Commercial", color: "#1a3a5c",
    buildingPool: ["office_skyscraper", "office_skyscraper", "residential_apartment"],
    npcRange: [12, 20], vehicleRange: [4, 8], propRange: [6, 10],
    footTraffic: 1.4, vendingDemand: 1.5,
  },
  residential: {
    weight: 25, label: "Residential", color: "#2a3a2a",
    buildingPool: ["residential_apartment", "residential_apartment", "public_park_plaza"],
    npcRange: [6, 12], vehicleRange: [2, 5], propRange: [8, 14],
    footTraffic: 0.8, vendingDemand: 0.7,
  },
  retail: {
    weight: 20, label: "Retail / Shopping", color: "#3a2a3a",
    buildingPool: ["neon_retail_strip_mall", "neon_retail_strip_mall", "office_skyscraper"],
    npcRange: [10, 18], vehicleRange: [3, 7], propRange: [5, 9],
    footTraffic: 1.3, vendingDemand: 1.4,
  },
  industrial: {
    weight: 15, label: "Industrial", color: "#2a2a1a",
    buildingPool: ["industrial_factory", "industrial_factory", "office_skyscraper"],
    npcRange: [3, 8], vehicleRange: [5, 10], propRange: [3, 6],
    footTraffic: 0.5, vendingDemand: 0.6,
  },
  transit: {
    weight: 10, label: "Transit Hub", color: "#1a2a3a",
    buildingPool: ["subway_transit_station", "office_skyscraper", "neon_retail_strip_mall"],
    npcRange: [15, 25], vehicleRange: [6, 12], propRange: [4, 8],
    footTraffic: 1.6, vendingDemand: 1.8,
  },
  park: {
    weight: 10, label: "Park / Recreation", color: "#1a3a1a",
    buildingPool: ["public_park_plaza"],
    npcRange: [8, 15], vehicleRange: [1, 3], propRange: [10, 18],
    footTraffic: 1.0, vendingDemand: 0.9,
  },
};

function getDistrictType(lat: number, lng: number): DistrictType {
  const seed = locationSeed(lat, lng);
  const rng = createSeededRng(seed);
  const roll = rng() * 100;
  let cumulative = 0;
  for (const [type, config] of Object.entries(DISTRICTS) as [DistrictType, DistrictConfig][]) {
    cumulative += config.weight;
    if (roll < cumulative) return type;
  }
  return "residential";
}

// ============================================================================
// SPRITE IMAGE LOADER & CACHE
// ============================================================================

const imageCache = new Map<string, HTMLImageElement>();
const loadingImages = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url)!);
  if (loadingImages.has(url)) return loadingImages.get(url)!;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      loadingImages.delete(url);
      resolve(img);
    };
    img.onerror = () => {
      loadingImages.delete(url);
      reject(new Error(`Failed to load: ${url}`));
    };
    img.src = url;
  });
  loadingImages.set(url, promise);
  return promise;
}

function getImage(url: string): HTMLImageElement | null {
  return imageCache.get(url) || null;
}

// Sprite URL lookup helpers
const BUILDING_SPRITE_MAP: Record<string, string> = {
  office_skyscraper: SPRITE_URLS.city_buildings["01_office_skyscraper"],
  residential_apartment: SPRITE_URLS.city_buildings["02_residential_apartment"],
  neon_retail_strip_mall: SPRITE_URLS.city_buildings["03_neon_retail_strip_mall"],
  subway_transit_station: SPRITE_URLS.city_buildings["04_subway_transit_station"],
  industrial_factory: SPRITE_URLS.city_buildings["05_industrial_factory"],
  public_park_plaza: SPRITE_URLS.city_buildings["06_public_park_plaza"],
};

const SUPPLIER_SPRITE_MAP: Record<string, string> = {
  sugar_rush: SPRITE_URLS.suppliers["01_sugar_rush"],
  liquid_oasis: SPRITE_URLS.suppliers["02_liquid_oasis"],
  fresh_farm: SPRITE_URLS.suppliers["03_fresh_farm"],
  tech_mech: SPRITE_URLS.suppliers["04_tech_mech"],
  arctic_chill: SPRITE_URLS.suppliers["05_arctic_chill"],
  mega_mart_hq: SPRITE_URLS.suppliers["06_mega_mart_hq"],
  black_market_alley: SPRITE_URLS.suppliers["07_black_market_alley"],
};

const VM_SPRITE_MAP: Record<string, string> = {
  classic_beverage: SPRITE_URLS.vending_machines["01_classic_beverage"],
  glass_front_snack: SPRITE_URLS.vending_machines["02_glass_front_snack"],
  combo_unit: SPRITE_URLS.vending_machines["03_combo_unit"],
  healthy_organic: SPRITE_URLS.vending_machines["04_healthy_organic"],
  coffee_espresso: SPRITE_URLS.vending_machines["05_coffee_espresso"],
  hot_food_noodle: SPRITE_URLS.vending_machines["06_hot_food_noodle"],
  ice_cream_frozen: SPRITE_URLS.vending_machines["07_ice_cream_frozen"],
  electronics: SPRITE_URLS.vending_machines["08_electronics"],
  pharmacy_otc: SPRITE_URLS.vending_machines["09_pharmacy_otc"],
  gacha_capsule: SPRITE_URLS.vending_machines["10_gacha_capsule"],
  mega_vendor: SPRITE_URLS.vending_machines["11_mega_vendor"],
  abandoned_rusted: SPRITE_URLS.vending_machines["12_abandoned_rusted"],
};

const PROP_SPRITE_MAP: Record<string, string> = {
  streetlight: SPRITE_URLS.city_props["05_streetlight"],
  tree: SPRITE_URLS.city_props["06_tree_planter"],
  bench: SPRITE_URLS.city_props["08_park_bench"],
  bus_stop: SPRITE_URLS.city_props["07_bus_stop"],
};

const ROAD_SPRITE_MAP: Record<string, string> = {
  road_h: SPRITE_URLS.city_props["01_road_straight"],
  road_v: SPRITE_URLS.city_props["01_road_straight"],
  intersection: SPRITE_URLS.city_props["02_road_4way"],
};

const NPC_SPRITES = [
  SPRITE_URLS.characters["04_npc_male_trenchcoat"],
  SPRITE_URLS.characters["05_npc_female_neon"],
  SPRITE_URLS.characters["08_npc_businessman"],
  SPRITE_URLS.characters["09_npc_jogger"],
  SPRITE_URLS.characters["10_npc_street_musician"],
  SPRITE_URLS.characters["11_npc_security_guard"],
];

const WORKER_SPRITES = [
  SPRITE_URLS.characters["01_delivery_worker"],
  SPRITE_URLS.characters["02_mechanic"],
  SPRITE_URLS.characters["03_angry_worker"],
];

const VEHICLE_SPRITES = [
  SPRITE_URLS.vehicles["01_hr_compact_car"],
  SPRITE_URLS.vehicles["02_hr_delivery_van"],
  SPRITE_URLS.vehicles["04_civilian_sedan"],
  SPRITE_URLS.vehicles["05_civilian_coupe"],
];

const TRUCK_SPRITE = SPRITE_URLS.vehicles["03_fleet_box_truck"];
const DRONE_SPRITE = SPRITE_URLS.vehicles["06_drone_active"];

// Preload all sprites
function preloadAllSprites(): Promise<void> {
  const allUrls = [
    ...Object.values(BUILDING_SPRITE_MAP),
    ...Object.values(SUPPLIER_SPRITE_MAP),
    ...Object.values(VM_SPRITE_MAP),
    ...Object.values(PROP_SPRITE_MAP),
    ...Object.values(ROAD_SPRITE_MAP),
    ...NPC_SPRITES,
    ...WORKER_SPRITES,
    ...VEHICLE_SPRITES,
    TRUCK_SPRITE,
    DRONE_SPRITE,
  ];
  return Promise.allSettled(allUrls.map(loadImage)).then(() => {});
}

// ============================================================================
// GENERATION FUNCTIONS (same logic as before)
// ============================================================================

interface RoadTile { x: number; y: number; type: string; }
interface Building { x: number; y: number; type: string; w: number; h: number; floors: number; }
interface Prop { x: number; y: number; type: string; }
interface Npc { x: number; y: number; spriteUrl: string; walkDir: number; isWorker: boolean; }
interface Vehicle { x: number; y: number; spriteUrl: string; dir: number; scale: number; }
interface Supplier { x: number; y: number; type: string; isBlackMarket: boolean; }
interface VendingMachine { x: number; y: number; type: string; }
interface Block {
  roads: RoadTile[];
  buildings: Building[];
  props: Prop[];
  npcs: Npc[];
  vehicles: Vehicle[];
  suppliers: Supplier[];
  vendingMachines: VendingMachine[];
  districtType: DistrictType;
  blockLat: number;
  blockLng: number;
}

function generateRoads(lat: number, lng: number): RoadTile[] {
  const seed = locationSeed(lat, lng);
  const rng = createSeededRng(seed);
  const tiles: RoadTile[] = [];
  const roadRows = new Set<number>();
  const roadCols = new Set<number>();

  roadRows.add(0);
  roadRows.add(GRID - 1);
  roadCols.add(0);
  roadCols.add(GRID - 1);

  const internalH = 1 + Math.floor(rng() * 2);
  const internalV = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < internalH; i++) roadRows.add(3 + Math.floor(rng() * 6));
  for (let i = 0; i < internalV; i++) roadCols.add(3 + Math.floor(rng() * 6));

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const isH = roadRows.has(y);
      const isV = roadCols.has(x);
      if (isH && isV) tiles.push({ x, y, type: "intersection" });
      else if (isH) tiles.push({ x, y, type: "road_h" });
      else if (isV) tiles.push({ x, y, type: "road_v" });
      else tiles.push({ x, y, type: "empty" });
    }
  }
  return tiles;
}

function generateBuildings(lat: number, lng: number, seasonId: number, config: DistrictConfig, roads: RoadTile[]): Building[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed);
  const buildings: Building[] = [];
  const occupied = new Set(roads.filter(r => r.type !== "empty").map(r => `${r.x},${r.y}`));

  for (let y = 1; y < GRID - 1; y += 2) {
    for (let x = 1; x < GRID - 1; x += 2) {
      if (occupied.has(`${x},${y}`)) continue;
      if (rng() < 0.15) continue;

      const type = config.buildingPool[Math.floor(rng() * config.buildingPool.length)];
      const w = type === "neon_retail_strip_mall" ? 2 : 1;
      const h = 1;
      const floors = type === "office_skyscraper" ? 3 + Math.floor(rng() * 5) :
                     type === "residential_apartment" ? 2 + Math.floor(rng() * 3) :
                     type === "industrial_factory" ? 1 + Math.floor(rng() * 2) : 1;

      let canPlace = true;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (occupied.has(`${x + dx},${y + dy}`)) canPlace = false;
        }
      }
      if (!canPlace) continue;

      buildings.push({ x, y, type, w, h, floors });
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          occupied.add(`${x + dx},${y + dy}`);
        }
      }
    }
  }
  return buildings;
}

function generateProps(lat: number, lng: number, config: DistrictConfig, roads: RoadTile[]): Prop[] {
  const seed = locationSeed(lat, lng);
  const rng = createSeededRng(seed + 7777);
  const props: Prop[] = [];
  const count = config.propRange[0] + Math.floor(rng() * (config.propRange[1] - config.propRange[0]));
  const roadPositions = roads.filter(r => r.type !== "empty");

  for (let i = 0; i < count; i++) {
    const roadTile = roadPositions[Math.floor(rng() * roadPositions.length)];
    if (!roadTile) continue;
    const types = ["streetlight", "tree", "bench", "bus_stop"];
    const type = types[Math.floor(rng() * types.length)];
    const offX = rng() < 0.5 ? -0.3 : 0.3;
    const offY = rng() < 0.5 ? -0.3 : 0.3;
    props.push({ x: roadTile.x + offX, y: roadTile.y + offY, type });
  }
  return props;
}

function generateNpcs(lat: number, lng: number, seasonId: number, config: DistrictConfig, roads: RoadTile[]): Npc[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed + 3333);
  const npcs: Npc[] = [];
  const count = config.npcRange[0] + Math.floor(rng() * (config.npcRange[1] - config.npcRange[0]));
  const roadPositions = roads.filter(r => r.type !== "empty");

  for (let i = 0; i < count; i++) {
    const tile = roadPositions[Math.floor(rng() * roadPositions.length)];
    if (!tile) continue;
    const isWorker = rng() < 0.15;
    const spriteUrl = isWorker
      ? WORKER_SPRITES[Math.floor(rng() * WORKER_SPRITES.length)]
      : NPC_SPRITES[Math.floor(rng() * NPC_SPRITES.length)];
    npcs.push({
      x: tile.x + (rng() - 0.5) * 0.6,
      y: tile.y + (rng() - 0.5) * 0.6,
      spriteUrl,
      walkDir: rng() * 360,
      isWorker,
    });
  }
  return npcs;
}

function generateVehicles(lat: number, lng: number, seasonId: number, config: DistrictConfig, roads: RoadTile[]): Vehicle[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed + 5555);
  const vehicles: Vehicle[] = [];
  const count = config.vehicleRange[0] + Math.floor(rng() * (config.vehicleRange[1] - config.vehicleRange[0]));
  const roadPositions = roads.filter(r => r.type === "road_h" || r.type === "road_v");

  for (let i = 0; i < count; i++) {
    const tile = roadPositions[Math.floor(rng() * roadPositions.length)];
    if (!tile) continue;
    const roll = rng();
    let spriteUrl: string;
    let scale = 1.0;
    if (roll < 0.05) { spriteUrl = DRONE_SPRITE; scale = 0.7; }
    else if (roll < 0.15) { spriteUrl = TRUCK_SPRITE; scale = 1.2; }
    else { spriteUrl = VEHICLE_SPRITES[Math.floor(rng() * VEHICLE_SPRITES.length)]; }
    vehicles.push({
      x: tile.x + (rng() - 0.5) * 0.3,
      y: tile.y + (rng() - 0.5) * 0.3,
      spriteUrl,
      dir: tile.type === "road_h" ? (rng() < 0.5 ? 0 : 180) : (rng() < 0.5 ? 90 : 270),
      scale,
    });
  }
  return vehicles;
}

function generateSuppliers(lat: number, lng: number, seasonId: number): Supplier[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed + 9999);
  const suppliers: Supplier[] = [];
  const types = [
    { type: "sugar_rush", prob: 0.04, bm: false },
    { type: "liquid_oasis", prob: 0.04, bm: false },
    { type: "fresh_farm", prob: 0.03, bm: false },
    { type: "tech_mech", prob: 0.03, bm: false },
    { type: "arctic_chill", prob: 0.03, bm: false },
    { type: "mega_mart_hq", prob: 0.02, bm: false },
    { type: "black_market_alley", prob: 0.015, bm: true },
  ];

  for (const s of types) {
    if (rng() < s.prob) {
      suppliers.push({
        x: 2 + Math.floor(rng() * (GRID - 4)),
        y: 2 + Math.floor(rng() * (GRID - 4)),
        type: s.type,
        isBlackMarket: s.bm,
      });
    }
  }
  return suppliers;
}

function generateVendingMachines(lat: number, lng: number, seasonId: number, config: DistrictConfig, roads: RoadTile[]): VendingMachine[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed + 1111);
  const vms: VendingMachine[] = [];
  const vmCount = Math.floor(config.vendingDemand * (1 + rng() * 2));
  const roadPositions = roads.filter(r => r.type !== "empty");
  const vmTypes = Object.keys(VM_SPRITE_MAP);

  for (let i = 0; i < vmCount; i++) {
    const tile = roadPositions[Math.floor(rng() * roadPositions.length)];
    if (!tile) continue;
    vms.push({
      x: tile.x + (rng() < 0.5 ? -0.4 : 0.4),
      y: tile.y + (rng() < 0.5 ? -0.4 : 0.4),
      type: vmTypes[Math.floor(rng() * vmTypes.length)],
    });
  }
  return vms;
}

function generateBlock(lat: number, lng: number, seasonId: number): Block {
  const districtType = getDistrictType(lat, lng);
  const config = DISTRICTS[districtType];
  const roads = generateRoads(lat, lng);
  const buildings = generateBuildings(lat, lng, seasonId, config, roads);
  const props = generateProps(lat, lng, config, roads);
  const npcs = generateNpcs(lat, lng, seasonId, config, roads);
  const vehicles = generateVehicles(lat, lng, seasonId, config, roads);
  const suppliers = generateSuppliers(lat, lng, seasonId);
  const vendingMachines = generateVendingMachines(lat, lng, seasonId, config, roads);

  return {
    roads, buildings, props, npcs, vehicles, suppliers, vendingMachines,
    districtType,
    blockLat: Math.floor(lat * 1000),
    blockLng: Math.floor(lng * 1000),
  };
}

// ============================================================================
// ISOMETRIC RENDERER WITH REAL SPRITES
// ============================================================================

const TILE_W = 64;
const TILE_H = 32;

function toIso(x: number, y: number): [number, number] {
  return [
    (x - y) * (TILE_W / 2),
    (x + y) * (TILE_H / 2),
  ];
}

function drawIsoDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
  ctx.fill();
}

function drawGlowCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a sprite image centered at (cx, cy) with given width, maintaining aspect ratio */
function drawSprite(
  ctx: CanvasRenderingContext2D,
  url: string,
  cx: number,
  cy: number,
  targetWidth: number,
  offsetY = 0,
  flipH = false,
) {
  const img = getImage(url);
  if (!img) return; // Not loaded yet — will render on next frame

  const aspect = img.height / img.width;
  const w = targetWidth;
  const h = w * aspect;
  const x = cx - w / 2;
  const y = cy - h + offsetY;

  if (flipH) {
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, y, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
}

function renderBlock(ctx: CanvasRenderingContext2D, block: Block, offsetX: number, offsetY: number) {
  const config = DISTRICTS[block.districtType];

  // Layer 1: Ground tiles
  for (const tile of block.roads) {
    const [ix, iy] = toIso(tile.x, tile.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;

    if (tile.type === "empty") {
      // Ground fill for non-road tiles
      drawIsoDiamond(ctx, sx, sy, TILE_W, TILE_H, config.color);
    } else {
      // Draw road sprite
      const roadUrl = ROAD_SPRITE_MAP[tile.type];
      if (roadUrl) {
        const img = getImage(roadUrl);
        if (img) {
          // Road tiles are drawn as isometric diamonds filling the tile
          const rw = TILE_W + 2;
          const rh = TILE_H + 2;
          ctx.drawImage(img, sx - rw / 2, sy - rh / 2, rw, rh);
        } else {
          // Fallback: colored diamond
          drawIsoDiamond(ctx, sx, sy, TILE_W, TILE_H, "#2a2a3a");
          ctx.strokeStyle = "#4a6a8a";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(sx - TILE_W / 4, sy);
          ctx.lineTo(sx + TILE_W / 4, sy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }

  // Layer 2: Buildings (sorted back-to-front for proper overlap)
  const sortedBuildings = [...block.buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  for (const building of sortedBuildings) {
    const [ix, iy] = toIso(building.x, building.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;
    const spriteUrl = BUILDING_SPRITE_MAP[building.type];

    if (spriteUrl) {
      // Scale building sprite based on floors
      const baseWidth = building.type === "neon_retail_strip_mall" ? 90 : 65;
      const heightScale = 1 + (building.floors - 1) * 0.12;
      drawSprite(ctx, spriteUrl, sx, sy + 8, baseWidth * heightScale, 0);
      // Neon glow beneath
      drawGlowCircle(ctx, sx, sy + 4, 20, config.color + "40");
    }
  }

  // Layer 3: Suppliers
  for (const supplier of block.suppliers) {
    const [ix, iy] = toIso(supplier.x, supplier.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;
    const spriteUrl = SUPPLIER_SPRITE_MAP[supplier.type];

    if (spriteUrl) {
      drawSprite(ctx, spriteUrl, sx, sy + 8, supplier.isBlackMarket ? 55 : 65, 0);
      // Glow effect
      if (supplier.isBlackMarket) {
        drawGlowCircle(ctx, sx, sy - 10, 20, "#ff000040");
        // Pulsing red warning
        ctx.fillStyle = "#ff0000cc";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("BLACK MARKET", sx, sy - 40);
      } else {
        drawGlowCircle(ctx, sx, sy - 10, 15, "#00d4ff30");
        ctx.fillStyle = "#ffffffaa";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText(supplier.type.replace(/_/g, " ").toUpperCase(), sx, sy - 38);
      }
    }
  }

  // Layer 4: Vending Machines
  for (const vm of block.vendingMachines) {
    const [ix, iy] = toIso(vm.x, vm.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;
    const spriteUrl = VM_SPRITE_MAP[vm.type];

    if (spriteUrl) {
      drawSprite(ctx, spriteUrl, sx, sy + 4, 28, 0);
      // Subtle glow
      drawGlowCircle(ctx, sx, sy + 2, 10, "#00d4ff20");
    }
  }

  // Layer 5: Props
  for (const prop of block.props) {
    const [ix, iy] = toIso(prop.x, prop.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;
    const spriteUrl = PROP_SPRITE_MAP[prop.type];

    if (spriteUrl) {
      const size = prop.type === "bus_stop" ? 24 : prop.type === "tree" ? 20 : 16;
      drawSprite(ctx, spriteUrl, sx, sy + 4, size, 0);
      // Light glow for streetlights
      if (prop.type === "streetlight") {
        drawGlowCircle(ctx, sx, sy - 8, 12, "#ffcc6630");
      }
    }
  }

  // Layer 6: Vehicles
  for (const vehicle of block.vehicles) {
    const [ix, iy] = toIso(vehicle.x, vehicle.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;
    const size = 30 * vehicle.scale;
    const flipH = vehicle.dir === 180 || vehicle.dir === 270;

    drawSprite(ctx, vehicle.spriteUrl, sx, sy + 4, size, 0, flipH);
    // Neon underglow
    drawGlowCircle(ctx, sx, sy + 2, 8, "#00d4ff18");
  }

  // Layer 7: NPCs (on top of everything)
  for (const npc of block.npcs) {
    const [ix, iy] = toIso(npc.x, npc.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;
    const size = npc.isWorker ? 18 : 15;
    const flipH = npc.walkDir > 180;

    drawSprite(ctx, npc.spriteUrl, sx, sy + 4, size, 0, flipH);
  }
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

const US_CITIES = [
  { name: "Dallas, TX", lat: 32.7767, lng: -96.7970 },
  { name: "New York, NY", lat: 40.7128, lng: -74.0060 },
  { name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { name: "Houston, TX", lat: 29.7604, lng: -95.3698 },
  { name: "Phoenix, AZ", lat: 33.4484, lng: -112.0740 },
  { name: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { name: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
  { name: "Denver, CO", lat: 39.7392, lng: -104.9903 },
  { name: "Atlanta, GA", lat: 33.7490, lng: -84.3880 },
];

export default function WorldMapDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lat, setLat] = useState(32.7767);
  const [lng, setLng] = useState(-96.7970);
  const [seasonId, setSeasonId] = useState(1);
  const [viewRadius, setViewRadius] = useState(2);
  const [selectedCity, setSelectedCity] = useState("Dallas, TX");
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const animFrameRef = useRef<number>(0);

  // Preload all sprites on mount
  useEffect(() => {
    let cancelled = false;
    const allUrls = [
      ...Object.values(BUILDING_SPRITE_MAP),
      ...Object.values(SUPPLIER_SPRITE_MAP),
      ...Object.values(VM_SPRITE_MAP),
      ...Object.values(PROP_SPRITE_MAP),
      ...Object.values(ROAD_SPRITE_MAP),
      ...NPC_SPRITES,
      ...WORKER_SPRITES,
      ...VEHICLE_SPRITES,
      TRUCK_SPRITE,
      DRONE_SPRITE,
    ];
    let loaded = 0;
    const total = allUrls.length;

    allUrls.forEach(url => {
      loadImage(url).then(() => {
        if (cancelled) return;
        loaded++;
        setLoadingProgress(Math.round((loaded / total) * 100));
        if (loaded === total) setSpritesLoaded(true);
      }).catch(() => {
        if (cancelled) return;
        loaded++;
        setLoadingProgress(Math.round((loaded / total) * 100));
        if (loaded === total) setSpritesLoaded(true);
      });
    });

    return () => { cancelled = true; };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Dark background
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Generate viewport blocks
    const bLat = Math.floor(lat * 1000);
    const bLng = Math.floor(lng * 1000);
    const blocks: Block[] = [];

    for (let dy = -viewRadius; dy <= viewRadius; dy++) {
      for (let dx = -viewRadius; dx <= viewRadius; dx++) {
        const blockLat = (bLat + dy) / 1000;
        const blockLng = (bLng + dx) / 1000;
        blocks.push(generateBlock(blockLat, blockLng, seasonId));
      }
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 3;

    // Render each block (back to front for proper overlap)
    const gridSize = viewRadius * 2 + 1;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const by = Math.floor(i / gridSize) - viewRadius;
      const bx = (i % gridSize) - viewRadius;

      const blockOffX = (bx - by) * (TILE_W / 2) * GRID;
      const blockOffY = (bx + by) * (TILE_H / 2) * GRID;

      renderBlock(ctx, block, centerX + blockOffX, centerY + blockOffY);
    }

    // HUD overlay
    ctx.fillStyle = "#00d4ff";
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`VendFX World Map — ${selectedCity}`, 20, 30);
    ctx.fillStyle = "#8a8a9a";
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillText(`Season ${seasonId} | Lat: ${lat.toFixed(4)} | Lng: ${lng.toFixed(4)} | Radius: ${viewRadius}`, 20, 50);

    // Stats
    const totalNpcs = blocks.reduce((s, b) => s + b.npcs.length, 0);
    const totalVehicles = blocks.reduce((s, b) => s + b.vehicles.length, 0);
    const totalVMs = blocks.reduce((s, b) => s + b.vendingMachines.length, 0);
    const totalSuppliers = blocks.reduce((s, b) => s + b.suppliers.length, 0);
    ctx.fillText(`NPCs: ${totalNpcs} | Vehicles: ${totalVehicles} | Vending Machines: ${totalVMs} | Suppliers: ${totalSuppliers}`, 20, 68);

    // District legend
    const legendY = rect.height - 120;
    ctx.fillStyle = "#00d4ff";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText("DISTRICT TYPES:", 20, legendY);
    let ly = legendY + 16;
    for (const [, config] of Object.entries(DISTRICTS)) {
      ctx.fillStyle = config.color;
      ctx.fillRect(20, ly - 8, 10, 10);
      ctx.strokeStyle = "#00d4ff40";
      ctx.strokeRect(20, ly - 8, 10, 10);
      ctx.fillStyle = "#8a8a9a";
      ctx.font = "10px 'Courier New', monospace";
      ctx.fillText(`${config.label} (${config.weight}%)`, 36, ly);
      ly += 14;
    }
  }, [lat, lng, seasonId, viewRadius, selectedCity]);

  // Re-render when sprites finish loading or params change
  useEffect(() => {
    render();
    // Keep re-rendering while sprites are still loading
    if (!spritesLoaded) {
      const interval = setInterval(render, 500);
      return () => clearInterval(interval);
    }
    const handleResize = () => render();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render, spritesLoaded]);

  const handleCityChange = (cityName: string) => {
    const city = US_CITIES.find(c => c.name === cityName);
    if (city) {
      setLat(city.lat);
      setLng(city.lng);
      setSelectedCity(cityName);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white flex flex-col">
      {/* Loading overlay */}
      {!spritesLoaded && (
        <div className="fixed inset-0 z-50 bg-[#0a0a14] flex flex-col items-center justify-center gap-4">
          <div className="text-[#00d4ff] font-mono text-lg">Loading VendFX World Sprites...</div>
          <div className="w-64 h-2 bg-[#1a1a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00d4ff] to-[#ff00ff] transition-all duration-300 rounded-full"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="text-[#8a8a9a] font-mono text-sm">{loadingProgress}% — {Math.round(loadingProgress * 59 / 100)}/59 sprites</div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-[#12121e] border-b border-[#1a1a2a] px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[#8a8a9a] text-sm font-mono">City:</label>
          <select
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
            className="bg-[#1a1a2a] border border-[#2a2a3a] text-[#00d4ff] px-3 py-1.5 rounded text-sm font-mono focus:outline-none focus:border-[#00d4ff]"
          >
            {US_CITIES.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[#8a8a9a] text-sm font-mono">Season:</label>
          <div className="flex gap-1">
            <button
              onClick={() => setSeasonId(Math.max(1, seasonId - 1))}
              className="bg-[#1a1a2a] border border-[#2a2a3a] text-[#00d4ff] px-2 py-1 rounded text-sm hover:bg-[#2a2a3a] transition-colors"
            >-</button>
            <span className="bg-[#1a1a2a] border border-[#2a2a3a] text-[#ffcc00] px-3 py-1 rounded text-sm font-mono min-w-[40px] text-center">
              {seasonId}
            </span>
            <button
              onClick={() => setSeasonId(seasonId + 1)}
              className="bg-[#1a1a2a] border border-[#2a2a3a] text-[#00d4ff] px-2 py-1 rounded text-sm hover:bg-[#2a2a3a] transition-colors"
            >+</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[#8a8a9a] text-sm font-mono">Zoom:</label>
          <input
            type="range"
            min={1}
            max={4}
            value={viewRadius}
            onChange={(e) => setViewRadius(Number(e.target.value))}
            className="w-24 accent-[#00d4ff]"
          />
          <span className="text-[#00d4ff] text-sm font-mono">{viewRadius}</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[#8a8a9a] text-sm font-mono">Lat:</label>
          <input
            type="number"
            step={0.001}
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
            className="bg-[#1a1a2a] border border-[#2a2a3a] text-[#00d4ff] px-2 py-1 rounded text-sm font-mono w-24 focus:outline-none focus:border-[#00d4ff]"
          />
          <label className="text-[#8a8a9a] text-sm font-mono">Lng:</label>
          <input
            type="number"
            step={0.001}
            value={lng}
            onChange={(e) => setLng(Number(e.target.value))}
            className="bg-[#1a1a2a] border border-[#2a2a3a] text-[#00d4ff] px-2 py-1 rounded text-sm font-mono w-24 focus:outline-none focus:border-[#00d4ff]"
          />
        </div>

        <button
          onClick={() => {
            setLat(lat + (Math.random() - 0.5) * 0.01);
            setLng(lng + (Math.random() - 0.5) * 0.01);
          }}
          className="bg-[#00d4ff20] border border-[#00d4ff40] text-[#00d4ff] px-4 py-1.5 rounded text-sm font-mono hover:bg-[#00d4ff30] transition-colors ml-auto"
        >
          Random Walk
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ minHeight: "calc(100vh - 60px)" }}
        />
      </div>
    </div>
  );
}
