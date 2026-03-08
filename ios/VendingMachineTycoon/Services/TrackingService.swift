import AppTrackingTransparency
import SwiftUI

@Observable
@MainActor
class TrackingService {
    var trackingAuthorized = false
    var hasRequestedTracking = false

    func requestTrackingPermission() async {
        guard !hasRequestedTracking else { return }
        hasRequestedTracking = true

        let status = await ATTrackingManager.requestTrackingAuthorization()
        trackingAuthorized = (status == .authorized)
    }

    var currentStatus: ATTrackingManager.AuthorizationStatus {
        ATTrackingManager.trackingAuthorizationStatus
    }
}
