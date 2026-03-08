import SwiftUI

struct SettingsView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showReputationHistory = false
    @State private var showResponsibleGaming = false
    @State private var showNotificationPrefs = false
    @State private var showDisputeCenter = false
    @State private var showCashOut = false
    @State private var showAccountDeletion = false
    @State private var showDataExportConfirm = false
    @State private var showLocationPrivacy = false
    @State private var trackingEnabled = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    accountSection
                    reputationSection
                    financialSection
                    preferencesSection
                    privacySection
                    supportSection
                    dangerZone
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showReputationHistory) {
                ReputationHistorySheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showResponsibleGaming) {
                ResponsibleGamingView(viewModel: viewModel)
            }
            .sheet(isPresented: $showNotificationPrefs) {
                NotificationPreferencesView(viewModel: viewModel)
            }
            .sheet(isPresented: $showDisputeCenter) {
                DisputeResolutionView(viewModel: viewModel)
            }
            .sheet(isPresented: $showCashOut) {
                CashOutView(viewModel: viewModel)
            }
            .sheet(isPresented: $showAccountDeletion) {
                AccountDeletionView(viewModel: viewModel)
            }
            .alert("Export Your Data", isPresented: $showDataExportConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Request Export") {}
            } message: {
                Text("We will compile all your personal data and send a download link to your registered email within 48 hours. This includes account info, transaction history, and game activity.")
            }
            .sheet(isPresented: $showLocationPrivacy) {
                LocationPrivacySheet()
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(icon: "person.crop.circle.fill", title: "Account", color: AppTheme.neonCyan)

            settingsRow(icon: "person.fill", title: "Edit Profile", subtitle: viewModel.player.name, color: AppTheme.neonCyan)
            settingsRow(icon: "envelope.fill", title: "Email", subtitle: "player@example.com", color: AppTheme.neonCyan)
            settingsRow(icon: "checkmark.seal.fill", title: "KYC Status", subtitle: "Verified", color: AppTheme.electricGreen)
            settingsRow(icon: "mappin.and.ellipse", title: "Region", subtitle: "New York, USA", color: AppTheme.gold)
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
    }

    private var reputationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(icon: "star.fill", title: "Reputation", color: AppTheme.gold)

            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(AppTheme.gold.opacity(0.1))
                        .frame(width: 56, height: 56)
                    Circle()
                        .stroke(AppTheme.gold.opacity(0.3), lineWidth: 2)
                        .frame(width: 56, height: 56)
                    Text(String(format: "%.1f", viewModel.player.reputation))
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.gold)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Overall Reputation Score")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    Text("Based on maintenance, pricing, and customer feedback")
                        .font(.caption)
                        .foregroundStyle(AppTheme.dimText)
                }
            }

            HStack(spacing: 8) {
                reputationMiniStat(label: "Gained", value: "+17", color: AppTheme.electricGreen)
                reputationMiniStat(label: "Lost", value: "-9", color: AppTheme.neonRed)
                reputationMiniStat(label: "Net", value: "+8", color: AppTheme.gold)
            }

            Button {
                showReputationHistory = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 12))
                    Text("View Reputation History")
                        .font(.subheadline.bold())
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
            .buttonStyle(.bordered)
            .tint(AppTheme.gold)
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
    }

    private func reputationMiniStat(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.headline.bold())
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(color.opacity(0.06))
        .clipShape(.rect(cornerRadius: 10))
    }

    private var financialSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(icon: "banknote.fill", title: "Financial", color: AppTheme.electricGreen)

            Button { showCashOut = true } label: {
                settingsRowContent(icon: "arrow.up.circle.fill", title: "Cash Out & Withdrawals", subtitle: "Transaction ledger, withdraw funds", color: AppTheme.electricGreen)
            }
            .buttonStyle(.plain)

            Button { showDisputeCenter = true } label: {
                settingsRowContent(icon: "exclamationmark.bubble.fill", title: "Disputes & Claims", subtitle: "\(viewModel.disputeTickets.filter { $0.status != .resolved }.count) open tickets", color: AppTheme.gold)
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
    }

    private var preferencesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(icon: "gearshape.fill", title: "Preferences", color: AppTheme.dimText)

            Button { showNotificationPrefs = true } label: {
                settingsRowContent(icon: "bell.badge.fill", title: "Notification Preferences", subtitle: "Customize alert categories", color: .orange)
            }
            .buttonStyle(.plain)

            settingsRow(icon: "speaker.wave.2.fill", title: "Sound Effects", subtitle: "On", color: AppTheme.neonCyan)
            settingsRow(icon: "hand.tap.fill", title: "Haptic Feedback", subtitle: "On", color: AppTheme.electricGreen)
        }
        .padding(16)
        .neonCardStyle()
    }

    private var privacySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(icon: "hand.raised.fill", title: "Privacy & Data", color: AppTheme.neonCyan)

            Button { showDataExportConfirm = true } label: {
                settingsRowContent(icon: "arrow.down.doc.fill", title: "Request Data Export", subtitle: "Download all your personal data (GDPR/CCPA)", color: AppTheme.neonCyan)
            }
            .buttonStyle(.plain)

            Button { showLocationPrivacy = true } label: {
                settingsRowContent(icon: "location.circle.fill", title: "Location Privacy Center", subtitle: "GPS data purged after 30 days", color: AppTheme.electricGreen)
            }
            .buttonStyle(.plain)

            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.orange.opacity(0.1))
                        .frame(width: 32, height: 32)
                    Image(systemName: "eye.tracking.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(.orange)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Cookie & Tracking")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.softWhite)
                    Text("Analytics & personalized ads")
                        .font(.system(size: 10))
                        .foregroundStyle(AppTheme.dimText)
                }
                Spacer()
                Toggle("", isOn: $trackingEnabled)
                    .labelsHidden()
                    .tint(.orange)
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
    }

    private var supportSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(icon: "questionmark.circle.fill", title: "Support & Compliance", color: AppTheme.neonCyan)

            settingsRow(icon: "book.fill", title: "How to Play", subtitle: "Game tutorial", color: AppTheme.neonCyan)
            settingsRow(icon: "bubble.left.fill", title: "Contact Support", subtitle: "Get help", color: AppTheme.electricGreen)

            Button { showResponsibleGaming = true } label: {
                settingsRowContent(icon: "heart.text.square.fill", title: "Responsible Gaming", subtitle: "Set spending limits & self-exclusion", color: .orange)
            }
            .buttonStyle(.plain)

            settingsRow(icon: "doc.text.fill", title: "Terms of Service", subtitle: "", color: AppTheme.dimText)
            settingsRow(icon: "hand.raised.fill", title: "Privacy Policy", subtitle: "", color: AppTheme.dimText)
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
    }

    private var dangerZone: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader(icon: "exclamationmark.triangle.fill", title: "Account Actions", color: AppTheme.neonRed)

            Button {} label: {
                HStack(spacing: 8) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 14))
                    Text("Sign Out")
                        .font(.subheadline.bold())
                }
                .foregroundStyle(AppTheme.neonRed)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(AppTheme.neonRed.opacity(0.06))
                .clipShape(.rect(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppTheme.neonRed.opacity(0.15), lineWidth: 0.5)
                )
            }

            Button { showAccountDeletion = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: "trash.fill")
                        .font(.system(size: 14))
                    Text("Delete Account & Data")
                        .font(.subheadline.bold())
                }
                .foregroundStyle(AppTheme.neonRed)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(AppTheme.neonRed.opacity(0.06))
                .clipShape(.rect(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppTheme.neonRed.opacity(0.15), lineWidth: 0.5)
                )
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonRed)
    }

    private func sectionHeader(icon: String, title: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(color)
            Text(title)
                .font(.headline)
                .foregroundStyle(AppTheme.softWhite)
        }
    }

    private func settingsRow(icon: String, title: String, subtitle: String, color: Color) -> some View {
        settingsRowContent(icon: icon, title: title, subtitle: subtitle, color: color)
    }

    private func settingsRowContent(icon: String, title: String, subtitle: String, color: Color) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(color.opacity(0.1))
                    .frame(width: 32, height: 32)
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundStyle(color)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.softWhite)
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 10))
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 10))
                .foregroundStyle(AppTheme.dimText)
        }
    }
}

