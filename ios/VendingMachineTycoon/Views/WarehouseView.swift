import SwiftUI

struct WarehouseView: View {
    let viewModel: GameViewModel
    @State private var selectedCategory: ProductCategory?
    @State private var showPurchaseSheet = false
    @State private var animateIn = false

    private var filteredItems: [WarehouseItem] {
        let sorted = viewModel.sortedWarehouseItems
        guard let category = selectedCategory else { return sorted }
        return sorted.filter { $0.product.category == category }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    warehouseStats
                    expirationAlert
                    categoryFilter
                    inventoryGrid
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
                        Image(systemName: "shippingbox.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.neonCyan)
                        Text("WAREHOUSE")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showPurchaseSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 10))
                            Text("BUY")
                                .font(.system(size: 9, weight: .heavy))
                        }
                        .foregroundStyle(AppTheme.electricGreen)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(AppTheme.electricGreen.opacity(0.12))
                        .clipShape(Capsule())
                    }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showPurchaseSheet) {
                WarehousePurchaseSheet(viewModel: viewModel)
            }
            .onAppear {
                withAnimation(.spring(response: 0.5)) { animateIn = true }
            }
        }
    }

    private var warehouseStats: some View {
        HStack(spacing: 10) {
            warehouseStat(icon: "cube.box.fill", title: "Total Units", value: "\(viewModel.totalWarehouseUnits)", color: AppTheme.neonCyan)
            warehouseStat(icon: "dollarsign.circle.fill", title: "Total Value", value: viewModel.formatVB(viewModel.totalWarehouseValue), color: AppTheme.electricGreen)
            warehouseStat(icon: "exclamationmark.triangle.fill", title: "Expiring", value: "\(viewModel.expiringWarehouseItems.count)", color: viewModel.expiringWarehouseItems.isEmpty ? AppTheme.dimText : AppTheme.neonRed)
        }
    }

    private func warehouseStat(icon: String, title: String, value: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(title)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .neonCardStyle(color)
    }

    @ViewBuilder
    private var expirationAlert: some View {
        if !viewModel.expiringWarehouseItems.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(AppTheme.neonRed)
                    Text("EXPIRATION WARNING")
                        .font(.system(size: 11, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(AppTheme.neonRed)
                    Spacer()
                    Text("\(viewModel.expiringWarehouseItems.count) items")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(AppTheme.neonRed)
                }

                ForEach(viewModel.expiringWarehouseItems) { item in
                    HStack(spacing: 10) {
                        Image(systemName: item.product.iconName)
                            .font(.system(size: 12))
                            .foregroundStyle(AppTheme.neonRed)
                        Text(item.product.name)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(AppTheme.softWhite)
                        Spacer()
                        Text("\(item.quantity) units")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(AppTheme.dimText)
                        Text(item.daysUntilExpiry == 0 ? "TODAY" : "\(item.daysUntilExpiry)d left")
                            .font(.system(size: 10, weight: .heavy))
                            .foregroundStyle(AppTheme.neonRed)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(AppTheme.neonRed.opacity(0.15))
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(14)
            .background(AppTheme.neonRed.opacity(0.06))
            .clipShape(.rect(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(AppTheme.neonRed.opacity(0.3), lineWidth: 1)
            )
            .pulseGlow(AppTheme.neonRed, radius: 6)
        }
    }

    private var categoryFilter: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                filterChip(nil, label: "All", icon: "square.grid.2x2.fill")
                ForEach(ProductCategory.allCases) { cat in
                    filterChip(cat, label: cat.rawValue, icon: cat.icon)
                }
            }
        }
        .contentMargins(.horizontal, 0)
        .scrollIndicators(.hidden)
    }

    private func filterChip(_ category: ProductCategory?, label: String, icon: String) -> some View {
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
            .overlay(Capsule().stroke(isSelected ? AppTheme.neonCyan.opacity(0.5) : AppTheme.cardBorder, lineWidth: 1))
        }
    }

    private var inventoryGrid: some View {
        let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]
        return LazyVGrid(columns: columns, spacing: 10) {
            ForEach(filteredItems) { item in
                warehouseItemCard(item)
                    .opacity(animateIn ? 1 : 0)
                    .offset(y: animateIn ? 0 : 15)
            }
        }
    }

    private func warehouseItemCard(_ item: WarehouseItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(categoryColor(item.product.category).opacity(0.1))
                        .frame(width: 34, height: 34)
                    Image(systemName: item.product.iconName)
                        .font(.system(size: 14))
                        .foregroundStyle(categoryColor(item.product.category))
                }
                Spacer()
                if item.isExpiringSoon {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.neonRed)
                }
            }

            Text(item.product.name)
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.softWhite)
                .lineLimit(1)

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(item.quantity) units")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(AppTheme.softWhite)
                    Text("@ \(viewModel.formatCurrency(item.purchasePrice))")
                        .font(.system(size: 10))
                        .foregroundStyle(AppTheme.dimText)
                }
                Spacer()
            }

            HStack(spacing: 4) {
                Image(systemName: "clock")
                    .font(.system(size: 9))
                Text(item.daysUntilExpiry == 0 ? "Expires today!" : "\(item.daysUntilExpiry)d until expiry")
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(item.isExpiringSoon ? AppTheme.neonRed : AppTheme.dimText)

            Button {
                viewModel.discardWarehouseItem(item.id)
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "trash")
                        .font(.system(size: 9))
                    Text("Discard")
                        .font(.system(size: 10, weight: .bold))
                }
                .foregroundStyle(AppTheme.neonRed.opacity(0.7))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(AppTheme.neonRed.opacity(0.08))
                .clipShape(Capsule())
            }
        }
        .padding(12)
        .background(
            item.isExpiringSoon
                ? AnyShapeStyle(AppTheme.neonRed.opacity(0.04))
                : AnyShapeStyle(LinearGradient(colors: [AppTheme.cardBackground, AppTheme.deepNavy], startPoint: .topLeading, endPoint: .bottomTrailing))
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(item.isExpiringSoon ? AppTheme.neonRed.opacity(0.4) : categoryColor(item.product.category).opacity(0.2), lineWidth: item.isExpiringSoon ? 1.5 : 1)
        )
    }

    private func categoryColor(_ category: ProductCategory) -> Color {
        switch category {
        case .soda: AppTheme.neonCyan
        case .snacks: AppTheme.gold
        case .healthy: AppTheme.electricGreen
        }
    }
}

