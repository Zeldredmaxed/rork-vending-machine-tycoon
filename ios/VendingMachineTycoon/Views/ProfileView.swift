import SwiftUI

struct ProfileView: View {
    let viewModel: GameViewModel
    @State private var showLeaderboard = false
    @State private var showSettings = false
    @State private var showDualWallet = false
    @State private var showChat = false
    @State private var showBrandCreation = false
    @State private var showAdNetwork = false
    @State private var showReferralHub = false
    @State private var showGlobalLeaderboard = false
    @State private var showAllianceHub = false
    @State private var animateIn = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    profileHeader
                    walletCards
                    eloProgressCard
                    socialQuickActions
                    brandCard
                    financialSummary
                    achievementsRow
                    leaderboardPreview
                    referralSection
                    seasonDetailsCard
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
                        Image(systemName: "person.crop.circle.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("PROFILE")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showLeaderboard) {
                LeaderboardSheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(viewModel: viewModel)
            }
            .sheet(isPresented: $showDualWallet) {
                DualWalletView(viewModel: viewModel)
            }
            .sheet(isPresented: $showChat) {
                ChatView(viewModel: viewModel)
            }
            .sheet(isPresented: $showBrandCreation) {
                BrandCreationView(viewModel: viewModel)
            }
            .sheet(isPresented: $showAdNetwork) {
                AdNetworkView(viewModel: viewModel)
            }
            .sheet(isPresented: $showReferralHub) {
                ReferralHubView(viewModel: viewModel)
            }
            .sheet(isPresented: $showGlobalLeaderboard) {
                GlobalLeaderboardView(viewModel: viewModel)
            }
            .sheet(isPresented: $showAllianceHub) {
                AllianceHubView(viewModel: viewModel)
            }
            .onAppear {
                withAnimation(.spring(response: 0.5)) { animateIn = true }
            }
        }
    }

    private var profileHeader: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(AppTheme.electricGreen.opacity(0.1))
                    .frame(width: 72, height: 72)
                Circle()
                    .stroke(AppTheme.electricGreen.opacity(0.4), lineWidth: 2)
                    .frame(width: 72, height: 72)
                Text(String(viewModel.player.name.prefix(2)).uppercased())
                    .font(.title2.bold())
                    .foregroundStyle(AppTheme.electricGreen)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(viewModel.player.name)
                    .font(.title3.bold())
                    .foregroundStyle(AppTheme.softWhite)
                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Image(systemName: "trophy.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.gold)
                        Text("Rank #\(viewModel.player.rank)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(AppTheme.gold)
                    }
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.gold)
                        Text(String(format: "%.1f", viewModel.player.reputation))
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                HStack(spacing: 4) {
                    eloBadgePill
                    Text("CEO")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(AppTheme.neonCyan)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(AppTheme.neonCyan.opacity(0.1))
                        .clipShape(Capsule())
                    Text("LVL 28")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(AppTheme.electricGreen)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(AppTheme.electricGreen.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private var eloBadgePill: some View {
        let tier = viewModel.player.eloBracketTier
        let color = profileTierColor(tier)
        return HStack(spacing: 3) {
            Image(systemName: tier.icon)
                .font(.system(size: 8))
            Text(tier.rawValue)
                .font(.system(size: 9, weight: .heavy))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(color.opacity(0.2), lineWidth: 0.5))
    }

    private var walletCards: some View {
        Button {
            showDualWallet = true
        } label: {
            HStack(spacing: 10) {
                walletCard(
                    title: "COMPETITION",
                    icon: "dollarsign.circle.fill",
                    balance: viewModel.player.competitionBucks,
                    color: AppTheme.electricGreen,
                    subtitle: "Business operations"
                )
                walletCard(
                    title: "PREMIUM",
                    icon: "diamond.fill",
                    balance: viewModel.player.premiumBucks,
                    color: AppTheme.neonCyan,
                    subtitle: "Cosmetics & subs"
                )
            }
        }
        .buttonStyle(.plain)
    }

    private var socialQuickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Access")
                .font(.headline)
                .foregroundStyle(AppTheme.softWhite)
                .padding(.leading, 2)

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                socialActionButton(icon: "bubble.left.and.bubble.right.fill", title: "Chat", color: AppTheme.neonCyan) { showChat = true }
                socialActionButton(icon: "paintbrush.fill", title: "Brand", color: AppTheme.gold) { showBrandCreation = true }
                socialActionButton(icon: "megaphone.fill", title: "Ads", color: .orange) { showAdNetwork = true }
                socialActionButton(icon: "person.badge.plus", title: "Referrals", color: AppTheme.electricGreen) { showReferralHub = true }
                socialActionButton(icon: "list.number", title: "Rankings", color: AppTheme.gold) { showGlobalLeaderboard = true }
                socialActionButton(icon: "person.3.sequence.fill", title: "Alliance", color: Color(red: 0.0, green: 0.8, blue: 0.8)) { showAllianceHub = true }
            }
        }
    }

    private func socialActionButton(icon: String, title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color.opacity(0.1))
                        .frame(width: 40, height: 40)
                    Image(systemName: icon)
                        .font(.system(size: 16))
                        .foregroundStyle(color)
                }
                Text(title)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(AppTheme.cardBackground)
            .clipShape(.rect(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(color.opacity(0.1), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func walletCard(title: String, icon: String, balance: Double, color: Color, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                    .foregroundStyle(color)
                Text(title)
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(0.5)
                    .foregroundStyle(color.opacity(0.8))
            }
            Text(viewModel.formatVB(balance))
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
            Text(subtitle)
                .font(.system(size: 9))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            LinearGradient(
                colors: [AppTheme.cardBackground, color.opacity(0.04)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }

    private var brandCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("BRAND")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(1.5)
                        .foregroundStyle(AppTheme.dimText)
                    Text(viewModel.player.brandName)
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(AppTheme.electricGreen.opacity(0.1))
                        .frame(width: 44, height: 44)
                    Image(systemName: "building.2.fill")
                        .foregroundStyle(AppTheme.electricGreen)
                }
            }

            HStack(spacing: 0) {
                brandStat(value: "\(viewModel.player.totalMachines)", label: "Machines", color: AppTheme.neonCyan)
                brandStat(value: viewModel.formatVB(viewModel.player.totalBalance), label: "Total Balance", color: AppTheme.electricGreen)
                brandStat(value: "\(viewModel.player.referralCount)", label: "Referrals", color: AppTheme.gold)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.cardBackground, Color(red: 0.06, green: 0.09, blue: 0.14)],
                startPoint: .topLeading, endPoint: .bottomTrailing
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

    private func brandStat(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.softWhite)
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(color.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
    }

    private var financialSummary: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "chart.pie.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.electricGreen)
                Text("Financial Summary")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            HStack(spacing: 10) {
                financeCard(
                    icon: "arrow.up.circle.fill",
                    title: "Revenue",
                    value: viewModel.formatCurrency(viewModel.player.totalRevenue),
                    color: AppTheme.electricGreen
                )
                financeCard(
                    icon: "arrow.down.circle.fill",
                    title: "Expenses",
                    value: viewModel.formatCurrency(viewModel.player.totalExpenses),
                    color: AppTheme.neonRed
                )
            }

            HStack(spacing: 14) {
                Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.electricGreen)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Net Profit")
                        .font(.system(size: 11))
                        .foregroundStyle(AppTheme.dimText)
                    Text(viewModel.formatCurrency(viewModel.player.netProfit))
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.electricGreen)
                }
                Spacer()
                Text("+\(Int((viewModel.player.netProfit / max(viewModel.player.totalRevenue, 1)) * 100))%")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(AppTheme.electricGreen)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(AppTheme.electricGreen.opacity(0.08))
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(AppTheme.electricGreen.opacity(0.15), lineWidth: 0.5))
            }
            .padding(14)
            .background(AppTheme.electricGreen.opacity(0.04))
            .clipShape(.rect(cornerRadius: 12))
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
    }

    private func financeCard(icon: String, title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.softWhite)
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

    private var achievementsRow: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "medal.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("Achievements")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            ScrollView(.horizontal) {
                HStack(spacing: 10) {
                    achievementBadge(icon: "star.circle.fill", title: "Top 15%", subtitle: "Season 7", color: AppTheme.gold)
                    achievementBadge(icon: "building.2.fill", title: "5 Machines", subtitle: "Empire Builder", color: AppTheme.neonCyan)
                    achievementBadge(icon: "person.2.fill", title: "3 Referrals", subtitle: "Networker", color: AppTheme.electricGreen)
                    achievementBadge(icon: "shield.checkered", title: "4 Turfs", subtitle: "Territory Lord", color: Color(red: 0.0, green: 0.8, blue: 0.8))
                }
            }
            .contentMargins(.horizontal, 0)
            .scrollIndicators(.hidden)
        }
    }

    private func achievementBadge(icon: String, title: String, subtitle: String, color: Color) -> some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.1))
                    .frame(width: 46, height: 46)
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 1)
                    .frame(width: 46, height: 46)
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(color)
            }
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
            Text(subtitle)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(width: 88)
        .padding(.vertical, 14)
        .background(AppTheme.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(color.opacity(0.12), lineWidth: 1)
        )
    }

    private var leaderboardPreview: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "list.number")
                        .font(.caption)
                        .foregroundStyle(AppTheme.gold)
                    Text("Leaderboard")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                Button {
                    showLeaderboard = true
                } label: {
                    HStack(spacing: 4) {
                        Text("View All")
                            .font(.system(size: 11, weight: .bold))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 9, weight: .bold))
                    }
                    .foregroundStyle(AppTheme.neonCyan)
                }
            }

            ForEach(viewModel.leaderboard.prefix(5)) { entry in
                leaderboardRow(entry)
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
    }

    private func leaderboardRow(_ entry: LeaderboardEntry) -> some View {
        let isPlayer = entry.playerName == viewModel.player.name
        return HStack(spacing: 10) {
            Text("#\(entry.rank)")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(entry.rank <= 3 ? AppTheme.gold : AppTheme.dimText)
                .frame(width: 28)

            if entry.rank <= 3 {
                Image(systemName: "crown.fill")
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.gold)
                    .frame(width: 14)
            } else {
                Color.clear.frame(width: 14)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.playerName)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(isPlayer ? AppTheme.electricGreen : AppTheme.softWhite)
                Text(entry.brandName)
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
            }

            Spacer()

            Text(viewModel.formatCurrency(entry.netWorth))
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .background(isPlayer ? AppTheme.electricGreen.opacity(0.05) : Color.clear)
        .clipShape(.rect(cornerRadius: 8))
    }

    private var referralSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "person.badge.plus")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Referral Program")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            Text("Invite friends — both earn 2,000 VB + Protection Shield + cosmetic skin!")
                .font(.system(size: 11))
                .foregroundStyle(AppTheme.dimText)

            HStack(spacing: 12) {
                VStack(spacing: 4) {
                    Text("\(viewModel.player.referralCount)")
                        .font(.title2.bold())
                        .foregroundStyle(AppTheme.neonCyan)
                    Text("Referred")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text(viewModel.player.referralCount >= 5 ? "Yes" : "\(5 - viewModel.player.referralCount) more")
                        .font(.title2.bold())
                        .foregroundStyle(viewModel.player.referralCount >= 5 ? AppTheme.electricGreen : AppTheme.gold)
                    Text("10% Discount")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
                .frame(maxWidth: .infinity)
            }

            Button {} label: {
                HStack(spacing: 6) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 12))
                    Text("Share Referral Link")
                        .font(.subheadline.bold())
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.neonCyan)
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
    }

    private func profileTierColor(_ tier: EloBracketTier) -> Color {
        switch tier {
        case .bronze: Color(red: 0.72, green: 0.45, blue: 0.2)
        case .silver: Color(red: 0.75, green: 0.75, blue: 0.8)
        case .gold: AppTheme.gold
        case .platinum: AppTheme.neonCyan
        }
    }

    private var eloProgressCard: some View {
        let tier = viewModel.player.eloBracketTier
        let color = profileTierColor(tier)
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.1))
                        .frame(width: 40, height: 40)
                    Circle()
                        .stroke(color.opacity(0.3), lineWidth: 1.5)
                        .frame(width: 40, height: 40)
                    Image(systemName: tier.icon)
                        .font(.system(size: 16))
                        .foregroundStyle(color)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("\(tier.rawValue.uppercased()) TIER")
                        .font(.system(size: 11, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(color)
                    Text("ELO Rating: \(viewModel.player.lifetimeElo)")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(AppTheme.dimText)
                }

                Spacer()

                if let tycoon = viewModel.player.tycoonScore {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("TYCOON")
                            .font(.system(size: 8, weight: .heavy))
                            .foregroundStyle(AppTheme.gold.opacity(0.6))
                        Text("\(tycoon.totalScore)")
                            .font(.system(size: 16, weight: .black, design: .monospaced))
                            .foregroundStyle(AppTheme.gold)
                    }
                }
            }

            if let nextTier = tier.nextTier {
                VStack(alignment: .leading, spacing: 4) {
                    GeometryReader { geo in
                        Capsule()
                            .fill(color.opacity(0.12))
                            .overlay(alignment: .leading) {
                                Capsule()
                                    .fill(
                                        LinearGradient(
                                            colors: [color.opacity(0.8), color],
                                            startPoint: .leading, endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geo.size.width * viewModel.player.eloProgressToNextTier)
                            }
                    }
                    .frame(height: 8)
                    .clipShape(Capsule())

                    HStack {
                        Text("\(viewModel.player.pointsToNextTier) pts to \(nextTier.rawValue)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(AppTheme.dimText)
                        Spacer()
                        Text("\(Int(viewModel.player.eloProgressToNextTier * 100))%")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(color)
                    }
                }
            } else {
                Text("Maximum tier achieved")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(color)
            }
        }
        .padding(16)
        .neonCardStyle(color)
    }

    private var seasonDetailsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "calendar.circle.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("Season \(viewModel.seasonInfo.seasonNumber) Details")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            let details: [(String, String)] = [
                ("Entry Fee", viewModel.formatCurrency(viewModel.seasonInfo.entryFee)),
                ("Bracket Size", "\(viewModel.seasonInfo.bracketSize) players"),
                ("Prize Pool", viewModel.formatCurrency(viewModel.seasonInfo.prizePool)),
                ("1st Place", viewModel.formatCurrency(viewModel.seasonInfo.prizePool * 0.4)),
                ("Players Active", "\(viewModel.seasonInfo.totalPlayers)"),
                ("Days Left", "\(viewModel.seasonInfo.daysRemaining)"),
            ]

            ForEach(details, id: \.0) { detail in
                HStack {
                    Text(detail.0)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                    Spacer()
                    Text(detail.1)
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                }
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
    }
}

