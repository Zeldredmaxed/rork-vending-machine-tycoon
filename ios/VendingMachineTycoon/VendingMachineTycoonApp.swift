import SwiftUI

@main
struct VendingMachineTycoonApp: App {
    @State private var trackingService = TrackingService()
    @State private var locationService = LocationComplianceService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(trackingService)
                .environment(locationService)
                .task {
                    try? await Task.sleep(for: .seconds(1))
                    await trackingService.requestTrackingPermission()
                    locationService.requestLocationPermission()
                }
        }
    }
}
