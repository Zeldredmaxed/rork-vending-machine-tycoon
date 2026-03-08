import SwiftUI

struct AdNetworkView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var adEnabled = true
    @State private var animateIn = false

    private let stats = SampleData.adNetworkStats

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    optInToggle
                    revenueOverview
                    machineBreakdown
                    adSpecs
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Ad Network")
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

    private var optInToggle: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(AppTheme.gold.opacity(0.1))
                    .frame(width: 50, height: 50)
                Image(systemName: "megaphone.fill")
                    .font(.title3)
                    .foregroundStyle(AppTheme.gold)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Ad Network")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Text("Earn passive VB by hosting contextual ads on machines with Digital Displays")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }

            Spacer()

            Toggle("", isOn: $adEnabled)
                .labelsHidden()
                .tint(AppTheme.electricGreen)
        }
        .padding(16)
        .neonCardStyle(AppTheme.gold)
        .opacity(animateIn ? 1 : 0)
    }

    private var revenueOverview: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "chart.bar.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.electricGreen)
                Text("Revenue Analytics")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            HStack(spacing: 10) {
                adStatCard(title: "Daily Revenue", value: String(format: "%.2f VB", stats.dailyRevenue), icon: "dollarsign.circle.fill", color: AppTheme.electricGreen)
                adStatCard(title: "Total Revenue", value: String(format: "%.2f VB", stats.totalRevenue), icon: "chart.line.uptrend.xyaxis", color: AppTheme.gold)
            }

            HStack(spacing: 10) {
                adStatCard(title: "Daily Impressions", value: stats.dailyImpressions.formatted(), icon: "eye.fill", color: AppTheme.neonCyan)
                adStatCard(title: "Total Impressions", value: stats.totalImpressions.formatted(), icon: "chart.bar.xaxis", color: .orange)
            }

            HStack(spacing: 14) {
                Image(systemName: "info.circle")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
                Text("CPM Rate: $\(String(format: "%.2f", stats.cpmRate))/1,000 impressions")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }
            .padding(10)
            .background(AppTheme.neonCyan.opacity(0.04))
            .clipShape(.rect(cornerRadius: 8))
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 15)
    }

    private func adStatCard(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(color)
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
            Text(value)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(color.opacity(0.05))
        .clipShape(.rect(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.1), lineWidth: 0.5)
        )
    }

    private var machineBreakdown: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "cabinet.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Participating Machines")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text("\(stats.activeMachines) active")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(AppTheme.electricGreen)
            }

            let adMachines = viewModel.machines.filter { $0.hasDigitalDisplay }
            if adMachines.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "tv.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.dimText)
                        Text("No machines with Digital Display")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                        Text("Purchase the Digital Display power-up to participate")
                            .font(.caption)
                            .foregroundStyle(AppTheme.dimText.opacity(0.7))
                    }
                    Spacer()
                }
                .padding(.vertical, 20)
            } else {
                ForEach(adMachines) { machine in
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(AppTheme.electricGreen.opacity(0.08))
                                .frame(width: 40, height: 40)
                            Image(systemName: "cabinet.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(AppTheme.electricGreen)
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            Text(machine.name)
                                .font(.subheadline.bold())
                                .foregroundStyle(AppTheme.softWhite)
                            Text("\(machine.footTraffic) visitors/day")
                                .font(.caption)
                                .foregroundStyle(AppTheme.dimText)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("+\(String(format: "%.0f", Double(machine.footTraffic) * 0.75 * stats.cpmRate / 1000)) VB")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(AppTheme.electricGreen)
                            Text("/day est.")
                                .font(.system(size: 9))
                                .foregroundStyle(AppTheme.dimText)
                        }
                    }
                    .padding(10)
                    .background(AppTheme.cardBackground)
                    .clipShape(.rect(cornerRadius: 12))
                }
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 15)
    }

    private var adSpecs: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "doc.text.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
                Text("Ad Specifications")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            let specs: [(String, String)] = [
                ("Frequency", "1 ad per 5 interactions"),
                ("Ad Types", "Static banners, 3-5s video clips"),
                ("Targeting", "Location, machine type, product"),
                ("Model", "Opt-in only — disable anytime"),
            ]

            ForEach(specs, id: \.0) { spec in
                HStack {
                    Text(spec.0)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                    Spacer()
                    Text(spec.1)
                        .font(.caption.bold())
                        .foregroundStyle(AppTheme.softWhite)
                }
            }
        }
        .padding(16)
        .neonCardStyle()
        .opacity(animateIn ? 1 : 0)
    }
}
