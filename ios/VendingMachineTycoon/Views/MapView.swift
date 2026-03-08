import SwiftUI
import MapKit

struct GameMapView: View {
    let viewModel: GameViewModel
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840),
            span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
        )
    )
    @State private var selectedMachineID: String?
    @State private var showPlaceMachine = false
    @State private var showHeatmap = true
    @State private var showTurfZones = true
    @State private var showTurfWarning = false
    @State private var showRelocateSheet = false
    @State private var showSalvageConfirm = false
    @State private var showReportSheet = false
    @State private var relocatingMachine: VendingMachine?
    @State private var salvagingMachine: VendingMachine?
    @State private var reportingMachine: VendingMachine?

    var body: some View {
        NavigationStack {
            ZStack {
                mapContent
                mapHUD
                overlayControls
                if showTurfWarning {
                    turfWarningBanner
                }
                bottomMachineCard
            }
            .ignoresSafeArea(edges: .bottom)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "map.fill")
                            .font(.caption)
                            .foregroundStyle(AppTheme.neonCyan)
                        Text("TERRITORY MAP")
                            .font(.system(size: 13, weight: .heavy))
                            .tracking(1.5)
                            .foregroundStyle(AppTheme.softWhite)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showPlaceMachine = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.system(size: 11, weight: .bold))
                            Text("BUILD")
                                .font(.system(size: 10, weight: .heavy))
                        }
                        .foregroundStyle(AppTheme.deepNavy)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(AppTheme.electricGreen)
                        .clipShape(Capsule())
                    }
                }
            }
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showPlaceMachine) {
                PlaceMachineSheet(viewModel: viewModel)
            }
            .sheet(item: $relocatingMachine) { machine in
                RelocateMachineSheet(viewModel: viewModel, machine: machine)
            }
            .sheet(item: $reportingMachine) { machine in
                LocationReportSheet(viewModel: viewModel, machine: machine)
            }
            .confirmationDialog(
                "Salvage Machine",
                isPresented: $showSalvageConfirm,
                presenting: salvagingMachine
            ) { machine in
                Button("Salvage for \(viewModel.formatVB(machine.salvageValue))", role: .destructive) {
                    _ = viewModel.salvageMachine(machine.id)
                    selectedMachineID = nil
                }
                Button("Cancel", role: .cancel) {}
            } message: { machine in
                Text("This will permanently remove \(machine.name) and refund 50% of its value plus remaining inventory. This cannot be undone.")
            }
        }
    }

    private var mapContent: some View {
        Map(position: $cameraPosition, selection: $selectedMachineID) {
            ForEach(viewModel.machines) { machine in
                if showTurfZones && machine.hasTurfProtection {
                    MapCircle(center: machine.coordinate, radius: machine.turfRadius)
                        .foregroundStyle(turfColor(for: machine).opacity(0.08))
                        .stroke(turfColor(for: machine).opacity(0.5), lineWidth: 2)
                }

                Annotation(machine.name, coordinate: machine.coordinate, anchor: .bottom) {
                    machinePin(machine)
                }
                .tag(machine.id)
            }

            if showHeatmap {
                ForEach(heatmapZones, id: \.id) { zone in
                    MapCircle(center: zone.center, radius: zone.radius)
                        .foregroundStyle(zone.color.opacity(0.12))
                }
            }
        }
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .mapControlVisibility(.hidden)
    }

    private func machinePin(_ machine: VendingMachine) -> some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(statusColor(for: machine.status).opacity(0.2))
                    .frame(width: 46, height: 46)

                Circle()
                    .fill(AppTheme.charcoal)
                    .frame(width: 38, height: 38)
                    .overlay(
                        Circle()
                            .stroke(statusColor(for: machine.status), lineWidth: 2)
                    )

                VStack(spacing: 1) {
                    Image(systemName: machine.status == .broken ? "xmark.octagon.fill" : "cabinet.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(statusColor(for: machine.status))
                    Text("\(machine.products.count)")
                        .font(.system(size: 8, weight: .heavy))
                        .foregroundStyle(AppTheme.softWhite)
                }
            }
            .shadow(color: statusColor(for: machine.status).opacity(0.5), radius: 8)

            Image(systemName: "triangle.fill")
                .font(.system(size: 8))
                .foregroundStyle(AppTheme.charcoal)
                .rotationEffect(.degrees(180))
                .offset(y: -4)
        }
        .scaleEffect(selectedMachineID == machine.id ? 1.15 : 1.0)
        .animation(.spring(response: 0.3), value: selectedMachineID)
    }

    private func turfColor(for machine: VendingMachine) -> Color {
        switch machine.status {
        case .healthy: AppTheme.neonCyan
        case .lowStock: AppTheme.gold
        default: AppTheme.neonRed
        }
    }

    private var mapHUD: some View {
        VStack {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text("CITY OVERVIEW")
                            .font(.system(size: 9, weight: .heavy))
                            .tracking(1)
                            .foregroundStyle(AppTheme.neonCyan)
                        Circle()
                            .fill(AppTheme.electricGreen)
                            .frame(width: 5, height: 5)
                    }
                    Text("DISTRICT 7")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(AppTheme.softWhite)
                }
                .padding(10)
                .background(.ultraThinMaterial.opacity(0.9))
                .clipShape(.rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(AppTheme.neonCyan.opacity(0.2), lineWidth: 0.5)
                )
                .padding(.leading, 12)

                Spacer()
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private var overlayControls: some View {
        VStack {
            HStack {
                Spacer()
                VStack(spacing: 6) {
                    mapToggle(icon: "flame.fill", isOn: $showHeatmap, color: .orange, label: "Heat")
                    mapToggle(icon: "shield.fill", isOn: $showTurfZones, color: AppTheme.neonCyan, label: "Turf")
                }
                .padding(8)
                .background(.ultraThinMaterial.opacity(0.9))
                .clipShape(.rect(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
                )
                .padding(.trailing, 12)
            }
            Spacer()
        }
        .padding(.top, 8)
    }

    private func mapToggle(icon: String, isOn: Binding<Bool>, color: Color, label: String) -> some View {
        Button {
            isOn.wrappedValue.toggle()
        } label: {
            VStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(isOn.wrappedValue ? color : AppTheme.dimText)
                Text(label)
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(isOn.wrappedValue ? color : AppTheme.dimText)
            }
            .frame(width: 40, height: 40)
            .background(isOn.wrappedValue ? color.opacity(0.12) : Color.clear)
            .clipShape(.rect(cornerRadius: 8))
        }
    }

    private var turfWarningBanner: some View {
        VStack {
            HStack(spacing: 8) {
                Image(systemName: "shield.slash.fill")
                    .foregroundStyle(AppTheme.neonRed)
                Text("TURF PROTECTED — Cannot place machine here")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(AppTheme.neonRed.opacity(0.2))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(AppTheme.neonRed.opacity(0.5), lineWidth: 1))
            .padding(.top, 60)
            Spacer()
        }
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    private var bottomMachineCard: some View {
        VStack {
            Spacer()
            if let id = selectedMachineID,
               let machine = viewModel.machines.first(where: { $0.id == id }) {
                selectedMachineInfo(machine)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            } else {
                machineStatusBar
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.4), value: selectedMachineID)
    }

    private var machineStatusBar: some View {
        HStack(spacing: 16) {
            HStack(spacing: 6) {
                Text("FLEET STATUS:")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(AppTheme.dimText)
                Text("\(viewModel.healthyMachineCount)/\(viewModel.machines.count) Active")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(AppTheme.softWhite)
            }
            if !viewModel.alertMachines.isEmpty {
                HStack(spacing: 4) {
                    Text("ALERT:")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(AppTheme.neonRed)
                    Text("\(viewModel.alertMachines.count) Issue\(viewModel.alertMachines.count > 1 ? "s" : "")")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(AppTheme.gold)
                }
            }
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.06), lineWidth: 0.5)
        )
        .padding(.horizontal, 12)
        .padding(.bottom, 90)
    }

    private func selectedMachineInfo(_ machine: VendingMachine) -> some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(machine.name)
                        .font(.headline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    HStack(spacing: 6) {
                        HStack(spacing: 3) {
                            Circle()
                                .fill(statusColor(for: machine.status))
                                .frame(width: 6, height: 6)
                            Text(machine.status.rawValue)
                                .font(.caption2.bold())
                                .foregroundStyle(statusColor(for: machine.status))
                        }
                        if machine.hasTurfProtection {
                            HStack(spacing: 3) {
                                Image(systemName: "shield.checkered")
                                    .font(.system(size: 9))
                                Text("\(Int(machine.turfRadius))m")
                                    .font(.system(size: 10, weight: .bold))
                            }
                            .foregroundStyle(AppTheme.neonCyan)
                        }
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(viewModel.formatCurrency(machine.dailyRevenue))
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.electricGreen)
                    Text("/day")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(AppTheme.dimText)
                }
            }

            HStack(spacing: 14) {
                miniStat(icon: "person.2.fill", value: "\(machine.footTraffic)", label: "Traffic")
                miniStat(icon: "star.fill", value: String(format: "%.1f", machine.reputation), label: "Rating")
                miniStat(icon: "shippingbox.fill", value: "\(Int(machine.overallStockLevel * 100))%", label: "Stock")
                miniStat(icon: "wrench.fill", value: "\(machine.upgradeCount)", label: "Upgrades")
            }

            HStack(spacing: 8) {
                Button {
                    viewModel.restockMachine(machine)
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 11))
                        Text("Restock")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.electricGreen)

                Button {
                    relocatingMachine = machine
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.triangle.swap")
                            .font(.system(size: 11))
                        Text("Relocate")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.bordered)
                .tint(AppTheme.neonCyan)
            }

            HStack(spacing: 8) {
                Button {
                    salvagingMachine = machine
                    showSalvageConfirm = true
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.uturn.backward.circle.fill")
                            .font(.system(size: 11))
                        Text("Salvage")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.bordered)
                .tint(AppTheme.neonRed)

                Button {
                    reportingMachine = machine
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "flag.fill")
                            .font(.system(size: 11))
                        Text("Report")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.bordered)
                .tint(AppTheme.dimText)
            }
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .clipShape(.rect(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
        )
        .padding(.horizontal, 12)
        .padding(.bottom, 90)
    }

    private func miniStat(icon: String, value: String, label: String) -> some View {
        VStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(AppTheme.dimText)
            Text(value)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(AppTheme.softWhite)
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(AppTheme.dimText)
        }
        .frame(maxWidth: .infinity)
    }

    private func statusColor(for status: MachineStatus) -> Color {
        switch status {
        case .healthy: AppTheme.electricGreen
        case .lowStock: AppTheme.gold
        case .needsMaintenance: AppTheme.neonRed
        case .broken: Color.purple
        case .offline: AppTheme.dimText
        }
    }

    private var heatmapZones: [HeatmapZone] {
        [
            HeatmapZone(id: "h1", center: CLLocationCoordinate2D(latitude: 40.7580, longitude: -73.9855), radius: 400, color: AppTheme.electricGreen),
            HeatmapZone(id: "h2", center: CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840), radius: 500, color: AppTheme.electricGreen),
            HeatmapZone(id: "h3", center: CLLocationCoordinate2D(latitude: 40.7233, longitude: -73.9985), radius: 350, color: AppTheme.electricGreen),
            HeatmapZone(id: "h4", center: CLLocationCoordinate2D(latitude: 40.7350, longitude: -73.9900), radius: 300, color: AppTheme.neonCyan),
            HeatmapZone(id: "h5", center: CLLocationCoordinate2D(latitude: 40.7694, longitude: -73.9654), radius: 280, color: AppTheme.neonCyan),
        ]
    }
}

