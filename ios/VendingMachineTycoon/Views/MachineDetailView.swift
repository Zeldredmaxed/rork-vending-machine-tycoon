import SwiftUI

struct MachineDetailView: View {
    let machine: VendingMachine
    let viewModel: GameViewModel
    @State private var selectedProduct: VendingMachineProduct?
    @State private var showRestockAllocation = false
    @State private var showMaintenanceDispatchAlert = false
    @State private var animateIn = false

    private var assignedEmployee: Employee? {
        viewModel.employeeForMachine(machine.id)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                machineHeader
                demographicBanner
                employeeStatus
                maintenanceDispatchSection
                statsGrid
                installedPowerUpsSection
                productsSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .scrollIndicators(.hidden)
        .gameBackground()
        .navigationTitle(machine.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .sheet(item: $selectedProduct) { product in
            ProductPopover(product: product, viewModel: viewModel)
        }
        .alert("Insufficient Repair Skill", isPresented: $showMaintenanceDispatchAlert) {
            Button("OK") {}
        } message: {
            if let emp = assignedEmployee {
                Text("\(emp.name) lacks the required repair skill (\(emp.statRepairSkill)/60 minimum). Hire a specialist or upgrade this employee.")
            } else {
                Text("No employee is assigned to this machine. Assign one from the HR Dashboard first.")
            }
        }
        .sheet(isPresented: $showRestockAllocation) {
            RestockAllocationView(machine: machine, viewModel: viewModel)
        }
        .onAppear {
            withAnimation(.spring(response: 0.5)) { animateIn = true }
        }
    }

    private var demographicBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: machine.demographicProfile.icon)
                .font(.title3)
                .foregroundStyle(AppTheme.neonCyan)
            VStack(alignment: .leading, spacing: 2) {
                Text(machine.demographicProfile.rawValue)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(machine.demographicProfile.description)
                    .font(.system(size: 10))
                    .foregroundStyle(AppTheme.dimText)
                    .lineLimit(2)
            }
            Spacer()
        }
        .padding(12)
        .neonCardStyle(AppTheme.neonCyan)
    }

    @ViewBuilder
    private var employeeStatus: some View {
        if let emp = assignedEmployee {
            HStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(AppTheme.electricGreen.opacity(0.12))
                        .frame(width: 36, height: 36)
                    Text(String(emp.name.prefix(1)))
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(AppTheme.electricGreen)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(emp.name)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(AppTheme.softWhite)
                    Text("Assigned Employee • \(Int(emp.wagePerTask)) VB/restock")
                        .font(.system(size: 9))
                        .foregroundStyle(AppTheme.dimText)
                }
                Spacer()
                if machine.restockState == .restocking {
                    HStack(spacing: 4) {
                        ProgressView()
                            .scaleEffect(0.6)
                        Text("In Transit")
                            .font(.system(size: 9, weight: .heavy))
                    }
                    .foregroundStyle(AppTheme.neonCyan)
                }
            }
            .padding(10)
            .neonCardStyle(AppTheme.electricGreen)
        } else {
            HStack(spacing: 8) {
                Image(systemName: "person.crop.circle.badge.exclamationmark")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.gold)
                Text("No employee assigned — visit HR Dashboard")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(AppTheme.gold)
                Spacer()
            }
            .padding(10)
            .background(AppTheme.gold.opacity(0.06))
            .clipShape(.rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.gold.opacity(0.15), lineWidth: 1))
        }
    }

    private var machineHeader: some View {
        VStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: [AppTheme.charcoal, AppTheme.cardBackground],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .frame(height: 200)

                VStack(spacing: 12) {
                    ZStack {
                        if machine.hasNeonWrap {
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(AppTheme.electricGreen.opacity(0.6), lineWidth: 3)
                                .frame(width: 90, height: 110)
                                .glow(AppTheme.electricGreen, radius: 10)
                        }

                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color(red: 0.12, green: 0.15, blue: 0.22))
                            .frame(width: 80, height: 100)
                            .overlay(
                                VStack(spacing: 4) {
                                    ForEach(0..<3) { row in
                                        HStack(spacing: 4) {
                                            ForEach(0..<3) { col in
                                                RoundedRectangle(cornerRadius: 3)
                                                    .fill(slotColor(row: row, col: col))
                                                    .frame(width: 16, height: 16)
                                            }
                                        }
                                    }
                                }
                                .padding(8)
                            )

                        if machine.hasLEDLighting {
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(AppTheme.neonCyan.opacity(0.4), lineWidth: 1)
                                .frame(width: 80, height: 100)
                                .glow(AppTheme.neonCyan, radius: 6)
                        }

                        if machine.hasDigitalDisplay {
                            VStack {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(AppTheme.neonCyan.opacity(0.3))
                                    .frame(width: 60, height: 12)
                                    .overlay(
                                        Text("LIVE")
                                            .font(.system(size: 7, weight: .bold, design: .monospaced))
                                            .foregroundStyle(AppTheme.neonCyan)
                                    )
                                Spacer()
                            }
                            .frame(width: 80, height: 100)
                            .offset(y: -8)
                        }
                    }

                    if let skin = machine.customSkinName {
                        Text(skin)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(AppTheme.gold)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(AppTheme.gold.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(statusColor(for: machine.status).opacity(0.15), lineWidth: 1)
            )

            HStack {
                statusBadge(machine.status)
                if machine.hasTurfProtection {
                    HStack(spacing: 4) {
                        Image(systemName: "shield.checkered")
                            .font(.system(size: 10))
                        Text("\(Int(machine.turfRadius))m")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(AppTheme.neonCyan)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(AppTheme.neonCyan.opacity(0.1))
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(AppTheme.neonCyan.opacity(0.2), lineWidth: 0.5))
                }
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 10))
                    Text("\(machine.footTraffic)/day")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundStyle(AppTheme.dimText)
            }
        }
    }

    private func slotColor(row: Int, col: Int) -> Color {
        let index = row * 3 + col
        if index < machine.products.count {
            let product = machine.products[index]
            if product.stockPercentage > 0.5 {
                return AppTheme.electricGreen.opacity(0.6)
            } else if product.stockPercentage > 0.2 {
                return AppTheme.gold.opacity(0.6)
            } else {
                return AppTheme.neonRed.opacity(0.6)
            }
        }
        return Color.white.opacity(0.04)
    }

    private func statusBadge(_ status: MachineStatus) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor(for: status))
                .frame(width: 6, height: 6)
            Text(status.rawValue)
                .font(.system(size: 11, weight: .bold))
        }
        .foregroundStyle(statusColor(for: status))
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(statusColor(for: status).opacity(0.1))
        .clipShape(Capsule())
    }

    @ViewBuilder
    private var maintenanceDispatchSection: some View {
        if machine.status == .needsMaintenance || machine.status == .broken {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 6) {
                    Image(systemName: "wrench.and.screwdriver.fill")
                        .font(.caption)
                        .foregroundStyle(AppTheme.neonRed)
                    Text("MAINTENANCE REQUIRED")
                        .font(.system(size: 11, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(AppTheme.neonRed)
                }

                Text(machine.status == .broken ? "This machine is broken and not generating revenue." : "This machine needs maintenance. Performance is degraded.")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.dimText)

                if let emp = assignedEmployee {
                    let canRepair = emp.statRepairSkill >= 60
                    Button {
                        if canRepair {
                            viewModel.fixMachine(machine)
                        } else {
                            showMaintenanceDispatchAlert = true
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: canRepair ? "wrench.fill" : "lock.fill")
                                .font(.system(size: 12))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(canRepair ? "Dispatch for Maintenance" : "Employee Lacks Repair Skill")
                                    .font(.system(size: 13, weight: .bold))
                                Text(canRepair ? "\(emp.name) (Repair: \(emp.statRepairSkill)/100)" : "\(emp.name) — Repair: \(emp.statRepairSkill)/100 (min 60)")
                                    .font(.system(size: 10))
                                    .opacity(0.7)
                            }
                            Spacer()
                        }
                        .foregroundStyle(canRepair ? .white : AppTheme.dimText)
                        .padding(14)
                        .frame(maxWidth: .infinity)
                        .background(canRepair ? AppTheme.electricGreen : Color.white.opacity(0.06))
                        .clipShape(.rect(cornerRadius: 14))
                    }
                    .sensoryFeedback(.impact(weight: .medium), trigger: canRepair)
                } else {
                    Button {
                        showMaintenanceDispatchAlert = true
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "person.crop.circle.badge.exclamationmark")
                                .font(.system(size: 12))
                            Text("No Employee — Assign from HR Dashboard")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.gold)
                        .padding(14)
                        .frame(maxWidth: .infinity)
                        .background(AppTheme.gold.opacity(0.08))
                        .clipShape(.rect(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(AppTheme.gold.opacity(0.2), lineWidth: 1)
                        )
                    }
                }
            }
            .padding(14)
            .background(AppTheme.neonRed.opacity(0.04))
            .clipShape(.rect(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(AppTheme.neonRed.opacity(0.25), lineWidth: 1)
            )
            .pulseGlow(AppTheme.neonRed, radius: 4)
        }
    }

    private var statsGrid: some View {
        let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]
        return LazyVGrid(columns: columns, spacing: 10) {
            statCard(icon: "dollarsign.circle.fill", title: "Daily Revenue", value: viewModel.formatCurrency(machine.dailyRevenue), color: AppTheme.electricGreen)
            statCard(icon: "chart.line.uptrend.xyaxis", title: "Total Revenue", value: viewModel.formatCurrency(machine.totalRevenue), color: AppTheme.gold)
            statCard(icon: "star.fill", title: "Reputation", value: String(format: "%.1f/5.0", machine.reputation), color: AppTheme.gold)
            statCard(icon: "shippingbox.fill", title: "Stock Level", value: "\(Int(machine.overallStockLevel * 100))%", color: machine.overallStockLevel > 0.5 ? AppTheme.electricGreen : AppTheme.neonRed)
        }
    }

    private func statCard(icon: String, title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(color)
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
            Text(value)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .neonCardStyle(color)
    }

    private var installedPowerUpsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "bolt.circle.fill")
                        .font(.caption)
                        .foregroundStyle(AppTheme.gold)
                    Text("Installed Power-Ups")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                HStack(spacing: 8) {
                    Text("\(machine.activePowerUps.count) active")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(AppTheme.electricGreen)
                    if machine.issueCount > 0 {
                        HStack(spacing: 3) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 9))
                            Text("\(machine.issueCount)")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.neonRed)
                    }
                }
            }

            if machine.installedPowerUps.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "bolt.slash.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.dimText)
                        Text("No power-ups installed")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(AppTheme.dimText)
                        Text("Visit the Power-Up Shop to boost this machine")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText.opacity(0.7))
                    }
                    Spacer()
                }
                .padding(.vertical, 20)
                .neonCardStyle()
            } else {
                ForEach(machine.installedPowerUps) { installed in
                    installedPowerUpRow(installed)
                }
            }
        }
    }

    private func installedPowerUpRow(_ installed: InstalledPowerUp) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(conditionAccentColor(installed.condition).opacity(0.1))
                        .frame(width: 40, height: 40)
                    Image(systemName: installed.powerUp.iconName)
                        .font(.system(size: 14))
                        .foregroundStyle(conditionAccentColor(installed.condition))
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(installed.powerUp.name)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        conditionBadge(installed.condition)
                    }
                    HStack(spacing: 8) {
                        Text(installed.powerUp.effectDescription)
                            .font(.system(size: 10))
                            .foregroundStyle(installed.condition.isOperational ? AppTheme.electricGreen : AppTheme.dimText)
                            .strikethrough(!installed.condition.isOperational)
                        if let days = installed.daysRemaining {
                            HStack(spacing: 2) {
                                Image(systemName: "clock")
                                    .font(.system(size: 8))
                                Text("\(days)d")
                                    .font(.system(size: 9, weight: .bold))
                            }
                            .foregroundStyle(days <= 2 ? AppTheme.neonRed : AppTheme.neonCyan)
                        }
                    }
                }

                Spacer()

                if installed.powerUp.durabilityType == .breakable {
                    healthGauge(installed.healthPercent)
                }
            }
            .padding(12)

            if installed.condition == .malfunctioning || installed.condition == .broken {
                repairBar(installed)
            }

            if installed.condition == .expired {
                expiredBar(installed)
            }
        }
        .neonCardStyle(conditionAccentColor(installed.condition))
    }

    private func conditionBadge(_ condition: PowerUpCondition) -> some View {
        HStack(spacing: 3) {
            Image(systemName: condition.icon)
                .font(.system(size: 7))
            Text(condition.rawValue)
                .font(.system(size: 8, weight: .heavy))
        }
        .foregroundStyle(conditionColor(condition))
        .padding(.horizontal, 5)
        .padding(.vertical, 2)
        .background(conditionColor(condition).opacity(0.12))
        .clipShape(Capsule())
    }

    private func healthGauge(_ percent: Double) -> some View {
        VStack(spacing: 3) {
            Text("\(Int(percent))%")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(percent > 60 ? AppTheme.electricGreen : percent > 30 ? AppTheme.gold : AppTheme.neonRed)
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.06))
                    .frame(width: 36, height: 5)
                Capsule()
                    .fill(percent > 60 ? AppTheme.electricGreen : percent > 30 ? AppTheme.gold : AppTheme.neonRed)
                    .frame(width: 36 * percent / 100, height: 5)
            }
        }
    }

    private func repairBar(_ installed: InstalledPowerUp) -> some View {
        HStack(spacing: 10) {
            HStack(spacing: 4) {
                Image(systemName: installed.condition == .broken ? "xmark.octagon.fill" : "exclamationmark.triangle.fill")
                    .font(.system(size: 10))
                Text(installed.condition == .broken ? "Broken — not providing bonuses" : "Malfunctioning — reduced effectiveness")
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(installed.condition == .broken ? AppTheme.neonRed : AppTheme.gold)

            Spacer()

            Button {
                viewModel.repairPowerUp(installed, onMachine: machine.id)
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "wrench.fill")
                        .font(.system(size: 9))
                    Text("Repair \(installed.repairCost) VB")
                        .font(.system(size: 10, weight: .bold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(installed.condition == .broken ? AppTheme.neonRed : AppTheme.gold)
                .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 10)
    }

    private func expiredBar(_ installed: InstalledPowerUp) -> some View {
        HStack(spacing: 10) {
            HStack(spacing: 4) {
                Image(systemName: "clock.badge.xmark")
                    .font(.system(size: 10))
                Text("Expired — purchase again to reactivate")
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(AppTheme.dimText)

            Spacer()

            Button {
                viewModel.removePowerUp(installed, fromMachine: machine.id)
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "trash.fill")
                        .font(.system(size: 9))
                    Text("Remove")
                        .font(.system(size: 10, weight: .bold))
                }
                .foregroundStyle(AppTheme.dimText)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.white.opacity(0.06))
                .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 10)
    }

    private func conditionColor(_ condition: PowerUpCondition) -> Color {
        switch condition {
        case .active: AppTheme.electricGreen
        case .malfunctioning: AppTheme.gold
        case .broken: AppTheme.neonRed
        case .expired: AppTheme.dimText
        }
    }

    private func conditionAccentColor(_ condition: PowerUpCondition) -> Color {
        switch condition {
        case .active: AppTheme.electricGreen
        case .malfunctioning: .orange
        case .broken: AppTheme.neonRed
        case .expired: AppTheme.dimText
        }
    }

    private var productsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "cube.box.fill")
                        .font(.caption)
                        .foregroundStyle(AppTheme.neonCyan)
                    Text("Products")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                Button {
                    showRestockAllocation = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "shippingbox.and.arrow.backward.fill")
                            .font(.system(size: 10))
                        Text("Logistics")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(AppTheme.electricGreen)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(AppTheme.electricGreen.opacity(0.1))
                    .clipShape(Capsule())
                }
            }

            HStack(spacing: 8) {
                Text("Capacity:")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(AppTheme.dimText)
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.06))
                        Capsule()
                            .fill(Double(machine.usedCapacity) / Double(max(1, machine.capacity)) > 0.85 ? AppTheme.neonRed : AppTheme.electricGreen)
                            .frame(width: geo.size.width * Double(machine.usedCapacity) / Double(max(1, machine.capacity)))
                    }
                }
                .frame(height: 5)
                Text("\(machine.usedCapacity)/\(machine.capacity)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
            }
            .padding(.horizontal, 4)

            ForEach(machine.products) { product in
                Button {
                    selectedProduct = product
                } label: {
                    productRow(product)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func productRow(_ product: VendingMachineProduct) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(categoryColor(product.product.category).opacity(0.1))
                    .frame(width: 40, height: 40)
                Image(systemName: product.product.iconName)
                    .font(.system(size: 14))
                    .foregroundStyle(categoryColor(product.product.category))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(product.product.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                HStack(spacing: 8) {
                    Text(viewModel.formatCurrency(product.sellingPrice))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(AppTheme.electricGreen)
                    if product.isExpiringSoon {
                        HStack(spacing: 2) {
                            Image(systemName: "clock.badge.exclamationmark")
                                .font(.system(size: 9))
                            Text("Expiring")
                                .font(.system(size: 9, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.neonRed)
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("\(product.stock)/\(product.maxStock)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
                stockIndicator(product.stockPercentage)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 10))
                .foregroundStyle(AppTheme.dimText)
        }
        .padding(12)
        .neonCardStyle(categoryColor(product.product.category))
    }

    private func stockIndicator(_ level: Double) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.06))
                Capsule()
                    .fill(level > 0.5 ? AppTheme.electricGreen : level > 0.2 ? AppTheme.gold : AppTheme.neonRed)
                    .frame(width: geo.size.width * level)
            }
        }
        .frame(width: 50, height: 4)
    }

    private func categoryColor(_ category: ProductCategory) -> Color {
        switch category {
        case .soda: AppTheme.neonCyan
        case .snacks: AppTheme.gold
        case .healthy: AppTheme.electricGreen
        }
    }

    private func statusColor(for status: MachineStatus) -> Color {
        switch status {
        case .healthy: AppTheme.electricGreen
        case .lowStock: AppTheme.gold
        case .needsMaintenance: AppTheme.neonRed
        case .broken: Color.purple
        case .offline: AppTheme.dimText
        }
    }
}

