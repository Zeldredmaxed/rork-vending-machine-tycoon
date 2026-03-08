import SwiftUI

struct AccountDeletionView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var confirmChecked = false
    @State private var showFinalConfirm = false
    @State private var isProcessing = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    warningHeader
                    consequencesCard
                    payoutCard
                    confirmationSection
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
                        Image(systemName: "trash.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.neonRed)
                        Text("DELETE ACCOUNT")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .alert("Permanent Account Deletion", isPresented: $showFinalConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Delete Everything", role: .destructive) {
                    isProcessing = true
                }
            } message: {
                Text("This will permanently delete all your data, forfeit any active season funds, and attempt a final payout of your Premium Wallet balance. This action cannot be reversed.")
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var warningHeader: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(AppTheme.neonRed.opacity(0.1))
                    .frame(width: 64, height: 64)
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title)
                    .foregroundStyle(AppTheme.neonRed)
                    .symbolEffect(.pulse, options: .repeating)
            }

            Text("Delete Account & All Data")
                .font(.title3.bold())
                .foregroundStyle(AppTheme.softWhite)

            Text("This action is permanent and irreversible. All your game data, progress, and history will be permanently erased in compliance with GDPR and CCPA regulations.")
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.dimText)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(AppTheme.neonRed.opacity(0.03))
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppTheme.neonRed.opacity(0.2), lineWidth: 1))
    }

    private var consequencesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "list.bullet.circle.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonRed)
                Text("What Will Be Deleted")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            consequenceRow(icon: "dollarsign.circle.fill", text: "Competition Wallet balance (\(viewModel.formatVB(viewModel.player.competitionBucks)))", color: AppTheme.neonRed)
            consequenceRow(icon: "cabinet.fill", text: "All \(viewModel.machines.count) vending machines and inventory", color: AppTheme.neonRed)
            consequenceRow(icon: "person.3.fill", text: "All employees and HR records", color: AppTheme.neonRed)
            consequenceRow(icon: "trophy.fill", text: "Leaderboard rankings and Tycoon Score", color: AppTheme.neonRed)
            consequenceRow(icon: "paintbrush.fill", text: "Brand identity and cosmetics", color: AppTheme.neonRed)
            consequenceRow(icon: "shield.fill", text: "ELO rating and season history", color: AppTheme.neonRed)
            consequenceRow(icon: "person.crop.circle.fill", text: "Account credentials and profile", color: AppTheme.neonRed)
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonRed)
    }

    private func consequenceRow(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(color)
                .frame(width: 20)
            Text(text)
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.dimText)
        }
    }

    private var payoutCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "banknote.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.electricGreen)
                Text("Final Payout Attempt")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            Text("Before deletion, the system will attempt to transfer your Premium Wallet balance to your linked bank account via Stripe.")
                .font(.system(size: 11))
                .foregroundStyle(AppTheme.dimText)

            HStack {
                Text("Premium Wallet Balance")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.dimText)
                Spacer()
                Text(viewModel.formatVB(viewModel.player.premiumBucks))
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.electricGreen)
            }
            .padding(12)
            .background(AppTheme.electricGreen.opacity(0.04))
            .clipShape(.rect(cornerRadius: 10))

            HStack(spacing: 6) {
                Image(systemName: "exclamationmark.circle")
                    .font(.system(size: 9))
                Text("Funds locked in an active Competition season will be forfeited.")
                    .font(.system(size: 10))
            }
            .foregroundStyle(AppTheme.neonRed)
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
    }

    private var confirmationSection: some View {
        VStack(spacing: 14) {
            Button {
                confirmChecked.toggle()
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: confirmChecked ? "checkmark.square.fill" : "square")
                        .font(.title3)
                        .foregroundStyle(confirmChecked ? AppTheme.neonRed : AppTheme.dimText)

                    Text("I understand that this will permanently delete my account, forfeit all funds in my active Competition Wallet, and that this action cannot be undone.")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.softWhite)
                        .multilineTextAlignment(.leading)
                }
            }
            .buttonStyle(.plain)

            Button {
                showFinalConfirm = true
            } label: {
                HStack(spacing: 8) {
                    if isProcessing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "trash.fill")
                            .font(.system(size: 14))
                        Text("Permanently Delete Account")
                            .font(.subheadline.bold())
                    }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(confirmChecked ? AppTheme.neonRed : AppTheme.neonRed.opacity(0.3))
                .clipShape(.rect(cornerRadius: 14))
            }
            .disabled(!confirmChecked || isProcessing)
        }
        .padding(16)
        .background(AppTheme.neonRed.opacity(0.02))
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppTheme.neonRed.opacity(0.1), lineWidth: 1))
    }
}
