import SwiftUI

struct PowerUpShopView: View {
    let viewModel: GameViewModel
    @State private var selectedCategory: PowerUpCategory?
    @State private var previewPowerUp: PowerUp?
    @State private var purchasePowerUp: PowerUp?
    @State private var animateIn = false
    @State private var purchaseTrigger = 0

    private var filteredPowerUps: [PowerUp] {
        guard let category = selectedCategory else { return viewModel.powerUps }
        return viewModel.powerUps.filter { $0.category == category }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    balanceBanner
                    categoryTabs
                    powerUpsList
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 100)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "bolt.shield.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.gold)
                        Text("POWER-UP SHOP")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
            }
            .toolbarBackground(AppTheme.charcoal.opacity(0.95), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(item: $previewPowerUp) { powerUp in
                PowerUpPreviewSheet(powerUp: powerUp, viewModel: viewModel)
            }
            .sheet(item: $purchasePowerUp) { powerUp in
                MachinePickerSheet(powerUp: powerUp, viewModel: viewModel, purchaseTrigger: $purchaseTrigger)
            }
            .sensoryFeedback(.success, trigger: purchaseTrigger)
            .onAppear {
                withAnimation(.spring(response: 0.5)) { animateIn = true }
            }
        }
    }

    private var balanceBanner: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("YOUR BALANCE")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                Text(viewModel.formatVB(viewModel.player.competitionBucks))
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(AppTheme.electricGreen)
                    .glow(AppTheme.electricGreen, radius: 4)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text("ISSUES")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                HStack(spacing: 4) {
                    if viewModel.totalPowerUpIssues > 0 {
                        Circle()
                            .fill(AppTheme.neonRed)
                            .frame(width: 6, height: 6)
                        Text("\(viewModel.totalPowerUpIssues)")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(AppTheme.neonRed)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("None")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.electricGreen)
                    }
                }
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.cardBackground, Color(red: 0.05, green: 0.08, blue: 0.12)],
                startPoint: .leading, endPoint: .trailing
            )
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    LinearGradient(
                        colors: [AppTheme.electricGreen.opacity(0.2), AppTheme.electricGreen.opacity(0.05)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
    }

    private var categoryTabs: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                categoryTab(nil, label: "All", icon: "square.grid.2x2.fill")
                ForEach(PowerUpCategory.allCases) { category in
                    categoryTab(category, label: category.rawValue, icon: category.icon)
                }
            }
        }
        .contentMargins(.horizontal, 0)
        .scrollIndicators(.hidden)
    }

    private func categoryTab(_ category: PowerUpCategory?, label: String, icon: String) -> some View {
        let isSelected = selectedCategory == category
        return Button {
            withAnimation(.snappy) { selectedCategory = category }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                Text(label)
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? AppTheme.neonCyan : AppTheme.cardBackground)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(isSelected ? AppTheme.neonCyan.opacity(0.5) : AppTheme.cardBorder, lineWidth: 1)
            )
        }
    }

    private var powerUpsList: some View {
        VStack(spacing: 10) {
            ForEach(filteredPowerUps) { powerUp in
                powerUpCard(powerUp)
                    .opacity(animateIn ? 1 : 0)
                    .offset(y: animateIn ? 0 : 15)
            }
        }
    }

    private func powerUpCard(_ powerUp: PowerUp) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14)
                        .fill(categoryColor(powerUp.category).opacity(0.1))
                        .frame(width: 50, height: 50)
                    Image(systemName: powerUp.iconName)
                        .font(.title3)
                        .foregroundStyle(categoryColor(powerUp.category))
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(powerUp.name)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        durabilityBadge(powerUp)
                    }
                    Text(powerUp.description)
                        .font(.system(size: 11))
                        .foregroundStyle(AppTheme.dimText)
                        .lineLimit(2)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(powerUp.costMin.formatted())")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    Text("VB")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            .padding(14)

            powerUpInfoRow(powerUp)

            installedMachinesRow(powerUp)
        }
        .neonCardStyle(categoryColor(powerUp.category))
    }

    private func durabilityBadge(_ powerUp: PowerUp) -> some View {
        HStack(spacing: 3) {
            Image(systemName: powerUp.durabilityType == .timed ? "clock.fill" : "wrench.and.screwdriver.fill")
                .font(.system(size: 7))
            Text(powerUp.durabilityType == .timed ? (powerUp.durationDays.map { "\($0)d" } ?? "Timed") : "Breakable")
                .font(.system(size: 8, weight: .heavy))
        }
        .foregroundStyle(powerUp.durabilityType == .timed ? AppTheme.neonCyan : .orange)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background((powerUp.durabilityType == .timed ? AppTheme.neonCyan : Color.orange).opacity(0.12))
        .clipShape(Capsule())
    }

    private func powerUpInfoRow(_ powerUp: PowerUp) -> some View {
        HStack(spacing: 10) {
            HStack(spacing: 4) {
                Image(systemName: "sparkle")
                    .font(.system(size: 10))
                    .foregroundStyle(AppTheme.electricGreen)
                Text(powerUp.effectDescription)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(AppTheme.electricGreen)
            }

            Spacer()

            HStack(spacing: 8) {
                Button {
                    previewPowerUp = powerUp
                } label: {
                    Text("Preview")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(AppTheme.neonCyan)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(AppTheme.neonCyan.opacity(0.1))
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(AppTheme.neonCyan.opacity(0.2), lineWidth: 0.5))
                }

                Button {
                    purchasePowerUp = powerUp
                } label: {
                    Text("Buy")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(AppTheme.deepNavy)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 6)
                        .background(AppTheme.electricGreen)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 10)
    }

    private func installedMachinesRow(_ powerUp: PowerUp) -> some View {
        let installed = viewModel.machines.compactMap { machine -> (VendingMachine, InstalledPowerUp)? in
            guard let ip = machine.installedPowerUps.first(where: { $0.powerUp.id == powerUp.id }) else { return nil }
            return (machine, ip)
        }

        return Group {
            if !installed.isEmpty {
                VStack(spacing: 6) {
                    Rectangle()
                        .fill(Color.white.opacity(0.04))
                        .frame(height: 1)

                    VStack(spacing: 4) {
                        ForEach(installed, id: \.1.id) { machine, ip in
                            installedOnRow(machine: machine, installed: ip)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 10)
                }
            }
        }
    }

    private func installedOnRow(machine: VendingMachine, installed: InstalledPowerUp) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "cabinet.fill")
                .font(.system(size: 9))
                .foregroundStyle(AppTheme.dimText)
            Text(machine.name)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(AppTheme.softWhite)

            conditionBadge(installed.condition)

            if let days = installed.daysRemaining {
                HStack(spacing: 2) {
                    Image(systemName: "clock")
                        .font(.system(size: 8))
                    Text("\(days)d left")
                        .font(.system(size: 9, weight: .bold))
                }
                .foregroundStyle(days <= 2 ? AppTheme.neonRed : AppTheme.neonCyan)
            }

            if installed.powerUp.durabilityType == .breakable {
                healthBar(installed.healthPercent)
            }

            Spacer()

            if installed.condition == .malfunctioning || installed.condition == .broken {
                Button {
                    viewModel.repairPowerUp(installed, onMachine: machine.id)
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "wrench.fill")
                            .font(.system(size: 8))
                        Text("\(installed.repairCost) VB")
                            .font(.system(size: 9, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppTheme.neonRed)
                    .clipShape(Capsule())
                }
            }
        }
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

    private func healthBar(_ percent: Double) -> some View {
        ZStack(alignment: .leading) {
            Capsule()
                .fill(Color.white.opacity(0.06))
                .frame(width: 32, height: 4)
            Capsule()
                .fill(percent > 60 ? AppTheme.electricGreen : percent > 30 ? AppTheme.gold : AppTheme.neonRed)
                .frame(width: 32 * percent / 100, height: 4)
        }
    }

    private func conditionColor(_ condition: PowerUpCondition) -> Color {
        switch condition {
        case .active: AppTheme.electricGreen
        case .malfunctioning: AppTheme.gold
        case .broken: AppTheme.neonRed
        case .expired: AppTheme.dimText
        }
    }

    private func categoryColor(_ category: PowerUpCategory) -> Color {
        switch category {
        case .turf: AppTheme.neonCyan
        case .visual: AppTheme.gold
        case .environmental: Color(red: 0.0, green: 0.8, blue: 0.8)
        case .operational: .orange
        }
    }
}