struct WarehousePurchaseSheet: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedProduct: Product?
    @State private var quantity: Double = 50

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Text("Items purchased here go to your Warehouse for later allocation to specific machines.")
                        .font(.system(size: 12))
                        .foregroundStyle(AppTheme.dimText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    ForEach(viewModel.products) { product in
                        Button {
                            selectedProduct = product
                        } label: {
                            purchaseRow(product)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Buy Wholesale")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .sheet(item: $selectedProduct) { product in
                BulkPurchaseSheet(product: product, viewModel: viewModel)
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
    }

    private func purchaseRow(_ product: Product) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(categoryColor(product.category).opacity(0.1))
                    .frame(width: 40, height: 40)
                Image(systemName: product.iconName)
                    .font(.system(size: 14))
                    .foregroundStyle(categoryColor(product.category))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(product.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                HStack(spacing: 6) {
                    Text(viewModel.formatCurrency(product.marketPrice))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(AppTheme.electricGreen)
                    directionBadge(product)
                }
            }

            Spacer()

            Image(systemName: "plus.circle.fill")
                .font(.title3)
                .foregroundStyle(AppTheme.electricGreen)
        }
        .padding(12)
        .neonCardStyle(categoryColor(product.category))
    }

    private func directionBadge(_ product: Product) -> some View {
        let color: Color = product.priceDirection == .up ? AppTheme.neonRed : product.priceDirection == .down ? AppTheme.electricGreen : AppTheme.dimText
        return HStack(spacing: 2) {
            Image(systemName: product.priceDirection == .up ? "arrow.up" : product.priceDirection == .down ? "arrow.down" : "minus")
                .font(.system(size: 7, weight: .bold))
            Text(String(format: "%.1f%%", product.priceChangePercent))
                .font(.system(size: 8, weight: .bold))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 5)
        .padding(.vertical, 2)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
    }

    private func categoryColor(_ category: ProductCategory) -> Color {
        switch category {
        case .soda: AppTheme.neonCyan
        case .snacks: AppTheme.gold
        case .healthy: AppTheme.electricGreen
        }
    }
}
