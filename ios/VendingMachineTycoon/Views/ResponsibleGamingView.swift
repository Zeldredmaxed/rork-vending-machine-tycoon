import SwiftUI

struct ResponsibleGamingView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var dailyLimit: String = ""
    @State private var weeklyLimit: String = ""
    @State private var showExclusionConfirm = false
    @State private var selectedExclusion: SelfExclusionPeriod = .oneDay
    @State private var limitsUpdated = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    headerCard
                    spendingLimitsSection
                    selfExclusionSection
                    resourcesSection
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
                        Image(systemName: "heart.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                        Text("RESPONSIBLE GAMING")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .toolbarBackground(AppTheme.charcoal.opacity(0.95), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .alert("Self-Exclusion", isPresented: $showExclusionConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Lock Account", role: .destructive) {}
            } message: {
                Text("Your account will be locked for \(selectedExclusion.rawValue). This action CANNOT be undone by customer support. Are you certain?")
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(Color.orange.opacity(0.1))
                        .frame(width: 48, height: 48)
                    Image(systemName: "heart.text.square.fill")
                        .font(.title3)
                        .foregroundStyle(.orange)
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text("Play Responsibly")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                    Text("Set limits and take control of your gaming experience.")
                        .font(.system(size: 11))
                        .foregroundStyle(AppTheme.dimText)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            LinearGradient(
                colors: [Color.orange.opacity(0.06), AppTheme.cardBackground],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.orange.opacity(0.2), lineWidth: 1))
    }

    private var spendingLimitsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "dollarsign.arrow.circlepath")
                    .font(.caption)
                    .foregroundStyle(AppTheme.electricGreen)
                Text("Spending Limits")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                contextHelp("Once set, limits cannot be increased for 7 days. They can be lowered at any time.")
            }

            limitField(label: "DAILY DEPOSIT LIMIT", placeholder: "e.g. 50", text: $dailyLimit)
            limitField(label: "WEEKLY DEPOSIT LIMIT", placeholder: "e.g. 200", text: $weeklyLimit)

            if !viewModel.spendingLimits.canIncreaseLimit {
                HStack(spacing: 6) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 9))
                    Text("Limits locked. Can be increased after 7 days from last change.")
                        .font(.system(size: 10))
                }
                .foregroundStyle(AppTheme.neonRed)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppTheme.neonRed.opacity(0.06))
                .clipShape(.rect(cornerRadius: 8))
            }

            Button {
                viewModel.spendingLimits.dailyLimit = Double(dailyLimit)
                viewModel.spendingLimits.weeklyLimit = Double(weeklyLimit)
                viewModel.spendingLimits.lastModified = Date()
                limitsUpdated = true
            } label: {
                Text(limitsUpdated ? "Limits Updated" : "Save Limits")
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(limitsUpdated ? AppTheme.electricGreen.opacity(0.5) : AppTheme.electricGreen)
                    .clipShape(.rect(cornerRadius: 12))
            }
            .disabled(limitsUpdated)
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
    }

    private func limitField(label: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 9, weight: .heavy))
                .tracking(1)
                .foregroundStyle(AppTheme.dimText)
            HStack(spacing: 6) {
                Text("$")
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.electricGreen)
                TextField(placeholder, text: text)
                    .keyboardType(.decimalPad)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.softWhite)
            }
            .padding(10)
            .background(Color.white.opacity(0.04))
            .clipShape(.rect(cornerRadius: 8))
        }
    }

    private var selfExclusionSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "hand.raised.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonRed)
                Text("Self-Exclusion / Cool-Down")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            Text("Lock your account for a set period. During this time, you will be unable to deposit, play, or access competitive features.")
                .font(.system(size: 11))
                .foregroundStyle(AppTheme.dimText)

            ForEach(SelfExclusionPeriod.allCases) { period in
                Button {
                    selectedExclusion = period
                    showExclusionConfirm = true
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "lock.circle.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(AppTheme.neonRed)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Lock for \(period.rawValue)")
                                .font(.subheadline.bold())
                                .foregroundStyle(AppTheme.softWhite)
                            Text("Cannot be undone by support")
                                .font(.system(size: 9))
                                .foregroundStyle(AppTheme.neonRed.opacity(0.7))
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                            .foregroundStyle(AppTheme.dimText)
                    }
                    .padding(12)
                    .background(AppTheme.neonRed.opacity(0.04))
                    .clipShape(.rect(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.neonRed.opacity(0.15), lineWidth: 0.5))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.neonRed.opacity(0.03), AppTheme.cardBackground],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppTheme.neonRed.opacity(0.15), lineWidth: 1))
    }

    private var resourcesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "phone.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Support Resources")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }
            resourceLink(title: "National Council on Problem Gambling", subtitle: "1-800-522-4700", icon: "phone.circle.fill")
            resourceLink(title: "Gamblers Anonymous", subtitle: "www.gamblersanonymous.org", icon: "globe")
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
    }

    private func resourceLink(title: String, subtitle: String, icon: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(AppTheme.neonCyan)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AppTheme.softWhite)
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundStyle(AppTheme.neonCyan)
            }
            Spacer()
        }
        .padding(10)
        .background(AppTheme.neonCyan.opacity(0.04))
        .clipShape(.rect(cornerRadius: 10))
    }

    private func contextHelp(_ text: String) -> some View {
        Image(systemName: "questionmark.circle")
            .font(.system(size: 12))
            .foregroundStyle(AppTheme.dimText)
            .help(text)
    }
}
