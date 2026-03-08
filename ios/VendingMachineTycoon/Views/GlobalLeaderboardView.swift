import SwiftUI

struct GlobalLeaderboardView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedSort = 0
    @State private var animateIn = false
    @State private var showScoreTooltip = false

    private let sortOptions = ["VFX Score", "Net Worth", "Machines"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    sortTabs
                    bracketTierIndicator
                    podium
                    fullRankings
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Global Leaderboard")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear {
                withAnimation(.spring(response: 0.5)) { animateIn = true }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var sortTabs: some View {
        HStack(spacing: 6) {
            ForEach(Array(sortOptions.enumerated()), id: \.offset) { index, option in
                let isSelected = selectedSort == index
                Button {
                    withAnimation(.snappy) { selectedSort = index }
                } label: {
                    Text(option)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(isSelected ? AppTheme.gold : AppTheme.cardBackground)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule().stroke(isSelected ? AppTheme.gold.opacity(0.5) : AppTheme.cardBorder, lineWidth: 1)
                        )
                }
            }
        }
        .sensoryFeedback(.selection, trigger: selectedSort)
    }

    private var bracketTierIndicator: some View {
        let tier = viewModel.player.eloBracketTier
        let color = tierColor(tier)
        return HStack(spacing: 10) {
            Image(systemName: tier.icon)
                .font(.subheadline)
                .foregroundStyle(color)
            Text("\(tier.rawValue) Bracket")
                .font(.subheadline.bold())
                .foregroundStyle(color)
            Spacer()
            HStack(spacing: 4) {
                Text("ELO \(viewModel.player.lifetimeElo)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(AppTheme.dimText)
                Button { showScoreTooltip.toggle() } label: {
                    Image(systemName: "questionmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.neonCyan)
                }
                .popover(isPresented: $showScoreTooltip) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("VFX Score")
                            .font(.headline)
                        Text("Rankings are determined by VFX Score — a composite of:\n\n• Financial Success (50%)\n• Operational Smoothness (30%)\n• Logistical Efficiency (20%)\n\nTap any player's score to see their breakdown.")
                            .font(.subheadline)
                    }
                    .padding(16)
                    .frame(width: 280)
                    .presentationCompactAdaptation(.popover)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(color.opacity(0.06))
        .clipShape(.rect(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }

    private var podium: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if viewModel.leaderboard.count >= 3 {
                podiumColumn(viewModel.leaderboard[1], place: 2, height: 90)
                podiumColumn(viewModel.leaderboard[0], place: 1, height: 120)
                podiumColumn(viewModel.leaderboard[2], place: 3, height: 70)
            }
        }
        .padding(.top, 8)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private func podiumColumn(_ entry: LeaderboardEntry, place: Int, height: CGFloat) -> some View {
        let medalColor: Color = place == 1 ? AppTheme.gold : place == 2 ? Color(red: 0.75, green: 0.75, blue: 0.8) : Color(red: 0.72, green: 0.45, blue: 0.2)

        return VStack(spacing: 8) {
            if place == 1 {
                Image(systemName: "crown.fill")
                    .font(.title3)
                    .foregroundStyle(AppTheme.gold)
                    .glow(AppTheme.gold, radius: 6)
            }

            ZStack {
                Circle()
                    .fill(medalColor.opacity(0.12))
                    .frame(width: 48, height: 48)
                Circle()
                    .stroke(medalColor.opacity(0.4), lineWidth: place == 1 ? 2 : 1)
                    .frame(width: 48, height: 48)
                Text(String(entry.playerName.prefix(2)).uppercased())
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(medalColor)
            }

            Text(entry.playerName)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
                .lineLimit(1)

            Text(sortValue(for: entry))
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(AppTheme.electricGreen)

            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(
                        LinearGradient(
                            colors: [medalColor.opacity(0.15), medalColor.opacity(0.05)],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .frame(height: height)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(medalColor.opacity(0.2), lineWidth: 1)
                    )
                Text("\(place)")
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(medalColor.opacity(0.5))
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var fullRankings: some View {
        VStack(spacing: 8) {
            ForEach(viewModel.leaderboard) { entry in
                let isPlayer = entry.playerName == viewModel.player.name
                HStack(spacing: 12) {
                    Text("#\(entry.rank)")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(entry.rank <= 3 ? AppTheme.gold : AppTheme.dimText)
                        .frame(width: 36)

                    ZStack {
                        Circle()
                            .fill(isPlayer ? AppTheme.electricGreen.opacity(0.12) : AppTheme.cardBackground)
                            .frame(width: 38, height: 38)
                        Circle()
                            .stroke(isPlayer ? AppTheme.electricGreen.opacity(0.3) : AppTheme.cardBorder, lineWidth: 1)
                            .frame(width: 38, height: 38)
                        Text(String(entry.playerName.prefix(2)).uppercased())
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(isPlayer ? AppTheme.electricGreen : AppTheme.dimText)
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(entry.playerName)
                                .font(.subheadline.bold())
                                .foregroundStyle(isPlayer ? AppTheme.electricGreen : AppTheme.softWhite)
                            tierPill(entry.eloBracketTier)
                        }
                        HStack(spacing: 8) {
                            Text(entry.brandName)
                                .font(.system(size: 10))
                                .foregroundStyle(AppTheme.dimText)
                            HStack(spacing: 3) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 8))
                                Text(String(format: "%.1f", entry.reputation))
                                    .font(.system(size: 9, weight: .bold))
                            }
                            .foregroundStyle(AppTheme.gold)
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 3) {
                        Text(sortValue(for: entry))
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        if selectedSort == 0 {
                            HStack(spacing: 4) {
                                scoreChip(Int(entry.financialScore), color: AppTheme.electricGreen)
                                scoreChip(Int(entry.operationalScore), color: AppTheme.neonCyan)
                                scoreChip(Int(entry.logisticalScore), color: AppTheme.gold)
                            }
                        } else {
                            Text("\(entry.machineCount) machines")
                                .font(.system(size: 10))
                                .foregroundStyle(AppTheme.dimText)
                        }
                    }
                }
                .padding(12)
                .background(isPlayer ? AppTheme.electricGreen.opacity(0.04) : AppTheme.cardBackground)
                .clipShape(.rect(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(isPlayer ? AppTheme.electricGreen.opacity(0.2) : AppTheme.cardBorder, lineWidth: 1)
                )
                .opacity(animateIn ? 1 : 0)
                .offset(y: animateIn ? 0 : 10)
            }
        }
    }

    private func scoreChip(_ value: Int, color: Color) -> some View {
        Text("\(value)")
            .font(.system(size: 8, weight: .bold, design: .monospaced))
            .foregroundStyle(color)
            .padding(.horizontal, 4)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .clipShape(.rect(cornerRadius: 4))
    }

    private func tierPill(_ tier: EloBracketTier) -> some View {
        let color = tierColor(tier)
        return Text(tier.rawValue.prefix(1))
            .font(.system(size: 8, weight: .heavy))
            .foregroundStyle(color)
            .frame(width: 16, height: 16)
            .background(color.opacity(0.15))
            .clipShape(Circle())
    }

    private func sortValue(for entry: LeaderboardEntry) -> String {
        switch selectedSort {
        case 0: "\(entry.tycoonScore) VFX"
        case 1: viewModel.formatCurrency(entry.netWorth)
        case 2: "\(entry.machineCount)"
        default: "\(entry.tycoonScore) VFX"
        }
    }

    private func tierColor(_ tier: EloBracketTier) -> Color {
        switch tier {
        case .bronze: Color(red: 0.72, green: 0.45, blue: 0.2)
        case .silver: Color(red: 0.75, green: 0.75, blue: 0.8)
        case .gold: AppTheme.gold
        case .platinum: AppTheme.neonCyan
        }
    }
}
