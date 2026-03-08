import Foundation

enum SampleData {
    static let products: [Product] = [
        Product(id: "p1", name: "Cola Classic", category: .soda, baseCost: 0.45, marketPrice: 0.52, priceDirection: .up, priceChangePercent: 8.2, expirationDays: 5, iconName: "drop.fill", demographicAffinityTags: ["cola", "high-sugar-soda", "soda"]),
        Product(id: "p2", name: "Lemon Fizz", category: .soda, baseCost: 0.40, marketPrice: 0.38, priceDirection: .down, priceChangePercent: 5.0, expirationDays: 5, iconName: "drop.fill", demographicAffinityTags: ["soda", "high-sugar-soda"]),
        Product(id: "p3", name: "Orange Burst", category: .soda, baseCost: 0.50, marketPrice: 0.55, priceDirection: .up, priceChangePercent: 10.0, expirationDays: 4, iconName: "drop.fill", demographicAffinityTags: ["soda", "juice"]),
        Product(id: "p4", name: "Energy Rush", category: .soda, baseCost: 0.80, marketPrice: 0.82, priceDirection: .stable, priceChangePercent: 1.2, expirationDays: 5, iconName: "bolt.fill", demographicAffinityTags: ["energy-drink"]),
        Product(id: "p5", name: "Sparkling Water", category: .soda, baseCost: 0.30, marketPrice: 0.28, priceDirection: .down, priceChangePercent: 6.7, expirationDays: 5, iconName: "drop.fill", demographicAffinityTags: ["sparkling-water", "water", "healthy"]),
        Product(id: "p6", name: "Cheese Puffs", category: .snacks, baseCost: 0.35, marketPrice: 0.42, priceDirection: .up, priceChangePercent: 12.5, expirationDays: 5, iconName: "flame.fill", demographicAffinityTags: ["chips", "snacks"]),
        Product(id: "p7", name: "Chocolate Bar", category: .snacks, baseCost: 0.60, marketPrice: 0.58, priceDirection: .down, priceChangePercent: 3.3, expirationDays: 4, iconName: "rectangle.fill", demographicAffinityTags: ["candy", "snacks"]),
        Product(id: "p8", name: "Potato Chips", category: .snacks, baseCost: 0.40, marketPrice: 0.48, priceDirection: .up, priceChangePercent: 15.0, expirationDays: 5, iconName: "flame.fill", demographicAffinityTags: ["chips", "snacks"]),
        Product(id: "p9", name: "Gummy Bears", category: .snacks, baseCost: 0.50, marketPrice: 0.50, priceDirection: .stable, priceChangePercent: 0.5, expirationDays: 5, iconName: "star.fill", demographicAffinityTags: ["candy", "snacks"]),
        Product(id: "p10", name: "Trail Mix", category: .healthy, baseCost: 0.70, marketPrice: 0.82, priceDirection: .up, priceChangePercent: 14.2, expirationDays: 3, iconName: "leaf.fill", demographicAffinityTags: ["trail-mix", "healthy", "fruit"]),
        Product(id: "p11", name: "Protein Bar", category: .healthy, baseCost: 0.90, marketPrice: 0.95, priceDirection: .up, priceChangePercent: 5.5, expirationDays: 5, iconName: "dumbbell.fill", demographicAffinityTags: ["protein-bar", "healthy"]),
        Product(id: "p12", name: "Dried Fruit", category: .healthy, baseCost: 0.55, marketPrice: 0.50, priceDirection: .down, priceChangePercent: 9.1, expirationDays: 4, iconName: "leaf.fill", demographicAffinityTags: ["dried-fruit", "fruit", "healthy"]),
        Product(id: "p13", name: "Veggie Sticks", category: .healthy, baseCost: 0.65, marketPrice: 0.72, priceDirection: .up, priceChangePercent: 10.7, expirationDays: 2, iconName: "carrot.fill", demographicAffinityTags: ["veggie", "healthy"]),
        Product(id: "p14", name: "Coconut Water", category: .healthy, baseCost: 0.85, marketPrice: 0.88, priceDirection: .stable, priceChangePercent: 2.1, expirationDays: 5, iconName: "drop.fill", demographicAffinityTags: ["water", "healthy"]),
        Product(id: "p15", name: "Milk Coffee", category: .soda, baseCost: 0.75, marketPrice: 0.80, priceDirection: .up, priceChangePercent: 6.5, expirationDays: 3, iconName: "cup.and.saucer.fill", demographicAffinityTags: ["milk-coffee", "coffee"]),
        Product(id: "p16", name: "Green Tea", category: .healthy, baseCost: 0.60, marketPrice: 0.65, priceDirection: .up, priceChangePercent: 8.0, expirationDays: 5, iconName: "leaf.fill", demographicAffinityTags: ["green-tea", "healthy"]),
        Product(id: "p17", name: "Hot Cheetos", category: .snacks, baseCost: 0.45, marketPrice: 0.55, priceDirection: .up, priceChangePercent: 18.0, expirationDays: 5, iconName: "flame.fill", demographicAffinityTags: ["hot-cheetos", "chips", "snacks"]),
    ]

