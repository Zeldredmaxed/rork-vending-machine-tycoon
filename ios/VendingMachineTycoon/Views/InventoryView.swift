import SwiftUI

struct InventoryView: View {
    let viewModel: GameViewModel
    @State private var selectedCategory: ProductCategory?
    @State private var selectedProduct: Product?
    @State private var showBulkSheet = false
    @State private var animateIn = false

    private var filteredProducts: [Product] {
        guard let category = selectedCategory else { return viewModel.products }
        return viewModel.products.filter { $0.category == category }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(spacing: 18) {
                        categoryFilter
                        marketOverview
                        productGrid
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 140)
                }
                .scrollIndicators(.hidden)

                newsTicker
            }
            .gameBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "storefront.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.gold)
                        Text("WHOLESALE MARKET")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if viewModel.player.hasMarketInsight {
                        HStack(spacing: 4) {
                            Image(systemName: "eye.fill")
                                .font(.system(size: 10))
                            Text("INSIGHT")
                                .font(.system(size: 9, weight: .heavy))
                        }
                        .foregroundStyle(AppTheme.gold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.gold.opacity(0.12))
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(AppTheme.gold.opacity(0.2), lineWidth: 0.5))
                    }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showBulkSheet) {
                if let product = selectedProduct {
                    BulkPurchaseSheet(product: product, viewModel: viewModel)
                }
            }
            .onAppear {
                withAnimation(.spring(response: 0.5)) { animateIn = true }
            }
        }
    }

    private var categoryFilter: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                categoryChip(nil, label: "All", icon: "square.grid.2x2.fill")
                ForEach(ProductCategory.allCases) { category in
                    categoryChip(category, label: category.rawValue, icon: category.icon)
                }
            }
        }
        .contentMargins(.horizontal, 0)
        .scrollIndicators(.hidden)
    }

    private func categoryChip(_ category: ProductCategory?, label: String, icon: String) -> some View {
        let isSelected = selectedCategory == category
        return Button {
            withAnimation(.snappy) { selectedCategory = category }
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

    private var marketOverview: some View {
        HStack(spacing: 10) {
            marketStat(icon: "arrow.up.right.circle.fill", title: "Trending Up", value: "\(viewModel.products.filter { $0.priceDirection == .up }.count)", color: AppTheme.electricGreen)
            marketStat(icon: "arrow.down.right.circle.fill", title: "Trending Down", value: "\(viewModel.products.filter { $0.priceDirection == .down }.count)", color: AppTheme.neonRed)
            marketStat(icon: "equal.circle.fill", title: "Stable", value: "\(viewModel.products.filter { $0.priceDirection == .stable }.count)", color: AppTheme.dimText)
        }
    }

    private func marketStat(icon: String, title: String, value: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
            Text(title)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .neonCardStyle(color)
    }

    private var productGrid: some View {
        let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]
        return LazyVGrid(columns: columns, spacing: 10) {
            ForEach(filteredProducts) { product in
                productCard(product)
                    .opacity(animateIn ? 1 : 0)
                    .offset(y: animateIn ? 0 : 15)
            }
        }
    }

    private func productCard(_ product: Product) -> some View {
        Button {
            selectedProduct = product
            showBulkSheet = true
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    ZStack {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(categoryColor(product.category).opacity(0.1))
                            .frame(width: 34, height: 34)
                        Image(systemName: product.iconName)
                            .font(.system(size: 14))
                            .foregroundStyle(categoryColor(product.category))
                    }
                    Spacer()
                    priceDirectionBadge(product)
                }

                Text(product.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Text("Base:")
                        .font(.system(size: 10))
                        .foregroundStyle(AppTheme.dimText)
                    Text(viewModel.formatCurrency(product.baseCost))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(AppTheme.dimText)
                }

                HStack {
                    Text(viewModel.formatCurrency(product.marketPrice))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(AppTheme.softWhite)
                    Spacer()
                    HStack(spacing: 3) {
                        Image(systemName: "clock")
                            .font(.system(size: 8))
                        Text("\(product.effectiveExpirationDays)d")
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(AppTheme.dimText)
                }

                marginBar(product)
            }
            .padding(12)
            .neonCardStyle(categoryColor(product.category))
        }
        .buttonStyle(.plain)
    }

    private func priceDirectionBadge(_ product: Product) -> some View {
        let color: Color = product.priceDirection == .up ? AppTheme.neonRed : product.priceDirection == .down ? AppTheme.electricGreen : AppTheme.dimText
        return HStack(spacing: 2) {
            Image(systemName: product.priceDirection == .up ? "arrow.up" : product.priceDirection == .down ? "arrow.down" : "minus")
                .font(.system(size: 8, weight: .bold))
            Text(String(format: "%.1f%%", product.priceChangePercent))
                .font(.system(size: 9, weight: .bold))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
    }

    private func marginBar(_ product: Product) -> some View {
        let margin = product.margin
        return HStack(spacing: 4) {
            Text("Margin")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.06))
                    Capsule()
                        .fill(margin > 0 ? AppTheme.electricGreen : AppTheme.neonRed)
                        .frame(width: max(0, min(geo.size.width, geo.size.width * (abs(margin) / 30.0))))
                }
            }
            .frame(height: 4)
            Text(String(format: "%+.0f%%", margin))
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(margin > 0 ? AppTheme.electricGreen : AppTheme.neonRed)
        }
    }

    private func categoryColor(_ category: ProductCategory) -> Color {
        switch category {
        case .soda: AppTheme.neonCyan
        case .snacks: AppTheme.gold
        case .healthy: AppTheme.electricGreen
        }
    }

    private var newsTicker: some View {
        HStack(spacing: 0) {
            HStack(spacing: 5) {
                Image(systemName: "newspaper.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(AppTheme.gold)
                Text("LIVE")
                    .font(.system(size: 8, weight: .heavy))
                    .foregroundStyle(AppTheme.neonRed)
            }
            .padding(.horizontal, 12)

            ScrollView(.horizontal) {
                HStack(spacing: 20) {
                    ForEach(viewModel.marketEvents) { event in
                        HStack(spacing: 5) {
                            Circle()
                                .fill(event.impactPercent > 15 ? AppTheme.neonRed : AppTheme.gold)
                                .frame(width: 5, height: 5)
                            Text(event.title)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(AppTheme.softWhite)
                            Text("(\(event.affectedCategory?.rawValue ?? "All"))")
                                .font(.system(size: 10))
                                .foregroundStyle(AppTheme.dimText)
                        }
                    }
                }
            }
            .contentMargins(.horizontal, 0)
            .scrollIndicators(.hidden)
        }
        .frame(height: 40)
        .background(AppTheme.charcoal.opacity(0.95))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(AppTheme.gold.opacity(0.15))
                .frame(height: 0.5)
        }
        .padding(.bottom, 56)
    }
}

