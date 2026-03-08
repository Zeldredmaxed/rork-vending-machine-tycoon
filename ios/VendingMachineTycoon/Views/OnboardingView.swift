import SwiftUI

struct OnboardingView: View {
    @Binding var isOnboarded: Bool
    @State private var currentStep = 0
    @State private var ageConfirmed = false
    @State private var kycStatus: KYCStatus = .notStarted
    @State private var animateIn = false
    @State private var pulseGlow = false
    @State private var tosAccepted = false
    @State private var selectedDateOfBirth = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @State private var showDatePicker = false
    @State private var ageVerificationFailed = false
    @Environment(LocationComplianceService.self) private var locationService

    private var minimumAge: Int {
        locationService.minimumAgeForCurrentState()
    }

    private var isOldEnough: Bool {
        let calendar = Calendar.current
        let ageComponents = calendar.dateComponents([.year], from: selectedDateOfBirth, to: Date())
        return (ageComponents.year ?? 0) >= minimumAge
    }

    var body: some View {
        ZStack {
            AppTheme.deepNavy.ignoresSafeArea()
            AppTheme.meshBackground.opacity(0.6).ignoresSafeArea()

            switch currentStep {
            case 0: welcomeStep
            case 1: ageGateStep
            case 2: kycStep
            case 3: tutorialStep
            default: EmptyView()
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            withAnimation(.spring(response: 0.6)) { animateIn = true }
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) { pulseGlow = true }
        }
    }

