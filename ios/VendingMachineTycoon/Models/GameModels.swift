import Foundation
import CoreLocation

nonisolated enum ProductCategory: String, CaseIterable, Identifiable, Codable, Sendable {
    case soda = "Soda"
    case snacks = "Snacks"
    case healthy = "Healthy Options"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .soda: "cup.and.saucer.fill"
        case .snacks: "birthday.cake.fill"
        case .healthy: "leaf.fill"
        }
    }
}

nonisolated enum MachineStatus: String, CaseIterable, Codable, Sendable {
    case healthy = "Healthy"
    case lowStock = "Low Stock"
    case needsMaintenance = "Needs Maintenance"
    case broken = "Broken"
    case offline = "Offline"

    var icon: String {
        switch self {
        case .healthy: "checkmark.circle.fill"
        case .lowStock: "exclamationmark.triangle.fill"
        case .needsMaintenance: "wrench.fill"
        case .broken: "xmark.octagon.fill"
        case .offline: "xmark.circle.fill"
        }
    }
}

nonisolated enum PriceDirection: String, Codable, Sendable {
    case up, down, stable
}

nonisolated enum PowerUpCategory: String, CaseIterable, Identifiable, Codable, Sendable {
    case turf = "Turf Protection"
    case visual = "Visual Appeal"
    case environmental = "Environmental"
    case operational = "Operational"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .turf: "shield.fill"
        case .visual: "sparkles"
        case .environmental: "cloud.sun.fill"
        case .operational: "gearshape.2.fill"
        }
    }
}

nonisolated enum PowerUpDurabilityType: String, Codable, Sendable {
    case timed
    case breakable
}

nonisolated enum PowerUpCondition: String, Codable, Sendable {
    case active = "Active"
    case malfunctioning = "Malfunctioning"
    case broken = "Broken"
    case expired = "Expired"

    var icon: String {
        switch self {
        case .active: "checkmark.circle.fill"
        case .malfunctioning: "exclamationmark.triangle.fill"
        case .broken: "xmark.octagon.fill"
        case .expired: "clock.badge.xmark"
        }
    }

    var isOperational: Bool {
        self == .active
    }
}

nonisolated enum WalletType: String, Codable, Sendable {
    case competition
    case premium
}

nonisolated enum GameEventType: String, Codable, Sendable {
    case transaction
    case daily
    case global
}

nonisolated enum GameEventSeverity: String, Codable, Sendable {
    case positive
    case negative
    case critical
    case contextual
    case neutral
}

nonisolated enum ZoneType: String, Codable, Sendable {
    case commercial = "Commercial"
    case residential = "Residential"
    case highway = "Highway"
    case water = "Water"
    case park = "Park"
    case industrial = "Industrial"
    case restricted = "Restricted"

    var isPlacementAllowed: Bool {
        switch self {
        case .commercial, .park, .industrial: true
        case .residential, .highway, .water, .restricted: false
        }
    }

    var icon: String {
        switch self {
        case .commercial: "building.2.fill"
        case .residential: "house.fill"
        case .highway: "road.lanes"
        case .water: "water.waves"
        case .park: "tree.fill"
        case .industrial: "hammer.fill"
        case .restricted: "nosign"
        }
    }
}

nonisolated enum LocationReportReason: String, CaseIterable, Codable, Sendable {
    case privateProperty = "Private Property"
    case dangerousLocation = "Dangerous Location"
    case obstructingPath = "Obstructing Path"
    case inappropriatePlacement = "Inappropriate Placement"

    var icon: String {
        switch self {
        case .privateProperty: "house.lodge.fill"
        case .dangerousLocation: "exclamationmark.triangle.fill"
        case .obstructingPath: "figure.walk"
        case .inappropriatePlacement: "nosign"
        }
    }
}

nonisolated enum LocationReportStatus: String, Codable, Sendable {
    case pending = "Pending"
    case reviewing = "Reviewing"
    case resolved = "Resolved"
    case dismissed = "Dismissed"
}

