import SwiftUI

struct AllianceHubView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab: Int = 0
    @State private var contributionAmount: String = ""
    @State private var showContributeConfirm = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    segBtn(title: "Dashboard", index: 0)
                    segBtn(title: "Members", index: 1)
                    segBtn(title: "Bulk Buy", index: 2)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 4)
                .background(AppTheme.charcoal.opacity(0.8))

                ScrollView {
                    VStack(spacing: 16) {
                        if let alliance = viewModel.alliance {
                            switch selectedTab {
                            case 0: dashboardSection(alliance)
                            case 1: membersSection(alliance)
                            case 2: bulkBuySection(alliance)
                            default: dashboardSection(alliance)
                            }
                        } else {
                            noAllianceView
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 32)
                }
                .scrollIndicators(.hidden)
            }
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "person.3.sequence.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.neonCyan)
                        Text("ALLIANCE")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .alert("Contribute to Treasury", isPresented: $showContributeConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Contribute") {
                    if let amount = Double(contributionAmount) {
                        viewModel.contributeToAlliance(amount)
                    }
                    contributionAmount = ""
                }
            } message: {
                Text("Contribute \(contributionAmount) VB from your Premium Wallet to the Alliance Treasury?")
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private func segBtn(title: String, index: Int) -> some View {
        let isSelected = selectedTab == index
        return Button {
            withAnimation(.snappy) { selectedTab = index }
        } label: {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(isSelected ? AppTheme.neonCyan : Color.clear)
                .clipShape(.rect(cornerRadius: 10))
        }
    }

    private func dashboardSection(_ alliance: Alliance) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.neonCyan.opacity(0.12))
                            .frame(width: 52, height: 52)
                        Image(systemName: "shield.lefthalf.filled.badge.checkmark")
                            .font(.title3)
                            .foregroundStyle(AppTheme.neonCyan)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(alliance.name)
                            .font(.title3.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        Text("Led by \(alliance.leaderName) • \(alliance.members.count) members")
                            .font(.system(size: 11))
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .neonCardStyle(AppTheme.neonCyan)

            HStack(spacing: 10) {
                statCard(title: "Treasury", value: "\(Int(alliance.treasuryBalance)) VB", color: AppTheme.electricGreen, icon: "banknote.fill")
                statCard(title: "Members", value: "\(alliance.members.count)", color: AppTheme.neonCyan, icon: "person.3.fill")
            }

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle.fill")
                        .font(.caption)
                        .foregroundStyle(AppTheme.electricGreen)
                    Text("Contribute to Treasury")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }

                HStack(spacing: 8) {
                    TextField("Amount", text: $contributionAmount)
                        .keyboardType(.numberPad)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.softWhite)
                        .padding(10)
                        .background(Color.white.opacity(0.04))
                        .clipShape(.rect(cornerRadius: 8))

                    Button {
                        showContributeConfirm = true
                    } label: {
                        Text("Contribute")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(AppTheme.electricGreen)
                            .clipShape(.rect(cornerRadius: 8))
                    }
                    .disabled(contributionAmount.isEmpty)
                }

                Text("Contributions come from your Premium Wallet.")
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
            }
            .padding(16)
            .neonCardStyle(AppTheme.electricGreen)
        }
    }

    private func statCard(title: String, value: String, color: Color, icon: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(value)
                .font(.headline.bold())
                .foregroundStyle(AppTheme.softWhite)
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .neonCardStyle(color)
    }

    private func membersSection(_ alliance: Alliance) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Alliance Roster")
                .font(.headline)
                .foregroundStyle(AppTheme.softWhite)

            ForEach(alliance.members) { member in
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill((member.isLeader ? AppTheme.gold : AppTheme.neonCyan).opacity(0.12))
                            .frame(width: 42, height: 42)
                        Text(String(member.playerName.prefix(2)).uppercased())
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(member.isLeader ? AppTheme.gold : AppTheme.neonCyan)
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(member.playerName)
                                .font(.subheadline.bold())
                                .foregroundStyle(AppTheme.softWhite)
                            if member.isLeader {
                                Text("LEADER")
                                    .font(.system(size: 8, weight: .heavy))
                                    .foregroundStyle(AppTheme.gold)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(AppTheme.gold.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                        }
                        Text(member.brandName)
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(Int(member.contribution)) VB")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("contributed")
                            .font(.system(size: 8))
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
                .padding(12)
                .neonCardStyle(member.isLeader ? AppTheme.gold : AppTheme.neonCyan)
            }
        }
    }

    private func bulkBuySection(_ alliance: Alliance) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "cart.fill.badge.plus")
                        .font(.caption)
                        .foregroundStyle(AppTheme.electricGreen)
                    Text("Collaborative Bulk Purchase")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Text("Pool VB from the Alliance Treasury to unlock massive wholesale discounts that individual players can't achieve.")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.dimText)
            }
            .padding(16)
            .neonCardStyle(AppTheme.electricGreen)

            discountTier(title: "Bronze Tier", requirement: "5,000 VB pooled", discount: "5% off wholesale", progress: min(1.0, alliance.treasuryBalance / 5000), color: Color(red: 0.72, green: 0.45, blue: 0.2))
            discountTier(title: "Silver Tier", requirement: "15,000 VB pooled", discount: "10% off wholesale", progress: min(1.0, alliance.treasuryBalance / 15000), color: Color(red: 0.75, green: 0.75, blue: 0.8))
            discountTier(title: "Gold Tier", requirement: "30,000 VB pooled", discount: "18% off wholesale", progress: min(1.0, alliance.treasuryBalance / 30000), color: AppTheme.gold)

            HStack(spacing: 6) {
                Image(systemName: "info.circle")
                    .font(.system(size: 9))
                Text("Discounts apply to all alliance members when purchasing from the Wholesale Market.")
                    .font(.system(size: 10))
            }
            .foregroundStyle(AppTheme.dimText)
        }
    }

    private func discountTier(title: String, requirement: String, discount: String, progress: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(color)
                Spacer()
                Text(discount)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(progress >= 1.0 ? AppTheme.electricGreen : AppTheme.dimText)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background((progress >= 1.0 ? AppTheme.electricGreen : AppTheme.dimText).opacity(0.1))
                    .clipShape(Capsule())
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.06))
                    Capsule()
                        .fill(progress >= 1.0 ? AppTheme.electricGreen : color)
                        .frame(width: geo.size.width * progress)
                }
            }
            .frame(height: 6)

            Text(requirement)
                .font(.system(size: 9))
                .foregroundStyle(AppTheme.dimText)
        }
        .padding(14)
        .neonCardStyle(color)
    }

    private var noAllianceView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.3.sequence.fill")
                .font(.system(size: 40))
                .foregroundStyle(AppTheme.neonCyan.opacity(0.4))

            Text("No Alliance Yet")
                .font(.title3.bold())
                .foregroundStyle(AppTheme.softWhite)

            Text("Create or join an alliance to pool resources, unlock bulk discounts, and dominate the market together.")
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.dimText)
                .multilineTextAlignment(.center)

            HStack(spacing: 12) {
                Button {
                } label: {
                    Text("Create Alliance")
                        .font(.subheadline.bold())
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(AppTheme.neonCyan)
                        .clipShape(.rect(cornerRadius: 12))
                }
                Button {
                } label: {
                    Text("Join Alliance")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.neonCyan)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(AppTheme.neonCyan.opacity(0.1))
                        .clipShape(.rect(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.neonCyan.opacity(0.3), lineWidth: 1))
                }
            }
        }
        .padding(24)
        .neonCardStyle(AppTheme.neonCyan)
    }
}