    static let machineProducts: [VendingMachineProduct] = [
        VendingMachineProduct(id: "vp1", product: products[0], stock: 18, maxStock: 30, sellingPrice: 1.50, expirationDate: Date().addingTimeInterval(86400 * 4)),
        VendingMachineProduct(id: "vp2", product: products[5], stock: 5, maxStock: 25, sellingPrice: 1.25, expirationDate: Date().addingTimeInterval(86400 * 2)),
        VendingMachineProduct(id: "vp3", product: products[7], stock: 22, maxStock: 25, sellingPrice: 1.75, expirationDate: Date().addingTimeInterval(86400 * 5)),
        VendingMachineProduct(id: "vp4", product: products[10], stock: 8, maxStock: 20, sellingPrice: 2.50, expirationDate: Date().addingTimeInterval(86400 * 3)),
        VendingMachineProduct(id: "vp5", product: products[3], stock: 2, maxStock: 20, sellingPrice: 2.00, expirationDate: Date().addingTimeInterval(86400 * 1)),
        VendingMachineProduct(id: "vp6", product: products[13], stock: 15, maxStock: 20, sellingPrice: 2.25, expirationDate: Date().addingTimeInterval(86400 * 5)),
    ]

    static let powerUps: [PowerUp] = [
        PowerUp(id: "pu1", name: "Protection Shield", description: "7-day protection zone around your machine", category: .turf, costMin: 500, costMax: 1000, effectDescription: "Blocks competitors within radius", iconName: "shield.checkered", durabilityType: .timed, durationDays: 7, malfunctionChancePercent: 0, repairCostPercent: 0),
        PowerUp(id: "pu2", name: "Permanent Claim", description: "Permanent smaller protection zone", category: .turf, costMin: 5000, costMax: 10000, effectDescription: "Permanent territory control", iconName: "mappin.circle.fill", durabilityType: .breakable, durationDays: nil, malfunctionChancePercent: 5, repairCostPercent: 25),
        PowerUp(id: "pu3", name: "LED Lighting Kit", description: "Enhanced visibility and night attraction", category: .visual, costMin: 800, costMax: 1200, effectDescription: "+15% customer attraction", iconName: "lightbulb.max.fill", durabilityType: .breakable, durationDays: nil, malfunctionChancePercent: 12, repairCostPercent: 30),
        PowerUp(id: "pu4", name: "Neon Wrap", description: "Custom neon graphics that pop", category: .visual, costMin: 1500, costMax: 2500, effectDescription: "+20% customer attraction", iconName: "paintbrush.fill", durabilityType: .breakable, durationDays: nil, malfunctionChancePercent: 8, repairCostPercent: 35),
        PowerUp(id: "pu5", name: "Digital Display", description: "Interactive screen for ads and promos", category: .visual, costMin: 3000, costMax: 5000, effectDescription: "+25% attraction + ad revenue", iconName: "tv.fill", durabilityType: .breakable, durationDays: nil, malfunctionChancePercent: 15, repairCostPercent: 40),
        PowerUp(id: "pu6", name: "Weather Canopy", description: "Protection from weather elements", category: .environmental, costMin: 2000, costMax: 3000, effectDescription: "80% sales in bad weather", iconName: "umbrella.fill", durabilityType: .timed, durationDays: 21, malfunctionChancePercent: 10, repairCostPercent: 20),
        PowerUp(id: "pu7", name: "Temp Control", description: "Optimal product temperature always", category: .environmental, costMin: 2500, costMax: 3500, effectDescription: "No spoilage + 10% consistency", iconName: "thermometer.medium", durabilityType: .breakable, durationDays: nil, malfunctionChancePercent: 18, repairCostPercent: 35),
        PowerUp(id: "pu8", name: "High-Cap Trays", description: "50% more inventory storage", category: .operational, costMin: 1000, costMax: 1500, effectDescription: "+50% storage capacity", iconName: "archivebox.fill", durabilityType: .breakable, durationDays: nil, malfunctionChancePercent: 6, repairCostPercent: 20),
        PowerUp(id: "pu9", name: "Fast Dispenser", description: "Reduced customer wait times", category: .operational, costMin: 1200, costMax: 1800, effectDescription: "+20% speed, +10% satisfaction", iconName: "bolt.circle.fill", durabilityType: .breakable, durationDays: nil, malfunctionChancePercent: 20, repairCostPercent: 30),
        PowerUp(id: "pu10", name: "Remote Diagnostics", description: "Real-time machine monitoring", category: .operational, costMin: 1500, costMax: 2000, effectDescription: "-30% maintenance time", iconName: "antenna.radiowaves.left.and.right", durabilityType: .timed, durationDays: 14, malfunctionChancePercent: 5, repairCostPercent: 15),
        PowerUp(id: "pu11", name: "Auto Restock Drone", description: "Automated restocking within 1km", category: .operational, costMin: 8000, costMax: 12000, effectDescription: "Auto-restock nearby machines", iconName: "airplane", durabilityType: .breakable, durationDays: nil, malfunctionChancePercent: 25, repairCostPercent: 45),
    ]

