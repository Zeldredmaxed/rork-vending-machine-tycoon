import { useRef, useEffect, useState, useCallback } from "react";

// ============================================================================
// INLINE PROCEDURAL ENGINE (mirrors server/engines/worldMap.ts)
// This is a client-side copy for the demo — in production, the server generates
// block data and sends it via tRPC.
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
// SPRITE COLORS — isometric representations
// ============================================================================

const BUILDING_COLORS: Record<string, { top: string; left: string; right: string; accent: string }> = {
  office_skyscraper:      { top: "#2a4a6a", left: "#1a3a5a", right: "#0a2a4a", accent: "#00d4ff" },
  residential_apartment:  { top: "#3a4a3a", left: "#2a3a2a", right: "#1a2a1a", accent: "#ffcc00" },
  neon_retail_strip_mall: { top: "#4a2a4a", left: "#3a1a3a", right: "#2a0a2a", accent: "#ff00ff" },
  subway_transit_station: { top: "#2a3a4a", left: "#1a2a3a", right: "#0a1a2a", accent: "#00ffcc" },
  industrial_factory:     { top: "#4a3a2a", left: "#3a2a1a", right: "#2a1a0a", accent: "#ff6600" },
  public_park_plaza:      { top: "#2a5a2a", left: "#1a4a1a", right: "#0a3a0a", accent: "#66ff66" },
};

const ROAD_COLOR = "#2a2a3a";
const ROAD_LINE = "#4a6a8a";
const SIDEWALK_COLOR = "#3a3a4a";

const NPC_COLORS = ["#00d4ff", "#ff00ff", "#ffcc00", "#ff6600", "#66ff66", "#ff3366", "#9966ff"];
const VEHICLE_COLORS = ["#0066ff", "#ff3300", "#9933ff", "#00cc66", "#ff9900"];

const SUPPLIER_COLORS: Record<string, string> = {
  sugar_rush: "#ff66ff",
  liquid_oasis: "#6666ff",
  fresh_farm: "#66ff66",
  tech_mech: "#ff6633",
  arctic_chill: "#66ffff",
  mega_mart_hq: "#ffcc00",
  black_market_alley: "#ff0000",
};

const VM_COLORS: Record<string, string> = {
  classic_beverage: "#3366ff",
  glass_front_snack: "#ff9933",
  combo_unit: "#9933ff",
  healthy_organic: "#33cc33",
  coffee_espresso: "#cc6600",
  hot_food_noodle: "#ff3300",
  ice_cream_frozen: "#66ccff",
  electronics: "#333333",
  pharmacy_otc: "#ffffff",
  gacha_capsule: "#ff66cc",
  mega_vendor: "#00ffcc",
  abandoned_rusted: "#666633",
};

// ============================================================================
// GENERATION FUNCTIONS
// ============================================================================

interface RoadTile { x: number; y: number; type: string; }
interface Building { x: number; y: number; type: string; w: number; h: number; floors: number; }
interface Prop { x: number; y: number; type: string; }
interface Npc { x: number; y: number; color: string; walkDir: number; }
interface Vehicle { x: number; y: number; color: string; dir: number; }
interface Supplier { x: number; y: number; type: string; isBlackMarket: boolean; }
interface Block {
  roads: RoadTile[];
  buildings: Building[];
  props: Prop[];
  npcs: Npc[];
  vehicles: Vehicle[];
  suppliers: Supplier[];
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

  // Always have border roads
  roadRows.add(0);
  roadRows.add(GRID - 1);
  roadCols.add(0);
  roadCols.add(GRID - 1);

  // Add 1-2 internal roads
  const internalH = 1 + Math.floor(rng() * 2);
  const internalV = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < internalH; i++) {
    roadRows.add(3 + Math.floor(rng() * 6));
  }
  for (let i = 0; i < internalV; i++) {
    roadCols.add(3 + Math.floor(rng() * 6));
  }

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const isH = roadRows.has(y);
      const isV = roadCols.has(x);
      if (isH && isV) {
        tiles.push({ x, y, type: "intersection" });
      } else if (isH) {
        tiles.push({ x, y, type: "road_h" });
      } else if (isV) {
        tiles.push({ x, y, type: "road_v" });
      } else {
        tiles.push({ x, y, type: "empty" });
      }
    }
  }
  return tiles;
}

