import Foundation

nonisolated enum DisputeCategory: String, CaseIterable, Identifiable, Codable, Sendable {
    case machineIssue = "Machine Issue"
    case transactionError = "Transaction Error"
    case billingProblem = "Billing Problem"
    case accountIssue = "Account Issue"
    case otherIssue = "Other"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .machineIssue: "cabinet.fill"
        case .transactionError: "creditcard.trianglebadge.exclamationmark"
        case .billingProblem: "banknote.fill"
        case .accountIssue: "person.crop.circle.badge.exclamationmark"
        case .otherIssue: "questionmark.circle.fill"
        }
    }
}

nonisolated enum DisputeStatus: String, Codable, Sendable {
    case pending = "Pending"
    case investigating = "Investigating"
    case resolved = "Resolved"

    var icon: String {
        switch self {
        case .pending: "clock.fill"
        case .investigating: "magnifyingglass"
        case .resolved: "checkmark.circle.fill"
        }
    }
}

nonisolated struct DisputeTicket: Identifiable, Codable, Sendable {
    let id: String
    let category: DisputeCategory
    let machineId: String?
    let transactionId: String?
    let description: String
    var status: DisputeStatus
    let submittedDate: Date
    var resolvedDate: Date?
}

nonisolated struct TransactionRecord: Identifiable, Codable, Sendable {
    let id: String
    let type: TransactionType
    let amount: Double
    let description: String
    let timestamp: Date
    let walletType: WalletType
}

nonisolated enum TransactionType: String, Codable, Sendable {
    case deposit = "Deposit"
    case withdrawal = "Withdrawal"
    case purchase = "Purchase"
    case sale = "Sale"
    case prize = "Prize"
    case refund = "Refund"
    case adRevenue = "Ad Revenue"
    case wage = "Wage"

    var icon: String {
        switch self {
        case .deposit: "arrow.down.circle.fill"
        case .withdrawal: "arrow.up.circle.fill"
        case .purchase: "cart.fill"
        case .sale: "dollarsign.circle.fill"
        case .prize: "trophy.fill"
        case .refund: "arrow.uturn.backward.circle.fill"
        case .adRevenue: "megaphone.fill"
        case .wage: "person.fill"
        }
    }

    var isPositive: Bool {
        switch self {
        case .deposit, .sale, .prize, .refund, .adRevenue: true
        case .withdrawal, .purchase, .wage: false
        }
    }
}

nonisolated enum SelfExclusionPeriod: String, CaseIterable, Identifiable, Codable, Sendable {
    case oneDay = "24 Hours"
    case oneWeek = "7 Days"
    case oneMonth = "30 Days"

    var id: String { rawValue }

    var hours: Int {
        switch self {
        case .oneDay: 24
        case .oneWeek: 168
        case .oneMonth: 720
        }
    }
}

nonisolated struct SpendingLimits: Codable, Sendable {
    var dailyLimit: Double?
    var weeklyLimit: Double?
    var lastModified: Date?

    var canIncreaseLimit: Bool {
        guard let modified = lastModified else { return true }
        return Date().timeIntervalSince(modified) > 7 * 86400
    }
}

nonisolated struct IdleRecapData: Codable, Sendable {
    let totalEarned: Double
    let itemsSold: Int
    let incidents: [IdleIncident]
    let hoursOffline: Double
}

nonisolated struct IdleIncident: Identifiable, Codable, Sendable {
    let id: String
    let title: String
    let description: String
    let iconName: String
    let timestamp: Date
    let isNegative: Bool
}

nonisolated struct Alliance: Identifiable, Codable, Sendable {
    let id: String
    let name: String
    let leaderName: String
    var members: [AllianceMember]
    var treasuryBalance: Double
    let createdDate: Date
}

nonisolated struct AllianceMember: Identifiable, Codable, Sendable {
    let id: String
    let playerName: String
    let brandName: String
    let contribution: Double
    let joinDate: Date
    let isLeader: Bool
}

nonisolated enum NotificationCategory: String, CaseIterable, Identifiable, Codable, Sendable {
    case market = "Market Alerts"
    case turf = "Turf & Competitors"
    case logistics = "Logistics & HR"
    case social = "Social"
    case financial = "Financial"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .market: "chart.line.uptrend.xyaxis"
        case .turf: "shield.fill"
        case .logistics: "shippingbox.fill"
        case .social: "bubble.left.and.bubble.right.fill"
        case .financial: "banknote.fill"
        }
    }

    var description: String {
        switch self {
        case .market: "Price shifts, global events, market insights"
        case .turf: "Protection expiring, competitors nearby"
        case .logistics: "Restocks complete, vehicle breakdowns, employee alerts"
        case .social: "Direct messages, alliance chat notifications"
        case .financial: "Daily payouts, referral bonuses, withdrawals"
        }
    }
}
