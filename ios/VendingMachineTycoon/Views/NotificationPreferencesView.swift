import SwiftUI

struct NotificationPreferencesView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    headerCard

                    ForEach(NotificationCategory.allCases) { category in
                        notificationToggleRow(category)
                    }

                    HStack(spacing: 6) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 9))
                        Text("Critical alerts (account security, season start/end) cannot be disabled.")
                            .font(.system(size: 10))
                    }
                    .foregroundStyle(AppTheme.dimText)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.03))
                    .clipShape(.rect(cornerRadius: 10))
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
                        Image(systemName: "bell.badge.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                        Text("NOTIFICATIONS")
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
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Customize Your Alerts")
                .font(.headline)
                .foregroundStyle(AppTheme.softWhite)
            Text("Control which notifications you receive to prevent alert fatigue.")
                .font(.system(size: 11))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .neonCardStyle(.orange)
    }

    private func notificationToggleRow(_ category: NotificationCategory) -> some View {
        let isEnabled = viewModel.notificationPreferences[category] ?? true
        let color = categoryColor(category)

        return HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(color.opacity(0.1))
                    .frame(width: 40, height: 40)
                Image(systemName: category.icon)
                    .font(.system(size: 15))
                    .foregroundStyle(color)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(category.rawValue)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(category.description)
                    .font(.system(size: 10))
                    .foregroundStyle(AppTheme.dimText)
                    .lineLimit(2)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { viewModel.notificationPreferences[category] ?? true },
                set: { viewModel.notificationPreferences[category] = $0 }
            ))
            .labelsHidden()
            .tint(color)
        }
        .padding(14)
        .neonCardStyle(isEnabled ? color : AppTheme.dimText)
    }

    private func categoryColor(_ category: NotificationCategory) -> Color {
        switch category {
        case .market: AppTheme.electricGreen
        case .turf: AppTheme.neonRed
        case .logistics: AppTheme.neonCyan
        case .social: AppTheme.electricBlue
        case .financial: AppTheme.gold
        }
    }
}
