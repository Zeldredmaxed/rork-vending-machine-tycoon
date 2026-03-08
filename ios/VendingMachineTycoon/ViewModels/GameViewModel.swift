import Foundation
import SwiftUI

@Observable
@MainActor
class GameViewModel {
    var player = SampleData.player
    var machines = SampleData.machines
    var products = SampleData.products
    var powerUps = SampleData.powerUps
    var leaderboard = SampleData.leaderboard
    var marketEvents = SampleData.marketEvents
    var dailyReport = SampleData.dailyReport
    var seasonInfo = SampleData.seasonInfo
    var gameEvents: [GameEvent] = SampleData.sampleGameEvents
    var locationReports: [LocationReport] = []

    var warehouseItems: [WarehouseItem] = SampleData.warehouseItems
    var employees: [Employee] = SampleData.employees
    var applicants: [Applicant] = SampleData.applicants
    var activeDispatches: [RestockDispatch] = []

    var disputeTickets: [DisputeTicket] = SampleData.disputeTickets
    var transactionHistory: [TransactionRecord] = SampleData.transactionHistory
    var spendingLimits = SpendingLimits()
    var notificationPreferences: [NotificationCategory: Bool] = NotificationCategory.allCases.reduce(into: [:]) { $0[$1] = true }
    var alliance: Alliance? = SampleData.sampleAlliance
    var isGeoRestricted = false
    var idleRecap: IdleRecapData? = SampleData.idleRecap
    var customerComplaints: [CustomerComplaint] = SampleData.sampleComplaints

    var selectedMachine: VendingMachine?
    var showPlaceMachine = false
    var showRestockAll = false
    var bulkPurchaseQuantity: Double = 50
    var selectedCategory: ProductCategory?

    var filteredProducts: [Product] {
        guard let category = selectedCategory else { return products }
        return products.filter { $0.category == category }
    }

    var totalDailyRevenue: Double {
        machines.reduce(0) { $0 + $1.dailyRevenue }
    }

    var totalNetWorth: Double {
        player.competitionBucks + machines.reduce(0) { $0 + $1.totalRevenue }
    }

    var alertMachines: [VendingMachine] {
        machines.filter { $0.status != .healthy }
    }

    var healthyMachineCount: Int {
        machines.filter { $0.status == .healthy }.count
    }

    var totalPowerUpIssues: Int {
        machines.reduce(0) { $0 + $1.issueCount }
    }

    var recentEvents: [GameEvent] {
        Array(gameEvents.sorted { $0.timestamp > $1.timestamp }.prefix(20))
    }

    var criticalEvents: [GameEvent] {
        gameEvents.filter { $0.severity == .critical }
    }

    var sortedWarehouseItems: [WarehouseItem] {
        warehouseItems.sorted { $0.expirationDate < $1.expirationDate }
    }

    var expiringWarehouseItems: [WarehouseItem] {
        warehouseItems.filter { $0.isExpiringSoon }
    }

    var totalWarehouseUnits: Int {
        warehouseItems.reduce(0) { $0 + $1.quantity }
    }

    var totalWarehouseValue: Double {
        warehouseItems.reduce(0) { $0 + ($1.purchasePrice * Double($1.quantity)) }
    }

    var unassignedMachines: [VendingMachine] {
        let assignedIds = Set(employees.compactMap { $0.assignedMachineId })
        return machines.filter { !assignedIds.contains($0.id) }
    }

    var unassignedEmployees: [Employee] {
        employees.filter { !$0.isAssigned }
    }

    // MARK: - Business Tier & Progression

    var currentBusinessTier: BusinessTier {
        BusinessTier.currentTier(reputation: player.reputation, revenue: player.totalRevenue)
    }

    var leadershipCapacity: Int {
        currentBusinessTier.maxLeadershipCapacity
    }

    var maxMachines: Int {
        currentBusinessTier.maxMachines
    }

    var canPlaceNewMachine: Bool {
        machines.count < maxMachines
    }

    var tierProgressReputation: Double {
        guard let next = currentBusinessTier.nextTier else { return 1.0 }
        let current = currentBusinessTier.requiredReputation
        let target = next.requiredReputation
        let range = target - current
        guard range > 0 else { return 1.0 }
        return min(1.0, max(0.0, (player.reputation - current) / range))
    }

    var tierProgressRevenue: Double {
        guard let next = currentBusinessTier.nextTier else { return 1.0 }
        let current = currentBusinessTier.requiredRevenue
        let target = next.requiredRevenue
        let range = target - current
        guard range > 0 else { return 1.0 }
        return min(1.0, max(0.0, (player.totalRevenue - current) / range))
    }

