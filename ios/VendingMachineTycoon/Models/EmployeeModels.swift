import Foundation

nonisolated enum EmployeeStatus: String, CaseIterable, Codable, Sendable {
    case idle = "Idle"
    case inTransit = "In Transit"
    case restocking = "Restocking"
    case returning = "Returning"
    case maintenance = "Maintenance"
}

nonisolated enum EmployeeCapacityTier: String, Codable, Sendable {
    case s = "S"
    case a = "A"
    case b = "B"
    case c = "C"

    var capacityCost: Int {
        switch self {
        case .s: 50
        case .a: 30
        case .b: 15
        case .c: 5
        }
    }
}

nonisolated struct Employee: Identifiable, Codable, Sendable {
    let id: String
    var name: String
    var wagePerTask: Double
    var assignedMachineId: String?
    var statSpeed: Int
    var statQualityControl: Int
    var statAttendance: Int
    var statDriving: Int
    var statAdaptability: Int
    var statRepairSkill: Int
    var status: EmployeeStatus
    var currentTaskStartTime: Date?
    var estimatedArrivalTime: Date?
    var assignmentLockUntil: Date?
    var capacityCost: Int

    var isAssigned: Bool { assignedMachineId != nil }

    var isLocked: Bool {
        guard let lockUntil = assignmentLockUntil else { return false }
        return lockUntil > Date()
    }

    var lockTimeRemaining: TimeInterval {
        guard let lockUntil = assignmentLockUntil else { return 0 }
        return max(0, lockUntil.timeIntervalSinceNow)
    }

    var overallRating: Double {
        Double(statSpeed + statQualityControl + statAttendance + statDriving + statAdaptability + statRepairSkill) / 6.0
    }

    var ratingTier: String {
        switch overallRating {
        case 90...: "S"
        case 75..<90: "A"
        case 50..<75: "B"
        default: "C"
        }
    }

    var capacityTier: EmployeeCapacityTier {
        switch overallRating {
        case 90...: .s
        case 75..<90: .a
        case 50..<75: .b
        default: .c
        }
    }

    var exponentialWage: Double {
        let avgStat = overallRating
        let baseCost = 30.0
        if avgStat >= 90 {
            return baseCost * (5.0 + (avgStat - 90) * 0.5)
        } else if avgStat >= 75 {
            return baseCost * (2.5 + (avgStat - 75) * 0.16)
        } else if avgStat >= 50 {
            return baseCost * (1.0 + (avgStat - 50) * 0.06)
        }
        return baseCost * max(0.5, avgStat / 50.0)
    }

    var etaMultiplier: Double {
        let speedFactor = Double(statSpeed) / 100.0
        return max(0.5, 2.0 - speedFactor * 1.5)
    }

    var noShowChance: Double {
        max(0.01, (100.0 - Double(statAttendance)) / 500.0)
    }

    var forgotGoodsChance: Double {
        max(0.01, (100.0 - Double(statQualityControl)) / 400.0)
    }

    var breakdownChance: Double {
        max(0.005, (100.0 - Double(statDriving)) / 300.0)
    }

    var weatherPenaltyMultiplier: Double {
        max(0.3, Double(statAdaptability) / 100.0)
    }

    var canRepairMachine: Bool {
        statRepairSkill >= 40
    }

    var transitProgress: Double {
        guard status == .inTransit || status == .returning,
              let start = currentTaskStartTime,
              let arrival = estimatedArrivalTime else { return 0 }
        let total = arrival.timeIntervalSince(start)
        let elapsed = Date().timeIntervalSince(start)
        return min(1.0, max(0.0, elapsed / total))
    }
}

nonisolated struct Applicant: Identifiable, Codable, Sendable {
    let id: String
    let name: String
    let wagePerRestock: Double
    let statSpeed: Int
    let statQualityControl: Int
    let statAttendance: Int
    let statDriving: Int
    let statAdaptability: Int
    let statRepairSkill: Int
    let capacityCost: Int
    let generatedAt: Date

    var overallRating: Double {
        Double(statSpeed + statQualityControl + statAttendance + statDriving + statAdaptability + statRepairSkill) / 6.0
    }

    var ratingTier: String {
        switch overallRating {
        case 90...: "S"
        case 75..<90: "A"
        case 50..<75: "B"
        default: "C"
        }
    }

    var capacityTier: EmployeeCapacityTier {
        switch overallRating {
        case 90...: .s
        case 75..<90: .a
        case 50..<75: .b
        default: .c
        }
    }

    func toEmployee() -> Employee {
        Employee(
            id: UUID().uuidString,
            name: name,
            wagePerTask: wagePerRestock,
            assignedMachineId: nil,
            statSpeed: statSpeed,
            statQualityControl: statQualityControl,
            statAttendance: statAttendance,
            statDriving: statDriving,
            statAdaptability: statAdaptability,
            statRepairSkill: statRepairSkill,
            status: .idle,
            currentTaskStartTime: nil,
            estimatedArrivalTime: nil,
            assignmentLockUntil: nil,
            capacityCost: capacityCost
        )
    }
}
