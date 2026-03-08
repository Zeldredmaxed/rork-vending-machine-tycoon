import SwiftUI

struct MarketOverviewView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedProduct: String = "Cola Classic"
    @State private var animateIn = false

    private let productNames = ["Cola Classic", "Cheese Puffs", "Trail Mix"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    priceTrendChart
                    eventNotifications
                    subscriptionPortal
                    marketSummary
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Market Intelligence")
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

    private var priceTrendChart: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "chart.xyaxis.line")
                        .font(.caption)
                        .foregroundStyle(AppTheme.neonCyan)
                    Text("24h Price Trends")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                }
                Spacer()
                if viewModel.player.hasMarketInsight {
                    HStack(spacing: 3) {
                        Image(systemName: "eye.fill")
                            .font(.system(size: 9))
                        Text("INSIGHT")
                            .font(.system(size: 8, weight: .heavy))
                    }
                    .foregroundStyle(AppTheme.gold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppTheme.gold.opacity(0.12))
                    .clipShape(Capsule())
                }
            }

            ScrollView(.horizontal) {
                HStack(spacing: 6) {
                    ForEach(productNames, id: \.self) { name in
                        let isSelected = selectedProduct == name
                        Button {
                            withAnimation(.snappy) { selectedProduct = name }
                        } label: {
                            Text(name)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(isSelected ? AppTheme.neonCyan : AppTheme.cardBackground)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            .contentMargins(.horizontal, 0)
            .scrollIndicators(.hidden)

            if let trends = SampleData.priceTrends[selectedProduct] {
                chartView(trends: trends)
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.neonCyan)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private func chartView(trends: [PriceTrendPoint]) -> some View {
        let prices = trends.map(\.price)
        let minPrice = (prices.min() ?? 0) * 0.95
        let maxPrice = (prices.max() ?? 1) * 1.05
        let range = maxPrice - minPrice

        return VStack(spacing: 8) {
            GeometryReader { geo in
                let width = geo.size.width
                let height = geo.size.height

                ZStack {
                    ForEach(0..<5) { i in
                        let y = height * CGFloat(i) / 4
                        Path { path in
                            path.move(to: CGPoint(x: 0, y: y))
                            path.addLine(to: CGPoint(x: width, y: y))
                        }
                        .stroke(Color.white.opacity(0.04), lineWidth: 0.5)
                    }

                    Path { path in
                        for (index, point) in trends.enumerated() {
                            let x = width * CGFloat(index) / CGFloat(max(trends.count - 1, 1))
                            let normalized = (point.price - minPrice) / range
                            let y = height * (1 - normalized)
                            if index == 0 {
                                path.move(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                    .stroke(
                        LinearGradient(
                            colors: [AppTheme.neonCyan, AppTheme.electricGreen],
                            startPoint: .leading, endPoint: .trailing
                        ),
                        style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)
                    )
                    .shadow(color: AppTheme.neonCyan.opacity(0.4), radius: 4)

                    Path { path in
                        for (index, point) in trends.enumerated() {
                            let x = width * CGFloat(index) / CGFloat(max(trends.count - 1, 1))
                            let normalized = (point.price - minPrice) / range
                            let y = height * (1 - normalized)
                            if index == 0 {
                                path.move(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                        if let last = trends.last {
                            let lastX = width
                            path.addLine(to: CGPoint(x: lastX, y: height))
                            path.addLine(to: CGPoint(x: 0, y: height))
                            path.closeSubpath()
                        }
                    }
                    .fill(
                        LinearGradient(
                            colors: [AppTheme.neonCyan.opacity(0.15), AppTheme.neonCyan.opacity(0)],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                }
            }
            .frame(height: 160)

            HStack {
                Text("0h")
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
                Spacer()
                Text("6h")
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
                Spacer()
                Text("12h")
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
                Spacer()
                Text("18h")
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
                Spacer()
                Text("24h")
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
            }

            HStack {
                Text("Low: $\(String(format: "%.2f", prices.min() ?? 0))")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(AppTheme.neonRed)
                Spacer()
                Text("Current: $\(String(format: "%.2f", prices.last ?? 0))")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
                Spacer()
                Text("High: $\(String(format: "%.2f", prices.max() ?? 0))")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(AppTheme.electricGreen)
            }
        }
    }

    private var eventNotifications: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "bolt.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
                Text("Active Market Events")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            ForEach(viewModel.marketEvents) { event in
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill((event.impactPercent > 15 ? AppTheme.neonRed : AppTheme.gold).opacity(0.1))
                            .frame(width: 36, height: 36)
                        Image(systemName: event.impactPercent > 15 ? "exclamationmark.triangle.fill" : "chart.line.uptrend.xyaxis")
                            .font(.system(size: 13))
                            .foregroundStyle(event.impactPercent > 15 ? AppTheme.neonRed : AppTheme.gold)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(event.title)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        Text(event.description)
                            .font(.caption)
                            .foregroundStyle(AppTheme.dimText)
                            .lineLimit(2)
                    }
                    Spacer()
                    Text("+\(Int(event.impactPercent))%")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(event.impactPercent > 15 ? AppTheme.neonRed : AppTheme.gold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background((event.impactPercent > 15 ? AppTheme.neonRed : AppTheme.gold).opacity(0.1))
                        .clipShape(Capsule())
                }
                .padding(10)
                .background(AppTheme.cardBackground)
                .clipShape(.rect(cornerRadius: 12))
            }
        }
        .padding(16)
        .neonCardStyle(.orange)
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private var subscriptionPortal: some View {
        VStack(spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "eye.fill")
                    .font(.title3)
                    .foregroundStyle(AppTheme.gold)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Market Insight Subscription")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)
                    Text("Get 24-hour advance notice on price shifts")
                        .font(.caption)
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 14) {
                VStack(spacing: 4) {
                    Image(systemName: "bell.badge.fill")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.gold)
                    Text("Early Alerts")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
                .frame(maxWidth: .infinity)
                VStack(spacing: 4) {
                    Image(systemName: "chart.bar.fill")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.gold)
                    Text("Trend Data")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
                .frame(maxWidth: .infinity)
                VStack(spacing: 4) {
                    Image(systemName: "target")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.gold)
                    Text("Buy Timing")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
                .frame(maxWidth: .infinity)
            }

            if viewModel.player.hasMarketInsight {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(AppTheme.electricGreen)
                    Text("Active Subscription")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.electricGreen)
                }
                .padding(12)
                .frame(maxWidth: .infinity)
                .background(AppTheme.electricGreen.opacity(0.06))
                .clipShape(.rect(cornerRadius: 12))
            } else {
                Button {} label: {
                    HStack(spacing: 8) {
                        Text("Subscribe — $2.99/month")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.gold)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [AppTheme.gold.opacity(0.06), AppTheme.cardBackground],
                startPoint: .top, endPoint: .bottom
            )
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(AppTheme.gold.opacity(0.2), lineWidth: 1)
        )
        .opacity(animateIn ? 1 : 0)
        .offset(y: animateIn ? 0 : 20)
    }

    private var marketSummary: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "chart.pie.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.electricGreen)
                Text("Market Summary")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            HStack(spacing: 10) {
                summaryCard(title: "Trending Up", count: viewModel.products.filter { $0.priceDirection == .up }.count, color: AppTheme.electricGreen, icon: "arrow.up.right")
                summaryCard(title: "Trending Down", count: viewModel.products.filter { $0.priceDirection == .down }.count, color: AppTheme.neonRed, icon: "arrow.down.right")
                summaryCard(title: "Stable", count: viewModel.products.filter { $0.priceDirection == .stable }.count, color: AppTheme.dimText, icon: "equal")
            }
        }
        .padding(16)
        .neonCardStyle(AppTheme.electricGreen)
    }

    private func summaryCard(title: String, count: Int, color: Color, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(color)
            Text("\(count)")
                .font(.title3.bold())
                .foregroundStyle(AppTheme.softWhite)
            Text(title)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.06))
        .clipShape(.rect(cornerRadius: 12))
    }
}