    // MARK: - Customer Service

    var pendingComplaints: [CustomerComplaint] {
        customerComplaints.filter { $0.resolution == .pending && !$0.isExpired }
    }

    var pendingComplaintCount: Int {
        pendingComplaints.count
    }

    func processExpiredComplaints() {
        for i in customerComplaints.indices {
            if customerComplaints[i].resolution == .pending && customerComplaints[i].isExpired {
                customerComplaints[i].resolution = .expired
                player.reputation = max(0, player.reputation - 5)
                gameEvents.append(GameEvent(
                    id: UUID().uuidString,
                    type: .daily,
                    severity: .negative,
                    title: "Complaint Ignored",
                    description: "A customer complaint about \(customerComplaints[i].productName) at \(customerComplaints[i].machineName) was ignored. -5 Reputation.",
                    machineId: customerComplaints[i].machineId,
                    machineName: customerComplaints[i].machineName,
                    impactValue: -5,
                    impactLabel: "-5 Rep",
                    iconName: "exclamationmark.bubble.fill",
                    timestamp: Date()
                ))
            }
        }
    }

    func issueRefund(_ complaintId: String) {
        guard let idx = customerComplaints.firstIndex(where: { $0.id == complaintId }) else { return }
        let complaint = customerComplaints[idx]
        guard complaint.resolution == .pending else { return }

        player.competitionBucks -= complaint.refundAmount
        player.totalExpenses += complaint.refundAmount
        player.reputation = min(999, player.reputation + 1)
        customerComplaints[idx].resolution = .refunded

        gameEvents.append(GameEvent(
            id: UUID().uuidString,
            type: .transaction,
            severity: .neutral,
            title: "Refund Issued",
            description: "Refunded \(Int(complaint.refundAmount)) VB for \(complaint.productName) at \(complaint.machineName). +1 Reputation.",
            machineId: complaint.machineId,
            machineName: complaint.machineName,
            impactValue: -complaint.refundAmount,
            impactLabel: "-\(Int(complaint.refundAmount)) VB",
            iconName: "arrow.uturn.backward.circle.fill",
            timestamp: Date()
        ))
    }

    func denyRefund(_ complaintId: String) {
        guard let idx = customerComplaints.firstIndex(where: { $0.id == complaintId }) else { return }
        let complaint = customerComplaints[idx]
        guard complaint.resolution == .pending else { return }

        player.reputation = max(0, player.reputation - 5)
        customerComplaints[idx].resolution = .denied

        gameEvents.append(GameEvent(
            id: UUID().uuidString,
            type: .daily,
            severity: .negative,
            title: "Refund Denied",
            description: "Denied refund for \(complaint.productName) at \(complaint.machineName). -5 Reputation.",
            machineId: complaint.machineId,
            machineName: complaint.machineName,
            impactValue: -5,
            impactLabel: "-5 Rep",
            iconName: "xmark.circle.fill",
            timestamp: Date()
        ))
    }

    func generateComplaintForExpiredItems() {
        for machine in machines {
            for product in machine.products {
                if product.expirationDate < Date() && product.stock > 0 {
                    let names = ["Alex T.", "Jordan M.", "Sam K.", "Casey R.", "Taylor W.", "Morgan L."]
                    let complaint = CustomerComplaint(
                        id: UUID().uuidString,
                        machineId: machine.id,
                        machineName: machine.name,
                        productName: product.product.name,
                        refundAmount: product.sellingPrice,
                        customerName: names.randomElement()!,
                        complaintDescription: "I purchased \(product.product.name) from \(machine.name) and it was expired. I want a refund.",
                        createdAt: Date(),
                        expiresAt: Date().addingTimeInterval(24 * 3600),
                        resolution: .pending
                    )
                    customerComplaints.insert(complaint, at: 0)
                }
            }
        }
    }

    // MARK: - Dual Wallet

    func depositPremium(_ amount: Double) {
        player.premiumBucks += amount
    }

    // MARK: - Warehouse Purchasing

