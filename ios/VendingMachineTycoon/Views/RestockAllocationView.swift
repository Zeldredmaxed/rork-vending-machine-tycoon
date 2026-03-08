import SwiftUI

struct RestockAllocationView: View {
    let machine: VendingMachine
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var allocations: [String: Double] = [:]
    @State private var showDispatchConfirm = false

    private var employee: Employee? {
        viewModel.employeeForMachine(machine.id)
    }

    private var availableItems: [WarehouseItem] {
        viewModel.warehouseItems.filter { $0.quantity > 0 && !$0.isExpired }
    }

    private var totalAllocated: Int {
        allocations.values.reduce(0) { $0 + Int($1) }
    }

    private var remainingCapacity: Int {
        max(0, machine.capacity - machine.usedCapacity - totalAllocated)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    demographicInsights
                    capacityGauge
                    allocationList
                    dispatchSection
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 100)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Restock \(machine.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Dispatch Employee?", isPresented: $showDispatchConfirm) {
                Button("Dispatch", role: .none) {
                    performDispatch()
                    dismiss()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                if let emp = employee {
                    Text("\(emp.name) will deliver \(totalAllocated) items. Wage: \(Int(emp.wagePerTask)) VB. ETA: \(Int(30 * emp.etaMultiplier)) min.")
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var demographicInsights: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "brain.head.profile.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("LOCAL INSIGHTS")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.neonCyan)
            }

            HStack(spacing: 8) {
                Image(systemName: machine.demographicProfile.icon)
                    .font(.title3)
                    .foregroundStyle(AppTheme.neonCyan)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Region: \(machine.demographicProfile.rawValue)")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    Text(machine.demographicProfile.description)
                        .font(.system(size: 10))
                        .foregroundStyle(AppTheme.dimText)
                }
            }

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("High Demand")
                            .font(.system(size: 9, weight: .heavy))
                            .foregroundStyle(AppTheme.electricGreen)
                    }
                    Text(machine.demographicProfile.highDemandTags.prefix(3).joined(separator: ", "))
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(AppTheme.softWhite)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.down.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.neonRed)
                        Text("Low Demand")
                            .font(.system(size: 9, weight: .heavy))
                            .foregroundStyle(AppTheme.neonRed)
                    }
                    Text(machine.demographicProfile.lowDemandTags.prefix(3).joined(separator: ", "))
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(AppTheme.softWhite)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(14)
        .neonCardStyle(AppTheme.neonCyan)
    }

    private var capacityGauge: some View {
        VStack(spacing: 10) {
            HStack {
                Text("Machine Capacity")
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text("\(machine.usedCapacity + totalAllocated)/\(machine.capacity)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(capacityColor)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.06))
                    Capsule()
                        .fill(AppTheme.dimText.opacity(0.3))
                        .frame(width: geo.size.width * Double(machine.usedCapacity) / Double(machine.capacity))
                    Capsule()
                        .fill(capacityColor)
                        .frame(width: geo.size.width * Double(machine.usedCapacity + totalAllocated) / Double(max(1, machine.capacity)))
                }
            }
            .frame(height: 8)

            HStack {
                HStack(spacing: 4) {
                    Circle().fill(AppTheme.dimText.opacity(0.3)).frame(width: 6, height: 6)
                    Text("Current: \(machine.usedCapacity)")
                        .font(.system(size: 9))
                        .foregroundStyle(AppTheme.dimText)
                }
                Spacer()
                HStack(spacing: 4) {
                    Circle().fill(capacityColor).frame(width: 6, height: 6)
                    Text("Adding: \(totalAllocated)")
                        .font(.system(size: 9))
                        .foregroundStyle(capacityColor)
                }
                Spacer()
                Text("Free: \(remainingCapacity)")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(AppTheme.electricGreen)
            }
        }
        .padding(14)
        .neonCardStyle()
    }

    private var capacityColor: Color {
        let fillPct = Double(machine.usedCapacity + totalAllocated) / Double(max(1, machine.capacity))
        if fillPct > 0.9 { return AppTheme.neonRed }
        if fillPct > 0.7 { return AppTheme.gold }
        return AppTheme.electricGreen
    }

    private var allocationList: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "shippingbox.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("WAREHOUSE INVENTORY")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.gold)
            }

            if availableItems.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "shippingbox.and.arrow.backward.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.dimText)
                        Text("Warehouse is empty")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(AppTheme.dimText)
                        Text("Purchase products from the Wholesale Market first")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText.opacity(0.7))
                    }
                    Spacer()
                }
                .padding(.vertical, 20)
            } else {
                ForEach(availableItems) { item in
                    allocationRow(item)
                }
            }
        }
    }

    private func allocationRow(_ item: WarehouseItem) -> some View {
        let affinity = item.product.affinityFor(profile: machine.demographicProfile)
        let currentAllocation = allocations[item.id] ?? 0

        return VStack(spacing: 10) {
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(categoryColor(item.product.category).opacity(0.1))
                        .frame(width: 36, height: 36)
                    Image(systemName: item.product.iconName)
                        .font(.system(size: 13))
                        .foregroundStyle(categoryColor(item.product.category))
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(item.product.name)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(AppTheme.softWhite)
                        affinityBadge(affinity)
                    }
                    HStack(spacing: 6) {
                        Text("\(item.quantity) in stock")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText)
                        if item.isExpiringSoon {
                            HStack(spacing: 2) {
                                Image(systemName: "clock.badge.exclamationmark")
                                    .font(.system(size: 8))
                                Text("\(item.daysUntilExpiry)d")
                                    .font(.system(size: 8, weight: .bold))
                            }
                            .foregroundStyle(AppTheme.neonRed)
                        }
                    }
                }

                Spacer()

                Text("\(Int(currentAllocation))")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(currentAllocation > 0 ? AppTheme.electricGreen : AppTheme.dimText)
                    .frame(width: 36)
            }

            HStack(spacing: 10) {
                Slider(
                    value: Binding(
                        get: { allocations[item.id] ?? 0 },
                        set: { newVal in
                            let maxAllowable = min(Double(item.quantity), Double(remainingCapacity) + (allocations[item.id] ?? 0))
                            allocations[item.id] = min(newVal, maxAllowable)
                        }
                    ),
                    in: 0...Double(item.quantity),
                    step: 1
                )
                .tint(affinity == .low ? AppTheme.gold : AppTheme.electricGreen)

                if affinity == .low && currentAllocation > 0 {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(AppTheme.gold)
                        .transition(.scale.combined(with: .opacity))
                }
            }
        }
        .padding(12)
        .neonCardStyle(affinity == .high ? AppTheme.electricGreen : affinity == .low ? AppTheme.gold.opacity(0.5) : AppTheme.dimText)
        .animation(.snappy, value: currentAllocation)
    }

    private func affinityBadge(_ affinity: DemographicAffinity) -> some View {
        let (text, color, icon): (String, Color, String) = switch affinity {
        case .high: ("Match", AppTheme.electricGreen, "checkmark.circle.fill")
        case .neutral: ("Neutral", AppTheme.dimText, "minus.circle")
        case .low: ("Mismatch", AppTheme.gold, "exclamationmark.triangle.fill")
        }
        return HStack(spacing: 2) {
            Image(systemName: icon)
                .font(.system(size: 7))
            Text(text)
                .font(.system(size: 8, weight: .heavy))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 5)
        .padding(.vertical, 2)
        .background(color.opacity(0.12))
        .clipShape(Capsule())
    }

    @ViewBuilder
    private var dispatchSection: some View {
        if let emp = employee {
            VStack(spacing: 12) {
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.electricGreen.opacity(0.12))
                            .frame(width: 40, height: 40)
                        Text(String(emp.name.prefix(1)))
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.electricGreen)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(emp.name)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        HStack(spacing: 8) {
                            Text("Wage: \(Int(emp.wagePerTask)) VB")
                                .font(.system(size: 10))
                                .foregroundStyle(AppTheme.dimText)
                            Text("ETA: ~\(Int(30 * emp.etaMultiplier)) min")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(AppTheme.neonCyan)
                        }
                    }
                    Spacer()
                    ratingBadge(emp.ratingTier)
                }

                Button {
                    showDispatchConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "shippingbox.and.arrow.backward.fill")
                        Text("Dispatch Employee")
                            .font(.headline)
                        Spacer()
                        Text("\(totalAllocated) items")
                            .font(.subheadline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.electricGreen)
                .disabled(totalAllocated == 0)
            }
            .padding(14)
            .neonCardStyle(AppTheme.electricGreen)
        } else {
            VStack(spacing: 10) {
                Image(systemName: "person.crop.circle.badge.exclamationmark")
                    .font(.title2)
                    .foregroundStyle(AppTheme.gold)
                Text("No Employee Assigned")
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text("Assign an employee to this machine from the HR Dashboard before dispatching restocks.")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.dimText)
                    .multilineTextAlignment(.center)
            }
            .padding(20)
            .frame(maxWidth: .infinity)
            .neonCardStyle(AppTheme.gold)
        }
    }

    private func ratingBadge(_ tier: String) -> some View {
        let color: Color = switch tier {
        case "S": AppTheme.gold
        case "A": AppTheme.electricGreen
        case "B": AppTheme.neonCyan
        default: AppTheme.dimText
        }
        return Text(tier)
            .font(.system(size: 14, weight: .heavy))
            .foregroundStyle(color)
            .frame(width: 30, height: 30)
            .background(color.opacity(0.12))
            .clipShape(.rect(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(color.opacity(0.3), lineWidth: 1))
    }

    private func performDispatch() {
        let allocs = allocations.compactMap { (key, value) -> (warehouseItemId: String, quantity: Int)? in
            let qty = Int(value)
            guard qty > 0 else { return nil }
            return (warehouseItemId: key, quantity: qty)
        }
        viewModel.dispatchRestock(machineId: machine.id, allocations: allocs)
    }

    private func categoryColor(_ category: ProductCategory) -> Color {
        switch category {
        case .soda: AppTheme.neonCyan
        case .snacks: AppTheme.gold
        case .healthy: AppTheme.electricGreen
        }
    }
}