nonisolated struct HeatmapZone: Sendable {
    let id: String
    let center: CLLocationCoordinate2D
    let radius: Double
    let color: Color
}

struct PlaceMachineSheet: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var isDropping = false
    @State private var showClaimed = false
    @State private var shieldExpanding = false
    @State private var zoneCheckResult: (ZoneType, Bool)?
    @State private var isCheckingZone = false

    private var isAtMachineCap: Bool {
        !viewModel.canPlaceNewMachine
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                ZStack {
                    Circle()
                        .stroke(AppTheme.neonCyan.opacity(showClaimed ? 0.4 : 0), lineWidth: 2)
                        .frame(width: shieldExpanding ? 220 : 80, height: shieldExpanding ? 220 : 80)
                        .glow(AppTheme.neonCyan, radius: 8)
                        .animation(.easeOut(duration: 1.0), value: shieldExpanding)
                        .opacity(showClaimed ? 1 : 0)

                    Circle()
                        .fill(AppTheme.electricGreen.opacity(showClaimed ? 0.1 : 0))
                        .frame(width: showClaimed ? 180 : 80, height: showClaimed ? 180 : 80)
                        .animation(.easeOut(duration: 0.8), value: showClaimed)

                    if let result = zoneCheckResult, !result.1 {
                        Image(systemName: "nosign")
                            .font(.system(size: 72))
                            .foregroundStyle(AppTheme.neonRed)
                            .glow(AppTheme.neonRed, radius: 12)
                    } else {
                        Image(systemName: "mappin.circle.fill")
                            .font(.system(size: 72))
                            .foregroundStyle(AppTheme.electricGreen)
                            .offset(y: isDropping ? 0 : -120)
                            .opacity(isDropping ? 1 : 0)
                            .scaleEffect(showClaimed ? 1.1 : 1.0)
                            .glow(AppTheme.electricGreen, radius: showClaimed ? 12 : 0)
                            .animation(.spring(response: 0.5, dampingFraction: 0.5), value: isDropping)
                            .animation(.spring(response: 0.3), value: showClaimed)
                    }
                }

                if let result = zoneCheckResult, !result.1 {
                    VStack(spacing: 8) {
                        Text("Invalid Zoning")
                            .font(.title2.bold())
                            .foregroundStyle(AppTheme.neonRed)
                        Text("Machines cannot be placed in \(result.0.rawValue) zones.")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                            .multilineTextAlignment(.center)
                        HStack(spacing: 4) {
                            Image(systemName: result.0.icon)
                                .font(.caption)
                            Text(result.0.rawValue)
                                .font(.caption.bold())
                        }
                        .foregroundStyle(AppTheme.neonRed)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(AppTheme.neonRed.opacity(0.1))
                        .clipShape(Capsule())
                    }
                    .transition(.scale.combined(with: .opacity))
                } else if showClaimed {
                    VStack(spacing: 8) {
                        Text("Location Claimed!")
                            .font(.title2.bold())
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("Turf shield is now active")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.neonCyan)
                        HStack(spacing: 4) {
                            Image(systemName: "shield.checkered")
                                .font(.caption)
                            Text("200m protection radius")
                                .font(.caption.bold())
                        }
                        .foregroundStyle(AppTheme.neonCyan)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(AppTheme.neonCyan.opacity(0.1))
                        .clipShape(Capsule())
                        .padding(.top, 4)
                    }
                    .transition(.scale.combined(with: .opacity))
                } else if isAtMachineCap {
                    VStack(spacing: 12) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(AppTheme.gold)
                        Text("Machine Cap Reached")
                            .font(.title2.bold())
                            .foregroundStyle(AppTheme.gold)
                        Text("You've reached your \(viewModel.currentBusinessTier.name) limit of \(viewModel.maxMachines) machine\(viewModel.maxMachines == 1 ? "" : "s").")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                            .multilineTextAlignment(.center)

                        if let next = viewModel.currentBusinessTier.nextTier {
                            VStack(spacing: 8) {
                                Text("Unlock \(next.name) for up to \(next.maxMachines) machines")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(AppTheme.softWhite)
                                HStack(spacing: 16) {
                                    VStack(spacing: 2) {
                                        Text("Rep")
                                            .font(.system(size: 9, weight: .heavy))
                                            .foregroundStyle(AppTheme.dimText)
                                        Text("\(Int(viewModel.player.reputation))/\(Int(next.requiredReputation))")
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundStyle(viewModel.player.reputation >= next.requiredReputation ? AppTheme.electricGreen : AppTheme.gold)
                                    }
                                    VStack(spacing: 2) {
                                        Text("Revenue")
                                            .font(.system(size: 9, weight: .heavy))
                                            .foregroundStyle(AppTheme.dimText)
                                        Text("$\(Int(viewModel.player.totalRevenue))/$\(Int(next.requiredRevenue))")
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundStyle(viewModel.player.totalRevenue >= next.requiredRevenue ? AppTheme.electricGreen : AppTheme.gold)
                                    }
                                }
                            }
                            .padding(14)
                            .frame(maxWidth: .infinity)
                            .background(AppTheme.gold.opacity(0.06))
                            .clipShape(.rect(cornerRadius: 14))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(AppTheme.gold.opacity(0.2), lineWidth: 1)
                            )
                            .padding(.horizontal, 24)
                        }
                    }
                    .transition(.scale.combined(with: .opacity))
                } else {
                    VStack(spacing: 8) {
                        Text("Place Your Machine")
                            .font(.title2.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        Text("Travel to a real-world location to deploy\nyour vending machine using GPS")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                            .multilineTextAlignment(.center)

                        HStack(spacing: 12) {
                            zoneBadge(.commercial, allowed: true)
                            zoneBadge(.park, allowed: true)
                            zoneBadge(.residential, allowed: false)
                            zoneBadge(.highway, allowed: false)
                        }
                        .padding(.top, 8)
                    }
                }

                Spacer()

                if isAtMachineCap && !showClaimed {
                    Button {
                        dismiss()
                    } label: {
                        Text("Return to Map")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.gold)
                    .padding(.horizontal, 24)
                } else if zoneCheckResult != nil && !(zoneCheckResult?.1 ?? true) {
                    Button {
                        withAnimation(.spring) {
                            zoneCheckResult = nil
                        }
                    } label: {
                        Text("Try Another Location")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.neonCyan)
                    .padding(.horizontal, 24)
                } else if !showClaimed {
                    Button {
                        let lat = 40.758 + Double.random(in: -0.02...0.02)
                        let lon = -73.985 + Double.random(in: -0.02...0.02)
                        let (zone, allowed) = viewModel.validatePlacementZone(lat: lat, lon: lon)

                        if !allowed {
                            withAnimation(.spring) {
                                zoneCheckResult = (zone, allowed)
                            }
                        } else {
                            withAnimation { isDropping = true }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                                withAnimation(.spring) {
                                    showClaimed = true
                                    shieldExpanding = true
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "mappin.and.ellipse")
                            Text("Drop Claim Marker")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.electricGreen)
                    .padding(.horizontal, 24)
                    .sensoryFeedback(.impact(weight: .heavy), trigger: isDropping)
                } else {
                    Button {
                        dismiss()
                    } label: {
                        Text("Continue")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.electricGreen)
                    .padding(.horizontal, 24)
                }
            }
            .padding(.bottom, 32)
            .gameBackground()
            .navigationTitle("New Machine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppTheme.dimText)
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
    }

    private func zoneBadge(_ zone: ZoneType, allowed: Bool) -> some View {
        VStack(spacing: 4) {
            Image(systemName: zone.icon)
                .font(.system(size: 14))
                .foregroundStyle(allowed ? AppTheme.electricGreen : AppTheme.neonRed)
            Text(zone.rawValue)
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(AppTheme.dimText)
            Image(systemName: allowed ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.system(size: 10))
                .foregroundStyle(allowed ? AppTheme.electricGreen : AppTheme.neonRed)
        }
        .frame(width: 60)
        .padding(.vertical, 8)
        .background((allowed ? AppTheme.electricGreen : AppTheme.neonRed).opacity(0.06))
        .clipShape(.rect(cornerRadius: 10))
    }
}