    func purchaseToWarehouse(_ product: Product, quantity: Int) {
        let cost = product.marketPrice * Double(quantity)
        guard player.competitionBucks >= cost else { return }
        player.competitionBucks -= cost
        player.totalExpenses += cost

        let gotExtraFresh = Double.random(in: 0...1) < FreshnessConstants.extraFreshChance
        let expirationDays = gotExtraFresh ? FreshnessConstants.extraFreshExpirationDays : product.effectiveExpirationDays
        let expirationDate = Date().addingTimeInterval(Double(expirationDays) * 86400)

        if !gotExtraFresh, let existingIndex = warehouseItems.firstIndex(where: {
            $0.product.id == product.id && abs($0.purchasePrice - product.marketPrice) < 0.01 && !$0.isExtraFresh
        }) {
            warehouseItems[existingIndex].quantity += quantity
        } else {
            let item = WarehouseItem(
                id: UUID().uuidString,
                product: product,
                quantity: quantity,
                purchasePrice: product.marketPrice,
                expirationDate: expirationDate,
                isExtraFresh: gotExtraFresh
            )
            warehouseItems.append(item)
        }

        if gotExtraFresh {
            let event = GameEvent(
                id: UUID().uuidString,
                type: .transaction,
                severity: .positive,
                title: "Extra Fresh Batch!",
                description: "Lucky! Your \(product.name) shipment is extra fresh — expires in 7 days instead of 5.",
                machineId: nil,
                machineName: nil,
                impactValue: 2,
                impactLabel: "+2 days shelf life",
                iconName: "sparkles",
                timestamp: Date()
            )
            gameEvents.insert(event, at: 0)
        }
    }

    func discardWarehouseItem(_ itemId: String) {
        warehouseItems.removeAll { $0.id == itemId }
    }

    // MARK: - Restock Allocation

    func allocateToMachine(machineId: String, warehouseItemId: String, quantity: Int) {
        guard let whIdx = warehouseItems.firstIndex(where: { $0.id == warehouseItemId }) else { return }
        guard let mIdx = machines.firstIndex(where: { $0.id == machineId }) else { return }
        guard warehouseItems[whIdx].quantity >= quantity else { return }

        let availableCapacity = machines[mIdx].capacity - machines[mIdx].usedCapacity
        let allocateQty = min(quantity, availableCapacity)
        guard allocateQty > 0 else { return }

        warehouseItems[whIdx].quantity -= allocateQty
        machines[mIdx].usedCapacity += allocateQty

        if warehouseItems[whIdx].quantity <= 0 {
            warehouseItems.remove(at: whIdx)
        }

        if let pIdx = machines[mIdx].products.firstIndex(where: { $0.product.id == warehouseItems.first(where: { $0.id == warehouseItemId })?.product.id ?? "" }) {
            machines[mIdx].products[pIdx].stock += allocateQty
        } else {
            let whItem = warehouseItems.first { $0.id == warehouseItemId }
            let product = whItem?.product ?? products[0]
            let vp = VendingMachineProduct(
                id: UUID().uuidString,
                product: product,
                stock: allocateQty,
                maxStock: allocateQty + 10,
                sellingPrice: product.marketPrice * 2.2,
                expirationDate: whItem?.expirationDate ?? Date().addingTimeInterval(Double(FreshnessConstants.standardExpirationDays) * 86400)
            )
            machines[mIdx].products.append(vp)
        }
    }

    // MARK: - Employee Management

    func hireApplicant(_ applicant: Applicant) {
        let employee = applicant.toEmployee()
        employees.append(employee)
        applicants.removeAll { $0.id == applicant.id }
    }

    func fireEmployee(_ employeeId: String) {
        employees.removeAll { $0.id == employeeId }
    }

    func assignEmployee(_ employeeId: String, toMachine machineId: String) {
        guard let idx = employees.firstIndex(where: { $0.id == employeeId }) else { return }
        employees[idx].assignedMachineId = machineId
        employees[idx].assignmentLockUntil = Date().addingTimeInterval(48 * 3600)
    }

    func unassignEmployee(_ employeeId: String) {
        guard let idx = employees.firstIndex(where: { $0.id == employeeId }) else { return }
        guard !employees[idx].isLocked else { return }
        employees[idx].assignedMachineId = nil
    }

    func employeeForMachine(_ machineId: String) -> Employee? {
        employees.first { $0.assignedMachineId == machineId }
    }

    var usedLeadershipCapacity: Int {
        employees.reduce(0) { $0 + $1.capacityCost }
    }

    var availableLeadershipCapacity: Int {
        leadershipCapacity - usedLeadershipCapacity
    }

    var idleEmployees: [Employee] {
        employees.filter { $0.status == .idle }
    }

    func canHireApplicant(_ applicant: Applicant) -> Bool {
        applicant.capacityCost <= availableLeadershipCapacity
    }