    private var welcomeStep: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 20) {
                ZStack {
                    Circle()
                        .fill(AppTheme.electricGreen.opacity(0.06))
                        .frame(width: 160, height: 160)
                    Circle()
                        .fill(AppTheme.electricGreen.opacity(0.1))
                        .frame(width: 110, height: 110)
                    Circle()
                        .stroke(AppTheme.electricGreen.opacity(pulseGlow ? 0.5 : 0.15), lineWidth: 2)
                        .frame(width: 110, height: 110)
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(AppTheme.electricGreen)
                        .glow(AppTheme.electricGreen, radius: pulseGlow ? 14 : 6)
                }

                HStack(spacing: 0) {
                    Text("Vend")
                        .font(.system(size: 42, weight: .black))
                        .foregroundStyle(AppTheme.softWhite)
                    Text("FX")
                        .font(.system(size: 42, weight: .black))
                        .foregroundStyle(AppTheme.electricGreen)
                }

                Text("Real-money vending simulation.\nCompete. Strategize. Profit.")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.dimText)
                    .multilineTextAlignment(.center)
            }
            .opacity(animateIn ? 1 : 0)
            .offset(y: animateIn ? 0 : 30)

            Spacer()

            VStack(spacing: 14) {
                Button {
                    withAnimation(.spring) { currentStep = 1 }
                } label: {
                    Text("Get Started")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.electricGreen)

                Button {
                    withAnimation(.spring) { currentStep = 1 }
                } label: {
                    Text("I already have an account")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.neonCyan)
                }

                legalLinksFooter
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 48)
        }
    }

    private var ageGateStep: some View {
        VStack(spacing: 0) {
            stepHeader(step: 1, title: "Age Verification")

            Spacer()

            VStack(spacing: 24) {
                ZStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(AppTheme.cardBackground)
                        .frame(width: 90, height: 90)
                    Image(systemName: "person.badge.shield.checkmark.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(AppTheme.neonCyan)
                }

                VStack(spacing: 8) {
                    Text("Are you \(minimumAge) or older?")
                        .font(.title2.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    Text("Real-money competitions require age verification as mandated by law. The minimum age is \(minimumAge)+ in your jurisdiction.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                        .multilineTextAlignment(.center)
                }

                VStack(spacing: 12) {
                    Button {
                        showDatePicker.toggle()
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "calendar")
                                .font(.title3)
                                .foregroundStyle(AppTheme.neonCyan)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("DATE OF BIRTH")
                                    .font(.system(size: 9, weight: .heavy))
                                    .tracking(1)
                                    .foregroundStyle(AppTheme.dimText)
                                Text(selectedDateOfBirth, format: .dateTime.month(.wide).day().year())
                                    .font(.subheadline.bold())
                                    .foregroundStyle(AppTheme.softWhite)
                            }
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.caption)
                                .foregroundStyle(AppTheme.dimText)
                        }
                        .padding(14)
                        .background(AppTheme.cardBackground)
                        .clipShape(.rect(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(AppTheme.cardBorder, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)

                    if showDatePicker {
                        DatePicker("", selection: $selectedDateOfBirth, in: ...Date(), displayedComponents: .date)
                            .datePickerStyle(.wheel)
                            .labelsHidden()
                            .colorScheme(.dark)
                            .onChange(of: selectedDateOfBirth) { _, _ in
                                ageVerificationFailed = false
                            }
                    }

                    Button {
                        ageConfirmed.toggle()
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: ageConfirmed ? "checkmark.square.fill" : "square")
                                .font(.title3)
                                .foregroundStyle(ageConfirmed ? AppTheme.electricGreen : AppTheme.dimText)
                            Text("I confirm I am \(minimumAge) years of age or older and the date of birth above is accurate")
                                .font(.system(size: 12))
                                .foregroundStyle(AppTheme.softWhite)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(16)
                        .background(ageConfirmed ? AppTheme.electricGreen.opacity(0.06) : AppTheme.cardBackground)
                        .clipShape(.rect(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(ageConfirmed ? AppTheme.electricGreen.opacity(0.3) : AppTheme.cardBorder, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .sensoryFeedback(.selection, trigger: ageConfirmed)

                    if ageVerificationFailed {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.caption)
                            Text("You must be at least \(minimumAge) years old to use VendFX.")
                                .font(.caption)
                        }
                        .foregroundStyle(AppTheme.neonRed)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(AppTheme.neonRed.opacity(0.06))
                        .clipShape(.rect(cornerRadius: 8))
                    }
                }
            }
            .padding(.horizontal, 24)

            Spacer()

            Button {
                if isOldEnough && ageConfirmed {
                    withAnimation(.spring) { currentStep = 2 }
                } else {
                    ageVerificationFailed = true
                }
            } label: {
                Text("Continue")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.electricGreen)
            .disabled(!ageConfirmed)
            .padding(.horizontal, 24)
            .padding(.bottom, 48)
        }
    }

    private var kycStep: some View {
        VStack(spacing: 0) {
            stepHeader(step: 2, title: "Identity Verification")

            ScrollView {
                VStack(spacing: 24) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(AppTheme.cardBackground)
                            .frame(width: 90, height: 90)
                        Image(systemName: "doc.viewfinder.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(AppTheme.gold)
                    }
                    .padding(.top, 24)

                    VStack(spacing: 8) {
                        Text("KYC / AML Verification")
                            .font(.title3.bold())
                            .foregroundStyle(AppTheme.softWhite)

                        Text("To participate in real-money brackets, we need to verify your identity per federal regulations. This process uses Persona/Onfido for secure verification.")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                            .multilineTextAlignment(.center)
                    }

                    VStack(spacing: 10) {
                        kycRequirement(icon: "person.text.rectangle.fill", title: "Government-Issued ID", subtitle: "Passport, Driver's License, or State ID", status: kycStatus == .approved ? .approved : .notStarted)
                        kycRequirement(icon: "faceid", title: "Selfie Verification", subtitle: "Quick photo to match your ID", status: kycStatus == .approved ? .approved : .notStarted)
                        kycRequirement(icon: "number", title: "SSN Verification", subtitle: "Last 4 digits for identity confirmation", status: kycStatus == .approved ? .approved : .notStarted)
                        kycRequirement(icon: "mappin.and.ellipse", title: "Address & State Verification", subtitle: "Confirm your state of residence", status: kycStatus == .approved ? .approved : .notStarted)
                    }

                    HStack(spacing: 6) {
                        Image(systemName: "lock.shield.fill")
                            .font(.system(size: 10))
                        Text("Your data is encrypted with AES-256 and processed by our licensed KYC provider. We never store full SSN numbers.")
                            .font(.system(size: 10))
                    }
                    .foregroundStyle(AppTheme.dimText)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.neonCyan.opacity(0.04))
                    .clipShape(.rect(cornerRadius: 8))

                    if kycStatus == .notStarted {
                        Button {
                            withAnimation(.spring) { kycStatus = .pending }
                            Task {
                                try? await Task.sleep(for: .milliseconds(1500))
                                withAnimation(.spring) { kycStatus = .approved }
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "doc.viewfinder.fill")
                                Text("Start Verification")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(AppTheme.gold)
                    } else if kycStatus == .pending {
                        HStack(spacing: 10) {
                            ProgressView()
                                .tint(AppTheme.gold)
                            Text("Verifying your documents...")
                                .font(.subheadline.bold())
                                .foregroundStyle(AppTheme.gold)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity)
                        .background(AppTheme.gold.opacity(0.08))
                        .clipShape(.rect(cornerRadius: 14))
                    } else if kycStatus == .approved {
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.title3)
                                .foregroundStyle(AppTheme.electricGreen)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Verified!")
                                    .font(.headline)
                                    .foregroundStyle(AppTheme.electricGreen)
                                Text("You're cleared for real-money brackets.")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.dimText)
                            }
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(AppTheme.electricGreen.opacity(0.06))
                        .clipShape(.rect(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(AppTheme.electricGreen.opacity(0.2), lineWidth: 1)
                        )
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 120)
            }
            .scrollIndicators(.hidden)

            if kycStatus == .approved {
                Button {
                    withAnimation(.spring) { currentStep = 3 }
                } label: {
                    Text("Continue")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.electricGreen)
                .padding(.horizontal, 24)
                .padding(.bottom, 48)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }

    private func kycRequirement(icon: String, title: String, subtitle: String, status: KYCStatus) -> some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(status == .approved ? AppTheme.electricGreen.opacity(0.1) : AppTheme.cardBackground)
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundStyle(status == .approved ? AppTheme.electricGreen : AppTheme.dimText)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }
            Spacer()
            Image(systemName: status == .approved ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(status == .approved ? AppTheme.electricGreen : AppTheme.dimText)
        }
        .padding(12)
        .background(AppTheme.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(status == .approved ? AppTheme.electricGreen.opacity(0.2) : AppTheme.cardBorder, lineWidth: 1)
        )
    }

    private var tutorialStep: some View {
        VStack(spacing: 0) {
            stepHeader(step: 3, title: "How It Works")

            ScrollView {
                VStack(spacing: 16) {
                    tutorialCard(
                        number: "01",
                        icon: "dollarsign.circle.fill",
                        title: "Join a 30-Day Bracket",
                        description: "Pay the entry fee and receive 50,000 Vending Bucks to start your empire.",
                        color: AppTheme.electricGreen
                    )
                    tutorialCard(
                        number: "02",
                        icon: "mappin.and.ellipse",
                        title: "Place Machines via GPS",
                        description: "Travel to real-world locations and deploy virtual vending machines.",
                        color: AppTheme.neonCyan
                    )
                    tutorialCard(
                        number: "03",
                        icon: "cart.fill",
                        title: "Manage & Compete",
                        description: "Stock inventory, set prices, purchase power-ups, and outperform rivals.",
                        color: AppTheme.gold
                    )
                    tutorialCard(
                        number: "04",
                        icon: "trophy.fill",
                        title: "Win Real Prizes",
                        description: "Top 5 players in each bracket win real-world cash prizes.",
                        color: AppTheme.gold
                    )

                    HStack(spacing: 6) {
                        Image(systemName: "info.circle")
                            .font(.caption)
                        Text("No additional funds can be added to your Competition Wallet once a season begins.")
                            .font(.caption)
                    }
                    .foregroundStyle(AppTheme.dimText)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.neonRed.opacity(0.06))
                    .clipShape(.rect(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(AppTheme.neonRed.opacity(0.15), lineWidth: 0.5)
                    )

                    tosAgreementSection
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)
                .padding(.bottom, 120)
            }
            .scrollIndicators(.hidden)

            Button {
                withAnimation(.spring) { isOnboarded = true }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "play.fill")
                    Text("Enter the Game")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.electricGreen)
            .disabled(!tosAccepted)
            .padding(.horizontal, 24)
            .padding(.bottom, 48)
            .sensoryFeedback(.impact(weight: .heavy), trigger: isOnboarded)
        }
    }

    private var tosAgreementSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "doc.text.fill")
                    .font(.caption)
                    .foregroundStyle(AppTheme.neonCyan)
                Text("Legal Agreements")
                    .font(.headline)
                    .foregroundStyle(AppTheme.softWhite)
            }

            Button {
                tosAccepted.toggle()
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: tosAccepted ? "checkmark.square.fill" : "square")
                        .font(.title3)
                        .foregroundStyle(tosAccepted ? AppTheme.electricGreen : AppTheme.dimText)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("I have read and agree to the following:")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(AppTheme.softWhite)

                        VStack(alignment: .leading, spacing: 4) {
                            legalLink(title: "Terms of Service", url: "https://vendfx.app/terms")
                            legalLink(title: "Privacy Policy", url: "https://vendfx.app/privacy")
                            legalLink(title: "Dispute Resolution Process", url: "https://vendfx.app/disputes")
                            legalLink(title: "End User License Agreement (EULA)", url: "https://vendfx.app/eula")
                        }
                    }
                }
            }
            .buttonStyle(.plain)
            .sensoryFeedback(.selection, trigger: tosAccepted)
        }
        .padding(16)
        .neonCardStyle(tosAccepted ? AppTheme.electricGreen : AppTheme.dimText)
    }

    private func legalLink(title: String, url: String) -> some View {
        Link(destination: URL(string: url)!) {
            HStack(spacing: 4) {
                Text("•")
                    .font(.caption)
                Text(title)
                    .font(.system(size: 11, weight: .medium))
                    .underline()
                Image(systemName: "arrow.up.right.square")
                    .font(.system(size: 8))
            }
            .foregroundStyle(AppTheme.neonCyan)
        }
    }

    private var legalLinksFooter: some View {
        HStack(spacing: 16) {
            Link("Terms", destination: URL(string: "https://vendfx.app/terms")!)
            Text("•").foregroundStyle(AppTheme.dimText)
            Link("Privacy", destination: URL(string: "https://vendfx.app/privacy")!)
            Text("•").foregroundStyle(AppTheme.dimText)
            Link("EULA", destination: URL(string: "https://vendfx.app/eula")!)
        }
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(AppTheme.neonCyan.opacity(0.7))
        .padding(.top, 4)
    }

    private func tutorialCard(number: String, icon: String, title: String, description: String, color: Color) -> some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(color.opacity(0.1))
                    .frame(width: 56, height: 56)
                VStack(spacing: 2) {
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundStyle(color)
                    Text(number)
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(color.opacity(0.6))
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
                    .lineLimit(3)
            }
            Spacer()
        }
        .padding(14)
        .neonCardStyle(color)
    }

    private func stepHeader(step: Int, title: String) -> some View {
        HStack {
            Button {
                withAnimation(.spring) { currentStep = max(0, currentStep - 1) }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.headline)
                    .foregroundStyle(AppTheme.dimText)
            }
            Spacer()
            HStack(spacing: 6) {
                ForEach(1...3, id: \.self) { i in
                    Capsule()
                        .fill(i <= step ? AppTheme.electricGreen : Color.white.opacity(0.1))
                        .frame(width: i == step ? 24 : 12, height: 4)
                }
            }
            Spacer()
            Text("Step \(step)/3")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(AppTheme.dimText)
        }
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .padding(.bottom, 8)
    }
}
