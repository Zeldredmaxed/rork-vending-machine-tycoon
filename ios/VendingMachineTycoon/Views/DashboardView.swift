import SwiftUI

struct DashboardView: View {
    let viewModel: GameViewModel
    @State private var animateCards = false
    @State private var pulseAlert = false
    @State private var glowPhase = false
    @State private var showEventsFeed = false
    @State private var showSeasonLobby = false
    @State private var showSeasonEnd = false
    @State private var showMarketOverview = false
    @State private var simulationTrigger = 0

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    hudHeader
                        .padding(.bottom, 16)
                    VStack(spacing: 18) {
                        seasonBanner
                        dailyReportCard
                        eventsFeedSection
                        quickActions
                        machineOverview
                        alertsSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 100)
                }
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "building.2.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("VENDING TYCOON")
                            .font(.system(size: 13, weight: .heavy, design: .default))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {} label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "bell.fill")
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.dimText)
                            if !viewModel.alertMachines.isEmpty {
                                Circle()
                                    .fill(AppTheme.neonRed)
                                    .frame(width: 8, height: 8)
                                    .offset(x: 2, y: -2)
                            }
                        }
                    }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showEventsFeed) {
                EventsFeedView(viewModel: viewModel)
            }
            .sheet(isPresented: $showSeasonLobby) {
                SeasonLobbyView(viewModel: viewModel)
            }
            .sheet(isPresented: $showSeasonEnd) {
                SeasonEndView(viewModel: viewModel)
            }
            .sheet(isPresented: $showMarketOverview) {
                MarketOverviewView(viewModel: viewModel)
            }
            .sensoryFeedback(.impact(weight: .medium), trigger: simulationTrigger)
            .onAppear {
                withAnimation(.spring(response: 0.6)) { animateCards = true }
                withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) { pulseAlert = true }
                withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: true)) { glowPhase = true }
            }
        }
    }

    private var hudHeader: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.electricGreen.opacity(0.15))
                            .frame(width: 44, height: 44)
                        Circle()
                            .stroke(AppTheme.electricGreen.opacity(0.4), lineWidth: 2)
                            .frame(width: 44, height: 44)
                        Text(String(viewModel.player.name.prefix(2)).uppercased())
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.electricGreen)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(viewModel.player.name)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        HStack(spacing: 4) {
                            Text("LVL 28")
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundStyle(AppTheme.neonCyan)
                            Capsule()
                                .fill(Color.white.opacity(0.08))
                                .frame(width: 50, height: 4)
                                .overlay(alignment: .leading) {
                                    Capsule()
                                        .fill(AppTheme.neonCyan)
                                        .frame(width: 35, height: 4)
                                }
                        }
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    hudCurrency(
                        icon: "dollarsign.circle.fill",
                        value: viewModel.formatVB(viewModel.player.competitionBucks),
                        color: AppTheme.electricGreen,
                        label: "COMP"
                    )
                    hudCurrency(
                        icon: "diamond.fill",
                        value: viewModel.formatVB(viewModel.player.premiumBucks),
                        color: AppTheme.neonCyan,
                        label: "PREM"
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                LinearGradient(
                    colors: [AppTheme.charcoal.opacity(0.95), AppTheme.deepNavy.opacity(0.8)],
                    startPoint: .top, endPoint: .bottom
                )
            )

            HStack(spacing: 16) {
                hudStat(icon: "star.fill", label: "Rep", value: String(format: "%.1f", viewModel.player.reputation), color: AppTheme.gold)

                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 1, height: 20)

                hudStat(icon: "trophy.fill", label: "Rank", value: "#\(viewModel.seasonInfo.playerRank)", color: AppTheme.gold)

                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 1, height: 20)

                hudStat(icon: "clock.fill", label: "Season", value: "\(viewModel.seasonInfo.daysRemaining)d", color: AppTheme.neonCyan)

                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 1, height: 20)

                hudStat(icon: "cabinet.fill", label: "Active", value: "\(viewModel.healthyMachineCount)/\(viewModel.machines.count)", color: AppTheme.electricGreen)
            }
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(AppTheme.cardBackground.opacity(0.9))
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [AppTheme.electricGreen.opacity(0.3), AppTheme.neonCyan.opacity(0.3)],
                            startPoint: .leading, endPoint: .trailing
                        )
                    )
                    .frame(height: 1)
            }
        }
    }

    private func hudCurrency(icon: String, value: String, color: Color, label: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(color)
            VStack(alignment: .leading, spacing: 0) {
                Text(label)
                    .font(.system(size: 7, weight: .heavy))
                    .foregroundStyle(color.opacity(0.7))
                Text(value)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.08))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(color.opacity(0.15), lineWidth: 0.5))
    }

    private func hudStat(icon: String, label: String, value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            HStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.system(size: 9))
                    .foregroundStyle(color)
                Text(value)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
            }
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
    }

    private var seasonBanner: some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text("SEASON \(viewModel.seasonInfo.seasonNumber)")
                            .font(.system(size: 11, weight: .heavy))
                            .tracking(2)
                            .foregroundStyle(AppTheme.gold)
                        Circle()
                            .fill(AppTheme.electricGreen)
                            .frame(width: 6, height: 6)
                            .pulseGlow(AppTheme.electricGreen, radius: 4)
                        Text("LIVE")
                            .font(.system(size: 9, weight: .heavy))
                            .foregroundStyle(AppTheme.electricGreen)
                    }
                    Text("Bracket: \(viewModel.seasonInfo.totalPlayers)/\(viewModel.seasonInfo.bracketSize)")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.dimText)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Prize Pool")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                    Text(viewModel.formatCurrency(viewModel.seasonInfo.prizePool))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(AppTheme.gold)
                        .glow(AppTheme.gold, radius: glowPhase ? 6 : 3)
                }
            }

            HStack(spacing: 12) {
                rankBadge
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Your Net Worth")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.dimText)
                    Text(viewModel.formatVB(viewModel.totalNetWorth))
                        .font(.headline.bold())
                        .foregroundStyle(AppTheme.electricGreen)
                }
            }

            seasonProgress
        }
        .padding(16)
        .background(
            ZStack {
                LinearGradient(
                    colors: [AppTheme.cardBackground, Color(red: 0.06, green: 0.08, blue: 0.14)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        LinearGradient(
                            colors: [AppTheme.gold.opacity(0.25), AppTheme.gold.opacity(0.05)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            }
        )
        .clipShape(.rect(cornerRadius: 16))
        .shadow(color: AppTheme.gold.opacity(0.08), radius: 16)
    }

    private var rankBadge: some View {
        HStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(AppTheme.gold.opacity(0.12))
                    .frame(width: 42, height: 42)
                Circle()
                    .stroke(AppTheme.gold.opacity(0.3), lineWidth: 1.5)
                    .frame(width: 42, height: 42)
                Text("#\(viewModel.seasonInfo.playerRank)")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(AppTheme.gold)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Current Rank")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.dimText)
                Text("Top \(Int((Double(viewModel.seasonInfo.playerRank) / Double(viewModel.seasonInfo.totalPlayers)) * 100))%")
                    .font(.caption.bold())
                    .foregroundStyle(AppTheme.softWhite)
            }
        }
    }

    private var seasonProgress: some View {
        VStack(spacing: 6) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.06))
                        .frame(height: 6)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [AppTheme.electricGreen, AppTheme.neonCyan],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * (1.0 - Double(viewModel.seasonInfo.daysRemaining) / 30.0), height: 6)
                        .glow(AppTheme.electricGreen, radius: 3)
                }
            }
            .frame(height: 6)
            HStack {
                Text("Day \(30 - viewModel.seasonInfo.daysRemaining) of 30")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(AppTheme.dimText)
                Spacer()
                Text("\(viewModel.seasonInfo.daysRemaining) days remaining")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(AppTheme.neonCyan)
            }
        }
    }

    private var dailyReportCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "chart.bar.fill")
                        .foregroundStyle(AppTheme.electricGreen)
                    Text("Daily Report")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                Text("Today")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(AppTheme.neonCyan)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(AppTheme.neonCyan.opacity(0.1))
                    .clipShape(Capsule())
            }

            HStack(spacing: 0) {
                reportMetric(
                    title: "Revenue",
                    value: viewModel.formatCurrency(viewModel.dailyReport.totalRevenue),
                    icon: "arrow.up.right",
                    color: AppTheme.electricGreen
                )
                reportMetric(
                    title: "Expenses",
                    value: viewModel.formatCurrency(viewModel.dailyReport.totalExpenses),
                    icon: "arrow.down.right",
                    color: AppTheme.neonRed
                )
                reportMetric(
                    title: "Profit",
                    value: viewModel.formatCurrency(viewModel.dailyReport.totalRevenue - viewModel.dailyReport.totalExpenses),
                    icon: "dollarsign",
                    color: AppTheme.gold
                )
            }

            HStack(spacing: 10) {
                infoChip(icon: "trophy.fill", text: viewModel.dailyReport.mostProfitableMachine, color: AppTheme.gold)
                infoChip(icon: "person.2.fill", text: "\(viewModel.dailyReport.customersServed) served", color: AppTheme.neonCyan)
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
        .opacity(animateCards ? 1 : 0)
        .offset(y: animateCards ? 0 : 20)
    }

    private func reportMetric(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(color)
                Text(title)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(AppTheme.dimText)
            }
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.softWhite)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func infoChip(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(color)
            Text(text)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(AppTheme.softWhite)
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.08))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(color.opacity(0.15), lineWidth: 0.5))
    }

    private var eventsFeedSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "bolt.fill")
                        .font(.caption)
                        .foregroundStyle(.orange)
                    Text("Live Events")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                HStack(spacing: 10) {
                    Button {
                        viewModel.runDailySimulation()
                        simulationTrigger += 1
                    } label: {
                        HStack(spacing: 3) {
                            Image(systemName: "play.fill")
                                .font(.system(size: 8))
                            Text("Simulate")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.electricGreen)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(AppTheme.electricGreen.opacity(0.1))
                        .clipShape(Capsule())
                    }
                    Button {
                        showEventsFeed = true
                    } label: {
                        HStack(spacing: 3) {
                            Text("View All")
                                .font(.system(size: 10, weight: .bold))
                            Image(systemName: "chevron.right")
                                .font(.system(size: 8, weight: .bold))
                        }
                        .foregroundStyle(AppTheme.neonCyan)
                    }
                }
            }

            if viewModel.recentEvents.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 6) {
                        Image(systemName: "newspaper")
                            .font(.title3)
                            .foregroundStyle(AppTheme.dimText)
                        Text("No events yet — tap Simulate")
                            .font(.system(size: 11))
                            .foregroundStyle(AppTheme.dimText)
                    }
                    Spacer()
                }
                .padding(.vertical, 16)
            } else {
                EventFeedInlineView(events: viewModel.recentEvents)
            }
        }
        .padding(16)
        .neonCardStyle(.orange)
        .opacity(animateCards ? 1 : 0)
        .offset(y: animateCards ? 0 : 20)
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .foregroundStyle(AppTheme.softWhite)
                .padding(.leading, 2)

            HStack(spacing: 10) {
                quickActionButton(
                    icon: "mappin.and.ellipse",
                    title: "Scout",
                    subtitle: "Location",
                    color: AppTheme.neonCyan
                ) { showSeasonLobby = true }

                quickActionButton(
                    icon: "shippingbox.fill",
                    title: "Warehouse",
                    subtitle: "Manage",
                    color: AppTheme.electricGreen
                ) { }

                quickActionButton(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "Market",
                    subtitle: "Insight",
                    color: AppTheme.gold
                ) { showMarketOverview = true }
            }
        }
        .opacity(animateCards ? 1 : 0)
        .offset(y: animateCards ? 0 : 20)
    }

    private func quickActionButton(icon: String, title: String, subtitle: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color.opacity(0.1))
                        .frame(width: 44, height: 44)
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundStyle(color)
                }
                VStack(spacing: 1) {
                    Text(title)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(AppTheme.softWhite)
                    Text(subtitle)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    colors: [AppTheme.cardBackground, AppTheme.cardBackground.opacity(0.7)],
                    startPoint: .top, endPoint: .bottom
                )
            )
            .clipShape(.rect(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(color.opacity(0.12), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var machineOverview: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "cabinet.fill")
                        .font(.caption)
                        .foregroundStyle(AppTheme.neonCyan)
                    Text("My Machines")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                HStack(spacing: 4) {
                    Circle()
                        .fill(AppTheme.electricGreen)
                        .frame(width: 6, height: 6)
                    Text("\(viewModel.machines.count) active")
                        .font(.caption2.bold())
                        .foregroundStyle(AppTheme.dimText)
                }
            }

            ForEach(viewModel.machines) { machine in
                NavigationLink {
                    MachineDetailView(machine: machine, viewModel: viewModel)
                } label: {
                    machineRow(machine)
                }
                .buttonStyle(.plain)
            }
        }
        .opacity(animateCards ? 1 : 0)
        .offset(y: animateCards ? 0 : 20)
    }

    private func machineRow(_ machine: VendingMachine) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(statusColor(for: machine.status).opacity(0.1))
                    .frame(width: 44, height: 44)
                Image(systemName: "cabinet.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(statusColor(for: machine.status))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(machine.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                HStack(spacing: 8) {
                    HStack(spacing: 3) {
                        Circle()
                            .fill(statusColor(for: machine.status))
                            .frame(width: 5, height: 5)
                        Text(machine.status.rawValue)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(statusColor(for: machine.status))
                    }
                    Text("•")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.dimText)
                    Text("\(machine.footTraffic) visitors/day")
                        .font(.system(size: 10))
                        .foregroundStyle(AppTheme.dimText)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(viewModel.formatCurrency(machine.dailyRevenue))
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.electricGreen)
                stockBar(level: machine.overallStockLevel)
            }
        }
        .padding(12)
        .background(AppTheme.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(statusColor(for: machine.status).opacity(0.1), lineWidth: 1)
        )
    }

    private func stockBar(level: Double) -> some View {
        HStack(spacing: 2) {
            ForEach(0..<5, id: \.self) { i in
                RoundedRectangle(cornerRadius: 1)
                    .fill(Double(i) / 5.0 < level ? AppTheme.electricGreen : Color.white.opacity(0.08))
                    .frame(width: 8, height: 4)
            }
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

    private var alertsSection: some View {
        Group {
            if !viewModel.alertMachines.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(AppTheme.neonRed)
                                .opacity(pulseAlert ? 1.0 : 0.5)
                            Text("Active Alerts")
                                .font(.headline)
                                .foregroundStyle(AppTheme.softWhite)
                        }
                        Spacer()
                        Text("\(viewModel.alertMachines.count)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(AppTheme.neonRed)
                            .clipShape(Capsule())
                    }

                    ForEach(viewModel.alertMachines) { machine in
                        alertRow(machine)
                    }
                }
            }
        }
    }

    private func alertRow(_ machine: VendingMachine) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(statusColor(for: machine.status).opacity(0.1))
                    .frame(width: 32, height: 32)
                Image(systemName: machine.status.icon)
                    .font(.system(size: 13))
                    .foregroundStyle(statusColor(for: machine.status))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(machine.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(machine.status.rawValue)
                    .font(.caption2)
                    .foregroundStyle(statusColor(for: machine.status))
            }
            Spacer()
            Button {
                viewModel.fixMachine(machine)
            } label: {
                Text("Fix")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 7)
                    .background(statusColor(for: machine.status))
                    .clipShape(Capsule())
            }
        }
        .padding(12)
        .background(statusColor(for: machine.status).opacity(0.06))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(statusColor(for: machine.status).opacity(0.15), lineWidth: 1)
        )
    }
}