    func generateNewApplicants() {
        let firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery", "Kai", "Dakota"]
        let lastNames = ["Smith", "Kim", "Garcia", "Brown", "Nguyen", "Davis", "Wilson", "Lopez", "Lee", "Martinez"]

        var newApplicants: [Applicant] = []
        for i in 0..<5 {
            let name = "\(firstNames.randomElement()!) \(lastNames.randomElement()!)"
            let tier = Double.random(in: 0...1)
            let baseStats: ClosedRange<Int>
            let wage: Double
            let capCost: Int
            if tier > 0.85 {
                baseStats = 85...98
                wage = Double.random(in: 150...300)
                capCost = 50
            } else if tier > 0.6 {
                baseStats = 70...89
                wage = Double.random(in: 75...160)
                capCost = 30
            } else if tier > 0.3 {
                baseStats = 50...74
                wage = Double.random(in: 38...80)
                capCost = 15
            } else {
                baseStats = 25...49
                wage = Double.random(in: 20...40)
                capCost = 5
            }

            newApplicants.append(Applicant(
                id: "a_gen_\(i)_\(UUID().uuidString.prefix(4))",
                name: name,
                wagePerRestock: wage.rounded(),
                statSpeed: Int.random(in: baseStats),
                statQualityControl: Int.random(in: baseStats),
                statAttendance: Int.random(in: baseStats),
                statDriving: Int.random(in: baseStats),
                statAdaptability: Int.random(in: baseStats),
                statRepairSkill: Int.random(in: baseStats),
                capacityCost: capCost,
                generatedAt: Date()
            ))
        }
        applicants = newApplicants
    }

    // MARK: - Dispatch & Restock Simulation

    func abortDispatch(_ dispatchId: String) {
        guard let dIdx = activeDispatches.firstIndex(where: { $0.id == dispatchId }) else { return }
        let dispatch = activeDispatches[dIdx]
        guard dispatch.status == .inTransit else { return }

        if let eIdx = employees.firstIndex(where: { $0.id == dispatch.employeeId }) {
            let elapsed = Date().timeIntervalSince(dispatch.dispatchTime)
            let returnArrival = Date().addingTimeInterval(elapsed)
            employees[eIdx].status = .returning
            employees[eIdx].currentTaskStartTime = Date()
            employees[eIdx].estimatedArrivalTime = returnArrival
        }

        activeDispatches[dIdx].status = .failed

        if let mIdx = machines.firstIndex(where: { $0.id == dispatch.machineId }) {
            machines[mIdx].restockState = .idle
        }
    }

    func submitDispute(category: DisputeCategory, machineId: String?, transactionId: String?, description: String) {
        let ticket = DisputeTicket(
            id: UUID().uuidString,
            category: category,
            machineId: machineId,
            transactionId: transactionId,
            description: description,
            status: .pending,
            submittedDate: Date(),
            resolvedDate: nil
        )
        disputeTickets.append(ticket)
    }

    func contributeToAlliance(_ amount: Double) {
        guard player.premiumBucks >= amount else { return }
        player.premiumBucks -= amount
        alliance?.treasuryBalance += amount
    }

    func dismissIdleRecap() {
        if let recap = idleRecap {
            player.competitionBucks += recap.totalEarned
        }
        idleRecap = nil
    }

