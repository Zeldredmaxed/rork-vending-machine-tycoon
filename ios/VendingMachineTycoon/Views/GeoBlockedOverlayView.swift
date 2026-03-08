import SwiftUI

struct GeoBlockedOverlayView: View {
    let viewModel: GameViewModel
    @Environment(LocationComplianceService.self) private var locationService
    @State private var showPracticeMode = false
    @State private var pulseGlow = false

    var body: some View {
        ZStack {
            AppTheme.deepNavy.ignoresSafeArea()
            AppTheme.meshBackground.opacity(0.4).ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 24) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.neonRed.opacity(0.06))
                            .frame(width: 140, height: 140)
                        Circle()
                            .fill(AppTheme.neonRed.opacity(0.1))
                            .frame(width: 100, height: 100)
                        Circle()
                            .stroke(AppTheme.neonRed.opacity(pulseGlow ? 0.5 : 0.2), lineWidth: 2)
                            .frame(width: 100, height: 100)
                        Image(systemName: "location.slash.circle.fill")
                            .font(.system(size: 44))
                            .foregroundStyle(AppTheme.neonRed)
                            .symbolEffect(.pulse, options: .repeating)
                    }

                    VStack(spacing: 10) {
                        Text("JURISDICTION RESTRICTED")
                            .font(.system(size: 12, weight: .heavy))
                            .tracking(2)
                            .foregroundStyle(AppTheme.neonRed)

                        Text("Competition Wallet Locked")
                            .font(.title2.bold())
                            .foregroundStyle(AppTheme.softWhite)

                        if let state = locationService.currentStateName {
                            Text("Detected Location: \(state)")
                                .font(.subheadline.bold())
                                .foregroundStyle(AppTheme.gold)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 6)
                                .background(AppTheme.gold.opacity(0.08))
                                .clipShape(Capsule())
                        }
                    }

                    VStack(spacing: 8) {
                        Text("Real-money bracket entry is prohibited in your current jurisdiction. You have been placed in Simulated Practice Mode.")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                            .multilineTextAlignment(.center)

                        Text("Your Competition Wallet and all real-money features are disabled until you are in a permitted jurisdiction.")
                            .font(.caption)
                            .foregroundStyle(AppTheme.dimText.opacity(0.7))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, 8)
                }
                .padding(.horizontal, 24)

                Spacer()

                VStack(spacing: 12) {
                    Button {
                        showPracticeMode = true
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "graduationcap.fill")
                            Text("Enter Practice Mode")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.gray)

                    Button {
                        locationService.checkCurrentJurisdiction()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "location.magnifyingglass")
                                .font(.system(size: 13))
                            Text("Re-check My Location")
                                .font(.subheadline.bold())
                        }
                        .foregroundStyle(AppTheme.neonCyan)
                    }

                    HStack(spacing: 6) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 10))
                        Text("Restricted states include AZ, AR, CT, DE, ID, IA, LA, MT, NV, SD, TN, WA")
                            .font(.system(size: 9))
                    }
                    .foregroundStyle(AppTheme.dimText.opacity(0.6))
                    .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 48)
            }
        }
        .interactiveDismissDisabled()
        .sheet(isPresented: $showPracticeMode) {
            PracticeModeView(viewModel: viewModel)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                pulseGlow = true
            }
        }
    }
}
