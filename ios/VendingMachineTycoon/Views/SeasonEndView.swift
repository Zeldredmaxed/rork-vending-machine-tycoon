import SwiftUI

struct SeasonEndView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var animateRows = false
    @State private var showRank = false
    @State private var showBreakdown = false
    @State private var showTycoonBreakdown = false
    @State private var glowPhase = false

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
                    HStack(spacing: 8) {
                        Text("Season \(result.seasonNumber)")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                        tierBadge(result.eloBracketTier)
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
                    Text("You didn't place in the top 5 this season, but your Tycoon Score contributes to your ELO rating. Keep improving!")
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