    func dispatchRestock(machineId: String, allocations: [(warehouseItemId: String, quantity: Int)]) {
        guard let employee = employeeForMachine(machineId) else { return }
        guard let mIdx = machines.firstIndex(where: { $0.id == machineId }) else { return }

        let wage = employee.wagePerTask
        guard player.competitionBucks >= wage else { return }
        player.competitionBucks -= wage
        player.totalExpenses += wage

        let baseMinutes: Double = 30
        let etaMinutes = baseMinutes * employee.etaMultiplier
        let eta = Date().addingTimeInterval(etaMinutes * 60)

        var restockAllocations: [RestockAllocation] = []
        for alloc in allocations {
            guard let whItem = warehouseItems.first(where: { $0.id == alloc.warehouseItemId }) else { continue }
            restockAllocations.append(RestockAllocation(
                id: UUID().uuidString,
                warehouseItemId: alloc.warehouseItemId,
                product: whItem.product,
                quantity: alloc.quantity
            ))
        }

        var dispatch = RestockDispatch(
            id: UUID().uuidString,
            machineId: machineId,
            employeeId: employee.id,
            employeeName: employee.name,
            allocations: restockAllocations,
            status: .inTransit,
            dispatchTime: Date(),
            estimatedArrival: eta,
            events: []
        )

        let restockEvents = simulateRestockEvents(employee: employee, dispatch: &dispatch)
        dispatch.events = restockEvents

        activeDispatches.append(dispatch)
        machines[mIdx].restockState = .restocking

        for alloc in allocations {
            if let whIdx = warehouseItems.firstIndex(where: { $0.id == alloc.warehouseItemId }) {
                warehouseItems[whIdx].quantity = max(0, warehouseItems[whIdx].quantity - alloc.quantity)
                if warehouseItems[whIdx].quantity <= 0 {
                    warehouseItems.remove(at: whIdx)
                }
            }
        }

        gameEvents.append(GameEvent(
            id: UUID().uuidString,
            type: .daily,
            severity: .neutral,
            title: "Restock Dispatched",
            description: "\(employee.name) is heading to \(machines[mIdx].name). ETA: \(Int(etaMinutes)) min.",
            machineId: machineId,
            machineName: machines[mIdx].name,
            impactValue: -wage,
            impactLabel: "-\(Int(wage)) VB",
            iconName: "shippingbox.fill",
            timestamp: Date()
        ))
    }

    func completeDispatch(_ dispatchId: String) {
        guard let dIdx = activeDispatches.firstIndex(where: { $0.id == dispatchId }) else { return }
        let dispatch = activeDispatches[dIdx]

        if dispatch.status == .failed { return }

        guard let mIdx = machines.firstIndex(where: { $0.id == dispatch.machineId }) else { return }

        for alloc in dispatch.allocations {
            if let pIdx = machines[mIdx].products.firstIndex(where: { $0.product.id == alloc.product.id }) {
                machines[mIdx].products[pIdx].stock += alloc.quantity
            } else {
                let vp = VendingMachineProduct(
                    id: UUID().uuidString,
                    product: alloc.product,
                    stock: alloc.quantity,
                    maxStock: alloc.quantity + 10,
                    sellingPrice: alloc.product.marketPrice * 2.2,
                    expirationDate: Date().addingTimeInterval(Double(alloc.product.effectiveExpirationDays) * 86400)
                )
                machines[mIdx].products.append(vp)
            }
            machines[mIdx].usedCapacity += alloc.quantity
        }

        activeDispatches[dIdx].status = .delivered
        machines[mIdx].restockState = .idle

        if machines[mIdx].status == .lowStock {
            machines[mIdx].status = .healthy
        }
    }

    private func simulateRestockEvents(employee: Employee, dispatch: inout RestockDispatch) -> [RestockEvent] {
        var events: [RestockEvent] = []

        if Double.random(in: 0...1) < employee.noShowChance {
            dispatch.status = .failed
            events.append(RestockEvent(
                id: UUID().uuidString,
                title: "No-Show",
                description: "\(employee.name) called in sick. Restock canceled.",
                iconName: "bed.double.fill",
                isNegative: true,
                timestamp: Date()
            ))
            return events
        }

        if Double.random(in: 0...1) < employee.forgotGoodsChance {
            let lostItems = Int.random(in: 1...5)
            if let firstAlloc = dispatch.allocations.first {
                let idx = dispatch.allocations.firstIndex(where: { $0.id == firstAlloc.id })!
                dispatch.allocations[idx].quantity = max(1, dispatch.allocations[idx].quantity - lostItems)
            }
            events.append(RestockEvent(
                id: UUID().uuidString,
                title: "Forgot the Goods",
                description: "\(employee.name) forgot a box of snacks at the warehouse. -\(lostItems) items.",
                iconName: "shippingbox.and.arrow.backward.fill",
                isNegative: true,
                timestamp: Date()
            ))
        }

        if Double.random(in: 0...1) < employee.breakdownChance {
            let repairCost = 50.0
            player.competitionBucks -= repairCost
            player.totalExpenses += repairCost
            events.append(RestockEvent(
                id: UUID().uuidString,
                title: "Vehicle Breakdown",
                description: "Delivery vehicle broke down! Emergency repairs cost \(Int(repairCost)) VB.",
                iconName: "car.fill",
                isNegative: true,
                timestamp: Date()
            ))
        }

        return events
    }

    // MARK: - Demographic Sales Multiplier

    func demographicMultiplier(product: Product, machine: VendingMachine) -> Double {
        let affinity = product.affinityFor(profile: machine.demographicProfile)
        switch affinity {
        case .high: return 1.5
        case .neutral: return 1.0
        case .low: return 0.4
        }
    }

