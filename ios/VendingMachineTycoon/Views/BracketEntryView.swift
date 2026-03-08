import SwiftUI

struct BracketEntryView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var lockSliderValue: CGFloat = 0
    @State private var isLocked = false
    @State private var animateIn = false
    @State private var showTooltip = false
    @State private var showEloTooltip = false
    @State private var skillAcknowledged = false
    @State private var matchmaking = MatchmakingService()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerBanner
                    eloBracketCard
                    financialBreakdown
                    prizePoolTiers
                    warningBanner
                    skillAcknowledgment
                    lockInSection
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Join Bracket")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppTheme.dimText)
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

    private var headerBanner: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "trophy.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.gold)
                VStack(alignment: .leading, spacing: 2) {
                    Text("30-DAY SIMULATION")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(2)
                        .foregroundStyle(AppTheme.gold)
                    Text("Season 8 Bracket")
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.softWhite)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text("Compete against players in your ELO tier over 30 days. Build the most profitable vending operation to win real cash prizes.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)

            HStack(spacing: 6) {
                Image(systemName: "calendar")
                    .font(.system(size: 11))
                Text("Registration: 1st of each month  •  Season starts: 2nd")
                    .font(.system(size: 11, weight: .medium))
            }
            .foregroundStyle(AppTheme.neonCyan)
        }
        .padding(18)
        .background(
            LinearGradient(
                colors: [AppTheme.gold.opacity(0.08), AppTheme.cardBackground],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(AppTheme.gold.opacity(0.2), lineWidth: 1)
        )
        .opacity(animateIn ? 1 : 0)
    }

    private var eloBracketCard: some View {
        let tier = viewModel.player.eloBracketTier
        let color = tierColor(tier)
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: tier.icon)
                        .font(.caption)
                        .foregroundStyle(color)
                    Text("Your Bracket Placement")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                Button { showEloTooltip.toggle() } label: {
                    Image(systemName: "questionmark.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.neonCyan)
                }
                .popover(isPresented: $showEloTooltip) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Elo Multiplier")
                            .font(.headline)
                        Text("Your ELO rating determines which bracket tier you compete in. Higher ELO means tougher competitors but potentially higher rewards. ELO is calculated from your VFX Score performance across seasons.")
                            .font(.subheadline)
                    }
                    .padding(16)
                    .frame(width: 280)
                    .presentationCompactAdaptation(.popover)
                }
            }

            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.1))
                        .frame(width: 56, height: 56)
                    Circle()
                        .stroke(color.opacity(0.3), lineWidth: 2)
                        .frame(width: 56, height: 56)
                    Image(systemName: tier.icon)
                        .font(.title2)
                        .foregroundStyle(color)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(tier.rawValue.uppercased() + " TIER")
                        .font(.system(size: 14, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(color)

                    HStack(spacing: 12) {
                        HStack(spacing: 4) {
                            Text("ELO:")
                                .font(.system(size: 11))
                                .foregroundStyle(AppTheme.dimText)
                            Text("\(viewModel.player.lifetimeElo)")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundStyle(AppTheme.softWhite)
                        }
                        HStack(spacing: 4) {
                            Text("Region:")
                                .font(.system(size: 11))
                                .foregroundStyle(AppTheme.dimText)
                            Text(viewModel.player.timezoneRegion.displayName)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(AppTheme.softWhite)
                        }
                    }
                }
            }

            Text("You will be matched with \(tier.rawValue)-tier players in the \(viewModel.player.timezoneRegion.displayName) timezone region.")
                .font(.caption)
                .foregroundStyle(AppTheme.dimText)
        }
        .padding(16)
        .neonCardStyle(color)
        .opacity(animateIn ? 1 : 0)
    }

    private var financialBreakdown: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Financial Breakdown")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Button { showTooltip.toggle() } label: {
                    Image(systemName: "questionmark.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.neonCyan)
                }
                .popover(isPresented: $showTooltip) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("House Rake (15%)")
                            .font(.headline)
                        Text("15% of all entry fees go to the platform to cover server costs, prize insurance, regulatory compliance, and operational expenses. The remaining 85% forms the prize pool.")
                            .font(.subheadline)
                    }
                    .padding(16)
                    .frame(width: 280)
                    .presentationCompactAdaptation(.popover)
                }
            }

            VStack(spacing: 10) {
                breakdownRow(label: "Entry Fee", value: "$50.00", color: AppTheme.softWhite, isBold: true)
                breakdownRow(label: "Starting Capital", value: "50,000 VB", color: AppTheme.electricGreen, isBold: true)
                Divider().background(AppTheme.cardBorder)
                breakdownRow(label: "Bracket Size", value: "500 players", color: AppTheme.neonCyan, isBold: false)
                breakdownRow(label: "Winning Metric", value: "VFX Score", color: AppTheme.gold, isBold: true)
                breakdownRow(label: "Total Pool", value: "$25,000", color: AppTheme.softWhite, isBold: false)

                HStack {
                    HStack(spacing: 4) {
                        Text("House Rake")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                        Button { showTooltip = true } label: {
                            Image(systemName: "questionmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(AppTheme.neonCyan)
                        }
                    }
                    Spacer()
                    Text("15% ($3,750)")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                }

                Divider().background(AppTheme.cardBorder)
                breakdownRow(label: "Prize Pool", value: "$21,250", color: AppTheme.gold, isBold: true)
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
        .opacity(animateIn ? 1 : 0)
    }

    private func breakdownRow(label: String, value: String, color: Color, isBold: Bool) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
            Spacer()
            Text(value)
                .font(isBold ? .subheadline.bold() : .subheadline)
                .foregroundStyle(color)
        }
    }

    private var prizePoolTiers: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "medal.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("Prize Distribution")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            Text("Ranked by VFX Score (Financial 50% + Operations 30% + Logistics 20%)")
                .font(.system(size: 10))
                .foregroundStyle(AppTheme.dimText)

            let tiers: [(String, String, String, Color)] = [
                ("1st", "40%", "$8,500", AppTheme.gold),
                ("2nd", "25%", "$5,312", Color(red: 0.75, green: 0.75, blue: 0.8)),
                ("3rd", "15%", "$3,187", Color(red: 0.72, green: 0.45, blue: 0.2)),
                ("4th", "12%", "$2,550", AppTheme.dimText),
                ("5th", "8%", "$1,700", AppTheme.dimText),
            ]

            ForEach(tiers, id: \.0) { tier in
                HStack(spacing: 14) {
                    ZStack {
                        Circle()
                            .fill(tier.3.opacity(0.12))
                            .frame(width: 36, height: 36)
                        Text(tier.0)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(tier.3)
                    }
                    Text(tier.1)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                        .frame(width: 40)
                    Spacer()

                    GeometryReader { geo in
                        Capsule()
                            .fill(tier.3.opacity(0.2))
                            .overlay(alignment: .leading) {
                                Capsule()
                                    .fill(tier.3.opacity(0.6))
                                    .frame(width: geo.size.width * barWidth(for: tier.0))
                            }
                    }
                    .frame(height: 8)

                    Text(tier.2)
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                        .frame(width: 72, alignment: .trailing)
                }
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
        .opacity(animateIn ? 1 : 0)
    }

    private func barWidth(for place: String) -> CGFloat {
        switch place {
        case "1st": 1.0
        case "2nd": 0.625
        case "3rd": 0.375
        case "4th": 0.3
        case "5th": 0.2
        default: 0
        }
    }

    private var warningBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "lock.fill")
                .font(.subheadline)
                .foregroundStyle(AppTheme.neonRed)
            VStack(alignment: .leading, spacing: 2) {
                Text("Competitive Fairness Lock")
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.neonRed)
                Text("No additional funds can be added to your Competition Wallet once the season begins.")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.neonRed.opacity(0.06))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(AppTheme.neonRed.opacity(0.2), lineWidth: 1)
        )
    }

    private var skillAcknowledgment: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "checkmark.shield.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Game of Skill Acknowledgment")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Button {} label: {
                    Image(systemName: "questionmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.neonCyan)
                }
                .popover(isPresented: .constant(false)) {
                    Text("This game is classified as a game of skill. Outcomes are determined by strategic decisions, not chance.")
                        .padding(16)
                        .frame(width: 260)
                        .presentationCompactAdaptation(.popover)
                }
            }

            Button {
                skillAcknowledged.toggle()
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: skillAcknowledged ? "checkmark.square.fill" : "square")
                        .font(.title3)
                        .foregroundStyle(skillAcknowledged ? AppTheme.electricGreen : AppTheme.dimText)
                    Text("I acknowledge that VendFX is a game of skill, my success depends on my strategic business decisions, and winning cash prizes is not based on chance.")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.softWhite)
                        .multilineTextAlignment(.leading)
                }
            }
            .buttonStyle(.plain)
            .sensoryFeedback(.selection, trigger: skillAcknowledged)
        }
        .padding(16)
        .neonCardStyle(skillAcknowledged ? AppTheme.electricGreen : AppTheme.dimText)
        .opacity(animateIn ? 1 : 0)
    }

    private var lockInSection: some View {
        VStack(spacing: 16) {
            if isLocked {
                VStack(spacing: 12) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(AppTheme.electricGreen)
                        .glow(AppTheme.electricGreen, radius: 12)
                    Text("You're In!")
                        .font(.title2.bold())
                        .foregroundStyle(AppTheme.electricGreen)
                    Text("Matchmaking begins at midnight. You'll be placed in a \(viewModel.player.eloBracketTier.rawValue) bracket.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                        .multilineTextAlignment(.center)
                    Button { dismiss() } label: {
                        Text("Go to Dashboard")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.electricGreen)
                }
                .transition(.scale.combined(with: .opacity))
            } else {
                SlideToLockButton {
                    withAnimation(.spring) { isLocked = true }
                }
                .opacity(skillAcknowledged ? 1 : 0.4)
                .allowsHitTesting(skillAcknowledged)

                if !skillAcknowledged {
                    Text("You must acknowledge the Game of Skill statement above to proceed.")
                        .font(.system(size: 10))
                        .foregroundStyle(AppTheme.neonRed)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .sensoryFeedback(.impact(weight: .heavy), trigger: isLocked)
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

struct SlideToLockButton: View {
    let onLock: () -> Void
    @State private var offset: CGFloat = 0
    @State private var isDragging = false

    var body: some View {
        GeometryReader { geo in
            let trackWidth = geo.size.width
            let knobWidth: CGFloat = 60
            let maxOffset = trackWidth - knobWidth - 8

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(AppTheme.electricGreen.opacity(0.15))
                    .overlay(
                        Capsule()
                            .stroke(AppTheme.electricGreen.opacity(0.3), lineWidth: 1)
                    )

                HStack {
                    Spacer()
                    Text("Slide to Lock In — $50")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(AppTheme.electricGreen.opacity(0.5))
                    Spacer()
                }

                Capsule()
                    .fill(AppTheme.electricGreen)
                    .frame(width: knobWidth)
                    .overlay(
                        Image(systemName: "chevron.right.2")
                            .font(.headline.bold())
                            .foregroundStyle(AppTheme.deepNavy)
                    )
                    .offset(x: offset + 4)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                isDragging = true
                                offset = min(max(0, value.translation.width), maxOffset)
                            }
                            .onEnded { _ in
                                isDragging = false
                                if offset > maxOffset * 0.85 {
                                    offset = maxOffset
                                    onLock()
                                } else {
                                    withAnimation(.spring) { offset = 0 }
                                }
                            }
                    )
            }
        }
        .frame(height: 56)
    }
}
