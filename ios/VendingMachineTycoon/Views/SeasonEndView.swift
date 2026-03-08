import SwiftUI

struct SeasonEndView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var animateRows = false
    @State private var showRank = false
    @State private var showBreakdown = false
    @State private var showTycoonBreakdown = false
    @State private var glowPhase = false
    @State private var showAllTiers = false
    @State private var showPoolBreakdown = false

    private let result = SampleData.seasonResult

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    rankReveal
                    if showBreakdown {
                        tycoonScoreCard
                        financialReceipt
                        eloChangeCard
                        payoutPoolCard
                        payoutTierList
                        prizeSection
                        postGameActions
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("SEASON COMPLETE")
                        .font(.system(size: 13, weight: .heavy))
                        .tracking(1.5)
                        .foregroundStyle(AppTheme.gold)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .onAppear {
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) { glowPhase = true }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    withAnimation(.spring(response: 0.8, dampingFraction: 0.6)) { showRank = true }
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    withAnimation(.spring(response: 0.5)) { showBreakdown = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                        animateRows = true
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var rankReveal: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(AppTheme.gold.opacity(0.04))
                    .frame(width: 180, height: 180)
                Circle()
                    .fill(AppTheme.gold.opacity(0.08))
                    .frame(width: 130, height: 130)
                Circle()
                    .stroke(AppTheme.gold.opacity(glowPhase ? 0.5 : 0.15), lineWidth: 2)
                    .frame(width: 130, height: 130)

                if showRank {
                    VStack(spacing: 4) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(AppTheme.gold)
                        Text("#\(result.finalRank)")
                            .font(.system(size: 48, weight: .black))
                            .foregroundStyle(AppTheme.gold)
                            .glow(AppTheme.gold, radius: 12)
                    }
                    .transition(.scale.combined(with: .opacity))
                }
            }

            if showRank {
                VStack(spacing: 6) {
                    Text("You placed \(ordinal(result.finalRank)) out of \(result.totalPlayers)!")
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.softWhite)

                    let payout = result.payoutSummary
                    HStack(spacing: 8) {
                        Text("Season \(result.seasonNumber)")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                        tierBadge(result.eloBracketTier)
                    }

                    if result.isWinner {
                        Text("Top \(Int(PayoutService.winnerPercentile * 100))% — You're in the money!")
                            .font(.caption.bold())
                            .foregroundStyle(AppTheme.electricGreen)
                            .padding(.top, 2)
                    } else {
                        Text("Top \(Int(PayoutService.winnerPercentile * 100))% cutoff: Rank \(payout.winnerCount)")
                            .font(.caption)
                            .foregroundStyle(AppTheme.dimText)
                            .padding(.top, 2)
                    }
                }
                .transition(.opacity)
            }
        }
        .padding(.top, 16)
    }

    private var tycoonScoreCard: some View {
        let score = result.tycoonScore
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "target")
                        .font(.caption)
                        .foregroundStyle(AppTheme.gold)
                    Text("Tycoon Score")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                Button { showTycoonBreakdown.toggle() } label: {
                    Image(systemName: "questionmark.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.neonCyan)
                }
                .popover(isPresented: $showTycoonBreakdown) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tycoon Score Breakdown")
                            .font(.headline)
                        Text("Your Tycoon Score is a composite metric that determines your season ranking:\n\n• Financial (50%): Revenue and net worth performance\n• Operations (30%): Reputation from maintenance and customer satisfaction\n• Logistics (20%): Employee restock efficiency and minimal delays")
                            .font(.subheadline)
                    }
                    .padding(16)
                    .frame(width: 300)
                    .presentationCompactAdaptation(.popover)
                }
            }

            Text("\(score.totalScore)")
                .font(.system(size: 44, weight: .black, design: .monospaced))
                .foregroundStyle(AppTheme.gold)
                .glow(AppTheme.gold, radius: glowPhase ? 8 : 4)
                .frame(maxWidth: .infinity)
                .opacity(animateRows ? 1 : 0)
                .animation(.spring(response: 0.5).delay(0.2), value: animateRows)

            VStack(spacing: 10) {
                scoreBreakdownRow(
                    label: "Financial Success",
                    weight: "50%",
                    points: Int(score.financialScore),
                    color: AppTheme.electricGreen,
                    progress: score.financialScore / max(Double(score.totalScore), 1),
                    delay: 0.3
                )
                scoreBreakdownRow(
                    label: "Operational Smoothness",
                    weight: "30%",
                    points: Int(score.operationalScore),
                    color: AppTheme.neonCyan,
                    progress: score.operationalScore / max(Double(score.totalScore), 1),
                    delay: 0.5
                )
                scoreBreakdownRow(
                    label: "Logistical Efficiency",
                    weight: "20%",
                    points: Int(score.logisticalScore),
                    color: AppTheme.gold,
                    progress: score.logisticalScore / max(Double(score.totalScore), 1),
                    delay: 0.7
                )
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.gold.opacity(0.06), AppTheme.cardBackground],
                startPoint: .top, endPoint: .bottom
            )
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(AppTheme.gold.opacity(0.2), lineWidth: 1)
        )
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func scoreBreakdownRow(label: String, weight: String, points: Int, color: Color, progress: Double, delay: Double) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(AppTheme.dimText)
                Spacer()
                Text(weight)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(color.opacity(0.6))
                Text("\(points) pts")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(color)
            }

            GeometryReader { geo in
                Capsule()
                    .fill(color.opacity(0.15))
                    .overlay(alignment: .leading) {
                        Capsule()
                            .fill(color)
                            .frame(width: animateRows ? geo.size.width * min(1, progress) : 0)
                            .animation(.spring(response: 0.6).delay(delay), value: animateRows)
                    }
            }
            .frame(height: 6)
            .clipShape(Capsule())
        }
    }

    private var eloChangeCard: some View {
        let isPositive = result.eloChange >= 0
        let changeColor: Color = isPositive ? AppTheme.electricGreen : AppTheme.neonRed
        return HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(changeColor.opacity(0.1))
                    .frame(width: 48, height: 48)
                Image(systemName: isPositive ? "arrow.up.circle.fill" : "arrow.down.circle.fill")
                    .font(.title2)
                    .foregroundStyle(changeColor)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("ELO RATING UPDATE")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                HStack(spacing: 8) {
                    Text("\(isPositive ? "+" : "")\(result.eloChange)")
                        .font(.title3.bold())
                        .foregroundStyle(changeColor)
                    Text("→ \(viewModel.player.lifetimeElo)")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.softWhite)
                }
            }

            Spacer()

            tierBadge(viewModel.player.eloBracketTier)
        }
        .padding(16)
        .neonCardStyle(changeColor)
        .opacity(animateRows ? 1 : 0)
        .animation(.spring(response: 0.4).delay(0.9), value: animateRows)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private var financialReceipt: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "doc.text.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Financial Breakdown")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            let rows: [(String, String, Color, Double)] = [
                ("Starting Capital", viewModel.formatVB(result.startingCapital), AppTheme.dimText, 0.1),
                ("Total Revenue", "+ " + viewModel.formatVB(result.totalRevenue), AppTheme.electricGreen, 0.3),
                ("Inventory Costs", "- " + viewModel.formatVB(result.totalExpenses), AppTheme.neonRed, 0.5),
            ]

            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                receiptRow(label: row.0, value: row.1, color: row.2)
                    .opacity(animateRows ? 1 : 0)
                    .offset(x: animateRows ? 0 : -20)
                    .animation(.spring(response: 0.4).delay(row.3), value: animateRows)
            }

            Rectangle()
                .fill(AppTheme.gold.opacity(0.3))
                .frame(height: 1)
                .opacity(animateRows ? 1 : 0)
                .animation(.spring(response: 0.4).delay(0.6), value: animateRows)

            HStack {
                Text("Final Net Worth")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text(viewModel.formatVB(result.finalNetWorth))
                    .font(.title3.bold())
                    .foregroundStyle(AppTheme.gold)
                    .glow(AppTheme.gold, radius: 4)
            }
            .opacity(animateRows ? 1 : 0)
            .animation(.spring(response: 0.4).delay(0.8), value: animateRows)
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.cardBackground, Color(red: 0.06, green: 0.08, blue: 0.14)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(AppTheme.gold.opacity(0.15), lineWidth: 1)
        )
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func receiptRow(label: String, value: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
            Spacer()
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(color)
        }
    }

    // MARK: - Prize Pool Breakdown

    private var payoutPoolCard: some View {
        let payout = result.payoutSummary
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "dollarsign.circle.fill")
                        .font(.caption)
                        .foregroundStyle(AppTheme.electricGreen)
                    Text("Prize Pool Breakdown")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                Button { showPoolBreakdown.toggle() } label: {
                    Image(systemName: "questionmark.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.neonCyan)
                }
                .popover(isPresented: $showPoolBreakdown) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Prize Pool Distribution")
                            .font(.headline)
                        Text("The top 40% of players ranked by Tycoon Score receive a payout. The 15% House Rake is deducted from total entry fees. Payouts scale exponentially — 1st place wins the most, while the last qualifying rank breaks even with their entry fee.")
                            .font(.subheadline)
                    }
                    .padding(16)
                    .frame(width: 300)
                    .presentationCompactAdaptation(.popover)
                }
            }

            VStack(spacing: 10) {
                poolDetailRow(
                    label: "\(payout.totalPlayers) Players × \(viewModel.formatCurrency(payout.entryFee))",
                    value: viewModel.formatCurrency(payout.totalEntryFees),
                    color: AppTheme.softWhite
                )
                poolDetailRow(
                    label: "House Rake (15%)",
                    value: "- " + viewModel.formatCurrency(payout.houseRake),
                    color: AppTheme.neonRed
                )

                Rectangle()
                    .fill(AppTheme.electricGreen.opacity(0.3))
                    .frame(height: 1)

                HStack {
                    Text("Total Prize Pool")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    Spacer()
                    Text(viewModel.formatCurrency(payout.prizePool))
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.electricGreen)
                        .glow(AppTheme.electricGreen, radius: 4)
                }

                HStack(spacing: 4) {
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 10))
                    Text("\(payout.winnerCount) winners paid out of \(payout.totalPlayers) players")
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundStyle(AppTheme.dimText)
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
        .opacity(animateRows ? 1 : 0)
        .animation(.spring(response: 0.4).delay(1.0), value: animateRows)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func poolDetailRow(label: String, value: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
            Spacer()
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(color)
        }
    }

    // MARK: - Payout Tier List

    private var payoutTierList: some View {
        let payout = result.payoutSummary
        let displayTiers = showAllTiers ? payout.tiers : condensedTiers(from: payout)
        let playerRank = payout.playerRank

        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "list.number")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("Payout Tiers")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text("\(payout.winnerCount) tiers")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }

            if showAllTiers {
                LazyVStack(spacing: 0) {
                    ForEach(displayTiers) { tier in
                        payoutTierRow(tier: tier, isPlayer: tier.rank == playerRank)
                    }
                }
            } else {
                VStack(spacing: 0) {
                    ForEach(displayTiers) { tier in
                        if tier.rank == -1 {
                            ellipsisRow(totalHidden: payout.winnerCount - condensedVisibleCount(payout))
                        } else {
                            payoutTierRow(tier: tier, isPlayer: tier.rank == playerRank)
                        }
                    }
                }
            }

            Button {
                withAnimation(.spring(response: 0.4)) { showAllTiers.toggle() }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: showAllTiers ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                    Text(showAllTiers ? "Show Less" : "Show All \(payout.winnerCount) Tiers")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundStyle(AppTheme.neonCyan)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.cardBackground, Color(red: 0.06, green: 0.07, blue: 0.12)],
                startPoint: .top, endPoint: .bottom
            )
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(AppTheme.gold.opacity(0.12), lineWidth: 1)
        )
        .opacity(animateRows ? 1 : 0)
        .animation(.spring(response: 0.4).delay(1.2), value: animateRows)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func condensedVisibleCount(_ payout: SeasonPayoutSummary) -> Int {
        let topCount = 5
        let bottomCount = 3
        let playerIncluded = payout.playerRank > topCount && payout.playerRank <= payout.winnerCount - bottomCount
        return topCount + bottomCount + (playerIncluded ? 3 : 0)
    }

    private func condensedTiers(from payout: SeasonPayoutSummary) -> [PayoutTier] {
        let tiers = payout.tiers
        guard tiers.count > 12 else { return tiers }

        let topCount = 5
        let bottomCount = 3
        let playerRank = payout.playerRank

        var visible: [PayoutTier] = []

        let topTiers = Array(tiers.prefix(topCount))
        visible.append(contentsOf: topTiers)

        let playerInTop = playerRank <= topCount
        let playerInBottom = playerRank > tiers.count - bottomCount

        if !playerInTop && !playerInBottom && playerRank <= tiers.count {
            visible.append(PayoutTier(rank: -1, payout: 0, percentOfPool: 0, isBreakEven: false))

            let playerIdx = playerRank - 1
            let contextStart = max(topCount, playerIdx - 1)
            let contextEnd = min(tiers.count - bottomCount, playerIdx + 2)
            for i in contextStart..<contextEnd {
                visible.append(tiers[i])
            }
        }

        visible.append(PayoutTier(rank: -1, payout: 0, percentOfPool: 0, isBreakEven: false))

        let bottomTiers = Array(tiers.suffix(bottomCount))
        visible.append(contentsOf: bottomTiers)

        return visible
    }

    private func payoutTierRow(tier: PayoutTier, isPlayer: Bool) -> some View {
        let accentColor: Color = {
            if isPlayer { return AppTheme.electricGreen }
            if tier.rank == 1 { return AppTheme.gold }
            if tier.rank <= 3 { return AppTheme.gold.opacity(0.7) }
            if tier.isBreakEven { return AppTheme.neonCyan }
            return AppTheme.softWhite
        }()

        return HStack(spacing: 10) {
            ZStack {
                if tier.rank <= 3 {
                    Circle()
                        .fill(accentColor.opacity(0.12))
                        .frame(width: 30, height: 30)
                }
                Text("\(tier.rank)")
                    .font(.system(size: tier.rank <= 3 ? 14 : 12, weight: tier.rank <= 3 ? .black : .semibold, design: .monospaced))
                    .foregroundStyle(accentColor)
                    .frame(width: 30)
            }

            if isPlayer {
                HStack(spacing: 4) {
                    Image(systemName: "arrowtriangle.right.fill")
                        .font(.system(size: 8))
                    Text("YOU")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(0.5)
                }
                .foregroundStyle(AppTheme.electricGreen)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(AppTheme.electricGreen.opacity(0.12))
                .clipShape(Capsule())
            }

            Spacer()

            if tier.isBreakEven {
                Text("BREAK EVEN")
                    .font(.system(size: 8, weight: .heavy))
                    .tracking(0.5)
                    .foregroundStyle(AppTheme.neonCyan)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(AppTheme.neonCyan.opacity(0.1))
                    .clipShape(Capsule())
            }

            Text(viewModel.formatCurrency(tier.payout))
                .font(.system(size: 13, weight: isPlayer || tier.rank <= 3 ? .bold : .medium, design: .monospaced))
                .foregroundStyle(accentColor)
        }
        .padding(.vertical, 7)
        .padding(.horizontal, isPlayer ? 8 : 0)
        .background(isPlayer ? AppTheme.electricGreen.opacity(0.05) : .clear)
        .clipShape(.rect(cornerRadius: 8))
        .overlay(
            Group {
                if tier.rank > 1 {
                    VStack {
                        Rectangle()
                            .fill(AppTheme.cardBorder)
                            .frame(height: 0.5)
                        Spacer()
                    }
                }
            }
        )
    }

    private func ellipsisRow(totalHidden: Int) -> some View {
        HStack {
            Spacer()
            VStack(spacing: 2) {
                ForEach(0..<3, id: \.self) { _ in
                    Circle()
                        .fill(AppTheme.dimText.opacity(0.4))
                        .frame(width: 3, height: 3)
                }
            }
            .padding(.vertical, 4)
            Spacer()
        }
        .padding(.vertical, 4)
    }

    // MARK: - Prize Section

    private var prizeSection: some View {
        Group {
            if result.isWinner, let prize = result.prizeAmount {
                VStack(spacing: 16) {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .font(.title3)
                            .foregroundStyle(AppTheme.gold)
                        Text("You Won a Prize!")
                            .font(.title3.bold())
                            .foregroundStyle(AppTheme.gold)
                    }

                    Text(viewModel.formatCurrency(prize))
                        .font(.system(size: 40, weight: .black))
                        .foregroundStyle(AppTheme.gold)
                        .glow(AppTheme.gold, radius: glowPhase ? 12 : 6)

                    if let playerTier = result.payoutSummary.playerTier {
                        Text("\(String(format: "%.1f", playerTier.percentOfPool))% of Prize Pool")
                            .font(.caption)
                            .foregroundStyle(AppTheme.dimText)
                    }

                    Button {} label: {
                        HStack(spacing: 8) {
                            Image(systemName: "banknote.fill")
                            Text("Claim Prize via Stripe")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.gold)
                }
                .padding(20)
                .background(
                    LinearGradient(
                        colors: [AppTheme.gold.opacity(0.08), AppTheme.cardBackground],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .clipShape(.rect(cornerRadius: 18))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(AppTheme.gold.opacity(0.25), lineWidth: 1)
                )
                .shadow(color: AppTheme.gold.opacity(0.15), radius: 20)
                .transition(.scale.combined(with: .opacity))
            } else {
                VStack(spacing: 14) {
                    Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(AppTheme.neonCyan)
                    Text("Great effort!")
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.softWhite)

                    let cutoff = result.payoutSummary.winnerCount
                    Text("You placed \(ordinal(result.finalRank)) — the top \(Int(PayoutService.winnerPercentile * 100))% cutoff was rank \(cutoff). Your Tycoon Score still contributes to your ELO rating. Keep improving!")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                        .multilineTextAlignment(.center)
                }
                .padding(20)
                .neonCardStyle(AppTheme.neonCyan)
                .transition(.opacity)
            }
        }
    }

    private var postGameActions: some View {
        VStack(spacing: 10) {
            Button {} label: {
                HStack(spacing: 8) {
                    Image(systemName: "chart.xyaxis.line")
                    Text("View Post-Game Analytics")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
            }
            .buttonStyle(.bordered)
            .tint(AppTheme.neonCyan)

            Button { dismiss() } label: {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.backward.circle.fill")
                    Text("Return to Lobby")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.electricGreen)
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func tierBadge(_ tier: EloBracketTier) -> some View {
        let color = tierColor(tier)
        return HStack(spacing: 4) {
            Image(systemName: tier.icon)
                .font(.system(size: 10))
            Text(tier.rawValue)
                .font(.system(size: 10, weight: .heavy))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(color.opacity(0.2), lineWidth: 0.5))
    }

    private func tierColor(_ tier: EloBracketTier) -> Color {
        switch tier {
        case .bronze: Color(red: 0.72, green: 0.45, blue: 0.2)
        case .silver: Color(red: 0.75, green: 0.75, blue: 0.8)
        case .gold: AppTheme.gold
        case .platinum: AppTheme.neonCyan
        }
    }

    private func ordinal(_ n: Int) -> String {
        let suffix: String
        let ones = n % 10
        let tens = (n / 10) % 10
        if tens == 1 {
            suffix = "th"
        } else {
            switch ones {
            case 1: suffix = "st"
            case 2: suffix = "nd"
            case 3: suffix = "rd"
            default: suffix = "th"
            }
        }
        return "\(n)\(suffix)"
    }
}
