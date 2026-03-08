import SwiftUI

struct EventsFeedView: View {
    let viewModel: GameViewModel
    @State private var selectedFilter: GameEventType?
    @State private var animateIn = false
    @Environment(\.dismiss) private var dismiss

    private var filteredEvents: [GameEvent] {
        let sorted = viewModel.recentEvents
        guard let filter = selectedFilter else { return sorted }
        return sorted.filter { $0.type == filter }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    filterBar
                    eventStats

                    if filteredEvents.isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: 8) {
                            ForEach(filteredEvents) { event in
                                eventCard(event)
                                    .opacity(animateIn ? 1 : 0)
                                    .offset(y: animateIn ? 0 : 12)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Event Log")
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

    private var filterBar: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                filterChip(nil, label: "All", icon: "list.bullet")
                filterChip(.transaction, label: "Transaction", icon: "creditcard.fill")
                filterChip(.daily, label: "Local", icon: "mappin.circle.fill")
                filterChip(.global, label: "Global", icon: "globe")
            }
        }
        .contentMargins(.horizontal, 0)
        .scrollIndicators(.hidden)
    }

    private func filterChip(_ type: GameEventType?, label: String, icon: String) -> some View {
        let isSelected = selectedFilter == type
        return Button {
            withAnimation(.snappy) { selectedFilter = type }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                Text(label)
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? AppTheme.neonCyan : AppTheme.cardBackground)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(isSelected ? AppTheme.neonCyan.opacity(0.5) : AppTheme.cardBorder, lineWidth: 1)
            )
        }
    }

    private var eventStats: some View {
        HStack(spacing: 10) {
            eventStatCard(
                label: "Positive",
                count: viewModel.gameEvents.filter { $0.severity == .positive }.count,
                color: AppTheme.electricGreen,
                icon: "arrow.up.circle.fill"
            )
            eventStatCard(
                label: "Negative",
                count: viewModel.gameEvents.filter { $0.severity == .negative }.count,
                color: AppTheme.neonRed,
                icon: "arrow.down.circle.fill"
            )
            eventStatCard(
                label: "Critical",
                count: viewModel.gameEvents.filter { $0.severity == .critical }.count,
                color: Color.purple,
                icon: "exclamationmark.octagon.fill"
            )
        }
    }

    private func eventStatCard(label: String, count: Int, color: Color, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(color)
            Text("\(count)")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .neonCardStyle(color)
    }

    private func eventCard(_ event: GameEvent) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(severityColor(event.severity).opacity(0.1))
                    .frame(width: 40, height: 40)
                Image(systemName: event.iconName)
                    .font(.system(size: 14))
                    .foregroundStyle(severityColor(event.severity))
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(event.title)
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                        .lineLimit(1)
                    eventTypeBadge(event.type)
                }
                Text(event.description)
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.dimText)
                    .lineLimit(2)
                HStack(spacing: 8) {
                    if let name = event.machineName {
                        HStack(spacing: 3) {
                            Image(systemName: "cabinet.fill")
                                .font(.system(size: 8))
                            Text(name)
                                .font(.system(size: 9, weight: .semibold))
                        }
                        .foregroundStyle(AppTheme.neonCyan)
                    }
                    Text(event.timestamp, style: .relative)
                        .font(.system(size: 9))
                        .foregroundStyle(AppTheme.dimText)
                }
            }

            Spacer()

            Text(event.impactLabel)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(severityColor(event.severity))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(severityColor(event.severity).opacity(0.1))
                .clipShape(Capsule())
        }
        .padding(12)
        .neonCardStyle(severityColor(event.severity))
    }

    private func eventTypeBadge(_ type: GameEventType) -> some View {
        let config: (String, Color) = switch type {
        case .transaction: ("TXN", AppTheme.electricGreen)
        case .daily: ("LOCAL", .orange)
        case .global: ("GLOBAL", Color.purple)
        }
        return Text(config.0)
            .font(.system(size: 7, weight: .heavy))
            .foregroundStyle(config.1)
            .padding(.horizontal, 5)
            .padding(.vertical, 2)
            .background(config.1.opacity(0.12))
            .clipShape(Capsule())
    }

    private func severityColor(_ severity: GameEventSeverity) -> Color {
        switch severity {
        case .positive: AppTheme.electricGreen
        case .negative: AppTheme.neonRed
        case .critical: Color.purple
        case .contextual: .orange
        case .neutral: AppTheme.neonCyan
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "newspaper")
                .font(.system(size: 40))
                .foregroundStyle(AppTheme.dimText)
            Text("No events yet")
                .font(.headline)
                .foregroundStyle(AppTheme.softWhite)
            Text("Events will appear as your machines operate")
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
        }
        .padding(40)
    }
}

struct EventFeedInlineView: View {
    let events: [GameEvent]

    var body: some View {
        VStack(spacing: 6) {
            ForEach(events.prefix(3)) { event in
                inlineEventRow(event)
            }
        }
    }

    private func inlineEventRow(_ event: GameEvent) -> some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(severityColor(event.severity).opacity(0.12))
                    .frame(width: 28, height: 28)
                Image(systemName: event.iconName)
                    .font(.system(size: 10))
                    .foregroundStyle(severityColor(event.severity))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
                    .lineLimit(1)
                if let name = event.machineName {
                    Text(name)
                        .font(.system(size: 9))
                        .foregroundStyle(AppTheme.dimText)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(event.impactLabel)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(severityColor(event.severity))
                Text(event.timestamp, style: .relative)
                    .font(.system(size: 8))
                    .foregroundStyle(AppTheme.dimText)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(severityColor(event.severity).opacity(0.04))
        .clipShape(.rect(cornerRadius: 10))
    }

    private func severityColor(_ severity: GameEventSeverity) -> Color {
        switch severity {
        case .positive: AppTheme.electricGreen
        case .negative: AppTheme.neonRed
        case .critical: Color.purple
        case .contextual: .orange
        case .neutral: AppTheme.neonCyan
        }
    }
}
