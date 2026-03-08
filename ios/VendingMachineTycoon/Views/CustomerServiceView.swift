import SwiftUI

struct CustomerServiceView: View {
    let viewModel: GameViewModel
    @State private var selectedFilter: ComplaintFilter = .pending
    @State private var animateCards = false

    private enum ComplaintFilter: String, CaseIterable {
        case pending = "Pending"
        case resolved = "Resolved"
        case all = "All"
    }

    private var filteredComplaints: [CustomerComplaint] {
        switch selectedFilter {
        case .pending:
            return viewModel.customerComplaints.filter { $0.resolution == .pending && !$0.isExpired }
        case .resolved:
            return viewModel.customerComplaints.filter { $0.resolution != .pending }
        case .all:
            return viewModel.customerComplaints
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                summaryHeader
                filterTabs
                if filteredComplaints.isEmpty {
                    emptyState
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredComplaints) { complaint in
                            complaintCard(complaint)
                                .opacity(animateCards ? 1 : 0)
                                .offset(y: animateCards ? 0 : 12)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .scrollIndicators(.hidden)
        .gameBackground()
        .navigationTitle("Customer Service")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .onAppear {
            viewModel.processExpiredComplaints()
            withAnimation(.spring(response: 0.5)) { animateCards = true }
        }
    }

    private var summaryHeader: some View {
        HStack(spacing: 12) {
            summaryPill(
                icon: "exclamationmark.bubble.fill",
                value: "\(viewModel.pendingComplaintCount)",
                label: "Open",
                color: viewModel.pendingComplaintCount > 0 ? AppTheme.neonRed : AppTheme.electricGreen
            )
            summaryPill(
                icon: "checkmark.circle.fill",
                value: "\(viewModel.customerComplaints.filter { $0.resolution == .refunded }.count)",
                label: "Refunded",
                color: AppTheme.electricGreen
            )
            summaryPill(
                icon: "xmark.circle.fill",
                value: "\(viewModel.customerComplaints.filter { $0.resolution == .denied || $0.resolution == .expired }.count)",
                label: "Denied",
                color: AppTheme.gold
            )
        }
    }

    private func summaryPill(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(color.opacity(0.06))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }

    private var filterTabs: some View {
        HStack(spacing: 6) {
            ForEach(ComplaintFilter.allCases, id: \.rawValue) { filter in
                Button {
                    withAnimation(.snappy(duration: 0.2)) { selectedFilter = filter }
                } label: {
                    Text(filter.rawValue)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(selectedFilter == filter ? AppTheme.deepNavy : AppTheme.dimText)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(selectedFilter == filter ? AppTheme.electricGreen : AppTheme.cardBackground)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .stroke(selectedFilter == filter ? Color.clear : AppTheme.cardBorder, lineWidth: 1)
                        )
                }
            }
            Spacer()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "face.smiling.inverse")
                .font(.system(size: 44))
                .foregroundStyle(AppTheme.electricGreen.opacity(0.5))
            Text("No Complaints")
                .font(.headline)
                .foregroundStyle(AppTheme.softWhite)
            Text("Your customers are happy! Keep stocking fresh inventory.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 60)
    }

    private func complaintCard(_ complaint: CustomerComplaint) -> some View {
        VStack(spacing: 14) {
            HStack {
                HStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(resolutionColor(complaint).opacity(0.12))
                            .frame(width: 36, height: 36)
                        Image(systemName: resolutionIcon(complaint))
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(resolutionColor(complaint))
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(complaint.customerName)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        Text(complaint.machineName)
                            .font(.system(size: 11))
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
                Spacer()
                if complaint.resolution == .pending && !complaint.isExpired {
                    timerBadge(complaint)
                } else {
                    resolutionBadge(complaint)
                }
            }

            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(AppTheme.neonRed)
                Text("Expired \(complaint.productName) purchased")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text(viewModel.formatVB(complaint.refundAmount))
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(AppTheme.gold)
            }
            .padding(10)
            .background(AppTheme.neonRed.opacity(0.06))
            .clipShape(.rect(cornerRadius: 10))

            Text(complaint.complaintDescription)
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.dimText)
                .lineLimit(2)

            if complaint.resolution == .pending && !complaint.isExpired {
                HStack(spacing: 10) {
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            viewModel.issueRefund(complaint.id)
                        }
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: "arrow.uturn.backward.circle.fill")
                                .font(.system(size: 12))
                            Text("Issue Refund")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.electricGreen)

                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            viewModel.denyRefund(complaint.id)
                        }
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 12))
                            Text("Deny Refund")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                    }
                    .buttonStyle(.bordered)
                    .tint(AppTheme.neonRed)
                }

                HStack(spacing: 4) {
                    Image(systemName: "info.circle.fill")
                        .font(.system(size: 9))
                    Text("Refund: -\\(Int(complaint.refundAmount)) VB, +1 Rep")
                        .font(.system(size: 10, weight: .medium))
                    Text("•")
                    Text("Deny: -5 Rep")
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundStyle(AppTheme.dimText)
            }
        }
        .padding(16)
        .neonCardStyle(complaint.resolution == .pending ? AppTheme.neonRed : AppTheme.dimText)
    }

    private func timerBadge(_ complaint: CustomerComplaint) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "clock.fill")
                .font(.system(size: 9))
            Text("\(complaint.hoursRemaining)h \(complaint.minutesRemaining)m")
                .font(.system(size: 10, weight: .bold))
        }
        .foregroundStyle(complaint.hoursRemaining <= 4 ? AppTheme.neonRed : AppTheme.gold)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background((complaint.hoursRemaining <= 4 ? AppTheme.neonRed : AppTheme.gold).opacity(0.1))
        .clipShape(Capsule())
    }

    private func resolutionBadge(_ complaint: CustomerComplaint) -> some View {
        HStack(spacing: 4) {
            Image(systemName: resolutionIcon(complaint))
                .font(.system(size: 9))
            Text(complaint.resolution.rawValue)
                .font(.system(size: 10, weight: .bold))
        }
        .foregroundStyle(resolutionColor(complaint))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(resolutionColor(complaint).opacity(0.1))
        .clipShape(Capsule())
    }

    private func resolutionColor(_ complaint: CustomerComplaint) -> Color {
        switch complaint.resolution {
        case .pending: AppTheme.gold
        case .refunded: AppTheme.electricGreen
        case .denied: AppTheme.neonRed
        case .expired: AppTheme.dimText
        }
    }

    private func resolutionIcon(_ complaint: CustomerComplaint) -> String {
        switch complaint.resolution {
        case .pending: "clock.fill"
        case .refunded: "checkmark.circle.fill"
        case .denied: "xmark.circle.fill"
        case .expired: "clock.badge.xmark"
        }
    }
}
