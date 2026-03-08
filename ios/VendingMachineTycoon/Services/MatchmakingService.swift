import Foundation

@Observable
@MainActor
class MatchmakingService {
    var isSearching = false
    var matchmakingProgress: Double = 0
    var matchmakingStatus: String = ""
    var estimatedBracketTier: EloBracketTier?
    var estimatedPlayersInBracket: Int = 0
    var isRegistrationOpen = false
    var isPracticeMode = false

    var registrationDeadline: Date {
        let cal = Calendar.current
        var comps = cal.dateComponents([.year, .month], from: Date())
        comps.day = 1
        comps.hour = 23
        comps.minute = 59
        comps.second = 59
        return cal.date(from: comps) ?? Date()
    }

    var nextSeasonStart: Date {
        let cal = Calendar.current
        var comps = cal.dateComponents([.year, .month], from: Date())
        comps.day = 2
        comps.hour = 0
        comps.minute = 0
        comps.second = 0
        return cal.date(from: comps) ?? Date()
    }

    var nextRegistrationOpen: Date {
        let cal = Calendar.current
        let now = Date()
        var comps = cal.dateComponents([.year, .month], from: now)
        comps.day = 1
        comps.hour = 0
        comps.minute = 0
        comps.second = 0
        guard let thisMonth = cal.date(from: comps) else { return now }
        if now > thisMonth {
            guard let nextMonth = cal.date(byAdding: .month, value: 1, to: thisMonth) else { return now }
            return nextMonth
        }
        return thisMonth
    }

    var daysUntilNextSeason: Int {
        let cal = Calendar.current
        let now = Date()
        let comps = cal.dateComponents([.year, .month], from: now)
        var nextComps = comps
        nextComps.month = (comps.month ?? 1) + 1
        nextComps.day = 2
        guard let nextStart = cal.date(from: nextComps) else { return 0 }
        return max(0, cal.dateComponents([.day], from: now, to: nextStart).day ?? 0)
    }

    func checkRegistrationWindow() {
        let cal = Calendar.current
        let now = Date()
        let day = cal.component(.day, from: now)
        isRegistrationOpen = day == 1
        isPracticeMode = day > 1
    }

    func startMatchmaking(playerElo: Int, region: TimezoneRegion) {
        isSearching = true
        matchmakingProgress = 0
        matchmakingStatus = "Initializing matchmaking..."
        estimatedBracketTier = EloBracketTier.tier(for: playerElo)

        let statuses = [
            (0.15, "Validating timezone region: \(region.displayName)..."),
            (0.30, "Scanning ELO database..."),
            (0.50, "Matching \(estimatedBracketTier?.rawValue ?? "")–tier competitors..."),
            (0.70, "Calculating bracket balance..."),
            (0.85, "Finalizing your bracket placement..."),
            (1.0, "Match found! Bracket locked."),
        ]

        Task {
            for (progress, status) in statuses {
                try? await Task.sleep(for: .milliseconds(800))
                matchmakingProgress = progress
                matchmakingStatus = status
            }
            estimatedPlayersInBracket = Int.random(in: 200...500)
            try? await Task.sleep(for: .milliseconds(500))
            isSearching = false
        }
    }

    func cancelMatchmaking() {
        isSearching = false
        matchmakingProgress = 0
        matchmakingStatus = ""
    }
}
