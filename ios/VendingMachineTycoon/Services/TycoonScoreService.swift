import Foundation

enum TycoonScoreService {
    static func calculateTycoonScore(
        totalRevenue: Double,
        netWorth: Double,
        reputationScore: Double,
        successfulRestocks: Int,
        failedRestocks: Int,
        breakdowns: Int
    ) -> TycoonScore {
        let financialRaw = (totalRevenue * 0.4 + netWorth * 0.6) / 100.0
        let financialScore = min(5000, financialRaw) * 0.50

        let repNormalized = reputationScore / 5.0
        let operationalScore = min(3000, repNormalized * 3000) * 0.30

        let totalLogEvents = max(1, successfulRestocks + failedRestocks + breakdowns)
        let logSuccess = Double(successfulRestocks) / Double(totalLogEvents)
        let logPenalty = Double(breakdowns) * 50
        let logisticalScore = max(0, min(2000, logSuccess * 2000 - logPenalty)) * 0.20

        let total = Int(financialScore + operationalScore + logisticalScore)

        return TycoonScore(
            financialScore: financialScore,
            operationalScore: operationalScore,
            logisticalScore: logisticalScore,
            totalScore: total
        )
    }

    static func calculateEloChange(
        currentElo: Int,
        tycoonScore: Int,
        rank: Int,
        totalPlayers: Int
    ) -> Int {
        let percentile = 1.0 - (Double(rank) / Double(max(1, totalPlayers)))

        let baseChange: Int
        if percentile >= 0.95 {
            baseChange = 120
        } else if percentile >= 0.8 {
            baseChange = 80
        } else if percentile >= 0.5 {
            baseChange = 30
        } else if percentile >= 0.3 {
            baseChange = -10
        } else {
            baseChange = -40
        }

        let scoreBonus = tycoonScore / 100
        return baseChange + scoreBonus
    }
}