struct MachinePickerSheet: View {
    let powerUp: PowerUp
    let viewModel: GameViewModel
    @Binding var purchaseTrigger: Int
    @Environment(\.dismiss) private var dismiss
    @State private var showSuccess = false
    @State private var purchasedMachineName = ""

    private var availableMachines: [VendingMachine] {
        viewModel.machinesWithoutPowerUp(powerUp.id)
    }

    private var machinesWithExisting: [VendingMachine] {
        viewModel.machines.filter { machine in
            machine.installedPowerUps.contains { $0.powerUp.id == powerUp.id && !$0.condition.isOperational }
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    powerUpSummary

                    if !showSuccess {
                        if availableMachines.isEmpty && machinesWithExisting.isEmpty {
                            allMachinesEquipped
                        } else {
                            if !availableMachines.isEmpty {
                                machineSection(title: "Install New", machines: availableMachines, isReplace: false)
                            }
                            if !machinesWithExisting.isEmpty {
                                machineSection(title: "Replace Broken/Expired", machines: machinesWithExisting, isReplace: true)
                            }
                        }
                    } else {
                        successView
                    }
                }
                .padding(20)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Select Machine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(showSuccess ? "Done" : "Cancel") { dismiss() }
                        .foregroundStyle(AppTheme.dimText)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
    }

