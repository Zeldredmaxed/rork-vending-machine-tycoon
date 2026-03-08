import CoreLocation
import SwiftUI

@Observable
@MainActor
class LocationComplianceService: NSObject, CLLocationManagerDelegate {
    var isInRestrictedState = false
    var currentStateName: String?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    var hasCheckedLocation = false

    private let locationManager = CLLocationManager()
    private let geocoder = CLGeocoder()

    private let restrictedStates: Set<String> = [
        "Arizona", "Arkansas", "Connecticut", "Delaware",
        "Idaho", "Iowa", "Louisiana", "Montana",
        "Nevada", "South Dakota", "Tennessee", "Washington"
    ]

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        authorizationStatus = locationManager.authorizationStatus
    }

    func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
    }

    func checkCurrentJurisdiction() {
        locationManager.requestLocation()
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            await reverseGeocode(location)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            hasCheckedLocation = true
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            authorizationStatus = status
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                checkCurrentJurisdiction()
            }
        }
    }

    private func reverseGeocode(_ location: CLLocation) async {
        do {
            let placemarks = try await geocoder.reverseGeocodeLocation(location)
            if let state = placemarks.first?.administrativeArea {
                currentStateName = state
                isInRestrictedState = restrictedStates.contains(state)
            }
        } catch {}
        hasCheckedLocation = true
    }

    func minimumAgeForCurrentState() -> Int {
        guard let state = currentStateName else { return 18 }
        let twentyOneStates: Set<String> = [
            "Alabama", "Alaska", "Nebraska", "Utah", "Mississippi"
        ]
        return twentyOneStates.contains(state) ? 21 : 18
    }
}
