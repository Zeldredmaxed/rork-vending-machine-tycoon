import SwiftUI

struct IdleRecapView: View {
    let viewModel: GameViewModel
    let recap: IdleRecapData
    @State private var showEarnings = false
    @State private var showItems = false
    @State private var showIncidents = false
    @State private var animateIn = false

    var body: some View {
        ZStack {
            AppTheme.deepNavy.ignoresSafeArea()
            AppTheme.meshBackground.opacity(0.5).ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 24) {
                    headerSection
                    earningsCard
                    itemsSoldCard
                    incidentsSection
                    claimButton
                }
                .padding(.horizontal, 20)

                Spacer()
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.6).delay(0.2)) { animateIn = true }
            withAnimation(.spring(response: 0.5).delay(0.5)) { showEarnings = true }
            withAnimation(.spring(response: 0.5).delay(0.8)) { showItems = true }
            withAnimation(.spring(response: 0.5).delay(1.1)) { showIncidents = true }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 10) {
            Image(systemName: "moon.zzz.fill")
                .font(.system(size: 36))
                .foregroundStyle(AppTheme.neonCyan)
                .symbolEffect(.pulse, options: .repeating)
                .opacity(animateIn ? 1 : 0)
                .scaleEffect(animateIn ? 1 : 0.5)

            Text("While You Were Away")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.softWhite)
                .opacity(animateIn ? 1 : 0)

            Text("You were offline for \(String(format: "%.1f", recap.hoursOffline)) hours")
                .font(.system(size: 12))
                .foregroundStyle(AppTheme.dimText)
                .opacity(animateIn ? 1 : 0)
        }
    }

    private var earningsCard: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(AppTheme.electricGreen.opacity(0.12))
                    .frame(width: 48, height: 48)
                Image(systemName: "dollarsign.circle.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.electricGreen)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("EARNINGS")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                Text("+\(String(format: "%.2f", recap.totalEarned)) VB")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(AppTheme.electricGreen)
                    .glow(AppTheme.electricGreen, radius: 6)
            }

            Spacer()
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
        .opacity(showEarnings ? 1 : 0)
        .offset(y: showEarnings ? 0 : 20)
    }

    private var itemsSoldCard: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(AppTheme.neonCyan.opacity(0.12))
                    .frame(width: 48, height: 48)
                Image(systemName: "shippingbox.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.neonCyan)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("ITEMS SOLD")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1)
                    .foregroundStyle(AppTheme.dimText)
                Text("\(recap.itemsSold) units")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
            }

            Spacer()
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
        .opacity(showItems ? 1 : 0)
        .offset(y: showItems ? 0 : 20)
    }

    private var incidentsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !recap.incidents.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(AppTheme.neonRed)
                    Text("INCIDENTS")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(AppTheme.neonRed.opacity(0.8))
                }

                ForEach(recap.incidents) { incident in
                    HStack(spacing: 10) {
                        Image(systemName: incident.iconName)
                            .font(.system(size: 12))
                            .foregroundStyle(incident.isNegative ? AppTheme.neonRed : AppTheme.electricGreen)
                            .frame(width: 20)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(incident.title)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(AppTheme.softWhite)
                            Text(incident.description)
                                .font(.system(size: 10))
                                .foregroundStyle(AppTheme.dimText)
                        }

                        Spacer()

                        Text(incident.timestamp, style: .time)
                            .font(.system(size: 9))
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
            }
        }
        .padding(14)
        .neonCardStyle(AppTheme.neonRed)
        .opacity(showIncidents ? 1 : 0)
        .offset(y: showIncidents ? 0 : 20)
    }

    private var claimButton: some View {
        Button {
            viewModel.dismissIdleRecap()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16))
                Text("Claim Offline Earnings")
                    .font(.headline)
            }
            .foregroundStyle(AppTheme.deepNavy)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(AppTheme.electricGreen)
            .clipShape(.rect(cornerRadius: 16))
            .glow(AppTheme.electricGreen, radius: 8)
        }
        .sensoryFeedback(.success, trigger: false)
        .opacity(showIncidents ? 1 : 0)
    }
}
