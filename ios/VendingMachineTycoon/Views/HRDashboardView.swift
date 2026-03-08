import SwiftUI

struct HRDashboardView: View {
    let viewModel: GameViewModel
    @State private var selectedTab: Int = 0
    @State private var showAssignSheet = false
    @State private var selectedEmployee: Employee?
    @State private var showLockWarning = false
    @State private var lockWarningEmployee: Employee?
    @State private var animateIn = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                segmentedControl
                ScrollView {
                    VStack(spacing: 16) {
                        if selectedTab == 0 {
                            leadershipCapacityBar
                            rosterSection
                            activeOperationsSection
                        } else {
                            leadershipCapacityBar
                            recruitmentSection
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 100)
                }
                .scrollIndicators(.hidden)
            }
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "person.3.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.electricBlue)
                        Text("HR DASHBOARD")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.generateNewApplicants()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 10))
                            Text("REFRESH")
                                .font(.system(size: 9, weight: .heavy))
                        }
                        .foregroundStyle(AppTheme.neonCyan)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(AppTheme.neonCyan.opacity(0.12))
                        .clipShape(Capsule())
                    }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showAssignSheet) {
                if let emp = selectedEmployee {
                    AssignEmployeeSheet(employee: emp, viewModel: viewModel)
                }
            }
            .alert("Transfer Cooldown", isPresented: $showLockWarning) {
                Button("OK") {}
            } message: {
                if let emp = lockWarningEmployee {
                    let hours = Int(emp.lockTimeRemaining / 3600)
                    let minutes = Int((emp.lockTimeRemaining.truncatingRemainder(dividingBy: 3600)) / 60)
                    Text("Employee Transfer Cooldown: \(emp.name) is currently familiarizing themselves with this route. They cannot be reassigned for another \(hours)h \(minutes)m.")
                }
            }
            .onAppear {
                withAnimation(.spring(response: 0.5)) { animateIn = true }
            }
        }
    }

    private var segmentedControl: some View {
        HStack(spacing: 0) {
            segmentButton(title: "Roster", icon: "person.2.fill", index: 0)
            segmentButton(title: "Recruitment", icon: "person.badge.plus", index: 1)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(AppTheme.charcoal.opacity(0.8))
    }

    private func segmentButton(title: String, icon: String, index: Int) -> some View {
        let isSelected = selectedTab == index
        return Button {
            withAnimation(.snappy) { selectedTab = index }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                Text(title)
                    .font(.system(size: 12, weight: .bold))
            }
            .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? AppTheme.electricBlue : Color.clear)
            .clipShape(.rect(cornerRadius: 10))
        }
    }

    // MARK: - Leadership Capacity

    private var leadershipCapacityBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 5) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(AppTheme.gold)
                    Text("LEADERSHIP CAPACITY")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(AppTheme.dimText)
                }
                Spacer()
                Text("\(viewModel.usedLeadershipCapacity) / \(viewModel.leadershipCapacity)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(capacityColor)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.06))
                    Capsule()
                        .fill(capacityColor)
                        .frame(width: geo.size.width * capacityProgress)
                }
            }
            .frame(height: 8)
            .clipShape(Capsule())

            HStack(spacing: 12) {
                capacityLegend(tier: "S", cost: 50, color: AppTheme.gold)
                capacityLegend(tier: "A", cost: 30, color: AppTheme.electricGreen)
                capacityLegend(tier: "B", cost: 15, color: AppTheme.neonCyan)
                capacityLegend(tier: "C", cost: 5, color: AppTheme.dimText)
            }
        }
        .padding(14)
        .neonCardStyle(AppTheme.gold)
    }

    private var capacityProgress: Double {
        min(1.0, Double(viewModel.usedLeadershipCapacity) / Double(viewModel.leadershipCapacity))
    }

    private var capacityColor: Color {
        let pct = capacityProgress
        if pct > 0.9 { return AppTheme.neonRed }
        if pct > 0.7 { return AppTheme.gold }
        return AppTheme.electricGreen
    }

    private func capacityLegend(tier: String, cost: Int, color: Color) -> some View {
        HStack(spacing: 3) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text("\(tier): \(cost)pt")
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(AppTheme.dimText)
        }
    }

    // MARK: - Roster

    private var rosterSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Current Staff")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text("\(viewModel.employees.count) employees")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(AppTheme.dimText)
            }

            if viewModel.employees.isEmpty {
                emptyState(
                    icon: "person.crop.circle.badge.questionmark",
                    title: "No Employees",
                    subtitle: "Check the Recruitment tab to hire your first employee"
                )
            } else {
                ForEach(viewModel.employees) { employee in
                    employeeCard(employee)
                        .opacity(animateIn ? 1 : 0)
                        .offset(y: animateIn ? 0 : 15)
                }
            }
        }
    }

    // MARK: - Active Operations

    private var activeOperationsSection: some View {
        Group {
            let transitEmployees = viewModel.employees.filter { $0.status == .inTransit || $0.status == .returning }
            let activeDisp = viewModel.activeDispatches.filter { $0.status == .inTransit }

            if !transitEmployees.isEmpty || !activeDisp.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 6) {
                        Image(systemName: "location.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.neonCyan)
                        Text("Active Operations")
                            .font(.headline)
                            .foregroundStyle(AppTheme.softWhite)
                    }

                    ForEach(activeDisp) { dispatch in
                        dispatchCard(dispatch)
                    }
                }
            }
        }
    }

    private func employeeCard(_ employee: Employee) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(tierColor(employee.ratingTier).opacity(0.12))
                        .frame(width: 48, height: 48)
                    if employee.isLocked {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(AppTheme.dimText)
                    } else {
                        Text(String(employee.name.prefix(1)))
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(tierColor(employee.ratingTier))
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(employee.name)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        tierBadge(employee.ratingTier)
                        Text("\(employee.capacityCost)pt")
                            .font(.system(size: 8, weight: .heavy))
                            .foregroundStyle(AppTheme.gold)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(AppTheme.gold.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    HStack(spacing: 8) {
                        Text("\(Int(employee.exponentialWage)) VB/task")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(AppTheme.dimText)

                        statusPill(employee)
                    }
                    if employee.isLocked {
                        let hours = Int(employee.lockTimeRemaining / 3600)
                        let mins = Int((employee.lockTimeRemaining.truncatingRemainder(dividingBy: 3600)) / 60)
                        HStack(spacing: 3) {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 7))
                            Text("Locked: \(hours)h \(mins)m")
                                .font(.system(size: 8, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.dimText)
                    }
                }

                Spacer()
            }
            .padding(12)

            statBars(employee: employee)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)

            HStack(spacing: 8) {
                if !employee.isAssigned {
                    Button {
                        selectedEmployee = employee
                        showAssignSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.system(size: 10))
                            Text("Assign")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.electricGreen)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(AppTheme.electricGreen.opacity(0.1))
                        .clipShape(Capsule())
                    }
                } else {
                    Button {
                        if employee.isLocked {
                            lockWarningEmployee = employee
                            showLockWarning = true
                        } else {
                            viewModel.unassignEmployee(employee.id)
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: employee.isLocked ? "lock.fill" : "arrow.uturn.backward")
                                .font(.system(size: 10))
                            Text(employee.isLocked ? "Locked" : "Unassign")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(employee.isLocked ? AppTheme.dimText : AppTheme.gold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background((employee.isLocked ? AppTheme.dimText : AppTheme.gold).opacity(0.1))
                        .clipShape(Capsule())
                    }
                }

                Button {
                    viewModel.fireEmployee(employee.id)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "person.crop.circle.badge.minus")
                            .font(.system(size: 10))
                        Text("Fire")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(AppTheme.neonRed)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(AppTheme.neonRed.opacity(0.1))
                    .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .neonCardStyle(tierColor(employee.ratingTier))
    }

    private func statusPill(_ employee: Employee) -> some View {
        let color: Color = switch employee.status {
        case .idle: AppTheme.electricGreen
        case .inTransit: AppTheme.neonCyan
        case .restocking: AppTheme.gold
        case .returning: .orange
        case .maintenance: AppTheme.neonRed
        }

        return HStack(spacing: 3) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text(employee.status.rawValue)
                .font(.system(size: 8, weight: .bold))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
    }

    private func dispatchCard(_ dispatch: RestockDispatch) -> some View {
        VStack(spacing: 10) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: dispatch.status.icon)
                        .font(.system(size: 12))
                        .foregroundStyle(dispatch.status == .failed ? AppTheme.neonRed : AppTheme.neonCyan)
                    Text(dispatch.employeeName)
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()

                if let machine = viewModel.machines.first(where: { $0.id == dispatch.machineId }) {
                    Text(machine.name)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(AppTheme.neonCyan)
                }

                Text(dispatch.status.rawValue)
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(dispatch.status == .failed ? AppTheme.neonRed : AppTheme.electricGreen)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background((dispatch.status == .failed ? AppTheme.neonRed : AppTheme.electricGreen).opacity(0.12))
                    .clipShape(Capsule())
            }

            if dispatch.status == .inTransit {
                VStack(spacing: 4) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.06))
                            Capsule()
                                .fill(AppTheme.neonCyan)
                                .frame(width: geo.size.width * dispatch.progress)
                        }
                    }
                    .frame(height: 6)

                    HStack {
                        Text("ETA: \(dispatch.estimatedArrival, style: .relative)")
                            .font(.system(size: 9))
                            .foregroundStyle(AppTheme.dimText)
                        Spacer()
                        Text("\(Int(dispatch.progress * 100))%")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(AppTheme.neonCyan)
                    }
                }
            }

            if !dispatch.events.isEmpty {
                ForEach(dispatch.events) { event in
                    HStack(spacing: 6) {
                        Image(systemName: event.iconName)
                            .font(.system(size: 10))
                            .foregroundStyle(event.isNegative ? AppTheme.neonRed : AppTheme.electricGreen)
                        Text(event.description)
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
            }

            HStack(spacing: 8) {
                if dispatch.status == .inTransit {
                    Button {
                        viewModel.abortDispatch(dispatch.id)
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 10))
                            Text("Abort Task")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.neonRed)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(AppTheme.neonRed.opacity(0.1))
                        .clipShape(Capsule())
                    }

                    Button {
                        viewModel.completeDispatch(dispatch.id)
                    } label: {
                        Text("Complete")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(AppTheme.electricGreen)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(12)
        .neonCardStyle(dispatch.status == .failed ? AppTheme.neonRed : AppTheme.neonCyan)
    }

    // MARK: - Recruitment

    private var recruitmentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Available Applicants")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text("\(viewModel.applicants.count) candidates")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(AppTheme.dimText)
            }

            if viewModel.applicants.isEmpty {
                emptyState(
                    icon: "person.crop.circle.badge.clock",
                    title: "No Applicants Available",
                    subtitle: "New candidates arrive twice a day. Tap Refresh to generate new applicants."
                )
            } else {
                ForEach(viewModel.applicants) { applicant in
                    applicantCard(applicant)
                        .opacity(animateIn ? 1 : 0)
                        .offset(y: animateIn ? 0 : 15)
                }
            }
        }
    }

    private func applicantCard(_ applicant: Applicant) -> some View {
        let canHire = viewModel.canHireApplicant(applicant)

        return VStack(spacing: 0) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(tierColor(applicant.ratingTier).opacity(0.12))
                        .frame(width: 48, height: 48)
                    Text(String(applicant.name.prefix(1)))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(tierColor(applicant.ratingTier))
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(applicant.name)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        tierBadge(applicant.ratingTier)
                        Text("\(applicant.capacityCost)pt")
                            .font(.system(size: 8, weight: .heavy))
                            .foregroundStyle(AppTheme.gold)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(AppTheme.gold.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    Text("\(Int(applicant.wagePerRestock)) VB per task")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }

                Spacer()

                Text(String(format: "%.0f", applicant.overallRating))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(tierColor(applicant.ratingTier))
            }
            .padding(12)

            statBarsApplicant(applicant: applicant)
                .padding(.horizontal, 12)
                .padding(.bottom, 10)

            Button {
                viewModel.hireApplicant(applicant)
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: 12))
                    Text(canHire ? "Hire Employee (\(applicant.capacityCost)pt)" : "Insufficient Capacity")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundStyle(canHire ? .white : AppTheme.dimText)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(canHire ? AppTheme.electricGreen : Color.white.opacity(0.06))
                .clipShape(.rect(cornerRadius: 12))
            }
            .disabled(!canHire)
            .padding(.horizontal, 12)
            .padding(.bottom, 12)

            if !canHire {
                Text("Fire an existing worker to free up Leadership Points")
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.neonRed.opacity(0.7))
                    .padding(.bottom, 10)
            }
        }
        .neonCardStyle(tierColor(applicant.ratingTier))
    }

    // MARK: - Shared Components

    private func statBars(employee: Employee) -> some View {
        VStack(spacing: 5) {
            statRow(label: "Speed", value: employee.statSpeed, icon: "hare.fill")
            statRow(label: "Quality", value: employee.statQualityControl, icon: "checkmark.seal.fill")
            statRow(label: "Attendance", value: employee.statAttendance, icon: "clock.fill")
            statRow(label: "Driving", value: employee.statDriving, icon: "car.fill")
            statRow(label: "Adaptability", value: employee.statAdaptability, icon: "wind")
            statRow(label: "Repair", value: employee.statRepairSkill, icon: "wrench.fill")
        }
    }

    private func statBarsApplicant(applicant: Applicant) -> some View {
        VStack(spacing: 5) {
            statRow(label: "Speed", value: applicant.statSpeed, icon: "hare.fill")
            statRow(label: "Quality", value: applicant.statQualityControl, icon: "checkmark.seal.fill")
            statRow(label: "Attendance", value: applicant.statAttendance, icon: "clock.fill")
            statRow(label: "Driving", value: applicant.statDriving, icon: "car.fill")
            statRow(label: "Adaptability", value: applicant.statAdaptability, icon: "wind")
            statRow(label: "Repair", value: applicant.statRepairSkill, icon: "wrench.fill")
        }
    }

    private func statRow(label: String, value: Int, icon: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 8))
                .foregroundStyle(AppTheme.dimText)
                .frame(width: 14)
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
                .frame(width: 65, alignment: .leading)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.06))
                    Capsule()
                        .fill(statColor(value))
                        .frame(width: geo.size.width * Double(value) / 100.0)
                }
            }
            .frame(height: 4)
            Text("\(value)")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(statColor(value))
                .frame(width: 22, alignment: .trailing)
        }
    }

    private func statColor(_ value: Int) -> Color {
        if value >= 80 { return AppTheme.electricGreen }
        if value >= 60 { return AppTheme.neonCyan }
        if value >= 40 { return AppTheme.gold }
        return AppTheme.neonRed
    }

    private func tierBadge(_ tier: String) -> some View {
        Text(tier)
            .font(.system(size: 9, weight: .heavy))
            .foregroundStyle(tierColor(tier))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(tierColor(tier).opacity(0.12))
            .clipShape(Capsule())
    }

    private func tierColor(_ tier: String) -> Color {
        switch tier {
        case "S": AppTheme.gold
        case "A": AppTheme.electricGreen
        case "B": AppTheme.neonCyan
        case "C": AppTheme.gold.opacity(0.7)
        default: AppTheme.dimText
        }
    }

    private func emptyState(icon: String, title: String, subtitle: String) -> some View {
        HStack {
            Spacer()
            VStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(AppTheme.dimText)
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.dimText)
                    .multilineTextAlignment(.center)
            }
            Spacer()
        }
        .padding(.vertical, 30)
        .neonCardStyle()
    }
}