struct LocationPrivacySheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: "location.circle.fill")
                                .font(.title3)
                                .foregroundStyle(AppTheme.electricGreen)
                            Text("Location Data Policy")
                                .font(.headline)
                                .foregroundStyle(AppTheme.softWhite)
                        }
                        Text("We take your location privacy seriously. Here's how we handle your GPS data.")
                            .font(.system(size: 12))
                            .foregroundStyle(AppTheme.dimText)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .neonCardStyle(AppTheme.electricGreen)

                    privacyDetailRow(icon: "mappin.and.ellipse", title: "Machine Placement", detail: "GPS coordinates are recorded only when you place or relocate a vending machine.")
                    privacyDetailRow(icon: "clock.arrow.circlepath", title: "30-Day Auto-Purge", detail: "All raw GPS location data is automatically purged from our servers after 30 days. Only anonymized zone data is retained.")
                    privacyDetailRow(icon: "eye.slash.fill", title: "No Background Tracking", detail: "We never track your location in the background. GPS is only accessed when you actively place a machine.")
                    privacyDetailRow(icon: "lock.shield.fill", title: "Encrypted Storage", detail: "Location data is encrypted at rest and in transit using AES-256 encryption.")
                    privacyDetailRow(icon: "person.crop.circle.badge.xmark", title: "Right to Erasure", detail: "You can request immediate deletion of all location data via the Data Export option in Settings.")
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Location Privacy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private func privacyDetailRow(icon: String, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(AppTheme.neonCyan.opacity(0.1))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.neonCyan)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(detail)
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.dimText)
            }
        }
        .padding(14)
        .neonCardStyle(AppTheme.neonCyan)
    }
}

struct ReputationHistorySheet: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    ForEach(SampleData.reputationHistory) { event in
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill((event.isPositive ? AppTheme.electricGreen : AppTheme.neonRed).opacity(0.1))
                                    .frame(width: 36, height: 36)
                                Image(systemName: event.iconName)
                                    .font(.system(size: 13))
                                    .foregroundStyle(event.isPositive ? AppTheme.electricGreen : AppTheme.neonRed)
                            }

                            VStack(alignment: .leading, spacing: 3) {
                                Text(event.title)
                                    .font(.subheadline.bold())
                                    .foregroundStyle(AppTheme.softWhite)
                                Text(event.timestamp, style: .relative)
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.dimText)
                            }

                            Spacer()

                            Text(event.isPositive ? "+\(Int(event.points))" : "\(Int(event.points))")
                                .font(.subheadline.bold())
                                .foregroundStyle(event.isPositive ? AppTheme.electricGreen : AppTheme.neonRed)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background((event.isPositive ? AppTheme.electricGreen : AppTheme.neonRed).opacity(0.1))
                                .clipShape(Capsule())
                        }
                        .padding(12)
                        .neonCardStyle(event.isPositive ? AppTheme.electricGreen : AppTheme.neonRed)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Reputation History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }
}
