import Foundation

nonisolated enum PayoutService {
    static let houseRakePercent: Double = 0.15
    static let winnerPercentile: Double = 0.40

    static func calculatePrizePool(totalPlayers: Int, entryFee: Double) -> Double {
        let totalFees = Double(totalPlayers) * entryFee
        return totalFees * (1.0 - houseRakePercent)
    }

    static func generatePayoutTiers(totalPlayers: Int, entryFee: Double) -> [PayoutTier] {
        let winnerCount = max(1, Int(ceil(Double(totalPlayers) * winnerPercentile)))
        let prizePool = calculatePrizePool(totalPlayers: totalPlayers, entryFee: entryFee)

        guard winnerCount > 1 else {
            return [PayoutTier(rank: 1, payout: prizePool, percentOfPool: 100, isBreakEven: false)]
        }

        let ratio = solveExponentialRatio(winnerCount: winnerCount, prizePool: prizePool, entryFee: entryFee)

        var tiers: [PayoutTier] = []
        var rawPayouts: [Double] = []

        for i in 0..<winnerCount {
            let exponent = Double(winnerCount - 1 - i)
            rawPayouts.append(entryFee * pow(ratio, exponent))
        }

        let rawSum = rawPayouts.reduce(0, +)
        let scaleFactor = prizePool / rawSum

        for i in 0..<winnerCount {
            let payout = rawPayouts[i] * scaleFactor
            let percentOfPool = (payout / prizePool) * 100
            let isBreakEven = i == winnerCount - 1
            tiers.append(PayoutTier(
                rank: i + 1,
                payout: payout,
                percentOfPool: percentOfPool,
                isBreakEven: isBreakEven
            ))
        }

        return tiers
    }

    static func payoutForRank(_ rank: Int, totalPlayers: Int, entryFee: Double) -> Double? {
        let winnerCount = max(1, Int(ceil(Double(totalPlayers) * winnerPercentile)))
        guard rank >= 1, rank <= winnerCount else { return nil }
        let tiers = generatePayoutTiers(totalPlayers: totalPlayers, entryFee: entryFee)
        return tiers.first { $0.rank == rank }?.payout
    }

    private static func solveExponentialRatio(winnerCount: Int, prizePool: Double, entryFee: Double) -> Double {
        let w = Double(winnerCount)
        var lo = 1.0001
        var hi = 100.0

        for _ in 0..<200 {
            let mid = (lo + hi) / 2.0
            let geometricSum = (pow(mid, w) - 1.0) / (mid - 1.0)
            let computedPool = entryFee * geometricSum
            if computedPool < prizePool {
                lo = mid
            } else {
                hi = mid
            }
        }

        return (lo + hi) / 2.0
    }
}

nonisolated struct PayoutTier: Identifiable, Codable, Sendable {
    var id: Int { rank }
    let rank: Int
    let payout: Double
    let percentOfPool: Double
    let isBreakEven: Bool
}

nonisolated struct SeasonPayoutSummary: Codable, Sendable {
    let totalPlayers: Int
    let entryFee: Double
    let totalEntryFees: Double
    let houseRake: Double
    let prizePool: Double
    let winnerCount: Int
    let tiers: [PayoutTier]
    let playerRank: Int
    let playerPayout: Double?

    var isPlayerWinner: Bool { playerPayout != nil }

    var topTiers: [PayoutTier] {
        Array(tiers.prefix(5))
    }

    var playerTier: PayoutTier? {
        tiers.first { $0.rank == playerRank }
    }

    var breakEvenTier: PayoutTier? {
        tiers.last
    }

    static func generate(totalPlayers: Int, entryFee: Double, playerRank: Int) -> SeasonPayoutSummary {
        let totalEntryFees = Double(totalPlayers) * entryFee
        let houseRake = totalEntryFees * PayoutService.houseRakePercent
        let prizePool = totalEntryFees - houseRake
        let tiers = PayoutService.generatePayoutTiers(totalPlayers: totalPlayers, entryFee: entryFee)
        let playerPayout = tiers.first { $0.rank == playerRank }?.payout

        return SeasonPayoutSummary(
            totalPlayers: totalPlayers,
            entryFee: entryFee,
            totalEntryFees: totalEntryFees,
            houseRake: houseRake,
            prizePool: prizePool,
            winnerCount: tiers.count,
            tiers: tiers,
            playerRank: playerRank,
            playerPayout: playerPayout
        )
    }
}