    static let m1PowerUps: [InstalledPowerUp] = [
        InstalledPowerUp(id: "ip1", powerUp: powerUps[0], machineId: "m1", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 3), expirationDate: Date().addingTimeInterval(86400 * 4), healthPercent: 100),
        InstalledPowerUp(id: "ip2", powerUp: powerUps[2], machineId: "m1", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 10), expirationDate: nil, healthPercent: 82),
        InstalledPowerUp(id: "ip3", powerUp: powerUps[3], machineId: "m1", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 8), expirationDate: nil, healthPercent: 91),
        InstalledPowerUp(id: "ip4", powerUp: powerUps[4], machineId: "m1", condition: .malfunctioning, installedDate: Date().addingTimeInterval(-86400 * 15), expirationDate: nil, healthPercent: 45),
        InstalledPowerUp(id: "ip5", powerUp: powerUps[6], machineId: "m1", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 5), expirationDate: nil, healthPercent: 88),
        InstalledPowerUp(id: "ip6", powerUp: powerUps[7], machineId: "m1", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 12), expirationDate: nil, healthPercent: 76),
        InstalledPowerUp(id: "ip7", powerUp: powerUps[10], machineId: "m1", condition: .broken, installedDate: Date().addingTimeInterval(-86400 * 20), expirationDate: nil, healthPercent: 12),
    ]

    static let m2PowerUps: [InstalledPowerUp] = [
        InstalledPowerUp(id: "ip8", powerUp: powerUps[0], machineId: "m2", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 2), expirationDate: Date().addingTimeInterval(86400 * 5), healthPercent: 100),
        InstalledPowerUp(id: "ip9", powerUp: powerUps[2], machineId: "m2", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 6), expirationDate: nil, healthPercent: 90),
        InstalledPowerUp(id: "ip10", powerUp: powerUps[5], machineId: "m2", condition: .expired, installedDate: Date().addingTimeInterval(-86400 * 25), expirationDate: Date().addingTimeInterval(-86400 * 4), healthPercent: 100),
        InstalledPowerUp(id: "ip11", powerUp: powerUps[6], machineId: "m2", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 7), expirationDate: nil, healthPercent: 72),
        InstalledPowerUp(id: "ip12", powerUp: powerUps[7], machineId: "m2", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 4), expirationDate: nil, healthPercent: 95),
    ]

    static let m3PowerUps: [InstalledPowerUp] = [
        InstalledPowerUp(id: "ip13", powerUp: powerUps[1], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 20), expirationDate: nil, healthPercent: 85),
        InstalledPowerUp(id: "ip14", powerUp: powerUps[2], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 14), expirationDate: nil, healthPercent: 78),
        InstalledPowerUp(id: "ip15", powerUp: powerUps[3], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 10), expirationDate: nil, healthPercent: 95),
        InstalledPowerUp(id: "ip16", powerUp: powerUps[4], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 12), expirationDate: nil, healthPercent: 88),
        InstalledPowerUp(id: "ip17", powerUp: powerUps[5], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 5), expirationDate: Date().addingTimeInterval(86400 * 16), healthPercent: 100),
        InstalledPowerUp(id: "ip18", powerUp: powerUps[6], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 8), expirationDate: nil, healthPercent: 92),
        InstalledPowerUp(id: "ip19", powerUp: powerUps[7], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 6), expirationDate: nil, healthPercent: 98),
        InstalledPowerUp(id: "ip20", powerUp: powerUps[8], machineId: "m3", condition: .malfunctioning, installedDate: Date().addingTimeInterval(-86400 * 18), expirationDate: nil, healthPercent: 52),
        InstalledPowerUp(id: "ip21", powerUp: powerUps[9], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 3), expirationDate: Date().addingTimeInterval(86400 * 11), healthPercent: 100),
        InstalledPowerUp(id: "ip22", powerUp: powerUps[10], machineId: "m3", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 2), expirationDate: nil, healthPercent: 94),
    ]

    static let m5PowerUps: [InstalledPowerUp] = [
        InstalledPowerUp(id: "ip23", powerUp: powerUps[0], machineId: "m5", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 1), expirationDate: Date().addingTimeInterval(86400 * 6), healthPercent: 100),
        InstalledPowerUp(id: "ip24", powerUp: powerUps[2], machineId: "m5", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 9), expirationDate: nil, healthPercent: 85),
        InstalledPowerUp(id: "ip25", powerUp: powerUps[4], machineId: "m5", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 7), expirationDate: nil, healthPercent: 79),
        InstalledPowerUp(id: "ip26", powerUp: powerUps[7], machineId: "m5", condition: .broken, installedDate: Date().addingTimeInterval(-86400 * 22), expirationDate: nil, healthPercent: 8),
        InstalledPowerUp(id: "ip27", powerUp: powerUps[8], machineId: "m5", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 4), expirationDate: nil, healthPercent: 90),
        InstalledPowerUp(id: "ip28", powerUp: powerUps[9], machineId: "m5", condition: .active, installedDate: Date().addingTimeInterval(-86400 * 2), expirationDate: Date().addingTimeInterval(86400 * 12), healthPercent: 100),
    ]

    static let machines: [VendingMachine] = [
        VendingMachine(id: "m1", name: "Downtown Hub", latitude: 40.7580, longitude: -73.9855, status: .healthy, products: Array(machineProducts[0...2]), dailyRevenue: 142.50, totalRevenue: 3280.00, reputation: 4.7, turfRadius: 200, installedPowerUps: m1PowerUps, footTraffic: 850, customSkinName: "Midnight Chrome", maintenanceLevel: 85, basePurchaseCost: 5000, demographicProfile: .downtownBusiness, restockState: .idle, capacity: 100, usedCapacity: 45),
        VendingMachine(id: "m2", name: "Central Park East", latitude: 40.7694, longitude: -73.9654, status: .lowStock, products: Array(machineProducts[2...4]), dailyRevenue: 98.25, totalRevenue: 2150.00, reputation: 4.2, turfRadius: 150, installedPowerUps: m2PowerUps, footTraffic: 620, customSkinName: nil, maintenanceLevel: 72, basePurchaseCost: 4500, demographicProfile: .touristDistrict, restockState: .idle, capacity: 80, usedCapacity: 46),
        VendingMachine(id: "m3", name: "Midtown Office", latitude: 40.7549, longitude: -73.9840, status: .healthy, products: Array(machineProducts[0...3]), dailyRevenue: 215.80, totalRevenue: 5420.00, reputation: 4.9, turfRadius: 250, installedPowerUps: m3PowerUps, footTraffic: 1200, customSkinName: "Neon Surge", maintenanceLevel: 95, basePurchaseCost: 6000, demographicProfile: .downtownBusiness, restockState: .idle, capacity: 150, usedCapacity: 53),
        VendingMachine(id: "m4", name: "Brooklyn Bridge", latitude: 40.7061, longitude: -73.9969, status: .needsMaintenance, products: Array(machineProducts[3...5]), dailyRevenue: 45.00, totalRevenue: 890.00, reputation: 3.5, turfRadius: 0, installedPowerUps: [], footTraffic: 380, customSkinName: nil, maintenanceLevel: 25, basePurchaseCost: 3500, demographicProfile: .touristDistrict, restockState: .idle, capacity: 60, usedCapacity: 25),
        VendingMachine(id: "m5", name: "SoHo Corner", latitude: 40.7233, longitude: -73.9985, status: .healthy, products: machineProducts, dailyRevenue: 178.90, totalRevenue: 4100.00, reputation: 4.5, turfRadius: 180, installedPowerUps: m5PowerUps, footTraffic: 940, customSkinName: "Urban Slate", maintenanceLevel: 90, basePurchaseCost: 5500, demographicProfile: .universityCampus, restockState: .idle, capacity: 120, usedCapacity: 70),
    ]

    static let player = PlayerProfile(
        name: "VendKing",
        brandName: "UrbanVend Co.",
        brandColor: "electricGreen",
        competitionBucks: 28_250.00,
        premiumBucks: 6_000.00,
        reputation: 4.6,
        rank: 12,
        totalMachines: 5,
        seasonDaysRemaining: 18,
        totalRevenue: 15_840.00,
        totalExpenses: 8_420.00,
        referralCount: 3,
        hasMarketInsight: true,
        lifetimeElo: 1480,
        hiddenEloRating: 1480,
        tycoonScore: TycoonScore(financialScore: 420, operationalScore: 245, logisticalScore: 160, totalScore: 825),
        timezoneRegion: .naEast
    )

    static let dailyReport = DailyReport(
        totalRevenue: 680.45,
        totalExpenses: 245.20,
        mostProfitableMachine: "Midtown Office",
        alertCount: 3,
        customersServed: 342,
        lowStockMachines: 2
    )

    static let leaderboard: [LeaderboardEntry] = [
        LeaderboardEntry(id: "l1", playerName: "MegaVend", brandName: "MegaVend Empire", netWorth: 48_200, machineCount: 12, reputation: 4.9, rank: 1, tycoonScore: 1240, eloBracketTier: .platinum, financialScore: 620, operationalScore: 372, logisticalScore: 248),
        LeaderboardEntry(id: "l2", playerName: "SnackMaster", brandName: "SnackMaster Pro", netWorth: 45_800, machineCount: 10, reputation: 4.8, rank: 2, tycoonScore: 1180, eloBracketTier: .gold, financialScore: 590, operationalScore: 354, logisticalScore: 236),
        LeaderboardEntry(id: "l3", playerName: "VendQueen", brandName: "Royal Refreshments", netWorth: 42_100, machineCount: 9, reputation: 4.7, rank: 3, tycoonScore: 1090, eloBracketTier: .gold, financialScore: 545, operationalScore: 327, logisticalScore: 218),
        LeaderboardEntry(id: "l4", playerName: "DrinkBoss", brandName: "Hydrate Nation", netWorth: 39_500, machineCount: 8, reputation: 4.6, rank: 4, tycoonScore: 1020, eloBracketTier: .gold, financialScore: 510, operationalScore: 306, logisticalScore: 204),
        LeaderboardEntry(id: "l5", playerName: "NeonVend", brandName: "Neon Drinks LLC", netWorth: 38_200, machineCount: 8, reputation: 4.5, rank: 5, tycoonScore: 980, eloBracketTier: .silver, financialScore: 490, operationalScore: 294, logisticalScore: 196),
        LeaderboardEntry(id: "l6", playerName: "ChipKing", brandName: "Crispy Corner", netWorth: 36_800, machineCount: 7, reputation: 4.4, rank: 6, tycoonScore: 940, eloBracketTier: .silver, financialScore: 470, operationalScore: 282, logisticalScore: 188),
        LeaderboardEntry(id: "l7", playerName: "FreshDrop", brandName: "FreshDrop Vending", netWorth: 35_100, machineCount: 7, reputation: 4.5, rank: 7, tycoonScore: 900, eloBracketTier: .silver, financialScore: 450, operationalScore: 270, logisticalScore: 180),
        LeaderboardEntry(id: "l8", playerName: "UrbanSnack", brandName: "Urban Eats", netWorth: 34_900, machineCount: 6, reputation: 4.3, rank: 8, tycoonScore: 870, eloBracketTier: .silver, financialScore: 435, operationalScore: 261, logisticalScore: 174),
        LeaderboardEntry(id: "l9", playerName: "VendKing", brandName: "UrbanVend Co.", netWorth: 34_250, machineCount: 5, reputation: 4.6, rank: 9, tycoonScore: 825, eloBracketTier: .silver, financialScore: 420, operationalScore: 245, logisticalScore: 160),
        LeaderboardEntry(id: "l10", playerName: "CoolBrew", brandName: "CoolBrew Stations", netWorth: 32_800, machineCount: 6, reputation: 4.2, rank: 10, tycoonScore: 790, eloBracketTier: .silver, financialScore: 395, operationalScore: 237, logisticalScore: 158),
    ]

    static let marketEvents: [MarketEvent] = [
        MarketEvent(id: "e1", title: "Summer Heatwave Alert", description: "Beverage demand surges 25% as temperatures soar.", impactPercent: 25.0, affectedCategory: .soda, timestamp: Date()),
        MarketEvent(id: "e2", title: "Sugar Tax Proposal", description: "City council considers new sugar tax — snack prices may rise.", impactPercent: 15.0, affectedCategory: .snacks, timestamp: Date().addingTimeInterval(-3600)),
        MarketEvent(id: "e3", title: "Health Trend Surge", description: "Fitness influencer promotes healthy vending — demand up 20%.", impactPercent: 20.0, affectedCategory: .healthy, timestamp: Date().addingTimeInterval(-7200)),
        MarketEvent(id: "e4", title: "Supply Chain Disruption", description: "Port delays causing 10% price increases across all categories.", impactPercent: 10.0, affectedCategory: nil, timestamp: Date().addingTimeInterval(-14400)),
    ]

    static let seasonInfo = SeasonInfo(
        seasonNumber: 7,
        bracketSize: 500,
        entryFee: 50.0,
        prizePool: 21_250.0,
        daysRemaining: 18,
        totalPlayers: 487,
        playerRank: 12,
        timezoneRegion: .naEast,
        eloBracketTier: .silver,
        seasonStartDate: Date().addingTimeInterval(-86400 * 12),
        registrationDeadline: Date().addingTimeInterval(-86400 * 13)
    )

    static let sampleGameEvents: [GameEvent] = [
        GameEvent(id: "ge1", type: .transaction, severity: .positive, title: "Customer Forgot Change", description: "A customer left 12 VB behind at Downtown Hub.", machineId: "m1", machineName: "Downtown Hub", impactValue: 12, impactLabel: "+12 VB", iconName: "banknote.fill", timestamp: Date().addingTimeInterval(-300)),
        GameEvent(id: "ge2", type: .daily, severity: .negative, title: "Unexpected Rainstorm", description: "Heavy rain near Central Park East. Sales dropped to 40% of normal.", machineId: "m2", machineName: "Central Park East", impactValue: -60, impactLabel: "-60% sales", iconName: "cloud.rain.fill", timestamp: Date().addingTimeInterval(-3600)),
        GameEvent(id: "ge3", type: .global, severity: .positive, title: "Viral Snack Trend", description: "Cheese Puffs went viral on social media! Customer demand tripled for 48 hours.", machineId: nil, machineName: nil, impactValue: 200, impactLabel: "3x demand", iconName: "flame.fill", timestamp: Date().addingTimeInterval(-7200)),
        GameEvent(id: "ge4", type: .transaction, severity: .negative, title: "Double Dispense", description: "Machine at Midtown Office dropped 2 items instead of 1. Lost 1 unit of inventory.", machineId: "m3", machineName: "Midtown Office", impactValue: -1, impactLabel: "-1 unit", iconName: "arrow.2.squarepath", timestamp: Date().addingTimeInterval(-14400)),
        GameEvent(id: "ge5", type: .daily, severity: .positive, title: "Local Heatwave", description: "Heatwave near SoHo Corner! Cold drinks demand surged. Temp Control protected perishables.", machineId: "m5", machineName: "SoHo Corner", impactValue: 40, impactLabel: "+40% cold drinks", iconName: "sun.max.fill", timestamp: Date().addingTimeInterval(-18000)),
        GameEvent(id: "ge6", type: .global, severity: .negative, title: "Supply Chain Disruption", description: "Truck shortages causing restocking costs to jump 20% for 3 days.", machineId: nil, machineName: nil, impactValue: 20, impactLabel: "+20% restock cost", iconName: "shippingbox.and.arrow.backward.fill", timestamp: Date().addingTimeInterval(-28800)),
        GameEvent(id: "ge7", type: .transaction, severity: .negative, title: "Item Stuck — Machine Shaken", description: "Product stuck in Brooklyn Bridge. Customer shook the machine causing maintenance damage.", machineId: "m4", machineName: "Brooklyn Bridge", impactValue: -5, impactLabel: "-5 maintenance", iconName: "hand.raised.slash.fill", timestamp: Date().addingTimeInterval(-36000)),
        GameEvent(id: "ge8", type: .daily, severity: .contextual, title: "Local Heatwave", description: "Heatwave near Brooklyn Bridge. Cold drinks demand up but perishable snacks spoiled!", machineId: "m4", machineName: "Brooklyn Bridge", impactValue: -15, impactLabel: "Spoilage risk", iconName: "sun.max.fill", timestamp: Date().addingTimeInterval(-43200)),
    ]

    static let warehouseItems: [WarehouseItem] = [
        WarehouseItem(id: "w1", product: products[0], quantity: 120, purchasePrice: 0.52, expirationDate: Date().addingTimeInterval(86400 * 4)),
        WarehouseItem(id: "w2", product: products[3], quantity: 80, purchasePrice: 0.82, expirationDate: Date().addingTimeInterval(86400 * 5)),
        WarehouseItem(id: "w3", product: products[5], quantity: 200, purchasePrice: 0.42, expirationDate: Date().addingTimeInterval(86400 * 1)),
        WarehouseItem(id: "w4", product: products[7], quantity: 150, purchasePrice: 0.48, expirationDate: Date().addingTimeInterval(86400 * 3)),
        WarehouseItem(id: "w5", product: products[10], quantity: 60, purchasePrice: 0.95, expirationDate: Date().addingTimeInterval(86400 * 5)),
        WarehouseItem(id: "w6", product: products[13], quantity: 40, purchasePrice: 0.88, expirationDate: Date().addingTimeInterval(86400 * 4)),
        WarehouseItem(id: "w7", product: products[14], quantity: 90, purchasePrice: 0.80, expirationDate: Date().addingTimeInterval(86400 * 2)),
        WarehouseItem(id: "w8", product: products[15], quantity: 75, purchasePrice: 0.65, expirationDate: Date().addingTimeInterval(86400 * 5)),
        WarehouseItem(id: "w9", product: products[16], quantity: 180, purchasePrice: 0.55, expirationDate: Date().addingTimeInterval(86400 * 1), isExtraFresh: false),
        WarehouseItem(id: "w10", product: products[9], quantity: 45, purchasePrice: 0.82, expirationDate: Date().addingTimeInterval(86400 * 3)),
        WarehouseItem(id: "w11", product: products[12], quantity: 30, purchasePrice: 0.72, expirationDate: Date().addingTimeInterval(86400 * 7), isExtraFresh: true),
    ]

    static let employees: [Employee] = [
        Employee(id: "e1", name: "Marcus Johnson", wagePerTask: 45, assignedMachineId: "m1", statSpeed: 78, statQualityControl: 85, statAttendance: 92, statDriving: 70, statAdaptability: 65, statRepairSkill: 72, status: .idle, currentTaskStartTime: nil, estimatedArrivalTime: nil, assignmentLockUntil: nil, capacityCost: 15),
        Employee(id: "e2", name: "Sarah Chen", wagePerTask: 55, assignedMachineId: "m3", statSpeed: 88, statQualityControl: 90, statAttendance: 95, statDriving: 82, statAdaptability: 78, statRepairSkill: 85, status: .idle, currentTaskStartTime: nil, estimatedArrivalTime: nil, assignmentLockUntil: nil, capacityCost: 30),
        Employee(id: "e3", name: "Dwayne Mitchell", wagePerTask: 35, assignedMachineId: "m5", statSpeed: 55, statQualityControl: 42, statAttendance: 60, statDriving: 48, statAdaptability: 50, statRepairSkill: 30, status: .idle, currentTaskStartTime: nil, estimatedArrivalTime: nil, assignmentLockUntil: nil, capacityCost: 5),
        Employee(id: "e4", name: "Aisha Patel", wagePerTask: 50, assignedMachineId: nil, statSpeed: 72, statQualityControl: 80, statAttendance: 88, statDriving: 75, statAdaptability: 82, statRepairSkill: 68, status: .idle, currentTaskStartTime: nil, estimatedArrivalTime: nil, assignmentLockUntil: nil, capacityCost: 15),
    ]

    static let applicants: [Applicant] = [
        Applicant(id: "a1", name: "Tyler Brooks", wagePerRestock: 40, statSpeed: 62, statQualityControl: 55, statAttendance: 70, statDriving: 65, statAdaptability: 58, statRepairSkill: 45, capacityCost: 15, generatedAt: Date()),
        Applicant(id: "a2", name: "Lisa Nakamura", wagePerRestock: 60, statSpeed: 90, statQualityControl: 88, statAttendance: 85, statDriving: 78, statAdaptability: 92, statRepairSkill: 88, capacityCost: 50, generatedAt: Date()),
        Applicant(id: "a3", name: "DeShawn Williams", wagePerRestock: 30, statSpeed: 45, statQualityControl: 38, statAttendance: 50, statDriving: 42, statAdaptability: 40, statRepairSkill: 35, capacityCost: 5, generatedAt: Date()),
        Applicant(id: "a4", name: "Emma Rodriguez", wagePerRestock: 48, statSpeed: 75, statQualityControl: 70, statAttendance: 82, statDriving: 68, statAdaptability: 72, statRepairSkill: 60, capacityCost: 15, generatedAt: Date()),
        Applicant(id: "a5", name: "Kenji Tanaka", wagePerRestock: 52, statSpeed: 80, statQualityControl: 76, statAttendance: 78, statDriving: 85, statAdaptability: 80, statRepairSkill: 75, capacityCost: 30, generatedAt: Date()),
    ]
}
