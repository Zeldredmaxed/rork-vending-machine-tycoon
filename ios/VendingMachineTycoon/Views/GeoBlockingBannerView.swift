import SwiftUI

struct GeoBlockingBannerView: View {
    let viewModel: GameViewModel
    @State private var isDismissed = false

    var body: some View {
        if viewModel.isGeoRestricted && !isDismissed {
            HStack(spacing: 10) {
                Image(systemName: "location.slash.circle.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(AppTheme.neonRed)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Jurisdiction Restriction")
                        .font(.system(size: 11, weight: .heavy))
                        .foregroundStyle(AppTheme.neonRed)
                    Text("You are in a restricted zone. Purchasing, restocking, and placing machines are disabled until you return to a legal gameplay zone.")
                        .font(.system(size: 9))
                        .foregroundStyle(AppTheme.softWhite.opacity(0.8))
                        .lineLimit(3)
                }

                Spacer(minLength: 4)

                Button {
                    withAnimation(.snappy) { isDismissed = true }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(AppTheme.dimText)
                }
            }
            .padding(12)
            .background(AppTheme.neonRed.opacity(0.08))
            .clipShape(.rect(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AppTheme.neonRed.opacity(0.3), lineWidth: 1)
            )
            .pulseGlow(AppTheme.neonRed, radius: 4)
            .padding(.horizontal, 16)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}
