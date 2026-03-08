import SwiftUI

struct PracticeModeView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showDisclaimer = true
    @State private var disclaimerAccepted = false
    @State private var animateIn = false
    @State private var practiceWallet = PracticeWallet(simulatedCoins: 50_000, startingCoins: 50_000)

    private var daysUntilNextSeason: Int {
        let cal = Calendar.current
        let now = Date()
        guard let nextMonth = cal.date(byAdding: .month, value: 1, to: now) else { return 0 }
        var comps = cal.dateComponents([.year, .month], from: nextMonth)
        comps.day = 1
        guard let nextFirst = cal.date(from: comps) else { return 0 }
        return max(0, cal.dateComponents([.day], from: now, to: nextFirst).day ?? 0)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if disclaimerAccepted {
                    practiceContent
                } else {
                    Color.clear
                }
            }
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "graduationcap.fill")
                            .font(.caption)
                            .foregroundStyle(Color.gray)
                        Text("PRACTICE MODE")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Exit") { dismiss() }
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .alert("Practice Mode", isPresented: $showDisclaimer) {
                Button("I Understand") {
                    disclaimerAccepted = true
                    withAnimation(.spring(response: 0.5)) { animateIn = true }
                }
                Button("Go Back", role: .cancel) { dismiss() }
            } message: {
                Text("Welcome to Practice Mode! Here you can learn the ropes using Simulated Coins. This mode is for practice only. No real money can be earned, and no prizes will be awarded. The next competitive season begins on the 1st of next month.")
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var practiceContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                practiceBanner

                practiceWalletCard

                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 6) {
                        Image(systemName: "lightbulb.fill")
                            .font(.caption)
                            .foregroundStyle(Color.gray)
                        Text("Practice Features")
                            .font(.headline)
                            .foregroundStyle(AppTheme.softWhite)
                    }

                    practiceFeatureRow(icon: "map.fill", title: "Scout Locations", desc: "Practice placing machines with GPS")
                    practiceFeatureRow(icon: "shippingbox.fill", title: "Test Inventory", desc: "Buy and allocate simulated products")
                    practiceFeatureRow(icon: "bolt.shield.fill", title: "Try Power-Ups", desc: "Preview upgrades risk-free")
                    practiceFeatureRow(icon: "person.3.fill", title: "Manage Staff", desc: "Hire employees and dispatch restocks")
                    practiceFeatureRow(icon: "chart.bar.fill", title: "Market Analysis", desc: "Learn to read market trends")
                }
                .padding(16)
                .background(
                    LinearGradient(
                        colors: [AppTheme.cardBackground, AppTheme.deepNavy],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .clipShape(.rect(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.gray.opacity(0.15), lineWidth: 1)
                )

                botBracketInfo
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
            .opacity(animateIn ? 1 : 0)
            .offset(y: animateIn ? 0 : 20)
        }
        .scrollIndicators(.hidden)
        .safeAreaInset(edge: .top) {
            HStack(spacing: 6) {
                Image(systemName: "info.circle.fill")
                    .font(.system(size: 11))
                Text("Simulated Mode — Next Ranked Season Starts in \(daysUntilNextSeason) Days")
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundStyle(Color.gray)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(Color.gray.opacity(0.1))
        }
    }

    private var practiceBanner: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.gray.opacity(0.08))
                    .frame(width: 80, height: 80)
                Image(systemName: "graduationcap.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.gray)
            }

            Text("Training Ground")
                .font(.title3.bold())
                .foregroundStyle(AppTheme.softWhite)

            Text("Master the mechanics before competing for real prizes")
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
                .multilineTextAlignment(.center)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Color.gray.opacity(0.06), AppTheme.cardBackground],
                startPoint: .top, endPoint: .bottom
            )
        )
        .clipShape(.rect(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.gray.opacity(0.15), lineWidth: 1)
        )
    }

    private var practiceWalletCard: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.gray.opacity(0.1))
                    .frame(width: 44, height: 44)
                Image(systemName: "banknote.fill")
                    .font(.title3)
                    .foregroundStyle(Color.gray)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("SIMULATED COINS")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(Color.gray.opacity(0.7))
                Text(viewModel.formatVB(practiceWallet.simulatedCoins))
                    .font(.title3.bold())
                    .foregroundStyle(AppTheme.softWhite)
            }

            Spacer()

            Text("NOT REAL")
                .font(.system(size: 8, weight: .heavy))
                .tracking(1)
                .foregroundStyle(Color.gray)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.gray.opacity(0.15))
                .clipShape(Capsule())
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.cardBackground, Color.gray.opacity(0.04)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
    }

    private func practiceFeatureRow(icon: String, title: String, desc: String) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.gray.opacity(0.08))
                    .frame(width: 38, height: 38)
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.gray)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(desc)
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.dimText)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(AppTheme.dimText)
        }
    }

    private var botBracketInfo: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "cpu")
                    .font(.caption)
                    .foregroundStyle(Color.gray)
                Text("Simulated Bracket")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }
            Text("You are competing against AI-controlled bots in a local simulation. Results do not affect your ELO rating or season standings.")
                .font(.caption)
                .foregroundStyle(AppTheme.dimText)

            HStack(spacing: 16) {
                VStack(spacing: 4) {
                    Text("50")
                        .font(.title3.bold())
                        .foregroundStyle(Color.gray)
                    Text("Bot Players")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("30")
                        .font(.title3.bold())
                        .foregroundStyle(Color.gray)
                    Text("Day Season")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("$0")
                        .font(.title3.bold())
                        .foregroundStyle(Color.gray)
                    Text("Prize Pool")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.cardBackground, AppTheme.deepNavy],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.15), lineWidth: 1)
        )
    }
}
