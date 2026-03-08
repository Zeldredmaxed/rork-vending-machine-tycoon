import SwiftUI

enum AppTheme {
    static let deepNavy = Color(red: 0.04, green: 0.06, blue: 0.12)
    static let charcoal = Color(red: 0.08, green: 0.1, blue: 0.15)
    static let charcoalLight = Color(red: 0.14, green: 0.16, blue: 0.22)
    static let electricGreen = Color(red: 0.0, green: 0.92, blue: 0.45)
    static let gold = Color(red: 1.0, green: 0.78, blue: 0.18)
    static let neonRed = Color(red: 1.0, green: 0.22, blue: 0.31)
    static let electricBlue = Color(red: 0.24, green: 0.51, blue: 1.0)
    static let neonCyan = Color(red: 0.0, green: 0.9, blue: 0.9)
    static let softWhite = Color(red: 0.93, green: 0.94, blue: 0.96)
    static let dimText = Color(red: 0.45, green: 0.5, blue: 0.58)
    static let cardBackground = Color(red: 0.07, green: 0.09, blue: 0.14)
    static let cardBorder = Color.white.opacity(0.05)
    static let surfaceElevated = Color(red: 0.1, green: 0.12, blue: 0.18)

    static let profitGradient = LinearGradient(
        colors: [electricGreen, electricGreen.opacity(0.6)],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )

    static let goldGradient = LinearGradient(
        colors: [gold, Color(red: 0.85, green: 0.6, blue: 0.1)],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )

    static let alertGradient = LinearGradient(
        colors: [neonRed, neonRed.opacity(0.7)],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )

    static let cyanGradient = LinearGradient(
        colors: [neonCyan, electricBlue],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )

    static let meshBackground = MeshGradient(
        width: 3, height: 3,
        points: [
            [0.0, 0.0], [0.5, 0.0], [1.0, 0.0],
            [0.0, 0.5], [0.5, 0.5], [1.0, 0.5],
            [0.0, 1.0], [0.5, 1.0], [1.0, 1.0]
        ],
        colors: [
            deepNavy, Color(red: 0.05, green: 0.08, blue: 0.18), deepNavy,
            Color(red: 0.03, green: 0.07, blue: 0.14), charcoal, Color(red: 0.04, green: 0.08, blue: 0.16),
            deepNavy, Color(red: 0.05, green: 0.07, blue: 0.13), deepNavy
        ]
    )
}

struct GlowModifier: ViewModifier {
    let color: Color
    let radius: CGFloat

    func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(0.7), radius: radius)
            .shadow(color: color.opacity(0.35), radius: radius * 2)
    }
}

struct NeonBorderModifier: ViewModifier {
    let color: Color
    let cornerRadius: CGFloat
    let lineWidth: CGFloat

    func body(content: Content) -> some View {
        content
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(color.opacity(0.4), lineWidth: lineWidth)
            )
            .shadow(color: color.opacity(0.15), radius: 8)
    }
}

struct PulseGlowModifier: ViewModifier {
    let color: Color
    let radius: CGFloat
    @State private var isGlowing = false

    func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(isGlowing ? 0.8 : 0.3), radius: isGlowing ? radius * 1.5 : radius)
            .onAppear {
                withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true)) {
                    isGlowing = true
                }
            }
    }
}

extension View {
    func glow(_ color: Color, radius: CGFloat = 8) -> some View {
        modifier(GlowModifier(color: color, radius: radius))
    }

    func neonBorder(_ color: Color, cornerRadius: CGFloat = 16, lineWidth: CGFloat = 1) -> some View {
        modifier(NeonBorderModifier(color: color, cornerRadius: cornerRadius, lineWidth: lineWidth))
    }

    func pulseGlow(_ color: Color, radius: CGFloat = 8) -> some View {
        modifier(PulseGlowModifier(color: color, radius: radius))
    }

    func cardStyle() -> some View {
        self
            .background(AppTheme.cardBackground)
            .clipShape(.rect(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.08), Color.white.opacity(0.02)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
    }

    func neonCardStyle(_ accentColor: Color = AppTheme.electricGreen) -> some View {
        self
            .background(
                LinearGradient(
                    colors: [AppTheme.cardBackground, AppTheme.deepNavy],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
            .clipShape(.rect(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(accentColor.opacity(0.2), lineWidth: 1)
            )
            .shadow(color: accentColor.opacity(0.08), radius: 12)
    }

    func gameBackground() -> some View {
        self.background(
            ZStack {
                AppTheme.deepNavy
                AppTheme.meshBackground.opacity(0.6)
            }
            .ignoresSafeArea()
        )
    }
}
