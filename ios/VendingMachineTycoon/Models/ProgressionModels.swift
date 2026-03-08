import Foundation

nonisolated enum BusinessTier: Int, CaseIterable, Identifiable, Codable, Sendable {
    case startup = 1
    case localOperator = 2
    case regionalManager = 3
    case executive = 4

    var id: Int { rawValue }

    var name: String {
        switch self {
        case .startup: "Startup"
        case .localOperator: "Local Operator"
        case .regionalManager: "Regional Manager"
        case .executive: "VendFX Executive"
        }
    }

    var icon: String {
        switch self {
        case .startup: "leaf.fill"
        case .localOperator: "building.fill"
        case .regionalManager: "building.2.fill"
        case .executive: "crown.fill"
        }
    }

    var maxMachines: Int {
        switch self {
        case .startup: 1
        case .localOperator: 5
        case .regionalManager: 15
        case .executive: 50
        }
    }

    var maxLeadershipCapacity: Int {
        switch self {
        case .startup: 15
        case .localOperator: 30
        case .regionalManager: 60
        case .executive: 100
        }
    }

    var requiredReputation: Double {
        switch self {
        case .startup: 0
        case .localOperator: 50
        case .regionalManager: 200
        case .executive: 500
        }
    }

    var requiredRevenue: Double {
        switch self {
        case .startup: 0
        case .localOperator: 500
        case .regionalManager: 2_500
        case .executive: 10_000
        }
    }

    var nextTier: BusinessTier? {
        switch self {
        case .startup: .localOperator
        case .localOperator: .regionalManager
        case .regionalManager: .executive
        case .executive: nil
        }
    }

    static func currentTier(reputation: Double, revenue: Double) -> BusinessTier {
        if reputation >= BusinessTier.executive.requiredReputation && revenue >= BusinessTier.executive.requiredRevenue {
            return .executive
        } else if reputation >= BusinessTier.regionalManager.requiredReputation && revenue >= BusinessTier.regionalManager.requiredRevenue {
            return .regionalManager
        } else if reputation >= BusinessTier.localOperator.requiredReputation && revenue >= BusinessTier.localOperator.requiredRevenue {
            return .localOperator
        }
        return .startup
    }
}

nonisolated enum ComplaintResolution: String, Codable, Sendable {
    case pending = "Pending"
    case refunded = "Refunded"
    case denied = "Denied"
    case expired = "Expired"
}

nonisolated struct CustomerComplaint: Identifiable, Codable, Sendable {
    let id: String
    let machineId: String
    let machineName: String
    let productName: String
    let refundAmount: Double
    let customerName: String
    let complaintDescription: String
    let createdAt: Date
    let expiresAt: Date
    var resolution: ComplaintResolution

    var isExpired: Bool {
        Date() >= expiresAt && resolution == .pending
    }

    var timeRemaining: TimeInterval {
        max(0, expiresAt.timeIntervalSinceNow)
    }

    var hoursRemaining: Int {
        max(0, Int(ceil(timeRemaining / 3600)))
    }

    var minutesRemaining: Int {
        max(0, Int(ceil(timeRemaining / 60)) % 60)
    }
}