struct RelocateMachineSheet: View {
    let viewModel: GameViewModel
    let machine: VendingMachine
    @Environment(\.dismiss) private var dismiss
    @State private var result: RelocationResult?
    @State private var isRelocating = false

    private var fee: Double {
        EventService.calculateRelocationFee(machine: machine)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(spacing: 12) {
                    Image(systemName: "arrow.triangle.swap")
                        .font(.system(size: 40))
                        .foregroundStyle(AppTheme.neonCyan)

                    Text("Relocate \(machine.name)")
                        .font(.title3.bold())
                        .foregroundStyle(AppTheme.softWhite)

                    Text("Move this machine to a new location.\nAll upgrades will be preserved.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.dimText)
                        .multilineTextAlignment(.center)
                }

                VStack(spacing: 12) {
                    detailRow(label: "Machine", value: machine.name)
                    detailRow(label: "Active Upgrades", value: "\(machine.activePowerUps.count)")
                    detailRow(label: "Relocation Fee", value: viewModel.formatVB(fee))
                    detailRow(label: "Your Balance", value: viewModel.formatVB(viewModel.player.competitionBucks))
                }
                .padding(16)
                .neonCardStyle(AppTheme.neonCyan)

                if viewModel.player.competitionBucks < fee {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption)
                        Text("Insufficient competition funds")
                            .font(.subheadline.bold())
                    }
                    .foregroundStyle(AppTheme.neonRed)
                }

