import SwiftUI

struct BrandCreationView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = 0
    @State private var brandName: String = ""
    @State private var selectedIcon: String = "building.2.fill"
    @State private var selectedColor: Color = AppTheme.electricGreen
    @State private var tagline: String = ""
    @State private var animateIn = false
    @State private var selectedCosmeticCategory: CosmeticCategory?

    private let brandIcons = ["building.2.fill", "storefront.fill", "cart.fill", "crown.fill", "bolt.fill", "star.fill", "diamond.fill", "leaf.fill"]
    private let brandColors: [Color] = [AppTheme.electricGreen, AppTheme.neonCyan, AppTheme.gold, .orange, .purple, AppTheme.neonRed, .pink, .mint]

    private var filteredCosmetics: [CosmeticItem] {
        guard let category = selectedCosmeticCategory else { return SampleData.cosmetics }
        return SampleData.cosmetics.filter { $0.category == category }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                brandTabs

                TabView(selection: $selectedTab) {
                    brandWizard.tag(0)
                    cosmeticShop.tag(1)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .gameBackground()
            .navigationTitle("Brand & Cosmetics")
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
                brandName = viewModel.player.brandName
                withAnimation(.spring(response: 0.5)) { animateIn = true }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var brandTabs: some View {
        HStack(spacing: 0) {
            brandTabButton(title: "Brand Wizard", icon: "paintbrush.fill", index: 0)
            brandTabButton(title: "Cosmetic Shop", icon: "sparkles", index: 1)
        }
        .padding(4)
        .background(AppTheme.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private func brandTabButton(title: String, icon: String, index: Int) -> some View {
        let isSelected = selectedTab == index
        return Button {
            withAnimation(.snappy) { selectedTab = index }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                Text(title)
                    .font(.system(size: 13, weight: .bold))
            }
            .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? AppTheme.gold : Color.clear)
            .clipShape(.rect(cornerRadius: 10))
        }
        .sensoryFeedback(.selection, trigger: selectedTab)
    }

    private var brandWizard: some View {
        ScrollView {
            VStack(spacing: 18) {
                brandPreview

                VStack(alignment: .leading, spacing: 12) {
                    Text("Franchise Name")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    TextField("Enter brand name", text: $brandName)
                        .textFieldStyle(.plain)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.softWhite)
                        .padding(14)
                        .background(AppTheme.cardBackground)
                        .clipShape(.rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.cardBorder, lineWidth: 1)
                        )
                }
                .padding(16)
                .neonCardStyle()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Brand Icon")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 52), spacing: 10)], spacing: 10) {
                        ForEach(brandIcons, id: \.self) { icon in
                            let isSelected = selectedIcon == icon
                            Button {
                                selectedIcon = icon
                            } label: {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(isSelected ? selectedColor.opacity(0.15) : AppTheme.cardBackground)
                                        .frame(width: 52, height: 52)
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(isSelected ? selectedColor.opacity(0.4) : AppTheme.cardBorder, lineWidth: isSelected ? 2 : 1)
                                        .frame(width: 52, height: 52)
                                    Image(systemName: icon)
                                        .font(.title3)
                                        .foregroundStyle(isSelected ? selectedColor : AppTheme.dimText)
                                }
                            }
                        }
                    }
                }
                .padding(16)
                .neonCardStyle()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Brand Color")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)

                    HStack(spacing: 10) {
                        ForEach(brandColors, id: \.self) { color in
                            let isSelected = selectedColor == color
                            Button {
                                selectedColor = color
                            } label: {
                                Circle()
                                    .fill(color)
                                    .frame(width: 36, height: 36)
                                    .overlay(
                                        Circle()
                                            .stroke(.white.opacity(isSelected ? 0.8 : 0), lineWidth: 2)
                                    )
                                    .overlay(
                                        Circle()
                                            .stroke(AppTheme.deepNavy, lineWidth: isSelected ? 3 : 0)
                                            .frame(width: 30, height: 30)
                                    )
                                    .scaleEffect(isSelected ? 1.15 : 1.0)
                                    .animation(.spring(response: 0.3), value: isSelected)
                            }
                        }
                    }
                }
                .padding(16)
                .neonCardStyle()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Tagline")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    TextField("Your franchise motto", text: $tagline)
                        .textFieldStyle(.plain)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.softWhite)
                        .padding(14)
                        .background(AppTheme.cardBackground)
                        .clipShape(.rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.cardBorder, lineWidth: 1)
                        )
                }
                .padding(16)
                .neonCardStyle()

                Button {} label: {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Save Brand")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.gold)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
    }

    private var brandPreview: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(selectedColor.opacity(0.12))
                    .frame(width: 80, height: 80)
                Circle()
                    .stroke(selectedColor.opacity(0.4), lineWidth: 2)
                    .frame(width: 80, height: 80)
                Image(systemName: selectedIcon)
                    .font(.system(size: 32))
                    .foregroundStyle(selectedColor)
            }

            Text(brandName.isEmpty ? "Your Brand" : brandName)
                .font(.title3.bold())
                .foregroundStyle(AppTheme.softWhite)

            if !tagline.isEmpty {
                Text(tagline)
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
                    .italic()
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .neonCardStyle(selectedColor)
    }

    private var cosmeticShop: some View {
        ScrollView {
            VStack(spacing: 14) {
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        cosmeticFilterChip(nil, label: "All")
                        ForEach(CosmeticCategory.allCases) { category in
                            cosmeticFilterChip(category, label: category.rawValue)
                        }
                    }
                }
                .contentMargins(.horizontal, 0)
                .scrollIndicators(.hidden)
                .padding(.horizontal, 16)

                LazyVStack(spacing: 10) {
                    ForEach(filteredCosmetics) { cosmetic in
                        cosmeticCard(cosmetic)
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.vertical, 16)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
    }

    private func cosmeticFilterChip(_ category: CosmeticCategory?, label: String) -> some View {
        let isSelected = selectedCosmeticCategory == category
        return Button {
            withAnimation(.snappy) { selectedCosmeticCategory = category }
        } label: {
            Text(label)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(isSelected ? AppTheme.deepNavy : AppTheme.dimText)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? AppTheme.gold : AppTheme.cardBackground)
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(isSelected ? AppTheme.gold.opacity(0.5) : AppTheme.cardBorder, lineWidth: 1)
                )
        }
    }

    private func cosmeticCard(_ cosmetic: CosmeticItem) -> some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(cosmeticCategoryColor(cosmetic.category).opacity(0.1))
                    .frame(width: 50, height: 50)
                Image(systemName: cosmetic.iconName)
                    .font(.title3)
                    .foregroundStyle(cosmeticCategoryColor(cosmetic.category))
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(cosmetic.name)
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    if cosmetic.isLimitedEdition {
                        Text("LIMITED")
                            .font(.system(size: 7, weight: .heavy))
                            .foregroundStyle(AppTheme.neonRed)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(AppTheme.neonRed.opacity(0.12))
                            .clipShape(Capsule())
                    }
                }
                Text(cosmetic.description)
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
                    .lineLimit(1)
            }

            Spacer()

            if cosmetic.isPurchased {
                Text("Owned")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(AppTheme.electricGreen)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppTheme.electricGreen.opacity(0.1))
                    .clipShape(Capsule())
            } else {
                Button {
                    viewModel.purchaseCosmetic(cost: Double(cosmetic.costVB))
                } label: {
                    Text("\(cosmetic.costVB.formatted()) VB")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(AppTheme.deepNavy)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(cosmeticCategoryColor(cosmetic.category))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(12)
        .neonCardStyle(cosmeticCategoryColor(cosmetic.category))
    }

    private func cosmeticCategoryColor(_ category: CosmeticCategory) -> Color {
        switch category {
        case .skins: AppTheme.neonCyan
        case .wraps: AppTheme.electricGreen
        case .designer: AppTheme.gold
        case .seasonal: .orange
        }
    }
}
