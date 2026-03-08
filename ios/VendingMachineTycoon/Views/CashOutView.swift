import SwiftUI

struct CashOutView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab: Int = 0
    @State private var withdrawAmount: String = ""
    @State private var showWithdrawConfirm = false
    @State private var showTaxDocs = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                segmentedControl
                ScrollView {
                    VStack(spacing: 16) {
                        switch selectedTab {
                        case 0: ledgerSection
                        case 1: withdrawSection
                        case 2: taxSection
                        default: ledgerSection
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
                        Image(systemName: "banknote.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("CASH OUT")
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
            .alert("Confirm Withdrawal", isPresented: $showWithdrawConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Withdraw") {
                    if let amount = Double(withdrawAmount), amount > 0 {
                        viewModel.player.premiumBucks -= min(amount, viewModel.player.premiumBucks)
                    }
                    withdrawAmount = ""
                }
            } message: {
                Text("Transfer $\(withdrawAmount) to your linked bank account? This may take 3-5 business days.")
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var segmentedControl: some View {
        HStack(spacing: 0) {
            segmentButton(title: "Ledger", icon: "list.bullet.rectangle.fill", index: 0)
            segmentButton(title: "Withdraw", icon: "arrow.up.circle.fill", index: 1)
            segmentButton(title: "Tax Docs", icon: "doc.text.fill", index: 2)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(AppTheme.charcoal.opacity(0.8))
    }

    private func segmentButton(title: String, icon: String, index: Int) -> some View {
        let isSelected = selectedTab == index
        return Button {
            withAnimation(.snappy) { selectedTab = index }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                Text(title)
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(isSelected ? AppTheme.electricGreen : Color.clear)
            .clipShape(.rect(cornerRadius: 10))
        }
    }

    // MARK: - Ledger

    private var ledgerSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            balanceSummaryCard

            HStack(spacing: 6) {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Transaction History")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            ForEach(viewModel.transactionHistory.sorted(by: { $0.timestamp > $1.timestamp })) { tx in
                transactionRow(tx)
            }
        }
    }

    private var balanceSummaryCard: some View {
        HStack(spacing: 12) {
            balancePill(title: "Competition", value: viewModel.formatVB(viewModel.player.competitionBucks), color: AppTheme.electricGreen, icon: "dollarsign.circle.fill")
            balancePill(title: "Premium", value: viewModel.formatVB(viewModel.player.premiumBucks), color: AppTheme.neonCyan, icon: "diamond.fill")
        }
    }

    private func balancePill(title: String, value: String, color: Color, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                Text(title.uppercased())
                    .font(.system(size: 8, weight: .heavy))
                    .tracking(0.5)
            }
            .foregroundStyle(color.opacity(0.7))
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(color.opacity(0.05))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(color.opacity(0.15), lineWidth: 1))
    }

    private func transactionRow(_ tx: TransactionRecord) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill((tx.type.isPositive ? AppTheme.electricGreen : AppTheme.neonRed).opacity(0.1))
                    .frame(width: 36, height: 36)
                Image(systemName: tx.type.icon)
                    .font(.system(size: 13))
                    .foregroundStyle(tx.type.isPositive ? AppTheme.electricGreen : AppTheme.neonRed)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(tx.description)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AppTheme.softWhite)
                    .lineLimit(1)
                HStack(spacing: 6) {
                    Text(tx.type.rawValue)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(AppTheme.dimText)
                    Text("•")
                        .foregroundStyle(AppTheme.dimText)
                    Text(tx.timestamp, style: .relative)
                        .font(.system(size: 9))
                        .foregroundStyle(AppTheme.dimText)
                }
            }

            Spacer()

            Text("\(tx.type.isPositive ? "+" : "-")$\(String(format: "%.2f", tx.amount))")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(tx.type.isPositive ? AppTheme.electricGreen : AppTheme.neonRed)
        }
        .padding(12)
        .neonCardStyle(tx.type.isPositive ? AppTheme.electricGreen : AppTheme.neonRed)
    }

    // MARK: - Withdraw

    private var withdrawSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Withdrawable Balance")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                Text(viewModel.formatCurrency(viewModel.player.premiumBucks))
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(AppTheme.electricGreen)
                Text("From Premium Meta-Wallet")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.dimText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .neonCardStyle(AppTheme.electricGreen)

            VStack(alignment: .leading, spacing: 12) {
                Text("Withdraw Funds")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)

                HStack(spacing: 8) {
                    Text("$")
                        .font(.title2.bold())
                        .foregroundStyle(AppTheme.electricGreen)
                    TextField("0.00", text: $withdrawAmount)
                        .keyboardType(.decimalPad)
                        .font(.title2.bold())
                        .foregroundStyle(AppTheme.softWhite)
                }
                .padding(14)
                .background(Color.white.opacity(0.04))
                .clipShape(.rect(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.electricGreen.opacity(0.2), lineWidth: 1))

                HStack(spacing: 8) {
                    quickAmountButton("$100", amount: 100)
                    quickAmountButton("$500", amount: 500)
                    quickAmountButton("$1,000", amount: 1000)
                    quickAmountButton("Max", amount: viewModel.player.premiumBucks)
                }

                Button {
                    showWithdrawConfirm = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "building.columns.fill")
                            .font(.system(size: 14))
                        Text("Transfer to Bank via Stripe")
                            .font(.subheadline.bold())
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppTheme.electricGreen)
                    .clipShape(.rect(cornerRadius: 14))
                }
                .disabled(Double(withdrawAmount) ?? 0 <= 0)
                .opacity((Double(withdrawAmount) ?? 0) > 0 ? 1 : 0.5)

                HStack(spacing: 6) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 9))
                    Text("Transfers processed securely via Stripe. 3-5 business days.")
                        .font(.system(size: 10))
                }
                .foregroundStyle(AppTheme.dimText)
            }
            .padding(16)
            .neonCardStyle(AppTheme.neonCyan)
        }
    }

    private func quickAmountButton(_ label: String, amount: Double) -> some View {
        Button {
            withdrawAmount = String(format: "%.0f", amount)
        } label: {
            Text(label)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(AppTheme.neonCyan)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(AppTheme.neonCyan.opacity(0.08))
                .clipShape(.rect(cornerRadius: 8))
        }
    }

    // MARK: - Tax

    private var taxSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "doc.text.fill")
                    .font(.title3)
                    .foregroundStyle(AppTheme.gold)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tax Compliance")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                    Text("Required for US players earning real-money prizes")
                        .font(.system(size: 11))
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .neonCardStyle(AppTheme.gold)

            taxDocRow(title: "1099-MISC (2024)", subtitle: "Prize earnings: $4,812.00", status: "Available", statusColor: AppTheme.electricGreen)
            taxDocRow(title: "1099-MISC (2023)", subtitle: "Prize earnings: $2,350.00", status: "Filed", statusColor: AppTheme.dimText)
            taxDocRow(title: "W-9 Form", subtitle: "Taxpayer identification", status: "On File", statusColor: AppTheme.electricGreen)

            HStack(spacing: 6) {
                Image(systemName: "info.circle")
                    .font(.system(size: 10))
                Text("Tax documents are generated annually for earnings over $600. Consult a tax professional for guidance.")
                    .font(.system(size: 10))
            }
            .foregroundStyle(AppTheme.dimText)
            .padding(12)
            .background(Color.white.opacity(0.03))
            .clipShape(.rect(cornerRadius: 10))
        }
    }

    private func taxDocRow(title: String, subtitle: String, status: String, statusColor: Color) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(AppTheme.gold.opacity(0.08))
                    .frame(width: 40, height: 40)
                Image(systemName: "doc.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(AppTheme.gold)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundStyle(AppTheme.dimText)
            }
            Spacer()
            Text(status)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(statusColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(statusColor.opacity(0.1))
                .clipShape(Capsule())
            Image(systemName: "arrow.down.circle.fill")
                .font(.system(size: 16))
                .foregroundStyle(AppTheme.neonCyan)
        }
        .padding(14)
        .neonCardStyle(AppTheme.gold)
    }
}
