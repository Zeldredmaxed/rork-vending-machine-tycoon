import SwiftUI

struct DisputeResolutionView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab: Int = 0
    @State private var showNewTicket = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    segBtn(title: "Open", index: 0)
                    segBtn(title: "Resolved", index: 1)
                    segBtn(title: "New Ticket", index: 2)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 4)
                .background(AppTheme.charcoal.opacity(0.8))

                ScrollView {
                    VStack(spacing: 14) {
                        if selectedTab == 2 {
                            NewDisputeForm(viewModel: viewModel, onSubmit: { selectedTab = 0 })
                        } else {
                            let tickets = selectedTab == 0
                                ? viewModel.disputeTickets.filter { $0.status != .resolved }
                                : viewModel.disputeTickets.filter { $0.status == .resolved }

                            if tickets.isEmpty {
                                emptyState
                            } else {
                                ForEach(tickets) { ticket in
                                    disputeCard(ticket)
                                }
                            }
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
                        Image(systemName: "exclamationmark.bubble.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.gold)
                        Text("DISPUTES")
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
                .background(isSelected ? AppTheme.gold : Color.clear)
                .clipShape(.rect(cornerRadius: 10))
        }
    }

    private func disputeCard(_ ticket: DisputeTicket) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: ticket.category.icon)
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.gold)
                    Text(ticket.category.rawValue)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                statusBadge(ticket.status)
            }

            Text(ticket.description)
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.dimText)
                .lineLimit(3)

            HStack(spacing: 12) {
                if let machineId = ticket.machineId {
                    HStack(spacing: 3) {
                        Image(systemName: "cabinet.fill")
                            .font(.system(size: 8))
                        Text("Machine: \(machineId)")
                            .font(.system(size: 9, weight: .medium))
                    }
                    .foregroundStyle(AppTheme.neonCyan)
                }
                if let txId = ticket.transactionId {
                    HStack(spacing: 3) {
                        Image(systemName: "number")
                            .font(.system(size: 8))
                        Text("TX: \(txId)")
                            .font(.system(size: 9, weight: .medium))
                    }
                    .foregroundStyle(AppTheme.neonCyan)
                }
                Spacer()
                Text(ticket.submittedDate, style: .relative)
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
            }
        }
        .padding(14)
        .neonCardStyle(statusColor(ticket.status))
    }

    private func statusBadge(_ status: DisputeStatus) -> some View {
        HStack(spacing: 4) {
            Image(systemName: status.icon)
                .font(.system(size: 8))
            Text(status.rawValue)
                .font(.system(size: 9, weight: .heavy))
        }
        .foregroundStyle(statusColor(status))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(statusColor(status).opacity(0.1))
        .clipShape(Capsule())
    }

    private func statusColor(_ status: DisputeStatus) -> Color {
        switch status {
        case .pending: AppTheme.gold
        case .investigating: AppTheme.neonCyan
        case .resolved: AppTheme.electricGreen
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.seal.fill")
                .font(.largeTitle)
                .foregroundStyle(AppTheme.electricGreen.opacity(0.4))
            Text(selectedTab == 0 ? "No Open Disputes" : "No Resolved Disputes")
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.softWhite)
            Text("All clear! If you encounter an issue, submit a new ticket.")
                .font(.system(size: 11))
                .foregroundStyle(AppTheme.dimText)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .neonCardStyle()
    }
}

struct NewDisputeForm: View {
    let viewModel: GameViewModel
    let onSubmit: () -> Void
    @State private var category: DisputeCategory = .machineIssue
    @State private var selectedMachineId: String = ""
    @State private var transactionId: String = ""
    @State private var description: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 6) {
                Image(systemName: "plus.circle.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.gold)
                Text("Submit New Ticket")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("CATEGORY")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                Picker("Category", selection: $category) {
                    ForEach(DisputeCategory.allCases) { cat in
                        Text(cat.rawValue).tag(cat)
                    }
                }
                .pickerStyle(.menu)
                .tint(AppTheme.gold)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("MACHINE (OPTIONAL)")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                Picker("Machine", selection: $selectedMachineId) {
                    Text("None").tag("")
                    ForEach(viewModel.machines) { machine in
                        Text(machine.name).tag(machine.id)
                    }
                }
                .pickerStyle(.menu)
                .tint(AppTheme.neonCyan)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("TRANSACTION ID (OPTIONAL)")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                TextField("e.g. tx_001", text: $transactionId)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.softWhite)
                    .padding(12)
                    .background(Color.white.opacity(0.04))
                    .clipShape(.rect(cornerRadius: 10))
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("DESCRIPTION")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                TextEditor(text: $description)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.softWhite)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 100)
                    .padding(10)
                    .background(Color.white.opacity(0.04))
                    .clipShape(.rect(cornerRadius: 10))
            }

            Button {
                viewModel.submitDispute(
                    category: category,
                    machineId: selectedMachineId.isEmpty ? nil : selectedMachineId,
                    transactionId: transactionId.isEmpty ? nil : transactionId,
                    description: description
                )
                onSubmit()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 12))
                    Text("Submit Ticket")
                        .font(.subheadline.bold())
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(description.isEmpty ? Color.white.opacity(0.1) : AppTheme.gold)
                .clipShape(.rect(cornerRadius: 14))
            }
            .disabled(description.isEmpty)
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
    }
}
