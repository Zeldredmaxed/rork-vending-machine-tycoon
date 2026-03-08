import SwiftUI

struct ReferralHubView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var animateIn = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    referralCodeCard
                    rewardsOverview
                    referralList
                    franchiseTiers
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Referral Hub")
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

    private var referralCodeCard: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(AppTheme.neonCyan.opacity(0.08))
                    .frame(width: 80, height: 80)
                Circle()
                    .stroke(AppTheme.neonCyan.opacity(0.3), lineWidth: 2)
                    .frame(width: 80, height: 80)
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 32))
                    .foregroundStyle(AppTheme.neonCyan)
            }

            VStack(spacing: 6) {
                Text("Your Referral Code")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.dimText)
                Text("VENDKING-7X2K")
                    .font(.system(size: 22, weight: .heavy, design: .monospaced))
                    .foregroundStyle(AppTheme.neonCyan)
                    .glow(AppTheme.neonCyan, radius: 4)
            }

            Text("Both you and your friend earn 2,000 VB + Protection Shield + cosmetic skin!")
                .font(.caption)
                .foregroundStyle(AppTheme.dimText)
                .multilineTextAlignment(.center)

            Button {} label: {
                HStack(spacing: 8) {
                    Image(systemName: "square.and.arrow.up")
                    Text("Share Referral Link")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.neonCyan)
        }
        .padding(20)
        .neonCardStyle(AppTheme.neonCyan)
        .opacity(animateIn ? 1 : 0)
    }

    private var rewardsOverview: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "gift.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("Starter Pack Rewards")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            HStack(spacing: 10) {
                rewardCard(icon: "dollarsign.circle.fill", title: "2,000 VB", subtitle: "Bonus Bucks", color: AppTheme.electricGreen)
                rewardCard(icon: "shield.checkered", title: "7-Day Shield", subtitle: "Protection", color: AppTheme.neonCyan)
                rewardCard(icon: "paintpalette.fill", title: "Cosmetic", subtitle: "Exclusive Skin", color: AppTheme.gold)
            }

            let progress = min(Double(viewModel.player.referralCount) / 5.0, 1.0)
            VStack(spacing: 8) {
                HStack {
                    Text("Tier Bonus: 5 referrals")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    Spacer()
                    Text("\(viewModel.player.referralCount)/5")
                        .font(.subheadline.bold())
                        .foregroundStyle(viewModel.player.referralCount >= 5 ? AppTheme.electricGreen : AppTheme.gold)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.white.opacity(0.06))
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [AppTheme.gold, AppTheme.electricGreen],
                                    startPoint: .leading, endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * progress)
                    }
                }
                .frame(height: 8)

                if viewModel.player.referralCount >= 5 {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("Unlocked: 10% discount on all power-ups next season!")
                            .font(.caption.bold())
                            .foregroundStyle(AppTheme.electricGreen)
                    }
                } else {
                    Text("Refer \(5 - viewModel.player.referralCount) more to unlock 10% power-up discount next season")
                        .font(.caption)
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            .padding(14)
            .background(AppTheme.gold.opacity(0.04))
            .clipShape(.rect(cornerRadius: 12))
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 15)
    }

    private func rewardCard(icon: String, title: String, subtitle: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
            Text(subtitle)
                .font(.system(size: 9))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(color.opacity(0.06))
        .clipShape(.rect(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.1), lineWidth: 0.5)
        )
    }

    private var referralList: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "person.2.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Your Referrals")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text("\(SampleData.referrals.count) total")
                    .font(.caption.bold())
                    .foregroundStyle(AppTheme.dimText)
            }

            ForEach(SampleData.referrals) { referral in
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(referralStatusColor(referral.status).opacity(0.1))
                            .frame(width: 36, height: 36)
                        Image(systemName: referral.status.icon)
                            .font(.system(size: 13))
                            .foregroundStyle(referralStatusColor(referral.status))
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(referral.playerName)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        Text("Joined \(referral.joinDate, style: .relative) ago")
                            .font(.caption)
                            .foregroundStyle(AppTheme.dimText)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 3) {
                        Text(referral.status.rawValue)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(referralStatusColor(referral.status))
                        if referral.rewardClaimed {
                            Text("Reward claimed")
                                .font(.system(size: 9))
                                .foregroundStyle(AppTheme.electricGreen)
                        }
                    }
                }
                .padding(10)
                .background(AppTheme.cardBackground)
                .clipShape(.rect(cornerRadius: 12))
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 15)
    }

    private var franchiseTiers: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "medal.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("Franchise Tiers")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            let tiers: [(String, String, String, Int, Bool)] = [
                ("Starter", "Deploy 3+ machines", "star.fill", 3, viewModel.machines.count >= 3),
                ("Builder", "Deploy 5+ machines", "star.circle.fill", 5, viewModel.machines.count >= 5),
                ("Franchise", "Deploy 10+ machines", "crown.fill", 10, viewModel.machines.count >= 10),
                ("Empire", "Deploy 20+ machines", "building.2.crop.circle.fill", 20, false),
            ]

            ForEach(tiers, id: \.0) { tier in
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill((tier.4 ? AppTheme.gold : AppTheme.dimText).opacity(0.1))
                            .frame(width: 36, height: 36)
                        Image(systemName: tier.2)
                            .font(.system(size: 14))
                            .foregroundStyle(tier.4 ? AppTheme.gold : AppTheme.dimText)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(tier.0)
                            .font(.subheadline.bold())
                            .foregroundStyle(tier.4 ? AppTheme.softWhite : AppTheme.dimText)
                        Text(tier.1)
                            .font(.caption)
                            .foregroundStyle(AppTheme.dimText)
                    }
                    Spacer()
                    if tier.4 {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(AppTheme.electricGreen)
                    } else {
                        Text("\(viewModel.machines.count)/\(tier.3)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
                .padding(10)
                .background(tier.4 ? AppTheme.gold.opacity(0.04) : AppTheme.cardBackground)
                .clipShape(.rect(cornerRadius: 12))
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
        .opacity(animateIn ? 1 : 0)
    }

    private func referralStatusColor(_ status: ReferralStatus) -> Color {
        switch status {
        case .pending: AppTheme.gold
        case .active: AppTheme.neonCyan
        case .completed: AppTheme.electricGreen
        }
    }
}