                if let result {
                    HStack(spacing: 8) {
                        Image(systemName: result.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .foregroundStyle(result.success ? AppTheme.electricGreen : AppTheme.neonRed)
                        Text(result.message)
                            .font(.subheadline.bold())
                            .foregroundStyle(result.success ? AppTheme.electricGreen : AppTheme.neonRed)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity)
                    .background((result.success ? AppTheme.electricGreen : AppTheme.neonRed).opacity(0.08))
                    .clipShape(.rect(cornerRadius: 12))
                }

                Spacer()

                if result?.success == true {
                    Button { dismiss() } label: {
                        Text("Done")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.electricGreen)
                } else {
                    Button {
                        let newLat = machine.latitude + Double.random(in: -0.01...0.01)
                        let newLon = machine.longitude + Double.random(in: -0.01...0.01)
                        withAnimation(.spring) {
                            result = viewModel.relocateMachine(machine.id, newLat: newLat, newLon: newLon)
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.triangle.swap")
                            Text("Confirm Relocation — \(viewModel.formatVB(fee))")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.neonCyan)
                    .disabled(viewModel.player.competitionBucks < fee)
                }
            }
            .padding(24)
            .gameBackground()
            .navigationTitle("Relocate Machine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppTheme.dimText)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppTheme.dimText)
            Spacer()
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(AppTheme.softWhite)
        }
    }
}

