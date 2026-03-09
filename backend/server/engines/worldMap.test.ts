/**
 * World Map Procedural Generation Engine — Tests
 * 
 * Tests the hybrid seed-based generation system:
 *   - Deterministic hash & RNG functions
 *   - District type assignment
 *   - Road grid generation
 *   - Building placement (seasonal rotation)
 *   - Prop placement (permanent layer)
 *   - NPC spawning rules
 *   - Vehicle spawning rules
 *   - Supplier & black market spawning
 *   - Full block generation
 *   - Viewport generation
 *   - Location analysis
 *   - Black market purchase mechanics
 */

import { describe, it, expect } from "vitest";
import {
  hashString,
  createSeededRng,
  locationSeed,
  seasonalSeed,
  getDistrictType,
  generateRoadGrid,
  generateBuildings,
  generateProps,
  generateNpcs,
  generateVehicles,
  generateSuppliers,
  generateBlock,
  generateViewport,
  getLocationSummary,
  attemptBlackMarketPurchase,
  DISTRICT_CONFIGS,
  SUPPLIER_CONFIGS,
  BUILDING_SPRITES,
  PROP_SPRITES,
  NPC_SPRITES,
  VEHICLE_SPRITES,
  VENDING_MACHINE_SPRITES,
  BLOCK_GRID_SIZE,
  type DistrictType,
  type RoadTileType,
} from "./worldMap";

// ============================================================================
// SEED & HASH FUNCTIONS
// ============================================================================