function generateBuildings(lat: number, lng: number, seasonId: number, config: DistrictConfig, roads: RoadTile[]): Building[] {
  const seed = seasonalSeed(lat, lng, seasonId);
  const rng = createSeededRng(seed);
  const buildings: Building[] = [];
  const occupied = new Set(roads.filter(r => r.type !== "empty").map(r => `${r.x},${r.y}`));

  // Find empty zones and place buildings
  for (let y = 1; y < GRID - 1; y += 2) {
    for (let x = 1; x < GRID - 1; x += 2) {
      if (occupied.has(`${x},${y}`)) continue;
      if (rng() < 0.15) continue; // Some empty lots

      const type = config.buildingPool[Math.floor(rng() * config.buildingPool.length)];
      const w = type === "neon_retail_strip_mall" ? 2 : 1;
      const h = 1;
      const floors = type === "office_skyscraper" ? 3 + Math.floor(rng() * 5) :
                     type === "residential_apartment" ? 2 + Math.floor(rng() * 3) :
                     type === "industrial_factory" ? 1 + Math.floor(rng() * 2) : 1;

      // Check all tiles are free
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
    // Place adjacent to road
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
    npcs.push({
      x: tile.x + (rng() - 0.5) * 0.6,
      y: tile.y + (rng() - 0.5) * 0.6,
      color: NPC_COLORS[Math.floor(rng() * NPC_COLORS.length)],
      walkDir: rng() * 360,
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
    vehicles.push({
      x: tile.x + (rng() - 0.5) * 0.3,
      y: tile.y + (rng() - 0.5) * 0.3,
      color: VEHICLE_COLORS[Math.floor(rng() * VEHICLE_COLORS.length)],
      dir: tile.type === "road_h" ? (rng() < 0.5 ? 0 : 180) : (rng() < 0.5 ? 90 : 270),
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

function generateBlock(lat: number, lng: number, seasonId: number): Block {
  const districtType = getDistrictType(lat, lng);
  const config = DISTRICTS[districtType];
  const roads = generateRoads(lat, lng);
  const buildings = generateBuildings(lat, lng, seasonId, config, roads);
  const props = generateProps(lat, lng, config, roads);
  const npcs = generateNpcs(lat, lng, seasonId, config, roads);
  const vehicles = generateVehicles(lat, lng, seasonId, config, roads);
  const suppliers = generateSuppliers(lat, lng, seasonId);

  return {
    roads, buildings, props, npcs, vehicles, suppliers,
    districtType,
    blockLat: Math.floor(lat * 1000),
    blockLng: Math.floor(lng * 1000),
  };
}

// ============================================================================
// ISOMETRIC RENDERER
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

function drawIsoBox(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, d: number, h: number, colors: { top: string; left: string; right: string }) {
  const hw = w / 2;
  const hd = d / 2;

  // Right face
  ctx.fillStyle = colors.right;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + hw, cy - hd);
  ctx.lineTo(cx + hw, cy - hd - h);
  ctx.lineTo(cx, cy - h);
  ctx.closePath();
  ctx.fill();

  // Left face
  ctx.fillStyle = colors.left;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - hw, cy - hd);
  ctx.lineTo(cx - hw, cy - hd - h);
  ctx.lineTo(cx, cy - h);
  ctx.closePath();
  ctx.fill();

  // Top face
  ctx.fillStyle = colors.top;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + hw, cy - hd - h);
  ctx.lineTo(cx, cy - d - h);
  ctx.lineTo(cx - hw, cy - hd - h);
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

function renderBlock(ctx: CanvasRenderingContext2D, block: Block, offsetX: number, offsetY: number) {
  const config = DISTRICTS[block.districtType];

  // Layer 1: Ground
  for (const tile of block.roads) {
    const [ix, iy] = toIso(tile.x, tile.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;

    if (tile.type === "empty") {
      drawIsoDiamond(ctx, sx, sy, TILE_W, TILE_H, config.color);
    } else if (tile.type === "intersection") {
      drawIsoDiamond(ctx, sx, sy, TILE_W, TILE_H, ROAD_COLOR);
      // Crosswalk lines
      ctx.strokeStyle = ROAD_LINE;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy);
      ctx.lineTo(sx + 8, sy);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      drawIsoDiamond(ctx, sx, sy, TILE_W, TILE_H, ROAD_COLOR);
      // Road markings
      ctx.strokeStyle = ROAD_LINE;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      if (tile.type === "road_h") {
        ctx.beginPath();
        ctx.moveTo(sx - TILE_W / 4, sy);
        ctx.lineTo(sx + TILE_W / 4, sy);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(sx, sy - TILE_H / 4);
        ctx.lineTo(sx, sy + TILE_H / 4);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // Sidewalk edges
      drawIsoDiamond(ctx, sx, sy, TILE_W + 4, TILE_H + 2, "transparent");
      ctx.strokeStyle = SIDEWALK_COLOR;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // Layer 2: Buildings
  for (const building of block.buildings) {
    const [ix, iy] = toIso(building.x, building.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;
    const colors = BUILDING_COLORS[building.type] || BUILDING_COLORS.office_skyscraper;
    const height = building.floors * 18;

    drawIsoBox(ctx, sx, sy, TILE_W * 0.8, TILE_H * 0.8, height, colors);

    // Neon accent glow
    drawGlowCircle(ctx, sx, sy - height - 5, 8, colors.accent + "40");

    // Windows
    ctx.fillStyle = colors.accent + "80";
    for (let f = 0; f < building.floors; f++) {
      const wy = sy - f * 18 - 10;
      for (let w = 0; w < 3; w++) {
        ctx.fillRect(sx - 8 + w * 6, wy, 3, 4);
      }
    }
  }

  // Layer 3: Suppliers
  for (const supplier of block.suppliers) {
    const [ix, iy] = toIso(supplier.x, supplier.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;
    const color = SUPPLIER_COLORS[supplier.type] || "#ffffff";

    if (supplier.isBlackMarket) {
      // Dark alley with red glow
      drawIsoBox(ctx, sx, sy, TILE_W * 0.6, TILE_H * 0.6, 25, {
        top: "#1a0a0a", left: "#0a0505", right: "#050202",
      });
      drawGlowCircle(ctx, sx, sy - 30, 15, "#ff000060");
      // Skull icon
      ctx.fillStyle = "#ff0000";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("☠", sx, sy - 28);
    } else {
      drawIsoBox(ctx, sx, sy, TILE_W * 0.7, TILE_H * 0.7, 30, {
        top: color + "cc", left: color + "99", right: color + "66",
      });
      drawGlowCircle(ctx, sx, sy - 35, 12, color + "50");
      // Label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 6px monospace";
      ctx.textAlign = "center";
      ctx.fillText(supplier.type.replace(/_/g, " ").toUpperCase(), sx, sy - 33);
    }
  }

  // Layer 4: Props
  for (const prop of block.props) {
    const [ix, iy] = toIso(prop.x, prop.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;

    switch (prop.type) {
      case "streetlight":
        ctx.strokeStyle = "#666666";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - 16);
        ctx.stroke();
        drawGlowCircle(ctx, sx, sy - 18, 8, "#ffcc6640");
        ctx.fillStyle = "#ffcc66";
        ctx.beginPath();
        ctx.arc(sx, sy - 18, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "tree":
        ctx.fillStyle = "#1a3a1a";
        ctx.beginPath();
        ctx.arc(sx, sy - 10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2a5a2a";
        ctx.beginPath();
        ctx.arc(sx, sy - 12, 5, 0, Math.PI * 2);
        ctx.fill();
        drawGlowCircle(ctx, sx, sy - 10, 4, "#00ffcc30");
        ctx.strokeStyle = "#4a2a1a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - 6);
        ctx.stroke();
        break;
      case "bench":
        ctx.fillStyle = "#3a4a5a";
        ctx.fillRect(sx - 5, sy - 3, 10, 3);
        ctx.strokeStyle = "#00d4ff40";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx - 5, sy - 3, 10, 3);
        break;
      case "bus_stop":
        drawIsoBox(ctx, sx, sy, 12, 8, 14, {
          top: "#2a3a4a", left: "#1a2a3a", right: "#0a1a2a",
        });
        drawGlowCircle(ctx, sx, sy - 16, 5, "#00d4ff30");
        break;
    }
  }

  // Layer 5: Vehicles
  for (const vehicle of block.vehicles) {
    const [ix, iy] = toIso(vehicle.x, vehicle.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;

    // Simple car shape
    ctx.fillStyle = vehicle.color;
    ctx.beginPath();
    if (vehicle.dir === 0 || vehicle.dir === 180) {
      ctx.ellipse(sx, sy, 8, 4, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(sx, sy, 4, 8, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // Headlights
    ctx.fillStyle = "#ffffff80";
    ctx.beginPath();
    ctx.arc(sx + (vehicle.dir === 0 ? 6 : vehicle.dir === 180 ? -6 : 0),
            sy + (vehicle.dir === 90 ? 6 : vehicle.dir === 270 ? -6 : 0), 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Neon underglow
    drawGlowCircle(ctx, sx, sy + 2, 6, vehicle.color + "30");
  }

  // Layer 6: NPCs
  for (const npc of block.npcs) {
    const [ix, iy] = toIso(npc.x, npc.y);
    const sx = offsetX + ix;
    const sy = offsetY + iy;

    // Body
    ctx.fillStyle = "#1a1a2a";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 1, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = "#3a3a4a";
    ctx.beginPath();
    ctx.arc(sx, sy - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Neon accent
    ctx.strokeStyle = npc.color;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy - 1);
    ctx.lineTo(sx + 2, sy - 1);
    ctx.stroke();
    // Glow
    drawGlowCircle(ctx, sx, sy, 4, npc.color + "20");
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
  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);
  const [selectedCity, setSelectedCity] = useState("Dallas, TX");

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

    // Calculate canvas center
    const centerX = rect.width / 2;
    const centerY = rect.height / 3;

    // Render each block
    const gridSize = viewRadius * 2 + 1;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const by = Math.floor(i / gridSize) - viewRadius;
      const bx = (i % gridSize) - viewRadius;

      // Block offset in iso space
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
    ctx.fillText(`Blocks: ${blocks.length} | Grid: ${GRID}x${GRID} per block`, 20, 68);

    // District legend
    const legendY = rect.height - 120;
    ctx.fillStyle = "#00d4ff";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText("DISTRICT TYPES:", 20, legendY);
    let ly = legendY + 16;
    for (const [type, config] of Object.entries(DISTRICTS)) {
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

  useEffect(() => {
    render();
    const handleResize = () => render();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

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