nonisolated enum FreshnessConstants {
    static let standardExpirationDays: Int = 5
    static let extraFreshExpirationDays: Int = 7
    static let extraFreshChance: Double = 0.02
}

nonisolated struct Product: Identifiable, Codable, Sendable {
    let id: String
    let name: String
    let category: ProductCategory
    let baseCost: Double
    var marketPrice: Double
    var priceDirection: PriceDirection
    var priceChangePercent: Double
    let expirationDays: Int
    let iconName: String
    var demographicAffinityTags: [String]

    var margin: Double {
        ((marketPrice - baseCost) / baseCost) * 100
    }

    var effectiveExpirationDays: Int {
        min(expirationDays, FreshnessConstants.standardExpirationDays)
    }

    func affinityFor(profile: DemographicProfile) -> DemographicAffinity {
        let hasHigh = demographicAffinityTags.contains { profile.highDemandTags.contains($0) }
        let hasLow = demographicAffinityTags.contains { profile.lowDemandTags.contains($0) }
        if hasHigh { return .high }
        if hasLow { return .low }
        return .neutral
    }
}

nonisolated struct VendingMachineProduct: Identifiable, Codable, Sendable {
    let id: String
    let product: Product
    var stock: Int
    var maxStock: Int
    var sellingPrice: Double
    var expirationDate: Date

    var stockPercentage: Double {
        guard maxStock > 0 else { return 0 }
        return Double(stock) / Double(maxStock)
    }

    var isExpiringSoon: Bool {
        expirationDate.timeIntervalSinceNow < 86400 * 3
    }
}

nonisolated struct PowerUp: Identifiable, Codable, Sendable {
    let id: String
    let name: String
    let description: String
    let category: PowerUpCategory
    let costMin: Int
    let costMax: Int
    let effectDescription: String
    let iconName: String
    let durabilityType: PowerUpDurabilityType
    let durationDays: Int?
    let malfunctionChancePercent: Double
    let repairCostPercent: Double

    var repairCostRange: String {
        let minRepair = Int(Double(costMin) * repairCostPercent / 100.0)
        let maxRepair = Int(Double(costMax) * repairCostPercent / 100.0)
        return "\(minRepair.formatted()) - \(maxRepair.formatted())"
    }
}

nonisolated struct InstalledPowerUp: Identifiable, Codable, Sendable {
    let id: String
    let powerUp: PowerUp
    let machineId: String
    var condition: PowerUpCondition
    let installedDate: Date
    let expirationDate: Date?
    var healthPercent: Double

    var isExpiringSoon: Bool {
        guard let exp = expirationDate else { return false }
        return exp.timeIntervalSinceNow < 86400 * 2 && exp.timeIntervalSinceNow > 0
    }

    var isExpired: Bool {
        guard let exp = expirationDate else { return false }
        return exp.timeIntervalSinceNow <= 0
    }

    var daysRemaining: Int? {
        guard let exp = expirationDate else { return nil }
        return max(0, Int(ceil(exp.timeIntervalSinceNow / 86400)))
    }

    var repairCost: Int {
        Int(Double(powerUp.costMin) * powerUp.repairCostPercent / 100.0)
    }
}

nonisolated enum MachineRestockState: String, Codable, Sendable {
    case idle = "Idle"
    case restocking = "Restocking"
    case awaitingDispatch = "Awaiting Dispatch"
}