struct LocationReportSheet: View {
    let viewModel: GameViewModel
    let machine: VendingMachine
    @Environment(\.dismiss) private var dismiss
    @State private var selectedReason: LocationReportReason?
    @State private var details: String = ""
    @State private var submitted = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if submitted {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(AppTheme.electricGreen)
                        Text("Report Submitted")
                            .font(.title2.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        Text("An admin will review this placement.")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.dimText)
                    }
                    .padding(.top, 40)

                    Spacer()

                    Button { dismiss() } label: {
                        Text("Done")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.electricGreen)
                } else {
                    Text("Report \(machine.name)")
                        .font(.headline)
                        .foregroundStyle(AppTheme.softWhite)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("REASON")
                            .font(.system(size: 10, weight: .heavy))
                            .tracking(1)
                            .foregroundStyle(AppTheme.dimText)

                        ForEach(LocationReportReason.allCases, id: \.rawValue) { reason in
                            Button {
                                selectedReason = reason
                            } label: {
                                HStack(spacing: 10) {
                                    Image(systemName: reason.icon)
                                        .font(.system(size: 14))
                                        .foregroundStyle(selectedReason == reason ? AppTheme.neonCyan : AppTheme.dimText)
                                        .frame(width: 24)
                                    Text(reason.rawValue)
                                        .font(.subheadline)
                                        .foregroundStyle(selectedReason == reason ? AppTheme.softWhite : AppTheme.dimText)
                                    Spacer()
                                    if selectedReason == reason {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(AppTheme.neonCyan)
                                    }
                                }
                                .padding(12)
                                .background(selectedReason == reason ? AppTheme.neonCyan.opacity(0.08) : AppTheme.cardBackground)
                                .clipShape(.rect(cornerRadius: 12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(selectedReason == reason ? AppTheme.neonCyan.opacity(0.3) : AppTheme.cardBorder, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("DETAILS (OPTIONAL)")
                            .font(.system(size: 10, weight: .heavy))
                            .tracking(1)
                            .foregroundStyle(AppTheme.dimText)
                        TextField("Add context...", text: $details, axis: .vertical)
                            .lineLimit(3...5)
                            .textFieldStyle(.plain)
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.softWhite)
                            .padding(12)
                            .background(AppTheme.cardBackground)
                            .clipShape(.rect(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(AppTheme.cardBorder, lineWidth: 1)
                            )
                    }

                    Spacer()

                    Button {
                        guard let reason = selectedReason else { return }
                        viewModel.submitLocationReport(machineId: machine.id, reason: reason, details: details)
                        withAnimation(.spring) { submitted = true }
                    } label: {
                        Text("Submit Report")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.neonRed)
                    .disabled(selectedReason == nil)
                }
            }
            .padding(24)
            .gameBackground()
            .navigationTitle("Report Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppTheme.dimText)
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
    }
}
