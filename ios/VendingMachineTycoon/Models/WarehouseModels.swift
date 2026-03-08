import Foundation

nonisolated enum DemographicProfile: String, CaseIterable, Identifiable, Codable, Sendable {
    case urbanJapan = "Urban Japan"
    case ruralUS = "Rural US"
    case universityCampus = "University Campus"
    case downtownBusiness = "Downtown Business"
    case touristDistrict = "Tourist District"
    case suburbanFamily = "Suburban Family"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .urbanJapan: "building.2.fill"
        case .ruralUS: "leaf.fill"
        case .universityCampus: "graduationcap.fill"
        case .downtownBusiness: "briefcase.fill"
        case .touristDistrict: "camera.fill"
        case .suburbanFamily: "house.fill"
        }
    }

    var highDemandTags: [String] {
        switch self {
        case .urbanJapan: ["milk-coffee", "green-tea", "healthy", "rice-snack"]
        case .ruralUS: ["cola", "chips", "energy-drink", "candy"]
        case .universityCampus: ["energy-drink", "hot-cheetos", "chips", "candy"]
        case .downtownBusiness: ["coffee", "healthy", "protein-bar", "sparkling-water"]
        case .touristDistrict: ["soda", "snacks", "water", "candy"]
        case .suburbanFamily: ["juice", "healthy", "trail-mix", "fruit"]
        }
    }

    var lowDemandTags: [String] {
        switch self {
        case .urbanJapan: ["high-sugar-soda", "hot-cheetos", "candy"]
        case .ruralUS: ["green-tea", "milk-coffee", "veggie"]
        case .universityCampus: ["veggie", "dried-fruit", "green-tea"]
        case .downtownBusiness: ["candy", "chips", "high-sugar-soda"]
        case .touristDistrict: ["protein-bar", "veggie", "green-tea"]
        case .suburbanFamily: ["energy-drink", "hot-cheetos", "coffee"]
        }
    }

    var description: String {
        switch self {
        case .urbanJapan: "Dense urban area with preference for Japanese beverages and healthy options"
        case .ruralUS: "Rural American community favoring classic sodas and hearty snacks"
        case .universityCampus: "College students craving energy drinks and bold-flavored snacks"
        case .downtownBusiness: "Office workers seeking coffee, protein, and healthy options"
        case .touristDistrict: "High-traffic tourist zone with broad snack and beverage demand"
        case .suburbanFamily: "Family-oriented area preferring juices, healthy snacks, and trail mix"
        }
    }
}

nonisolated enum DemographicAffinity: String, Codable, Sendable {
    case high
    case neutral
    case low
}

nonisolated struct WarehouseItem: Identifiable, Codable, Sendable {
    let id: String
    let product: Product
    var quantity: Int
    let purchasePrice: Double
    let expirationDate: Date
    var isExtraFresh: Bool = false

    var isExpiringSoon: Bool {
        expirationDate.timeIntervalSinceNow < 86400 * 2
    }

    var isExpired: Bool {
        expirationDate.timeIntervalSinceNow <= 0
    }

    var daysUntilExpiry: Int {
        max(0, Int(ceil(expirationDate.timeIntervalSinceNow / 86400)))
    }
}

nonisolated struct MachineActiveInventory: Identifiable, Codable, Sendable {
    let id: String
    let machineId: String
    let warehouseItemId: String
    let product: Product
    var quantityAllocated: Int
    var priceSet: Double
    let expirationDate: Date
}

nonisolated enum RestockStatus: String, Codable, Sendable {
    case pending = "Pending"
    case inTransit = "In Transit"
    case delivered = "Delivered"
    case failed = "Failed"
    case delayed = "Delayed"

    var icon: String {
        switch self {
        case .pending: "clock.fill"
        case .inTransit: "shippingbox.and.arrow.backward.fill"
        case .delivered: "checkmark.circle.fill"
        case .failed: "xmark.circle.fill"
        case .delayed: "exclamationmark.triangle.fill"
        }
    }
}

nonisolated struct RestockDispatch: Identifiable, Codable, Sendable {
    let id: String
    let machineId: String
    let employeeId: String
    let employeeName: String
    var allocations: [RestockAllocation]
    var status: RestockStatus
    let dispatchTime: Date
    let estimatedArrival: Date
    var events: [RestockEvent]

    var progress: Double {
        guard status == .inTransit else {
            return status == .delivered ? 1.0 : 0.0
        }
        let total = estimatedArrival.timeIntervalSince(dispatchTime)
        let elapsed = Date().timeIntervalSince(dispatchTime)
        return min(1.0, max(0.0, elapsed / total))
    }
}

nonisolated struct RestockAllocation: Identifiable, Codable, Sendable {
    let id: String
    let warehouseItemId: String
    let product: Product
    var quantity: Int
}

nonisolated struct RestockEvent: Identifiable, Codable, Sendable {
    let id: String
    let title: String
    let description: String
    let iconName: String
    let isNegative: Bool
    let timestamp: Date
}