nonisolated struct VendingMachine: Identifiable, Codable, Sendable {
    let id: String
    var name: String
    var latitude: Double
    var longitude: Double
    var status: MachineStatus
    var products: [VendingMachineProduct]
    var dailyRevenue: Double
    var totalRevenue: Double
    var reputation: Double
    var turfRadius: Double
    var installedPowerUps: [InstalledPowerUp]
    var footTraffic: Int
    var customSkinName: String?
    var maintenanceLevel: Double
    var basePurchaseCost: Double
    var demographicProfile: DemographicProfile
    var restockState: MachineRestockState
    var capacity: Int
    var usedCapacity: Int

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var overallStockLevel: Double {
        guard !products.isEmpty else { return 0 }
        return products.reduce(0.0) { $0 + $1.stockPercentage } / Double(products.count)
    }

    var activePowerUps: [InstalledPowerUp] {
        installedPowerUps.filter { $0.condition.isOperational }
    }

    var upgradeCount: Int {
        activePowerUps.count
    }

    func hasPowerUp(_ powerUpId: String) -> Bool {
        installedPowerUps.contains { $0.powerUp.id == powerUpId && $0.condition.isOperational }
    }

    func powerUpCondition(_ powerUpId: String) -> PowerUpCondition? {
        installedPowerUps.first { $0.powerUp.id == powerUpId }?.condition
    }

    var hasTurfProtection: Bool {
        installedPowerUps.contains { ($0.powerUp.category == .turf) && $0.condition.isOperational }
    }

    var hasLEDLighting: Bool { hasPowerUp("pu3") }
    var hasNeonWrap: Bool { hasPowerUp("pu4") }
    var hasDigitalDisplay: Bool { hasPowerUp("pu5") }
    var hasWeatherproofing: Bool { hasPowerUp("pu6") }
    var hasTempControl: Bool { hasPowerUp("pu7") }
    var hasHighCapacity: Bool { hasPowerUp("pu8") }
    var hasFastDispense: Bool { hasPowerUp("pu9") }
    var hasRemoteDiagnostic: Bool { hasPowerUp("pu10") }
    var hasAutoDrone: Bool { hasPowerUp("pu11") }

    var malfunctioningPowerUps: [InstalledPowerUp] {
        installedPowerUps.filter { $0.condition == .malfunctioning }
    }

    var brokenPowerUps: [InstalledPowerUp] {
        installedPowerUps.filter { $0.condition == .broken }
    }

    var expiredPowerUps: [InstalledPowerUp] {
        installedPowerUps.filter { $0.condition == .expired }
    }

    var issueCount: Int {
        malfunctioningPowerUps.count + brokenPowerUps.count + expiredPowerUps.count
    }

    var salvageValue: Double {
        let machineRefund = basePurchaseCost * 0.5
        let inventoryValue = products.reduce(0.0) { total, vp in
            guard !vp.isExpiringSoon else { return total }
            return total + (vp.product.marketPrice * Double(vp.stock))
        }
        return machineRefund + (inventoryValue * 0.5)
    }
}

nonisolated enum EloBracketTier: String, CaseIterable, Identifiable, Codable, Sendable {
    case bronze = "Bronze"
    case silver = "Silver"
    case gold = "Gold"
    case platinum = "Platinum"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .bronze: "shield.fill"
        case .silver: "shield.lefthalf.filled"
        case .gold: "shield.checkered"
        case .platinum: "crown.fill"
        }
    }

    var color: String {
        switch self {
        case .bronze: "bronze"
        case .silver: "silver"
        case .gold: "gold"
        case .platinum: "platinum"
        }
    }

    var minElo: Int {
        switch self {
        case .bronze: 0
        case .silver: 1200
        case .gold: 1600
        case .platinum: 2000
        }
    }

    var maxElo: Int {
        switch self {
        case .bronze: 1199
        case .silver: 1599
        case .gold: 1999
        case .platinum: 9999
        }
    }

    var nextTier: EloBracketTier? {
        switch self {
        case .bronze: .silver
        case .silver: .gold
        case .gold: .platinum
        case .platinum: nil
        }
    }

    static func tier(for elo: Int) -> EloBracketTier {
        if elo >= 2000 { return .platinum }
        if elo >= 1600 { return .gold }
        if elo >= 1200 { return .silver }
        return .bronze
    }
}

nonisolated enum TimezoneRegion: String, CaseIterable, Identifiable, Codable, Sendable {
    case naEast = "NA-East"
    case naWest = "NA-West"
    case europe = "Europe"
    case asiaPacific = "Asia-Pacific"
    case southAmerica = "South America"
    case africa = "Africa"

    var id: String { rawValue }

    var displayName: String { rawValue }
}

