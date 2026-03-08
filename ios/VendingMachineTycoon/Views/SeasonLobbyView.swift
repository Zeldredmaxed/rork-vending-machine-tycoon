import SwiftUI

struct SeasonLobbyView: View {
    let viewModel: GameViewModel
    @State private var showBracketEntry = false
    @State private var showPracticeMode = false
    @State private var animateIn = false
    @State private var pulseGlow = false
    @State private var matchmaking = MatchmakingService()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    walletBar
                    if matchmaking.isSearching {
                        matchmakingRadar
                    } else if matchmaking.isPracticeMode {
                        practiceHeroCard
                    } else {
                        countdownTimer
                        heroCard
                    }
                    eloBadgeCard
                    careerStatsSection
                    nextSeasonInfo
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "flag.checkered.2.crossed")
                            .font(.caption)
                            .foregroundStyle(AppTheme.gold)
                        Text("SEASON LOBBY")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            .toolbarBackground(AppTheme.charcoal.opacity(0.95), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showBracketEntry) {
                BracketEntryView(viewModel: viewModel)
            }
            .sheet(isPresented: $showPracticeMode) {
                PracticeModeView(viewModel: viewModel)
            }
            .onAppear {
                matchmaking.checkRegistrationWindow()
                withAnimation(.spring(response: 0.6)) { animateIn = true }
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) { pulseGlow = true }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var walletBar: some View {
        HStack(spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.electricGreen)
                VStack(alignment: .leading, spacing: 0) {
                    Text("COMP")
                        .font(.system(size: 7, weight: .heavy))
                        .foregroundStyle(AppTheme.electricGreen.opacity(0.7))
                    Text(viewModel.formatVB(viewModel.player.competitionBucks))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(AppTheme.softWhite)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(AppTheme.electricGreen.opacity(0.08))
            .clipShape(Capsule())

            HStack(spacing: 6) {
                Image(systemName: "diamond.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.neonCyan)
                VStack(alignment: .leading, spacing: 0) {
                    Text("PREM")
                        .font(.system(size: 7, weight: .heavy))
                        .foregroundStyle(AppTheme.neonCyan.opacity(0.7))
                    Text(viewModel.formatVB(viewModel.player.premiumBucks))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(AppTheme.softWhite)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(AppTheme.neonCyan.opacity(0.08))
            .clipShape(Capsule())

            Spacer()
        }
    }

    private var countdownTimer: some View {
        VStack(spacing: 12) {
            Text("SEASON STARTS IN")
                .font(.system(size: 10, weight: .heavy))
                .tracking(2)
                .foregroundStyle(AppTheme.electricGreen.opacity(0.7))

            TimelineView(.periodic(from: .now, by: 1)) { _ in
                let remaining = matchmaking.nextSeasonStart.timeIntervalSince(Date())
                let hours = Int(remaining) / 3600
                let minutes = (Int(remaining) % 3600) / 60
                let seconds = Int(remaining) % 60

                HStack(spacing: 16) {
                    countdownUnit(value: hours, label: "HRS")
                    countdownDivider
                    countdownUnit(value: minutes, label: "MIN")
                    countdownDivider
                    countdownUnit(value: seconds, label: "SEC")
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(
            ZStack {
                AppTheme.cardBackground
                RoundedRectangle(cornerRadius: 18)
                    .stroke(AppTheme.electricGreen.opacity(0.2), lineWidth: 1)
            }
        )
        .clipShape(.rect(cornerRadius: 18))
        .shadow(color: AppTheme.electricGreen.opacity(0.1), radius: 16)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private func countdownUnit(value: Int, label: String) -> some View {
        VStack(spacing: 4) {
            Text(String(format: "%02d", max(0, value)))
                .font(.system(size: 36, weight: .black, design: .monospaced))
                .foregroundStyle(AppTheme.electricGreen)
                .glow(AppTheme.electricGreen, radius: 6)
            Text(label)
                .font(.system(size: 9, weight: .heavy))
                .tracking(1)
                .foregroundStyle(AppTheme.dimText)
        }
    }

    private var countdownDivider: some View {
        Text(":")
            .font(.system(size: 30, weight: .bold, design: .monospaced))
            .foregroundStyle(AppTheme.electricGreen.opacity(0.4))
            .offset(y: -6)
    }

    private var matchmakingRadar: some View {
        VStack(spacing: 24) {
            ZStack {
                ForEach(0..<3) { i in
                    Circle()
                        .stroke(AppTheme.neonCyan.opacity(0.15 - Double(i) * 0.04), lineWidth: 1)
                        .frame(width: CGFloat(80 + i * 40), height: CGFloat(80 + i * 40))
                }

                Circle()
                    .fill(AppTheme.neonCyan.opacity(0.06))
                    .frame(width: 160, height: 160)

                Circle()
                    .trim(from: 0, to: matchmaking.matchmakingProgress)
                    .stroke(
                        AngularGradient(
                            colors: [AppTheme.neonCyan, AppTheme.electricGreen, AppTheme.neonCyan.opacity(0.3)],
                            center: .center
                        ),
                        style: StrokeStyle(lineWidth: 3, lineCap: .round)
                    )
                    .frame(width: 140, height: 140)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.5), value: matchmaking.matchmakingProgress)

                VStack(spacing: 6) {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 28))
                        .foregroundStyle(AppTheme.neonCyan)
                        .symbolEffect(.variableColor.iterative, options: .repeating)
                    Text("\(Int(matchmaking.matchmakingProgress * 100))%")
                        .font(.system(size: 20, weight: .black, design: .monospaced))
                        .foregroundStyle(AppTheme.softWhite)
                }
            }

            VStack(spacing: 6) {
                Text("SEARCHING FOR COMPETITORS...")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1.5)
                    .foregroundStyle(AppTheme.neonCyan)

                Text(matchmaking.matchmakingStatus)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.dimText)
                    .multilineTextAlignment(.center)
                    .animation(.easeInOut, value: matchmaking.matchmakingStatus)
            }

            if let tier = matchmaking.estimatedBracketTier {
                HStack(spacing: 8) {
                    Image(systemName: tier.icon)
                        .foregroundStyle(tierColor(tier))
                    Text("Estimated: \(tier.rawValue) Bracket")
                        .font(.subheadline.bold())
                        .foregroundStyle(tierColor(tier))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(tierColor(tier).opacity(0.08))
                .clipShape(Capsule())
            }

            Button {
                matchmaking.cancelMatchmaking()
            } label: {
                Text("Cancel")
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.neonRed)
            }
        }
        .padding(24)
        .neonCardStyle(AppTheme.neonCyan)
        .transition(.scale.combined(with: .opacity))
    }

    private var heroCard: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(AppTheme.electricGreen.opacity(0.04))
                    .frame(width: 140, height: 140)
                Circle()
                    .fill(AppTheme.electricGreen.opacity(0.08))
                    .frame(width: 100, height: 100)
                Circle()
                    .stroke(AppTheme.electricGreen.opacity(pulseGlow ? 0.5 : 0.15), lineWidth: 2)
                    .frame(width: 100, height: 100)
                Image(systemName: "flag.checkered.2.crossed")
                    .font(.system(size: 36))
                    .foregroundStyle(AppTheme.electricGreen)
                    .glow(AppTheme.electricGreen, radius: pulseGlow ? 12 : 6)
            }

            VStack(spacing: 6) {
                Text("SEASON 8 REGISTRATION OPEN")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(2)
                    .foregroundStyle(AppTheme.gold)
                Text("Ready to compete?")
                    .font(.title2.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text("Registration closes at midnight")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }

            Button {
                showBracketEntry = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "bolt.fill")
                    Text("Join Next Season")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.electricGreen)
            .glow(AppTheme.electricGreen, radius: pulseGlow ? 8 : 3)
            .sensoryFeedback(.impact(weight: .medium), trigger: showBracketEntry)
        }
        .padding(24)
        .background(
            ZStack {
                LinearGradient(
                    colors: [AppTheme.cardBackground, Color(red: 0.04, green: 0.08, blue: 0.14)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                RoundedRectangle(cornerRadius: 20)
                    .stroke(
                        LinearGradient(
                            colors: [AppTheme.electricGreen.opacity(0.25), AppTheme.electricGreen.opacity(0.05)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            }
        )
        .clipShape(.rect(cornerRadius: 20))
        .shadow(color: AppTheme.electricGreen.opacity(0.1), radius: 20)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private var practiceHeroCard: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color.gray.opacity(0.06))
                    .frame(width: 120, height: 120)
                Circle()
                    .stroke(Color.gray.opacity(0.2), lineWidth: 2)
                    .frame(width: 90, height: 90)
                Image(systemName: "graduationcap.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.gray)
            }

            VStack(spacing: 6) {
                Text("REGISTRATION CLOSED")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(2)
                    .foregroundStyle(Color.gray)
                Text("Season in progress")
                    .font(.title3.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text("Next competitive season starts on the 1st")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }

            Button {
                showPracticeMode = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "play.circle.fill")
                    Text("Enter Practice Simulation")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.gray)

            HStack(spacing: 4) {
                Image(systemName: "clock.fill")
                    .font(.system(size: 11))
                Text("Next Ranked Season in \(matchmaking.daysUntilNextSeason) days")
                    .font(.caption.bold())
            }
            .foregroundStyle(AppTheme.neonCyan)
        }
        .padding(24)
        .background(
            ZStack {
                LinearGradient(
                    colors: [AppTheme.cardBackground, Color(red: 0.06, green: 0.06, blue: 0.1)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.gray.opacity(0.15), lineWidth: 1)
            }
        )
        .clipShape(.rect(cornerRadius: 20))
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private var eloBadgeCard: some View {
        let tier = viewModel.player.eloBracketTier
        let color = tierColor(tier)
        return HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.1))
                    .frame(width: 52, height: 52)
                Circle()
                    .stroke(color.opacity(0.3), lineWidth: 2)
                    .frame(width: 52, height: 52)
                Image(systemName: tier.icon)
                    .font(.title3)
                    .foregroundStyle(color)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text(tier.rawValue.uppercased())
                        .font(.system(size: 12, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(color)
                    Text("ELO \(viewModel.player.lifetimeElo)")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(AppTheme.dimText)
                }

                if let nextTier = tier.nextTier {
                    VStack(alignment: .leading, spacing: 3) {
                        GeometryReader { geo in
                            Capsule()
                                .fill(color.opacity(0.15))
                                .overlay(alignment: .leading) {
                                    Capsule()
                                        .fill(color)
                                        .frame(width: geo.size.width * viewModel.player.eloProgressToNextTier)
                                }
                        }
                        .frame(height: 6)
                        .clipShape(Capsule())

                        Text("\(viewModel.player.pointsToNextTier) pts to \(nextTier.rawValue)")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(AppTheme.dimText)
                    }
                } else {
                    Text("Maximum tier reached")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(color)
                }
            }

            Spacer()
        }
        .padding(16)
        .neonCardStyle(color)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private var careerStatsSection: some View {
        let stats = SampleData.careerStats
        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "chart.bar.xaxis")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("Career Stats")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]
            LazyVGrid(columns: columns, spacing: 10) {
                careerStatCard(icon: "calendar", title: "Seasons", value: "\(stats.seasonsPlayed)", color: AppTheme.neonCyan)
                careerStatCard(icon: "trophy.fill", title: "Best Rank", value: "#\(stats.bestRank)", color: AppTheme.gold)
                careerStatCard(icon: "chart.line.uptrend.xyaxis", title: "All-Time Revenue", value: viewModel.formatVB(stats.allTimeRevenue), color: AppTheme.electricGreen)
                careerStatCard(icon: "target", title: "Best Tycoon Score", value: "\(stats.bestTycoonScore)", color: AppTheme.neonCyan)
            }

            if let badge = stats.franchiseBadge {
                HStack(spacing: 10) {
                    Image(systemName: "medal.fill")
                        .font(.title3)
                        .foregroundStyle(AppTheme.gold)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Franchise Badge")
                            .font(.caption)
                            .foregroundStyle(AppTheme.dimText)
                        Text(badge)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.gold)
                    }
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                        Text(String(format: "%.1f", stats.globalReputation))
                            .font(.subheadline.bold())
                    }
                    .foregroundStyle(AppTheme.gold)
                }
                .padding(14)
                .background(AppTheme.gold.opacity(0.06))
                .clipShape(.rect(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(AppTheme.gold.opacity(0.15), lineWidth: 1)
                )
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private func careerStatCard(icon: String, title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(color)
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(color.opacity(0.05))
        .clipShape(.rect(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.1), lineWidth: 0.5)
        )
    }

    private var nextSeasonInfo: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "info.circle.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Next Season")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            let details: [(String, String, Color)] = [
                ("Entry Fee", "$50.00", AppTheme.softWhite),
                ("Starting Capital", "50,000 VB", AppTheme.electricGreen),
                ("Registration", "1st of each month", AppTheme.neonCyan),
                ("Season Start", "2nd of each month", AppTheme.gold),
                ("Duration", "30 days", AppTheme.gold),
                ("1st Place Prize", "$8,500", AppTheme.gold),
            ]

            ForEach(details, id: \.0) { detail in
                HStack {
                    Text(detail.0)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                    Spacer()
                    Text(detail.1)
                        .font(.subheadline.bold())
                        .foregroundStyle(detail.2)
                }
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    func tierColor(_ tier: EloBracketTier) -> Color {
        switch tier {
        case .bronze: Color(red: 0.72, green: 0.45, blue: 0.2)
        case .silver: Color(red: 0.75, green: 0.75, blue: 0.8)
        case .gold: AppTheme.gold
        case .platinum: AppTheme.neonCyan
        }
    }
}