struct BulkPurchaseSheet: View {
    let product: Product
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var quantity: Double = 50

    private var totalCost: Double { product.marketPrice * quantity }
    private var estimatedRevenue: Double { product.marketPrice * 2.2 * quantity }
    private var estimatedProfit: Double { estimatedRevenue - totalCost }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(AppTheme.electricGreen.opacity(0.1))
                                .frame(width: 56, height: 56)
                            Image(systemName: product.iconName)
                                .font(.title2)
                                .foregroundStyle(AppTheme.electricGreen)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text(product.name)
                                .font(.title3.bold())
                                .foregroundStyle(AppTheme.softWhite)
                            HStack(spacing: 6) {
                                Text(viewModel.formatCurrency(product.marketPrice))
                                    .font(.headline)
                                    .foregroundStyle(AppTheme.electricGreen)
                                Text("/unit")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.dimText)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(spacing: 12) {
                        HStack {
                            Text("Quantity")
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.dimText)
                            Spacer()
                            Text("\(Int(quantity)) units")
                                .font(.subheadline.bold())
                                .foregroundStyle(AppTheme.softWhite)
                        }
                        Slider(value: $quantity, in: 10...500, step: 10)
                            .tint(AppTheme.electricGreen)
                    }
                    .padding(16)
                    .neonCardStyle()

                    VStack(spacing: 16) {
                        Text("Profit Calculator")
                            .font(.headline)
                            .foregroundStyle(AppTheme.softWhite)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        calcRow(label: "Total Cost", value: viewModel.formatCurrency(totalCost), color: AppTheme.neonRed)
                        calcRow(label: "Est. Revenue (2.2x)", value: viewModel.formatCurrency(estimatedRevenue), color: AppTheme.neonCyan)
                        Divider().background(AppTheme.cardBorder)
                        calcRow(label: "Est. Profit", value: viewModel.formatCurrency(estimatedProfit), color: AppTheme.electricGreen)
                    }
                    .padding(16)
                    .neonCardStyle(AppTheme.electricGreen)

                    HStack(spacing: 6) {
                        Image(systemName: "info.circle")
                            .font(.caption)
                        Text("Expires in \(product.effectiveExpirationDays) days (2% chance for 7d Extra Fresh)")
                            .font(.caption)
                    }
                    .foregroundStyle(AppTheme.dimText)
                }
                .padding(24)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Bulk Purchase")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button {
                    viewModel.purchaseProduct(product, quantity: Int(quantity))
                    dismiss()
                } label: {
                    HStack {
                        Text("Buy \(Int(quantity)) units")
                            .font(.headline)
                        Spacer()
                        Text(viewModel.formatCurrency(totalCost))
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .padding(.horizontal, 24)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.electricGreen)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
                .background(.bar)
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private func calcRow(label: String, value: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
            Spacer()
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(color)
        }
    }
}