    private var powerUpSummary: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(AppTheme.gold.opacity(0.1))
                    .frame(width: 50, height: 50)
                Image(systemName: powerUp.iconName)
                    .font(.title3)
                    .foregroundStyle(AppTheme.gold)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(powerUp.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                HStack(spacing: 8) {
                    Text("\(powerUp.costMin.formatted()) VB")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(AppTheme.electricGreen)
                    HStack(spacing: 3) {
                        Image(systemName: powerUp.durabilityType == .timed ? "clock.fill" : "wrench.and.screwdriver.fill")
                            .font(.system(size: 9))
                        Text(powerUp.durabilityType == .timed ? "\(powerUp.durationDays ?? 0) days" : "\(Int(powerUp.malfunctionChancePercent))% malfunction risk")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .foregroundStyle(powerUp.durabilityType == .timed ? AppTheme.neonCyan : .orange)
                }
            }
            Spacer()
        }
        .padding(14)
        .neonCardStyle(AppTheme.gold)
    }

    private func machineSection(title: String, machines: [VendingMachine], isReplace: Bool) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .heavy))
                .tracking(1)
                .foregroundStyle(AppTheme.dimText)

            ForEach(machines) { machine in
                machineOption(machine, isReplace: isReplace)
            }
        }
    }

    private func machineOption(_ machine: VendingMachine, isReplace: Bool) -> some View {
        Button {
            viewModel.purchasePowerUp(powerUp, forMachine: machine.id)
            purchasedMachineName = machine.name
            purchaseTrigger += 1
            withAnimation(.spring) { showSuccess = true }
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(AppTheme.electricGreen.opacity(0.08))
                        .frame(width: 40, height: 40)
                    Image(systemName: "cabinet.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(AppTheme.electricGreen)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(machine.name)
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    HStack(spacing: 6) {
                        Text("\(machine.activePowerUps.count) active")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(AppTheme.dimText)
                        if machine.issueCount > 0 {
                            HStack(spacing: 2) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 8))
                                Text("\(machine.issueCount) issues")
                                    .font(.system(size: 10, weight: .medium))
                            }
                            .foregroundStyle(AppTheme.neonRed)
                        }
                    }
                }

                Spacer()

                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(AppTheme.electricGreen)
            }
            .padding(12)
            .background(AppTheme.cardBackground)
            .clipShape(.rect(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(AppTheme.electricGreen.opacity(0.1), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var allMachinesEquipped: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 40))
                .foregroundStyle(AppTheme.electricGreen)
            Text("All machines equipped")
                .font(.headline)
                .foregroundStyle(AppTheme.softWhite)
            Text("Every machine already has this power-up active.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
                .multilineTextAlignment(.center)
        }
        .padding(32)
    }

    private var successView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(AppTheme.electricGreen)
                .glow(AppTheme.electricGreen, radius: 12)

            Text("Installed!")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.softWhite)

            Text("\(powerUp.name) is now active on **\(purchasedMachineName)**")
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
                .multilineTextAlignment(.center)

            if powerUp.durabilityType == .timed, let days = powerUp.durationDays {
                HStack(spacing: 4) {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 12))
                    Text("Expires in \(days) days")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundStyle(AppTheme.neonCyan)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(AppTheme.neonCyan.opacity(0.1))
                .clipShape(Capsule())
            }

            if powerUp.durabilityType == .breakable {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 12))
                    Text("\(Int(powerUp.malfunctionChancePercent))% daily malfunction chance")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundStyle(.orange)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.orange.opacity(0.1))
                .clipShape(Capsule())
            }

            Button {
                dismiss()
            } label: {
                Text("Done")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.electricGreen)
            .padding(.top, 8)
        }
        .transition(.scale.combined(with: .opacity))
    }
}