struct LeaderboardSheet: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    podiumSection
                    remainingEntries
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Leaderboard")
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
        .presentationContentInteraction(.scrolls)
    }

    private var podiumSection: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if viewModel.leaderboard.count >= 3 {
                podiumEntry(viewModel.leaderboard[1], height: 90, medal: "2")
                podiumEntry(viewModel.leaderboard[0], height: 120, medal: "1")
                podiumEntry(viewModel.leaderboard[2], height: 70, medal: "3")
            }
        }
        .padding(.top, 16)
        .padding(.bottom, 8)
    }

    private func podiumEntry(_ entry: LeaderboardEntry, height: CGFloat, medal: String) -> some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(AppTheme.gold.opacity(0.12))
                    .frame(width: 44, height: 44)
                Circle()
                    .stroke(AppTheme.gold.opacity(medal == "1" ? 0.4 : 0.15), lineWidth: 1.5)
                    .frame(width: 44, height: 44)
                Text(String(entry.playerName.prefix(2)).uppercased())
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(AppTheme.gold)
            }

            Text(entry.playerName)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
                .lineLimit(1)

            Text(viewModel.formatCurrency(entry.netWorth))
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(AppTheme.electricGreen)

            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(medal == "1" ? AppTheme.gold.opacity(0.15) : AppTheme.cardBackground)
                    .frame(height: height)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AppTheme.gold.opacity(medal == "1" ? 0.3 : 0.1), lineWidth: 1)
                    )
                Text(medal)
                    .font(.title.bold())
                    .foregroundStyle(AppTheme.gold)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var remainingEntries: some View {
        VStack(spacing: 8) {
            ForEach(viewModel.leaderboard.dropFirst(3)) { entry in
                let isPlayer = entry.playerName == viewModel.player.name
                HStack(spacing: 12) {
                    Text("#\(entry.rank)")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.dimText)
                        .frame(width: 36)

                    ZStack {
                        Circle()
                            .fill(isPlayer ? AppTheme.electricGreen.opacity(0.12) : AppTheme.cardBackground)
                            .frame(width: 36, height: 36)
                        Text(String(entry.playerName.prefix(2)).uppercased())
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(isPlayer ? AppTheme.electricGreen : AppTheme.dimText)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.playerName)
                            .font(.subheadline.bold())
                            .foregroundStyle(isPlayer ? AppTheme.electricGreen : AppTheme.softWhite)
                        Text(entry.brandName)
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(viewModel.formatCurrency(entry.netWorth))
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        Text("\(entry.machineCount) machines")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
                .padding(12)
                .background(isPlayer ? AppTheme.electricGreen.opacity(0.04) : AppTheme.cardBackground)
                .clipShape(.rect(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isPlayer ? AppTheme.electricGreen.opacity(0.2) : AppTheme.cardBorder, lineWidth: 1)
                )
            }
        }
    }
}