struct ProductPopover: View {
    let product: VendingMachineProduct
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                ZStack {
                    Circle()
                        .fill(AppTheme.electricGreen.opacity(0.08))
                        .frame(width: 80, height: 80)
                    Image(systemName: product.product.iconName)
                        .font(.title)
                        .foregroundStyle(AppTheme.electricGreen)
                }

                Text(product.product.name)
                    .font(.title2.bold())
                    .foregroundStyle(AppTheme.softWhite)

                VStack(spacing: 16) {
                    detailRow(label: "Stock Level", value: "\(product.stock) / \(product.maxStock) units")
                    detailRow(label: "Selling Price", value: viewModel.formatCurrency(product.sellingPrice))
                    detailRow(label: "Base Cost", value: viewModel.formatCurrency(product.product.baseCost))
                    detailRow(label: "Margin", value: String(format: "%.0f%%", ((product.sellingPrice - product.product.baseCost) / product.product.baseCost) * 100))
                    detailRow(label: "Expires", value: product.expirationDate.formatted(.dateTime.month().day()))
                    if product.isExpiringSoon {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(AppTheme.neonRed)
                            Text("Expiring Soon!")
                                .font(.subheadline.bold())
                                .foregroundStyle(AppTheme.neonRed)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(AppTheme.neonRed.opacity(0.08))
                        .clipShape(.rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.neonRed.opacity(0.2), lineWidth: 0.5)
                        )
                    }
                }
                .padding(16)
                .neonCardStyle()

                Spacer()

                Button {} label: {
                    Label("Restock This Product", systemImage: "shippingbox.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.electricGreen)
            }
            .padding(24)
            .gameBackground()
            .navigationTitle("Product Detail")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
            Spacer()
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.softWhite)
        }
    }
}
