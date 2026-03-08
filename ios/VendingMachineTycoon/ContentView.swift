import SwiftUI

struct ContentView: View {
    @State private var viewModel = GameViewModel()
    @State private var selectedTab = 0
    @State private var isOnboarded = false

    var body: some View {
        if isOnboarded {
            if let recap = viewModel.idleRecap {
                IdleRecapView(viewModel: viewModel, recap: recap)
                    .preferredColorScheme(.dark)
            } else {
                ZStack(alignment: .bottom) {
                    VStack(spacing: 0) {
                        GeoBlockingBannerView(viewModel: viewModel)

                        Group {
                            switch selectedTab {
                            case 0: DashboardView(viewModel: viewModel)
                            case 1: GameMapView(viewModel: viewModel)
                            case 2: WarehouseView(viewModel: viewModel)
                            case 3: HRDashboardView(viewModel: viewModel)
                            case 4: moreView
                            default: DashboardView(viewModel: viewModel)
                            }
                        }
                    }

                    customTabBar
                }
                .preferredColorScheme(.dark)
                .ignoresSafeArea(.keyboard)
            }
        } else {
            OnboardingView(isOnboarded: $isOnboarded)
        }
    }

    private var moreView: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    moreNavCard(icon: "storefront.fill", title: "Wholesale Market", subtitle: "Buy inventory for your warehouse", color: AppTheme.gold) {
                        InventoryView(viewModel: viewModel)
                    }
                    moreNavCard(icon: "bolt.shield.fill", title: "Power-Ups", subtitle: "Upgrade your machines", color: AppTheme.neonCyan) {
                        PowerUpShopView(viewModel: viewModel)
                    }
                    moreNavCard(icon: "exclamationmark.bubble.fill", title: "Customer Service", subtitle: "\(viewModel.pendingComplaintCount) open complaints", color: viewModel.pendingComplaintCount > 0 ? AppTheme.neonRed : AppTheme.dimText) {
                        CustomerServiceView(viewModel: viewModel)
                    }
                    moreNavCard(icon: "person.crop.circle.fill", title: "Profile", subtitle: "Account, brand, and settings", color: AppTheme.electricGreen) {
                        ProfileView(viewModel: viewModel)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 100)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "ellipsis.circle.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("MORE")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func moreNavCard<Destination: View>(icon: String, title: String, subtitle: String, color: Color, @ViewBuilder destination: @escaping () -> Destination) -> some View {
        NavigationLink {
            destination()
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color.opacity(0.1))
                        .frame(width: 44, height: 44)
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundStyle(color)
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(AppTheme.dimText)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AppTheme.dimText)
            }
            .padding(14)
            .neonCardStyle(color)
        }
        .buttonStyle(.plain)
    }

    private var customTabBar: some View {
        HStack(spacing: 0) {
            tabItem(icon: "chart.bar.fill", label: "Overview", index: 0)
            tabItem(icon: "map.fill", label: "Map", index: 1)
            tabItem(icon: "shippingbox.fill", label: "Warehouse", index: 2)
            tabItem(icon: "person.3.fill", label: "HR", index: 3)
            tabItem(icon: "ellipsis.circle.fill", label: "More", index: 4)
        }
        .padding(.horizontal, 8)
        .padding(.top, 10)
        .padding(.bottom, 2)
        .background(
            ZStack {
                AppTheme.charcoal
                LinearGradient(
                    colors: [Color.white.opacity(0.04), Color.clear],
                    startPoint: .top, endPoint: .bottom
                )
            }
        )
        .overlay(alignment: .top) {
            Rectangle()
                .fill(AppTheme.electricGreen.opacity(0.15))
                .frame(height: 0.5)
        }
    }

    private func tabItem(icon: String, label: String, index: Int) -> some View {
        let isSelected = selectedTab == index
        return Button {
            withAnimation(.snappy(duration: 0.25)) {
                selectedTab = index
            }
        } label: {
            VStack(spacing: 4) {
                ZStack {
                    if isSelected {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(AppTheme.electricGreen.opacity(0.12))
                            .frame(width: 44, height: 30)
                    }
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: isSelected ? .semibold : .regular))
                        .foregroundStyle(isSelected ? AppTheme.electricGreen : AppTheme.dimText)
                        .symbolEffect(.bounce, value: isSelected)
                }
                .frame(height: 30)

                Text(label)
                    .font(.system(size: 10, weight: isSelected ? .bold : .medium))
                    .foregroundStyle(isSelected ? AppTheme.electricGreen : AppTheme.dimText)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: selectedTab)
    }
}

#Preview {
    ContentView()
}