    // MARK: - Power-Ups (competition bucks)

    func purchasePowerUp(_ powerUp: PowerUp, forMachine machineId: String) {
        let cost = Double(powerUp.costMin)
        guard player.competitionBucks >= cost else { return }
        guard let machineIndex = machines.firstIndex(where: { $0.id == machineId }) else { return }

        let alreadyInstalled = machines[machineIndex].installedPowerUps.contains {
            $0.powerUp.id == powerUp.id && $0.condition.isOperational
        }
        guard !alreadyInstalled else { return }

        player.competitionBucks -= cost
        player.totalExpenses += cost

        let expirationDate: Date? = if let days = powerUp.durationDays {
            Date().addingTimeInterval(Double(days) * 86400)
        } else {
            nil
        }

        let installed = InstalledPowerUp(
            id: UUID().uuidString,
            powerUp: powerUp,
            machineId: machineId,
            condition: .active,
            installedDate: Date(),
            expirationDate: expirationDate,
            healthPercent: 100.0
        )

        if let existingIndex = machines[machineIndex].installedPowerUps.firstIndex(where: {
            $0.powerUp.id == powerUp.id && !$0.condition.isOperational
        }) {
            machines[machineIndex].installedPowerUps[existingIndex] = installed
        } else {
            machines[machineIndex].installedPowerUps.append(installed)
        }
    }

    func repairPowerUp(_ installedPowerUp: InstalledPowerUp, onMachine machineId: String) {
        let cost = Double(installedPowerUp.repairCost)
        guard player.competitionBucks >= cost else { return }
        guard let machineIndex = machines.firstIndex(where: { $0.id == machineId }) else { return }
        guard let puIndex = machines[machineIndex].installedPowerUps.firstIndex(where: { $0.id == installedPowerUp.id }) else { return }

        player.competitionBucks -= cost
        player.totalExpenses += cost
        machines[machineIndex].installedPowerUps[puIndex].condition = .active
        machines[machineIndex].installedPowerUps[puIndex].healthPercent = min(100, machines[machineIndex].installedPowerUps[puIndex].healthPercent + 40)
    }

    func removePowerUp(_ installedPowerUp: InstalledPowerUp, fromMachine machineId: String) {
        guard let machineIndex = machines.firstIndex(where: { $0.id == machineId }) else { return }
        machines[machineIndex].installedPowerUps.removeAll { $0.id == installedPowerUp.id }
    }

    // MARK: - Cosmetics (premium bucks)

    func purchaseCosmetic(cost: Double) {
        guard player.premiumBucks >= cost else { return }
        player.premiumBucks -= cost
    }

    // MARK: - Event Simulation

    func simulateMalfunctions() {
        for mi in machines.indices {
            for pi in machines[mi].installedPowerUps.indices {
                let pu = machines[mi].installedPowerUps[pi]
                guard pu.condition == .active else { continue }

                if pu.isExpired {
                    machines[mi].installedPowerUps[pi].condition = .expired
                    continue
                }

                if pu.powerUp.durabilityType == .breakable {
                    let roll = Double.random(in: 0...100)
                    if roll < pu.powerUp.malfunctionChancePercent {
                        machines[mi].installedPowerUps[pi].healthPercent -= Double.random(in: 15...35)
                        if machines[mi].installedPowerUps[pi].healthPercent <= 30 {
                            machines[mi].installedPowerUps[pi].condition = .broken
                        } else if machines[mi].installedPowerUps[pi].healthPercent <= 60 {
                            machines[mi].installedPowerUps[pi].condition = .malfunctioning
                        }
                    }
                }
            }
        }
    }

    func runTransactionSimulation() {
        for machine in machines {
            let events = EventService.simulateTransactionEvents(for: machine)
            for event in events {
                applyTransactionEvent(event)
            }
            gameEvents.append(contentsOf: events)
        }
    }

    func runDailySimulation() {
        for machine in machines {
            let events = EventService.simulateDailyEvents(for: machine)
            for event in events {
                applyDailyEvent(event)
            }
            gameEvents.append(contentsOf: events)
        }

        let globalEvents = EventService.simulateGlobalEvents()
        for event in globalEvents {
            applyGlobalEvent(event)
        }
        gameEvents.append(contentsOf: globalEvents)
        simulateMalfunctions()
    }

