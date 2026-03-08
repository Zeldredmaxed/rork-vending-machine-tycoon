import Foundation

nonisolated enum KYCStatus: String, Codable, Sendable {
    case notStarted = "Not Started"
    case pending = "Pending"
    case approved = "Approved"
    case rejected = "Rejected"

    var icon: String {
        switch self {
        case .notStarted: "questionmark.circle"
        case .pending: "clock.fill"
        case .approved: "checkmark.seal.fill"
        case .rejected: "xmark.seal.fill"
        }
    }
}

nonisolated enum SeasonState: String, Codable, Sendable {
    case preseason
    case active
    case ended
}

nonisolated struct ChatMessage: Identifiable, Codable, Sendable {
    let id: String
    let senderName: String
    let senderBrand: String
    let content: String
    let timestamp: Date
    let isFromPlayer: Bool
}

nonisolated struct ChatConversation: Identifiable, Codable, Sendable {
    let id: String
    let participantName: String
    let participantBrand: String
    let lastMessage: String
    let lastMessageTime: Date
    let unreadCount: Int
    let isAlliance: Bool
}

nonisolated struct BrandProfile: Codable, Sendable {
    var name: String
    var logoIcon: String
    var primaryColor: String
    var secondaryColor: String
    var tagline: String
    var totalRevenue: Double
    var machineCount: Int
    var reputation: Double
}

nonisolated struct CosmeticItem: Identifiable, Codable, Sendable {
    let id: String
    let name: String
    let description: String
    let costVB: Int
    let iconName: String
    let isLimitedEdition: Bool
    let isPurchased: Bool
    let category: CosmeticCategory
}

nonisolated enum CosmeticCategory: String, CaseIterable, Identifiable, Codable, Sendable {
    case skins = "Machine Skins"
    case wraps = "Neon Wraps"
    case designer = "Designer"
    case seasonal = "Seasonal"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .skins: "paintpalette.fill"
        case .wraps: "sparkles"
        case .designer: "crown.fill"
        case .seasonal: "leaf.fill"
        }
    }
}

nonisolated struct AdNetworkStats: Codable, Sendable {
    let totalImpressions: Int
    let dailyImpressions: Int
    let totalRevenue: Double
    let dailyRevenue: Double
    let activeMachines: Int
    let cpmRate: Double
}

nonisolated struct ReferralEntry: Identifiable, Codable, Sendable {
    let id: String
    let playerName: String
    let status: ReferralStatus
    let joinDate: Date
    let rewardClaimed: Bool
}

nonisolated enum ReferralStatus: String, Codable, Sendable {
    case pending = "Pending"
    case active = "Active"
    case completed = "Completed"

    var icon: String {
        switch self {
        case .pending: "clock.fill"
        case .active: "play.circle.fill"
        case .completed: "checkmark.circle.fill"
        }
    }
}

nonisolated struct SeasonResult: Codable, Sendable {
    let seasonNumber: Int
    let finalRank: Int
    let totalPlayers: Int
    let startingCapital: Double
    let totalRevenue: Double
    let totalExpenses: Double
    let finalNetWorth: Double
    let tycoonScore: TycoonScore
    let eloBracketTier: EloBracketTier
    let eloChange: Int
    let payoutSummary: SeasonPayoutSummary

    var isWinner: Bool { payoutSummary.isPlayerWinner }
    var prizeAmount: Double? { payoutSummary.playerPayout }
}

nonisolated struct CareerStats: Codable, Sendable {
    let seasonsPlayed: Int
    let bestRank: Int
    let allTimeRevenue: Double
    let totalPrizeEarnings: Double
    let machinesDeployed: Int
    let franchiseBadge: String?
    let globalReputation: Double
    let lifetimeElo: Int
    let bestTycoonScore: Int
    let eloBracketTier: EloBracketTier
}

nonisolated struct ReputationEvent: Identifiable, Codable, Sendable {
    let id: String
    let title: String
    let points: Double
    let isPositive: Bool
    let timestamp: Date
    let iconName: String
}

nonisolated struct PriceTrendPoint: Identifiable, Codable, Sendable {
    let id: String
    let hour: Int
    let price: Double
}