struct PowerUpPreviewSheet: View {
    let powerUp: PowerUp
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var glowActive = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                ZStack {
                    Circle()
                        .fill(previewColor.opacity(0.06))
                        .frame(width: 180, height: 180)
                    Circle()
                        .fill(previewColor.opacity(0.1))
                        .frame(width: 120, height: 120)
                    Circle()
                        .stroke(previewColor.opacity(glowActive ? 0.4 : 0.15), lineWidth: 1.5)
                        .frame(width: 120, height: 120)
                    Image(systemName: powerUp.iconName)
                        .font(.system(size: 48))
                        .foregroundStyle(previewColor)
                        .glow(previewColor, radius: glowActive ? 16 : 8)
                }
                .onAppear {
                    withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                        glowActive = true
                    }
                }

                VStack(spacing: 8) {
                    Text(powerUp.name)
                        .font(.title2.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    Text(powerUp.description)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                        .multilineTextAlignment(.center)
                }

                machinePreview

                VStack(spacing: 12) {
                    previewDetail(label: "Effect", value: powerUp.effectDescription)
                    previewDetail(label: "Cost Range", value: "\(powerUp.costMin.formatted()) - \(powerUp.costMax.formatted()) VB")
                    previewDetail(label: "Category", value: powerUp.category.rawValue)
                    previewDetail(label: "Type", value: powerUp.durabilityType == .timed ? "Timed (\(powerUp.durationDays ?? 0) days)" : "Breakable")
                    if powerUp.durabilityType == .breakable {
                        previewDetail(label: "Malfunction Risk", value: "\(Int(powerUp.malfunctionChancePercent))% daily")
                        previewDetail(label: "Repair Cost", value: "\(powerUp.repairCostRange) VB")
                    }
                }
                .padding(16)
                .neonCardStyle(previewColor)

                Spacer()
            }
            .padding(24)
            .gameBackground()
            .navigationTitle("Preview")
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
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
    }

    private var machinePreview: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(AppTheme.cardBackground)
                .frame(height: 130)

            ZStack {
                if powerUp.category == .visual && powerUp.iconName == "paintbrush.fill" {
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppTheme.electricGreen.opacity(0.8), lineWidth: 3)
                        .frame(width: 60, height: 80)
                        .glow(AppTheme.electricGreen, radius: 12)
                }

                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(red: 0.12, green: 0.15, blue: 0.22))
                    .frame(width: 50, height: 70)

                if powerUp.category == .visual && powerUp.iconName == "lightbulb.max.fill" {
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(AppTheme.neonCyan.opacity(0.5), lineWidth: 1)
                        .frame(width: 50, height: 70)
                        .glow(AppTheme.neonCyan, radius: 8)
                }

                if powerUp.category == .environmental {
                    Image(systemName: powerUp.iconName)
                        .font(.caption2)
                        .foregroundStyle(AppTheme.neonCyan)
                        .offset(y: -42)
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(previewColor.opacity(0.1), lineWidth: 0.5)
        )
    }

    private func previewDetail(label: String, value: String) -> some View {
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

    private var previewColor: Color {
        switch powerUp.category {
        case .turf: AppTheme.neonCyan
        case .visual: AppTheme.gold
        case .environmental: Color(red: 0.0, green: 0.8, blue: 0.8)
        case .operational: .orange
        }
    }
}