struct AssignEmployeeSheet: View {
    let employee: Employee
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.machines.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "cabinet.fill")
                                .font(.title2)
                                .foregroundStyle(AppTheme.dimText)
                            Text("No machines available")
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.dimText)
                        }
                        .padding(.vertical, 40)
                    } else {
                        ForEach(viewModel.machines) { machine in
                            Button {
                                viewModel.assignEmployee(employee.id, toMachine: machine.id)
                                dismiss()
                            } label: {
                                HStack(spacing: 12) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 10)
                                            .fill(AppTheme.neonCyan.opacity(0.1))
                                            .frame(width: 40, height: 40)
                                        Image(systemName: "cabinet.fill")
                                            .font(.system(size: 14))
                                            .foregroundStyle(AppTheme.neonCyan)
                                    }
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(machine.name)
                                            .font(.subheadline.bold())
                                            .foregroundStyle(AppTheme.softWhite)
                                        HStack(spacing: 6) {
                                            Image(systemName: machine.demographicProfile.icon)
                                                .font(.system(size: 9))
                                            Text(machine.demographicProfile.rawValue)
                                                .font(.system(size: 10))
                                        }
                                        .foregroundStyle(AppTheme.dimText)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 10))
                                        .foregroundStyle(AppTheme.dimText)
                                }
                                .padding(12)
                                .neonCardStyle(AppTheme.neonCyan)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(16)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Assign \(employee.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
    }
}
