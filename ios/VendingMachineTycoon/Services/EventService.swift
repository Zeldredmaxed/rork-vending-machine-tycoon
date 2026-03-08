import Foundation
import CoreLocation

struct EventService {
    static func simulateTransactionEvents(for machine: VendingMachine) -> [GameEvent] {
        var events: [GameEvent] = []

        let forgotChangeRoll = Double.random(in: 0...100)
        if forgotChangeRoll < 3.0 {
            let bonus = Double.random(in: 5...25)
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .transaction,
                severity: .positive,
                title: "Customer Forgot Change",
                description: "A customer left \(String(format: "%.0f", bonus)) VB behind at \(machine.name).",
                machineId: machine.id,
                machineName: machine.name,
                impactValue: bonus,
                impactLabel: "+\(String(format: "%.0f", bonus)) VB",
                iconName: "banknote.fill",
                timestamp: Date()
            ))
        }

        let doubleDispenseRoll = Double.random(in: 0...100)
        if doubleDispenseRoll < 2.0 {
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .transaction,
                severity: .negative,
                title: "Double Dispense",
                description: "Machine at \(machine.name) dropped 2 items instead of 1. Lost 1 unit of inventory.",
                machineId: machine.id,
                machineName: machine.name,
                impactValue: -1,
                impactLabel: "-1 unit",
                iconName: "arrow.2.squarepath",
                timestamp: Date()
            ))
        }

        let stuckRoll = Double.random(in: 0...100)
        if stuckRoll < 1.5 {
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .transaction,
                severity: .negative,
                title: "Item Stuck — Machine Shaken",
                description: "Product stuck in \(machine.name). Customer shook the machine causing maintenance damage.",
                machineId: machine.id,
                machineName: machine.name,
                impactValue: -5,
                impactLabel: "-5 maintenance",
                iconName: "hand.raised.slash.fill",
                timestamp: Date()
            ))
        }

        let jamRoll = Double.random(in: 0...100)
        if jamRoll < 1.0 {
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .transaction,
                severity: .negative,
                title: "Bill Acceptor Jammed",
                description: "\(machine.name) stopped accepting cash. Sales reduced 50% until fixed.",
                machineId: machine.id,
                machineName: machine.name,
                impactValue: -50,
                impactLabel: "-50% sales",
                iconName: "creditcard.trianglebadge.exclamationmark",
                timestamp: Date()
            ))
        }

        return events
    }

    static func simulateDailyEvents(for machine: VendingMachine) -> [GameEvent] {
        var events: [GameEvent] = []

        let vandalismRoll = Double.random(in: 0...100)
        if vandalismRoll < 2.0 {
            let cleanCost = Double.random(in: 100...300)
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .daily,
                severity: .negative,
                title: "Minor Vandalism",
                description: "Graffiti on \(machine.name). Foot traffic dropped 15%. Clean cost: \(Int(cleanCost)) VB.",
                machineId: machine.id,
                machineName: machine.name,
                impactValue: -cleanCost,
                impactLabel: "-\(Int(cleanCost)) VB",
                iconName: "paintbrush.pointed.fill",
                timestamp: Date()
            ))
        }

        let brokenRoll = Double.random(in: 0...100)
        if brokenRoll < 0.5 {
            let repairCost = Double.random(in: 2000...5000)
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .daily,
                severity: .critical,
                title: "Machine Glass Smashed",
                description: "\(machine.name) glass broken. All sales stopped. Repair: \(Int(repairCost)) VB.",
                machineId: machine.id,
                machineName: machine.name,
                impactValue: -repairCost,
                impactLabel: "-\(Int(repairCost)) VB",
                iconName: "exclamationmark.octagon.fill",
                timestamp: Date()
            ))
        }

        let knockedRoll = Double.random(in: 0...100)
        if knockedRoll < 0.1 {
            let lossCost = Double.random(in: 5000...12000)
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .daily,
                severity: .critical,
                title: "Machine Knocked Over",
                description: "\(machine.name) tipped over! Major inventory loss and structural damage.",
                machineId: machine.id,
                machineName: machine.name,
                impactValue: -lossCost,
                impactLabel: "-\(Int(lossCost)) VB",
                iconName: "arrow.uturn.down.circle.fill",
                timestamp: Date()
            ))
        }

        let heatRoll = Double.random(in: 0...100)
        if heatRoll < 5.0 {
            if machine.hasTempControl {
                events.append(GameEvent(
                    id: UUID().uuidString,
                    type: .daily,
                    severity: .positive,
                    title: "Local Heatwave",
                    description: "Heatwave near \(machine.name)! Cold drinks demand surged. Temp Control protected perishables.",
                    machineId: machine.id,
                    machineName: machine.name,
                    impactValue: 40,
                    impactLabel: "+40% cold drinks",
                    iconName: "sun.max.fill",
                    timestamp: Date()
                ))
            } else {
                events.append(GameEvent(
                    id: UUID().uuidString,
                    type: .daily,
                    severity: .contextual,
                    title: "Local Heatwave",
                    description: "Heatwave near \(machine.name). Cold drinks demand up but perishable snacks spoiled!",
                    machineId: machine.id,
                    machineName: machine.name,
                    impactValue: -15,
                    impactLabel: "Spoilage risk",
                    iconName: "sun.max.fill",
                    timestamp: Date()
                ))
            }
        }

        let rainRoll = Double.random(in: 0...100)
        if rainRoll < 10.0 {
            if machine.hasWeatherproofing {
                events.append(GameEvent(
                    id: UUID().uuidString,
                    type: .daily,
                    severity: .positive,
                    title: "Unexpected Rainstorm",
                    description: "Rain near \(machine.name). Weather Canopy maintained 80% sales.",
                    machineId: machine.id,
                    machineName: machine.name,
                    impactValue: -20,
                    impactLabel: "80% maintained",
                    iconName: "cloud.rain.fill",
                    timestamp: Date()
                ))
            } else {
                events.append(GameEvent(
                    id: UUID().uuidString,
                    type: .daily,
                    severity: .negative,
                    title: "Unexpected Rainstorm",
                    description: "Heavy rain near \(machine.name). Sales dropped to 40% of normal.",
                    machineId: machine.id,
                    machineName: machine.name,
                    impactValue: -60,
                    impactLabel: "-60% sales",
                    iconName: "cloud.rain.fill",
                    timestamp: Date()
                ))
            }
        }

        return events
    }

    static func simulateGlobalEvents() -> [GameEvent] {
        var events: [GameEvent] = []

        let sugarTaxRoll = Double.random(in: 0...100)
        if sugarTaxRoll < 2.0 {
            let increase = Double.random(in: 15...30)
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .global,
                severity: .negative,
                title: "Sugar Tax Implemented",
                description: "City implements sugar tax. Sugary soda wholesale costs up \(Int(increase))%.",
                machineId: nil,
                machineName: nil,
                impactValue: increase,
                impactLabel: "+\(Int(increase))% soda cost",
                iconName: "doc.text.fill",
                timestamp: Date()
            ))
        }

        let viralRoll = Double.random(in: 0...100)
        if viralRoll < 3.0 {
            let snackNames = ["Spicy Chips", "Gummy Bears", "Cheese Puffs", "Trail Mix"]
            let snack = snackNames.randomElement() ?? "Snacks"
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .global,
                severity: .positive,
                title: "Viral Snack Trend",
                description: "\(snack) went viral on social media! Customer demand tripled for 48 hours.",
                machineId: nil,
                machineName: nil,
                impactValue: 200,
                impactLabel: "3x demand",
                iconName: "flame.fill",
                timestamp: Date()
            ))
        }

        let supplyRoll = Double.random(in: 0...100)
        if supplyRoll < 1.5 {
            events.append(GameEvent(
                id: UUID().uuidString,
                type: .global,
                severity: .negative,
                title: "Supply Chain Disruption",
                description: "Truck shortages causing restocking costs to jump 20% for 3 days.",
                machineId: nil,
                machineName: nil,
                impactValue: 20,
                impactLabel: "+20% restock cost",
                iconName: "shippingbox.and.arrow.backward.fill",
                timestamp: Date()
            ))
        }

        return events
    }

    static func validateZone(latitude: Double, longitude: Double) -> (ZoneType, Bool) {
        let zones: [(CLLocationCoordinate2D, Double, ZoneType)] = [
            (CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.0060), 200, .residential),
            (CLLocationCoordinate2D(latitude: 40.7400, longitude: -73.9950), 300, .highway),
            (CLLocationCoordinate2D(latitude: 40.7700, longitude: -73.9750), 250, .water),
            (CLLocationCoordinate2D(latitude: 40.7580, longitude: -73.9855), 600, .commercial),
            (CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840), 500, .commercial),
            (CLLocationCoordinate2D(latitude: 40.7233, longitude: -73.9985), 400, .commercial),
            (CLLocationCoordinate2D(latitude: 40.7694, longitude: -73.9654), 350, .park),
        ]

        let point = CLLocation(latitude: latitude, longitude: longitude)

        for zone in zones {
            let zoneCenter = CLLocation(latitude: zone.0.latitude, longitude: zone.0.longitude)
            if point.distance(from: zoneCenter) <= zone.1 {
                return (zone.2, zone.2.isPlacementAllowed)
            }
        }

        return (.commercial, true)
    }

    static func calculateRelocationFee(machine: VendingMachine) -> Double {
        let baseFee = machine.basePurchaseCost * 0.15
        let upgradeSurcharge = Double(machine.activePowerUps.count) * 50
        return baseFee + upgradeSurcharge
    }

    static func calculateSalvage(machine: VendingMachine) -> SalvageResult {
        let machineRefund = machine.basePurchaseCost * 0.5
        let inventoryRefund = machine.products.reduce(0.0) { total, vp in
            guard !vp.isExpiringSoon else { return total }
            return total + (vp.product.marketPrice * Double(vp.stock) * 0.5)
        }
        return SalvageResult(
            machineRefund: machineRefund,
            inventoryRefund: inventoryRefund,
            totalRefund: machineRefund + inventoryRefund
        )
    }
}