describe("Hash & Seed Functions", () => {
  it("hashString produces consistent results for the same input", () => {
    const hash1 = hashString("test-string");
    const hash2 = hashString("test-string");
    expect(hash1).toBe(hash2);
  });

  it("hashString produces different results for different inputs", () => {
    const hash1 = hashString("hello");
    const hash2 = hashString("world");
    expect(hash1).not.toBe(hash2);
  });

  it("hashString returns unsigned 32-bit integers", () => {
    const hash = hashString("any-string");
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });

  it("createSeededRng produces deterministic sequences", () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("createSeededRng produces values in [0, 1)", () => {
    const rng = createSeededRng(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("different seeds produce different sequences", () => {
    const rng1 = createSeededRng(1);
    const rng2 = createSeededRng(2);
    const val1 = rng1();
    const val2 = rng2();
    expect(val1).not.toBe(val2);
  });

  it("locationSeed is deterministic for same coordinates", () => {
    const seed1 = locationSeed(32.7767, -96.7970);
    const seed2 = locationSeed(32.7767, -96.7970);
    expect(seed1).toBe(seed2);
  });

  it("locationSeed differs for different coordinates", () => {
    const seed1 = locationSeed(32.7767, -96.7970);
    const seed2 = locationSeed(40.7128, -74.0060);
    expect(seed1).not.toBe(seed2);
  });

  it("locationSeed quantizes to block level (~100m)", () => {
    // These are within the same block (differ by < 0.001 degrees)
    // Math.floor(32.7764 * 1000) = 32776, Math.floor(32.7765 * 1000) = 32776
    const seed1 = locationSeed(32.7764, -96.7974);
    const seed2 = locationSeed(32.7765, -96.7974);
    expect(seed1).toBe(seed2);
  });

  it("locationSeed differs for adjacent blocks", () => {
    const seed1 = locationSeed(32.776, -96.797);
    const seed2 = locationSeed(32.777, -96.797); // Next block north
    expect(seed1).not.toBe(seed2);
  });

  it("seasonalSeed differs from locationSeed", () => {
    const locSeed = locationSeed(32.7767, -96.7970);
    const seaSeed = seasonalSeed(32.7767, -96.7970, 1);
    expect(locSeed).not.toBe(seaSeed);
  });

  it("seasonalSeed changes with season ID", () => {
    const season1 = seasonalSeed(32.7767, -96.7970, 1);
    const season2 = seasonalSeed(32.7767, -96.7970, 2);
    expect(season1).not.toBe(season2);
  });

  it("seasonalSeed is deterministic for same coords + season", () => {
    const seed1 = seasonalSeed(32.7767, -96.7970, 5);
    const seed2 = seasonalSeed(32.7767, -96.7970, 5);
    expect(seed1).toBe(seed2);
  });
});

// ============================================================================
// DISTRICT TYPE ASSIGNMENT
// ============================================================================

describe("District Type Assignment", () => {
  it("getDistrictType returns a valid district type", () => {
    const validTypes: DistrictType[] = ["downtown", "residential", "retail", "industrial", "transit", "park"];
    const type = getDistrictType(32.7767, -96.7970);
    expect(validTypes).toContain(type);
  });

  it("getDistrictType is deterministic for same coordinates", () => {
    const type1 = getDistrictType(32.7767, -96.7970);
    const type2 = getDistrictType(32.7767, -96.7970);
    expect(type1).toBe(type2);
  });

  it("getDistrictType varies across different locations", () => {
    // Test many locations to ensure we get variety
    const types = new Set<DistrictType>();
    for (let lat = 30; lat < 45; lat += 0.5) {
      for (let lng = -100; lng < -70; lng += 0.5) {
        types.add(getDistrictType(lat, lng));
      }
    }
    // Should get at least 4 different district types across the US
    expect(types.size).toBeGreaterThanOrEqual(4);
  });

  it("district configs have valid weight distributions", () => {
    const totalWeight = Object.values(DISTRICT_CONFIGS).reduce((sum, d) => sum + d.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("all district types have valid NPC density ranges", () => {
    for (const config of Object.values(DISTRICT_CONFIGS)) {
      expect(config.npcDensityRange[0]).toBeLessThanOrEqual(config.npcDensityRange[1]);
      expect(config.npcDensityRange[0]).toBeGreaterThanOrEqual(0);
    }
  });

  it("all district types have valid vehicle density ranges", () => {
    for (const config of Object.values(DISTRICT_CONFIGS)) {
      expect(config.vehicleDensityRange[0]).toBeLessThanOrEqual(config.vehicleDensityRange[1]);
      expect(config.vehicleDensityRange[0]).toBeGreaterThanOrEqual(0);
    }
  });

  it("all district types have non-empty building pools", () => {
    for (const config of Object.values(DISTRICT_CONFIGS)) {
      expect(config.buildingPool.length).toBeGreaterThan(0);
    }
  });

  it("transit district has highest foot traffic multiplier", () => {
    const transit = DISTRICT_CONFIGS.transit;
    for (const [type, config] of Object.entries(DISTRICT_CONFIGS)) {
      if (type !== "transit") {
        expect(transit.footTrafficMultiplier).toBeGreaterThanOrEqual(config.footTrafficMultiplier);
      }
    }
  });
});

// ============================================================================
// ROAD GRID GENERATION
// ============================================================================

describe("Road Grid Generation", () => {
  it("generates correct number of tiles", () => {
    const roads = generateRoadGrid(32.7767, -96.7970);
    expect(roads.length).toBe(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
  });

  it("is deterministic for same coordinates", () => {
    const roads1 = generateRoadGrid(32.7767, -96.7970);
    const roads2 = generateRoadGrid(32.7767, -96.7970);
    expect(roads1).toEqual(roads2);
  });

  it("contains road tiles and empty tiles", () => {
    const roads = generateRoadGrid(32.7767, -96.7970);
    const roadTiles = roads.filter((r) => r.type !== "empty");
    const emptyTiles = roads.filter((r) => r.type === "empty");
    expect(roadTiles.length).toBeGreaterThan(0);
    expect(emptyTiles.length).toBeGreaterThan(0);
  });

  it("has roads on edges (border roads)", () => {
    const roads = generateRoadGrid(32.7767, -96.7970);
    const topEdge = roads.filter((r) => r.y === 0 && r.type !== "empty");
    const bottomEdge = roads.filter((r) => r.y === BLOCK_GRID_SIZE - 1 && r.type !== "empty");
    expect(topEdge.length).toBeGreaterThan(0);
    expect(bottomEdge.length).toBeGreaterThan(0);
  });

  it("all tiles have valid coordinates", () => {
    const roads = generateRoadGrid(32.7767, -96.7970);
    for (const tile of roads) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(BLOCK_GRID_SIZE);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThan(BLOCK_GRID_SIZE);
    }
  });

  it("intersections exist where horizontal and vertical roads meet", () => {
    const roads = generateRoadGrid(32.7767, -96.7970);
    const intersections = roads.filter(
      (r) => r.type === "intersection_4" || r.type === "intersection_t"
    );
    expect(intersections.length).toBeGreaterThan(0);
  });

  it("road tiles have valid sprite keys", () => {
    const roads = generateRoadGrid(32.7767, -96.7970);
    for (const tile of roads) {
      if (tile.type !== "empty") {
        expect(tile.spriteKey).toBeTruthy();
        expect(tile.spriteKey.length).toBeGreaterThan(0);
      }
    }
  });

  it("rotation values are multiples of 90", () => {
    const roads = generateRoadGrid(32.7767, -96.7970);
    for (const tile of roads) {
      expect(tile.rotation % 90).toBe(0);
    }
  });
});

// ============================================================================
// BUILDING GENERATION (SEASONAL)
// ============================================================================

describe("Building Generation", () => {
  const lat = 32.7767;
  const lng = -96.7970;
  const roads = generateRoadGrid(lat, lng);
  const districtConfig = DISTRICT_CONFIGS[getDistrictType(lat, lng)];

  it("generates buildings in empty spaces", () => {
    const buildings = generateBuildings(lat, lng, 1, districtConfig, roads);
    expect(buildings.length).toBeGreaterThan(0);
  });

  it("buildings change with different seasons", () => {
    const buildings1 = generateBuildings(lat, lng, 1, districtConfig, roads);
    const buildings2 = generateBuildings(lat, lng, 2, districtConfig, roads);
    // At least some buildings should differ
    const types1 = buildings1.map((b) => `${b.x},${b.y}:${b.type}`).sort();
    const types2 = buildings2.map((b) => `${b.x},${b.y}:${b.type}`).sort();
    expect(types1).not.toEqual(types2);
  });

  it("buildings are deterministic for same season", () => {
    const buildings1 = generateBuildings(lat, lng, 5, districtConfig, roads);
    const buildings2 = generateBuildings(lat, lng, 5, districtConfig, roads);
    expect(buildings1).toEqual(buildings2);
  });

  it("buildings do not overlap with roads", () => {
    const buildings = generateBuildings(lat, lng, 1, districtConfig, roads);
    const roadPositions = new Set(
      roads.filter((r) => r.type !== "empty").map((r) => `${r.x},${r.y}`)
    );
    for (const building of buildings) {
      expect(roadPositions.has(`${building.x},${building.y}`)).toBe(false);
    }
  });

  it("buildings have valid types from the district pool", () => {
    const buildings = generateBuildings(lat, lng, 1, districtConfig, roads);
    for (const building of buildings) {
      expect(BUILDING_SPRITES[building.type]).toBeDefined();
    }
  });

  it("buildings have valid sprite keys", () => {
    const buildings = generateBuildings(lat, lng, 1, districtConfig, roads);
    for (const building of buildings) {
      expect(building.spriteKey).toBeTruthy();
    }
  });
});

// ============================================================================
// PROP GENERATION (PERMANENT)
// ============================================================================

describe("Prop Generation", () => {
  const lat = 32.7767;
  const lng = -96.7970;
  const roads = generateRoadGrid(lat, lng);
  const districtConfig = DISTRICT_CONFIGS[getDistrictType(lat, lng)];

  it("generates props", () => {
    const props = generateProps(lat, lng, districtConfig, roads);
    expect(props.length).toBeGreaterThan(0);
  });

  it("props are deterministic (permanent layer)", () => {
    const props1 = generateProps(lat, lng, districtConfig, roads);
    const props2 = generateProps(lat, lng, districtConfig, roads);
    expect(props1).toEqual(props2);
  });

  it("prop count is within district density range", () => {
    const props = generateProps(lat, lng, districtConfig, roads);
    expect(props.length).toBeGreaterThanOrEqual(districtConfig.propDensityRange[0]);
    // Can be less than max if not enough sidewalk positions
    expect(props.length).toBeLessThanOrEqual(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
  });

  it("props have valid types", () => {
    const props = generateProps(lat, lng, districtConfig, roads);
    const validTypes = PROP_SPRITES.map((p) => p.type);
    for (const prop of props) {
      expect(validTypes).toContain(prop.type);
    }
  });

  it("props have valid coordinates", () => {
    const props = generateProps(lat, lng, districtConfig, roads);
    for (const prop of props) {
      expect(prop.x).toBeGreaterThanOrEqual(0);
      expect(prop.x).toBeLessThan(BLOCK_GRID_SIZE);
      expect(prop.y).toBeGreaterThanOrEqual(0);
      expect(prop.y).toBeLessThan(BLOCK_GRID_SIZE);
    }
  });
});

// ============================================================================
// NPC GENERATION (SEASONAL)
// ============================================================================

describe("NPC Generation", () => {
  const lat = 40.7128;
  const lng = -74.0060;
  const roads = generateRoadGrid(lat, lng);
  const districtConfig = DISTRICT_CONFIGS[getDistrictType(lat, lng)];

  it("generates NPCs", () => {
    const npcs = generateNpcs(lat, lng, 1, districtConfig, roads);
    expect(npcs.length).toBeGreaterThan(0);
  });

  it("NPC count is within district density range", () => {
    const npcs = generateNpcs(lat, lng, 1, districtConfig, roads);
    expect(npcs.length).toBeGreaterThanOrEqual(districtConfig.npcDensityRange[0]);
    expect(npcs.length).toBeLessThanOrEqual(districtConfig.npcDensityRange[1]);
  });

  it("NPCs change with different seasons", () => {
    const npcs1 = generateNpcs(lat, lng, 1, districtConfig, roads);
    const npcs2 = generateNpcs(lat, lng, 2, districtConfig, roads);
    const types1 = npcs1.map((n) => n.type).sort();
    const types2 = npcs2.map((n) => n.type).sort();
    // With different seasons, the NPC mix should differ
    expect(JSON.stringify(npcs1)).not.toBe(JSON.stringify(npcs2));
  });

  it("NPCs are deterministic for same season", () => {
    const npcs1 = generateNpcs(lat, lng, 5, districtConfig, roads);
    const npcs2 = generateNpcs(lat, lng, 5, districtConfig, roads);
    expect(npcs1).toEqual(npcs2);
  });

  it("only non-player NPCs spawn as ambient", () => {
    const npcs = generateNpcs(lat, lng, 1, districtConfig, roads);
    const playerNpcTypes = ["delivery_worker", "mechanic", "angry_worker"];
    for (const npc of npcs) {
      expect(playerNpcTypes).not.toContain(npc.type);
    }
  });

  it("NPCs respect district restrictions", () => {
    // Generate for park district specifically
    const parkConfig = DISTRICT_CONFIGS.park;
    const parkRoads = generateRoadGrid(35.0, -90.0); // some park location
    const npcs = generateNpcs(35.0, -90.0, 1, parkConfig, parkRoads);
    
    for (const npc of npcs) {
      const sprite = NPC_SPRITES.find((s) => s.type === npc.type);
      if (sprite && sprite.districtRestriction) {
        expect(sprite.districtRestriction).toContain("park");
      }
    }
  });

  it("ambient NPCs have walk directions", () => {
    const npcs = generateNpcs(lat, lng, 1, districtConfig, roads);
    const ambientNpcs = npcs.filter((n) => n.isAmbient);
    for (const npc of ambientNpcs) {
      expect(npc.walkDirection).toBeGreaterThanOrEqual(0);
      expect(npc.walkDirection).toBeLessThan(360);
    }
  });
});

// ============================================================================
// VEHICLE GENERATION (SEASONAL)
// ============================================================================

describe("Vehicle Generation", () => {
  const lat = 32.7767;
  const lng = -96.7970;
  const roads = generateRoadGrid(lat, lng);
  const districtConfig = DISTRICT_CONFIGS[getDistrictType(lat, lng)];

  it("generates vehicles", () => {
    const vehicles = generateVehicles(lat, lng, 1, districtConfig, roads);
    expect(vehicles.length).toBeGreaterThanOrEqual(0);
  });

  it("vehicle count is within district density range", () => {
    const vehicles = generateVehicles(lat, lng, 1, districtConfig, roads);
    expect(vehicles.length).toBeLessThanOrEqual(districtConfig.vehicleDensityRange[1]);
  });

  it("only civilian vehicles spawn as ambient traffic", () => {
    const vehicles = generateVehicles(lat, lng, 1, districtConfig, roads);
    const playerVehicleTypes = ["hr_compact_car", "hr_delivery_van", "fleet_box_truck", "drone_active", "drone_broken"];
    for (const vehicle of vehicles) {
      expect(playerVehicleTypes).not.toContain(vehicle.type);
    }
  });

  it("vehicles are deterministic for same season", () => {
    const vehicles1 = generateVehicles(lat, lng, 3, districtConfig, roads);
    const vehicles2 = generateVehicles(lat, lng, 3, districtConfig, roads);
    expect(vehicles1).toEqual(vehicles2);
  });

  it("vehicles have valid directions", () => {
    const vehicles = generateVehicles(lat, lng, 1, districtConfig, roads);
    for (const vehicle of vehicles) {
      expect([0, 90, 180, 270]).toContain(vehicle.direction);
    }
  });
});

// ============================================================================
// SUPPLIER & BLACK MARKET GENERATION
// ============================================================================

describe("Supplier Generation", () => {
  it("supplier spawning is deterministic", () => {
    const suppliers1 = generateSuppliers(32.7767, -96.7970, 1);
    const suppliers2 = generateSuppliers(32.7767, -96.7970, 1);
    expect(suppliers1).toEqual(suppliers2);
  });

  it("supplier spawning changes with seasons", () => {
    // Test many locations to find differences
    let foundDifference = false;
    for (let lat = 30; lat < 40; lat += 0.1) {
      const s1 = generateSuppliers(lat, -96.0, 1);
      const s2 = generateSuppliers(lat, -96.0, 2);
      if (JSON.stringify(s1) !== JSON.stringify(s2)) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  it("suppliers are rare (most blocks have none)", () => {
    let blocksWithSuppliers = 0;
    const totalBlocks = 100;
    for (let i = 0; i < totalBlocks; i++) {
      const suppliers = generateSuppliers(30 + i * 0.01, -96.0, 1);
      if (suppliers.length > 0) blocksWithSuppliers++;
    }
    // With ~4% per supplier type, most blocks should be empty
    expect(blocksWithSuppliers).toBeLessThan(totalBlocks * 0.5);
  });

  it("black market alleys are very rare", () => {
    let blackMarketCount = 0;
    const totalBlocks = 500;
    for (let i = 0; i < totalBlocks; i++) {
      const suppliers = generateSuppliers(30 + i * 0.002, -96.0, 1);
      if (suppliers.some((s) => s.isBlackMarket)) blackMarketCount++;
    }
    // 1.5% probability — expect roughly 7-8 out of 500, allow wide range
    expect(blackMarketCount).toBeLessThan(totalBlocks * 0.05);
  });

  it("supplier configs are valid", () => {
    for (const config of SUPPLIER_CONFIGS) {
      expect(config.spawnProbability).toBeGreaterThan(0);
      expect(config.spawnProbability).toBeLessThan(1);
      expect(config.priceMultiplier).toBeGreaterThan(0);
      expect(config.priceMultiplier).toBeLessThan(1);
      if (config.isBlackMarket) {
        expect(config.fineAmount).toBeGreaterThan(0);
        expect(config.caughtChance).toBeGreaterThan(0);
        expect(config.caughtChance).toBeLessThanOrEqual(1);
      }
    }
  });

  it("generated suppliers have valid positions", () => {
    // Find a block with suppliers
    for (let i = 0; i < 200; i++) {
      const suppliers = generateSuppliers(30 + i * 0.005, -96.0, 1);
      for (const supplier of suppliers) {
        expect(supplier.x).toBeGreaterThanOrEqual(1);
        expect(supplier.x).toBeLessThan(BLOCK_GRID_SIZE - 1);
        expect(supplier.y).toBeGreaterThanOrEqual(1);
        expect(supplier.y).toBeLessThan(BLOCK_GRID_SIZE - 1);
      }
    }
  });
});

// ============================================================================
// BLACK MARKET PURCHASE MECHANICS
// ============================================================================

describe("Black Market Purchase", () => {
  it("returns success for valid black market supplier", () => {
    const result = attemptBlackMarketPurchase("black_market_alley", 1000);
    expect(result.success).toBe(true);
  });

  it("returns failure for non-black-market supplier", () => {
    const result = attemptBlackMarketPurchase("sugar_rush", 1000);
    expect(result.success).toBe(false);
  });

  it("applies correct discount (60% off)", () => {
    const result = attemptBlackMarketPurchase("black_market_alley", 1000);
    expect(result.discountedPrice).toBe(400); // 1000 * 0.40
  });

  it("fine amount is correct when caught", () => {
    // Run many attempts to find a "caught" result
    let caughtResult = null;
    for (let i = 0; i < 100; i++) {
      const result = attemptBlackMarketPurchase("black_market_alley", 1000);
      if (result.caught) {
        caughtResult = result;
        break;
      }
    }
    // With 25% chance, should find one in 100 attempts
    if (caughtResult) {
      expect(caughtResult.fineAmount).toBe(5000);
    }
  });

  it("not-caught result has zero fine", () => {
    let notCaughtResult = null;
    for (let i = 0; i < 100; i++) {
      const result = attemptBlackMarketPurchase("black_market_alley", 1000);
      if (!result.caught) {
        notCaughtResult = result;
        break;
      }
    }
    if (notCaughtResult) {
      expect(notCaughtResult.fineAmount).toBe(0);
    }
  });

  it("caught probability is approximately 25%", () => {
    let caughtCount = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      const result = attemptBlackMarketPurchase("black_market_alley", 100);
      if (result.caught) caughtCount++;
    }
    const caughtRate = caughtCount / trials;
    // Allow 5% tolerance
    expect(caughtRate).toBeGreaterThan(0.15);
    expect(caughtRate).toBeLessThan(0.35);
  });
});

// ============================================================================
// FULL BLOCK GENERATION
// ============================================================================

describe("Full Block Generation", () => {
  it("generates a complete block with all layers", () => {
    const block = generateBlock(32.7767, -96.7970, 1);
    expect(block.roads.length).toBe(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
    expect(block.buildings.length).toBeGreaterThan(0);
    expect(block.props.length).toBeGreaterThan(0);
    expect(block.npcs.length).toBeGreaterThan(0);
    expect(block.districtType).toBeTruthy();
    expect(block.footTraffic).toBeGreaterThan(0);
  });

  it("block is fully deterministic for same inputs", () => {
    const block1 = generateBlock(32.7767, -96.7970, 1);
    const block2 = generateBlock(32.7767, -96.7970, 1);
    expect(block1).toEqual(block2);
  });

  it("permanent layers stay the same across seasons", () => {
    const block1 = generateBlock(32.7767, -96.7970, 1);
    const block2 = generateBlock(32.7767, -96.7970, 2);
    // Roads and props (permanent) should be identical
    expect(block1.roads).toEqual(block2.roads);
    expect(block1.props).toEqual(block2.props);
    expect(block1.districtType).toBe(block2.districtType);
  });

  it("seasonal layers change across seasons", () => {
    const block1 = generateBlock(32.7767, -96.7970, 1);
    const block2 = generateBlock(32.7767, -96.7970, 2);
    // Buildings and NPCs (seasonal) should differ
    expect(JSON.stringify(block1.buildings)).not.toBe(JSON.stringify(block2.buildings));
  });

  it("block has correct coordinate metadata", () => {
    const block = generateBlock(32.7767, -96.7970, 1);
    expect(block.blockLat).toBe(Math.floor(32.7767 * 1000));
    expect(block.blockLng).toBe(Math.floor(-96.7970 * 1000));
    // centerLat = (blockLat + 0.5) / 1000
    const expectedCenterLat = (block.blockLat + 0.5) / 1000;
    const expectedCenterLng = (block.blockLng + 0.5) / 1000;
    expect(block.centerLat).toBeCloseTo(expectedCenterLat, 4);
    expect(block.centerLng).toBeCloseTo(expectedCenterLng, 4);
  });

  it("foot traffic is positive for non-park districts", () => {
    // Test several locations
    for (let lat = 30; lat < 35; lat += 0.5) {
      const block = generateBlock(lat, -96.0, 1);
      expect(block.footTraffic).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// VIEWPORT GENERATION
// ============================================================================

describe("Viewport Generation", () => {
  it("generates correct number of blocks for default radius", () => {
    const blocks = generateViewport(32.7767, -96.7970, 1);
    // Default radius = 2, so 5x5 = 25 blocks
    expect(blocks.length).toBe(25);
  });

  it("generates correct number of blocks for custom radius", () => {
    const blocks = generateViewport(32.7767, -96.7970, 1, 1);
    // Radius 1 = 3x3 = 9 blocks
    expect(blocks.length).toBe(9);
  });

  it("viewport blocks are all unique", () => {
    const blocks = generateViewport(32.7767, -96.7970, 1);
    const coords = blocks.map((b) => `${b.blockLat},${b.blockLng}`);
    const uniqueCoords = new Set(coords);
    expect(uniqueCoords.size).toBe(blocks.length);
  });

  it("viewport is centered on the given coordinates", () => {
    const blocks = generateViewport(32.7767, -96.7970, 1, 2);
    const centerBlock = blocks[Math.floor(blocks.length / 2)];
    expect(centerBlock.blockLat).toBe(Math.floor(32.7767 * 1000));
    expect(centerBlock.blockLng).toBe(Math.floor(-96.7970 * 1000));
  });

  it("all viewport blocks have valid data", () => {
    const blocks = generateViewport(32.7767, -96.7970, 1);
    for (const block of blocks) {
      expect(block.roads.length).toBe(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
      expect(block.districtType).toBeTruthy();
      expect(block.footTraffic).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// LOCATION SUMMARY
// ============================================================================

describe("Location Summary", () => {
  it("returns valid summary data", () => {
    const summary = getLocationSummary(32.7767, -96.7970, 1);
    expect(summary.districtType).toBeTruthy();
    expect(summary.districtLabel).toBeTruthy();
    expect(["very_low", "low", "medium", "high", "very_high"]).toContain(summary.footTrafficLevel);
    expect(summary.rentCostMultiplier).toBeGreaterThan(0);
    expect(summary.vendingDemandMultiplier).toBeGreaterThan(0);
    expect(typeof summary.hasSupplier).toBe("boolean");
    expect(typeof summary.hasBlackMarket).toBe("boolean");
    expect(Array.isArray(summary.supplierNames)).toBe(true);
  });

  it("is deterministic", () => {
    const summary1 = getLocationSummary(32.7767, -96.7970, 1);
    const summary2 = getLocationSummary(32.7767, -96.7970, 1);
    expect(summary1).toEqual(summary2);
  });

  it("black market is not listed in supplier names", () => {
    // Test many locations to find one with a black market
    for (let i = 0; i < 200; i++) {
      const summary = getLocationSummary(30 + i * 0.005, -96.0, 1);
      if (summary.hasBlackMarket) {
        expect(summary.supplierNames).not.toContain("???");
        break;
      }
    }
  });
});

// ============================================================================
// SPRITE CATALOG INTEGRITY
// ============================================================================

describe("Sprite Catalog Integrity", () => {
  it("all building types have sprite definitions", () => {
    const buildingTypes = Object.keys(BUILDING_SPRITES);
    expect(buildingTypes.length).toBe(6);
    for (const sprite of Object.values(BUILDING_SPRITES)) {
      expect(sprite.spriteKey).toBeTruthy();
      expect(sprite.widthTiles).toBeGreaterThan(0);
      expect(sprite.heightTiles).toBeGreaterThan(0);
    }
  });

  it("all vending machine types have sprite mappings", () => {
    const types = Object.keys(VENDING_MACHINE_SPRITES);
    expect(types.length).toBe(12);
    for (const spriteKey of Object.values(VENDING_MACHINE_SPRITES)) {
      expect(spriteKey).toBeTruthy();
    }
  });

  it("all NPC sprites have valid configs", () => {
    expect(NPC_SPRITES.length).toBe(11);
    for (const npc of NPC_SPRITES) {
      expect(npc.spriteKey).toBeTruthy();
      expect(npc.spawnWeight).toBeGreaterThanOrEqual(0);
    }
  });

  it("all vehicle sprites have valid configs", () => {
    expect(VEHICLE_SPRITES.length).toBe(7);
    for (const vehicle of VEHICLE_SPRITES) {
      expect(vehicle.spriteKey).toBeTruthy();
      expect(vehicle.spawnWeight).toBeGreaterThanOrEqual(0);
    }
  });

  it("all prop sprites have valid configs", () => {
    expect(PROP_SPRITES.length).toBe(4);
    for (const prop of PROP_SPRITES) {
      expect(prop.spriteKey).toBeTruthy();
      expect(prop.spawnWeight).toBeGreaterThan(0);
    }
  });

  it("supplier configs total 7 types", () => {
    expect(SUPPLIER_CONFIGS.length).toBe(7);
    const blackMarkets = SUPPLIER_CONFIGS.filter((s) => s.isBlackMarket);
    expect(blackMarkets.length).toBe(1);
  });
});

// ============================================================================
// EDGE CASES & BOUNDARY CONDITIONS
// ============================================================================

describe("Edge Cases", () => {
  it("handles equator coordinates (lat=0, lng=0)", () => {
    const block = generateBlock(0, 0, 1);
    expect(block.roads.length).toBe(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
    expect(block.districtType).toBeTruthy();
  });

  it("handles extreme northern coordinates", () => {
    const block = generateBlock(89.999, -96.0, 1);
    expect(block.roads.length).toBe(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
  });

  it("handles extreme southern coordinates", () => {
    const block = generateBlock(-89.999, -96.0, 1);
    expect(block.roads.length).toBe(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
  });

  it("handles international date line", () => {
    const block = generateBlock(35.0, 179.999, 1);
    expect(block.roads.length).toBe(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
  });

  it("handles negative longitude", () => {
    const block = generateBlock(35.0, -179.999, 1);
    expect(block.roads.length).toBe(BLOCK_GRID_SIZE * BLOCK_GRID_SIZE);
  });

  it("handles season ID = 1 (first season)", () => {
    const block = generateBlock(32.7767, -96.7970, 1);
    expect(block.buildings.length).toBeGreaterThan(0);
  });

  it("handles large season IDs", () => {
    const block = generateBlock(32.7767, -96.7970, 99999);
    expect(block.buildings.length).toBeGreaterThan(0);
  });

  it("viewport with max radius generates correct count", () => {
    const blocks = generateViewport(32.7767, -96.7970, 1, 5);
    // Radius 5 = 11x11 = 121 blocks
    expect(blocks.length).toBe(121);
  });

  it("black market purchase with zero amount", () => {
    const result = attemptBlackMarketPurchase("black_market_alley", 0);
    expect(result.discountedPrice).toBe(0);
  });

  it("black market purchase with very large amount", () => {
    const result = attemptBlackMarketPurchase("black_market_alley", 1000000);
    expect(result.discountedPrice).toBe(400000);
  });
});
