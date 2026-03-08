import SwiftUI

struct DualWalletView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = 0
    @State private var depositAmount: String = ""
    @State private var animateIn = false
    @State private var isSeasonActive = true

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                walletTabs
                TabView(selection: $selectedTab) {
                    competitionWallet.tag(0)
                    premiumWallet.tag(1)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .gameBackground()
            .navigationTitle("Wallets")
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

    private var walletTabs: some View {
        HStack(spacing: 0) {
            walletTabButton(title: "Competition", icon: "dollarsign.circle.fill", color: AppTheme.electricGreen, index: 0)
            walletTabButton(title: "Premium", icon: "diamond.fill", color: AppTheme.neonCyan, index: 1)
        }
        .padding(4)
        .background(AppTheme.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private func walletTabButton(title: String, icon: String, color: Color, index: Int) -> some View {
        let isSelected = selectedTab == index
        return Button {
            withAnimation(.snappy) { selectedTab = index }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                Text(title)
                    .font(.system(size: 13, weight: .bold))
            }
            .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? color : Color.clear)
            .clipShape(.rect(cornerRadius: 10))
        }
        .sensoryFeedback(.selection, trigger: selectedTab)
    }

    private var competitionWallet: some View {
        ScrollView {
            VStack(spacing: 18) {
                VStack(spacing: 10) {
                    Text("COMPETITION WALLET")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(2)
                        .foregroundStyle(AppTheme.electricGreen.opacity(0.7))

                    Text(viewModel.formatVB(viewModel.player.competitionBucks))
                        .font(.system(size: 36, weight: .bold))
                        .foregroundStyle(AppTheme.electricGreen)
                        .glow(AppTheme.electricGreen, radius: 6)

                    Text("FairPlay Balance")
                        .font(.caption)
                        .foregroundStyle(AppTheme.dimText)
                }
                .padding(24)
                .frame(maxWidth: .infinity)
                .neonCardStyle(AppTheme.electricGreen)

                if isSeasonActive {
                    VStack(spacing: 12) {
                        HStack(spacing: 10) {
                            Image(systemName: "lock.fill")
                                .font(.title3)
                                .foregroundStyle(AppTheme.neonRed)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Locked for Competitive Fairness")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(AppTheme.neonRed)
                                Text("No funds can be added until the current season ends. This ensures all players compete on equal footing.")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.dimText)
                            }
                        }

                        Button {} label: {
                            HStack(spacing: 6) {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 12))
                                Text("Add Funds")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(AppTheme.dimText.opacity(0.3))
                        .disabled(true)
                    }
                    .padding(16)
                    .background(AppTheme.neonRed.opacity(0.04))
                    .clipShape(.rect(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AppTheme.neonRed.opacity(0.2), lineWidth: 1)
                    )
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("What Competition Bucks Are For")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)

                    compUseRow(icon: "shippingbox.fill", text: "Purchasing inventory", color: AppTheme.electricGreen)
                    compUseRow(icon: "cabinet.fill", text: "Buying & deploying machines", color: AppTheme.neonCyan)
                    compUseRow(icon: "bolt.shield.fill", text: "Standard power-ups", color: AppTheme.gold)
                    compUseRow(icon: "arrow.triangle.swap", text: "Relocation fees", color: .orange)
                    compUseRow(icon: "wrench.fill", text: "Repairs & maintenance", color: AppTheme.neonRed)
                }
                .padding(16)
                .neonCardStyle()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
    }

    private func compUseRow(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundStyle(color)
                .frame(width: 20)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(AppTheme.softWhite)
        }
    }

    private var premiumWallet: some View {
        ScrollView {
            VStack(spacing: 18) {
                VStack(spacing: 10) {
                    Text("PREMIUM META-WALLET")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(2)
                        .foregroundStyle(AppTheme.neonCyan.opacity(0.7))

                    Text(viewModel.formatVB(viewModel.player.premiumBucks))
                        .font(.system(size: 36, weight: .bold))
                        .foregroundStyle(AppTheme.neonCyan)
                        .glow(AppTheme.neonCyan, radius: 6)

                    Text("Permanent Balance — Persists Across Seasons")
                        .font(.caption)
                        .foregroundStyle(AppTheme.dimText)

                    HStack(spacing: 4) {
                        Image(systemName: "questionmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.neonCyan)
                        Text("These funds are permanent and persist across all seasons.")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText)
                    }
                    .padding(8)
                    .background(AppTheme.neonCyan.opacity(0.06))
                    .clipShape(.rect(cornerRadius: 8))
                }
                .padding(24)
                .frame(maxWidth: .infinity)
                .neonCardStyle(AppTheme.neonCyan)

                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 6) {
                        Image(systemName: "creditcard.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.neonCyan)
                        Text("Add Funds")
                            .font(.headline)
                            .foregroundStyle(AppTheme.softWhite)
                    }

                    HStack(spacing: 6) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 10))
                        Text("Real-money deposits for competition entry fees and prize withdrawals are processed via Stripe, a licensed payment processor. These are not digital goods.")
                            .font(.system(size: 10))
                    }
                    .foregroundStyle(AppTheme.dimText)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.neonCyan.opacity(0.04))
                    .clipShape(.rect(cornerRadius: 8))

                    HStack(spacing: 8) {
                        quickDepositButton(amount: 5, vb: 5000)
                        quickDepositButton(amount: 10, vb: 10000)
                        quickDepositButton(amount: 25, vb: 25000)
                        quickDepositButton(amount: 50, vb: 50000)
                    }

                    Button {
                        viewModel.depositPremium(10000)
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "creditcard.fill")
                            Text("Deposit via Stripe")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.neonCyan)
                }
                .padding(16)
                .neonCardStyle(AppTheme.neonCyan)

                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 6) {
                        Image(systemName: "applelogo")
                            .font(.caption)
                            .foregroundStyle(AppTheme.softWhite)
                        Text("Digital Goods (Apple In-App Purchase)")
                            .font(.headline)
                            .foregroundStyle(AppTheme.softWhite)
                    }

                    HStack(spacing: 6) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 10))
                        Text("Subscriptions and cosmetic items are digital goods purchased through Apple's In-App Purchase system. These are separate from real-money competition funds.")
                            .font(.system(size: 10))
                    }
                    .foregroundStyle(AppTheme.dimText)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.03))
                    .clipShape(.rect(cornerRadius: 8))

                    premiumPurchaseRow(
                        icon: "eye.fill",
                        title: "Market Insight Subscription",
                        subtitle: "24-hour advance price alerts • Apple IAP",
                        price: "$2.99/mo",
                        color: AppTheme.gold,
                        isActive: viewModel.player.hasMarketInsight
                    )

                    premiumPurchaseRow(
                        icon: "paintpalette.fill",
                        title: "Premium Machine Skins",
                        subtitle: "Exclusive cosmetic designs • Apple IAP",
                        price: "From 500 VB",
                        color: AppTheme.neonCyan,
                        isActive: false
                    )

                    premiumPurchaseRow(
                        icon: "sparkles",
                        title: "Limited Edition Wraps",
                        subtitle: "Time-limited designer wraps • Apple IAP",
                        price: "From 2,000 VB",
                        color: Color.purple,
                        isActive: false
                    )
                }
                .padding(16)
                .neonCardStyle()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
    }

    private func quickDepositButton(amount: Int, vb: Int) -> some View {
        Button {
            viewModel.depositPremium(Double(vb))
        } label: {
            VStack(spacing: 4) {
                Text("$\(amount)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
                Text("\(vb.formatted()) VB")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(AppTheme.neonCyan)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(AppTheme.neonCyan.opacity(0.08))
            .clipShape(.rect(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AppTheme.neonCyan.opacity(0.15), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func premiumPurchaseRow(icon: String, title: String, subtitle: String, price: String, color: Color, isActive: Bool) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(color.opacity(0.1))
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundStyle(color)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }
            Spacer()
            if isActive {
                Text("Active")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(AppTheme.electricGreen)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppTheme.electricGreen.opacity(0.1))
                    .clipShape(Capsule())
            } else {
                Text(price)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(color)
            }
        }
        .padding(12)
        .background(color.opacity(0.04))
        .clipShape(.rect(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.1), lineWidth: 0.5)
        )
    }
}