    private func applyTransactionEvent(_ event: GameEvent) {
        guard let machineId = event.machineId,
              let idx = machines.firstIndex(where: { $0.id == machineId }) else { return }

        switch event.title {
        case "Customer Forgot Change":
            player.competitionBucks += event.impactValue
            machines[idx].dailyRevenue += event.impactValue
        case "Double Dispense":
            if let pIdx = machines[idx].products.indices.first(where: { machines[idx].products[$0].stock > 0 }) {
                machines[idx].products[pIdx].stock = max(0, machines[idx].products[pIdx].stock - 1)
            }
        case "Item Stuck — Machine Shaken":
            machines[idx].maintenanceLevel = max(0, machines[idx].maintenanceLevel + event.impactValue)
            if machines[idx].maintenanceLevel < 30 {
                machines[idx].status = .needsMaintenance
            }
        case "Bill Acceptor Jammed":
            machines[idx].status = .needsMaintenance
        default:
            break
        }
    }

    private func applyDailyEvent(_ event: GameEvent) {
        guard let machineId = event.machineId,
              let idx = machines.firstIndex(where: { $0.id == machineId }) else { return }

        switch event.title {
        case "Machine Glass Smashed":
            machines[idx].status = .broken
        case "Machine Knocked Over":
            machines[idx].status = .broken
            for pIdx in machines[idx].products.indices {
                machines[idx].products[pIdx].stock = max(0, machines[idx].products[pIdx].stock / 2)
            }
        case "Minor Vandalism":
            machines[idx].footTraffic = Int(Double(machines[idx].footTraffic) * 0.85)
        default:
            break
        }
    }

    private func applyGlobalEvent(_ event: GameEvent) {
        switch event.title {
        case "Sugar Tax Implemented":
            for i in products.indices where products[i].category == .soda {
                products[i].marketPrice *= (1 + event.impactValue / 100)
                products[i].priceDirection = .up
                products[i].priceChangePercent = event.impactValue
            }
        case "Viral Snack Trend":
            for i in products.indices where products[i].category == .snacks {
                products[i].marketPrice *= 1.5
                products[i].priceDirection = .up
                products[i].priceChangePercent = 50
            }
        case "Supply Chain Disruption":
            for i in products.indices {
                products[i].marketPrice *= 1.2
                products[i].priceDirection = .up
                products[i].priceChangePercent = 20
            }
        default:
            break
        }
    }

    // MARK: - Relocation & Salvage

    func relocateMachine(_ machineId: String, newLat: Double, newLon: Double) -> RelocationResult {
        guard let idx = machines.firstIndex(where: { $0.id == machineId }) else {
            return RelocationResult(success: false, fee: 0, message: "Machine not found.")
        }

        let (zone, allowed) = EventService.validateZone(latitude: newLat, longitude: newLon)
        guard allowed else {
            return RelocationResult(success: false, fee: 0, message: "Invalid Zoning: Machines cannot be placed in \(zone.rawValue) zones.")
        }

        let fee = EventService.calculateRelocationFee(machine: machines[idx])
        guard player.competitionBucks >= fee else {
            return RelocationResult(success: false, fee: fee, message: "Insufficient funds. Relocation costs \(Int(fee)) VB.")
        }

        player.competitionBucks -= fee
        player.totalExpenses += fee
        machines[idx].latitude = newLat
        machines[idx].longitude = newLon

        gameEvents.append(GameEvent(
            id: UUID().uuidString,
            type: .daily,
            severity: .neutral,
            title: "Machine Relocated",
            description: "\(machines[idx].name) moved to new location. Fee: \(Int(fee)) VB.",
            machineId: machineId,
            machineName: machines[idx].name,
            impactValue: -fee,
            impactLabel: "-\(Int(fee)) VB",
            iconName: "arrow.triangle.swap",
            timestamp: Date()
        ))

        return RelocationResult(success: true, fee: fee, message: "Machine relocated successfully!")
    }

    func salvageMachine(_ machineId: String) -> SalvageResult? {
        guard let idx = machines.firstIndex(where: { $0.id == machineId }) else { return nil }
        let result = EventService.calculateSalvage(machine: machines[idx])

        let machineName = machines[idx].name
        player.competitionBucks += result.totalRefund

        gameEvents.append(GameEvent(
            id: UUID().uuidString,
            type: .daily,
            severity: .neutral,
            title: "Machine Salvaged",
            description: "\(machineName) salvaged. Refunded \(Int(result.totalRefund)) VB.",
            machineId: machineId,
            machineName: machineName,
            impactValue: result.totalRefund,
            impactLabel: "+\(Int(result.totalRefund)) VB",
            iconName: "arrow.uturn.backward.circle.fill",
            timestamp: Date()
        ))

        machines.remove(at: idx)
        player.totalMachines = machines.count
        return result
    }