nonisolated struct TycoonScore: Codable, Sendable {
    let financialScore: Double
    let operationalScore: Double
    let logisticalScore: Double
    let totalScore: Int

    var financialPercent: Double { financialScore / max(Double(totalScore), 1) * 100 }
    var operationalPercent: Double { operationalScore / max(Double(totalScore), 1) * 100 }
    var logisticalPercent: Double { logisticalScore / max(Double(totalScore), 1) * 100 }
}

nonisolated struct PracticeWallet: Codable, Sendable {
    var simulatedCoins: Double
    let startingCoins: Double
}

nonisolated struct PlayerProfile: Codable, Sendable {
    var name: String
    var brandName: String
    var brandColor: String
    var competitionBucks: Double
    var premiumBucks: Double
    var reputation: Double
    var rank: Int
    var totalMachines: Int
    var seasonDaysRemaining: Int
    var totalRevenue: Double
    var totalExpenses: Double
    var referralCount: Int
    var hasMarketInsight: Bool
    var lifetimeElo: Int
    var hiddenEloRating: Int
    var tycoonScore: TycoonScore?
    var timezoneRegion: TimezoneRegion

    var netProfit: Double { totalRevenue - totalExpenses }
    var totalBalance: Double { competitionBucks + premiumBucks }
    var eloBracketTier: EloBracketTier { EloBracketTier.tier(for: lifetimeElo) }

    var eloProgressToNextTier: Double {
        let tier = eloBracketTier
        guard let next = tier.nextTier else { return 1.0 }
        let range = Double(next.minElo - tier.minElo)
        let progress = Double(lifetimeElo - tier.minElo)
        return min(1.0, max(0.0, progress / range))
    }

    var pointsToNextTier: Int {
        let tier = eloBracketTier
        guard let next = tier.nextTier else { return 0 }
        return max(0, next.minElo - lifetimeElo)
    }
}

nonisolated struct LeaderboardEntry: Identifiable, Codable, Sendable {
    let id: String
    let playerName: String
    let brandName: String
    let netWorth: Double
    let machineCount: Int
    let reputation: Double
    let rank: Int
    let tycoonScore: Int
    let eloBracketTier: EloBracketTier
    let financialScore: Double
    let operationalScore: Double
    let logisticalScore: Double
}

nonisolated struct MarketEvent: Identifiable, Codable, Sendable {
    let id: String
    let title: String
    let description: String
    let impactPercent: Double
    let affectedCategory: ProductCategory?
    let timestamp: Date
}

nonisolated struct DailyReport: Codable, Sendable {
    let totalRevenue: Double
    let totalExpenses: Double
    let mostProfitableMachine: String
    let alertCount: Int
    let customersServed: Int
    let lowStockMachines: Int
}

nonisolated struct SeasonInfo: Codable, Sendable {
    let seasonNumber: Int
    let bracketSize: Int
    let entryFee: Double
    let prizePool: Double
    let daysRemaining: Int
    let totalPlayers: Int
    let playerRank: Int
    let timezoneRegion: TimezoneRegion
    let eloBracketTier: EloBracketTier
    let seasonStartDate: Date
    let registrationDeadline: Date
}

nonisolated struct GameEvent: Identifiable, Codable, Sendable {
    let id: String
    let type: GameEventType
    let severity: GameEventSeverity
    let title: String
    let description: String
    let machineId: String?
    let machineName: String?
    let impactValue: Double
    let impactLabel: String
    let iconName: String
    let timestamp: Date
}

nonisolated struct LocationReport: Identifiable, Codable, Sendable {
    let id: String
    let machineId: String
    let reporterEmail: String
    let reason: LocationReportReason
    let details: String
    var status: LocationReportStatus
    let timestamp: Date
}

nonisolated struct RelocationResult: Codable, Sendable {
    let success: Bool
    let fee: Double
    let message: String
}

nonisolated struct SalvageResult: Codable, Sendable {
    let machineRefund: Double
    let inventoryRefund: Double
    let totalRefund: Double
}