    // MARK: - Zone Validation

    func validatePlacementZone(lat: Double, lon: Double) -> (ZoneType, Bool) {
        EventService.validateZone(latitude: lat, longitude: lon)
    }

    // MARK: - Location Reports

    func submitLocationReport(machineId: String, reason: LocationReportReason, details: String) {
        let report = LocationReport(
            id: UUID().uuidString,
            machineId: machineId,
            reporterEmail: "player@example.com",
            reason: reason,
            details: details,
            status: .pending,
            timestamp: Date()
        )
        locationReports.append(report)
    }

    // MARK: - Tycoon Score

    var successfulRestocks: Int {
        activeDispatches.filter { $0.status == .delivered }.count
    }

    var failedRestocks: Int {
        activeDispatches.filter { $0.status == .failed }.count
    }

    var restockBreakdowns: Int {
        activeDispatches.flatMap { $0.events }.filter { $0.title == "Vehicle Breakdown" }.count
    }

    func calculateTycoonScore() {
        let score = TycoonScoreService.calculateTycoonScore(
            totalRevenue: player.totalRevenue,
            netWorth: totalNetWorth,
            reputationScore: player.reputation,
            successfulRestocks: successfulRestocks,
            failedRestocks: failedRestocks,
            breakdowns: restockBreakdowns
        )
        player.tycoonScore = score
    }

    // MARK: - Season Rollover

    func simulateSeasonEnd() {
        calculateTycoonScore()

        let payoutSummary = SeasonPayoutSummary.generate(
            totalPlayers: seasonInfo.totalPlayers,
            entryFee: seasonInfo.entryFee,
            playerRank: player.rank
        )

        if let prizePayout = payoutSummary.playerPayout {
            player.premiumBucks += prizePayout
        }

        if let score = player.tycoonScore {
            let eloChange = TycoonScoreService.calculateEloChange(
                currentElo: player.lifetimeElo,
                tycoonScore: score.totalScore,
                rank: player.rank,
                totalPlayers: seasonInfo.totalPlayers
            )
            player.lifetimeElo += eloChange
            player.hiddenEloRating = player.lifetimeElo
        }

        player.competitionBucks = 50_000
        for i in machines.indices {
            machines[i].totalRevenue = 0
            machines[i].dailyRevenue = 0
        }
        player.totalRevenue = 0
        player.totalExpenses = 0
        gameEvents.removeAll()
    }

    // MARK: - Helpers

    func installedPowerUpsForMachine(_ machineId: String) -> [InstalledPowerUp] {
        machines.first { $0.id == machineId }?.installedPowerUps ?? []
    }

    func machinesWithoutPowerUp(_ powerUpId: String) -> [VendingMachine] {
        machines.filter { machine in
            !machine.installedPowerUps.contains { $0.powerUp.id == powerUpId && $0.condition.isOperational }
        }
    }

    func formatCurrency(_ value: Double) -> String {
        value.formatted(.currency(code: "USD").precision(.fractionLength(0...2)))
    }

    func formatVB(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        return (formatter.string(from: NSNumber(value: value)) ?? "0") + " VB"
    }

    func fixMachine(_ machine: VendingMachine) {
        guard let idx = machines.firstIndex(where: { $0.id == machine.id }) else { return }
        let repairCost: Double
        switch machines[idx].status {
        case .broken:
            repairCost = machines[idx].basePurchaseCost * 0.3
        case .needsMaintenance:
            repairCost = 200
        default:
            return
        }
        guard player.competitionBucks >= repairCost else { return }
        player.competitionBucks -= repairCost
        player.totalExpenses += repairCost
        machines[idx].status = .healthy
        machines[idx].maintenanceLevel = 100
    }

    func restockMachine(_ machine: VendingMachine) {
        guard let index = machines.firstIndex(where: { $0.id == machine.id }) else { return }
        for i in machines[index].products.indices {
            machines[index].products[i].stock = machines[index].products[i].maxStock
        }
        if machines[index].status == .lowStock {
            machines[index].status = .healthy
        }
    }

    func purchaseProduct(_ product: Product, quantity: Int) {
        purchaseToWarehouse(product, quantity: quantity)
    }
}
