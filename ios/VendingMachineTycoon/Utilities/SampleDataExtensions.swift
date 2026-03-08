import Foundation

extension SampleData {
    static let careerStats = CareerStats(
        seasonsPlayed: 6,
        bestRank: 3,
        allTimeRevenue: 142_500,
        totalPrizeEarnings: 4_812,
        machinesDeployed: 28,
        franchiseBadge: "Gold Entrepreneur",
        globalReputation: 4.6,
        lifetimeElo: 1480,
        bestTycoonScore: 1150,
        eloBracketTier: .silver
    )

    static let seasonResult = SeasonResult(
        seasonNumber: 7,
        finalRank: 2,
        totalPlayers: 487,
        startingCapital: 50_000,
        totalRevenue: 15_840,
        totalExpenses: 8_420,
        finalNetWorth: 57_420,
        prizeAmount: 2_656,
        isWinner: true,
        tycoonScore: TycoonScore(financialScore: 520, operationalScore: 310, logisticalScore: 195, totalScore: 1025),
        eloBracketTier: .silver,
        eloChange: 85
    )

    static let conversations: [ChatConversation] = [
        ChatConversation(id: "c1", participantName: "MegaVend", participantBrand: "MegaVend Empire", lastMessage: "Want to form a bulk buying alliance?", lastMessageTime: Date().addingTimeInterval(-1800), unreadCount: 2, isAlliance: false),
        ChatConversation(id: "c2", participantName: "SnackMaster", participantBrand: "SnackMaster Pro", lastMessage: "Nice placement on 5th Ave!", lastMessageTime: Date().addingTimeInterval(-7200), unreadCount: 0, isAlliance: true),
        ChatConversation(id: "c3", participantName: "VendQueen", participantBrand: "Royal Refreshments", lastMessage: "I'll undercut your prices downtown.", lastMessageTime: Date().addingTimeInterval(-14400), unreadCount: 1, isAlliance: false),
        ChatConversation(id: "c4", participantName: "DrinkBoss", participantBrand: "Hydrate Nation", lastMessage: "Let's split the SoHo district.", lastMessageTime: Date().addingTimeInterval(-28800), unreadCount: 0, isAlliance: true),
    ]

    static let chatMessages: [ChatMessage] = [
        ChatMessage(id: "m1", senderName: "MegaVend", senderBrand: "MegaVend Empire", content: "Hey, I noticed we're both stocking up on Cola Classic. Want to form a bulk buying alliance to get better rates?", timestamp: Date().addingTimeInterval(-3600), isFromPlayer: false),
        ChatMessage(id: "m2", senderName: "VendKing", senderBrand: "UrbanVend Co.", content: "That's a solid idea. How many units are you looking at per week?", timestamp: Date().addingTimeInterval(-3000), isFromPlayer: true),
        ChatMessage(id: "m3", senderName: "MegaVend", senderBrand: "MegaVend Empire", content: "Around 500 units. Together we could push for a 12% discount on wholesale.", timestamp: Date().addingTimeInterval(-2400), isFromPlayer: false),
        ChatMessage(id: "m4", senderName: "VendKing", senderBrand: "UrbanVend Co.", content: "Deal. Let's coordinate on the next market dip.", timestamp: Date().addingTimeInterval(-1800), isFromPlayer: true),
    ]

    static let cosmetics: [CosmeticItem] = [
        CosmeticItem(id: "cos1", name: "Midnight Chrome", description: "Sleek dark chrome finish with reflective highlights", costVB: 800, iconName: "moon.fill", isLimitedEdition: false, isPurchased: true, category: .skins),
        CosmeticItem(id: "cos2", name: "Neon Surge", description: "Pulsating neon green accent lines", costVB: 1200, iconName: "bolt.fill", isLimitedEdition: false, isPurchased: true, category: .wraps),
        CosmeticItem(id: "cos3", name: "Urban Slate", description: "Industrial concrete-inspired matte finish", costVB: 600, iconName: "square.grid.3x3.fill", isLimitedEdition: false, isPurchased: true, category: .skins),
        CosmeticItem(id: "cos4", name: "Gold Rush", description: "Premium gold metallic wrap with diamond pattern", costVB: 3500, iconName: "diamond.fill", isLimitedEdition: true, isPurchased: false, category: .designer),
        CosmeticItem(id: "cos5", name: "Cyber Punk", description: "Futuristic cyberpunk-inspired holographic wrap", costVB: 2800, iconName: "sparkle", isLimitedEdition: true, isPurchased: false, category: .wraps),
        CosmeticItem(id: "cos6", name: "Arctic Frost", description: "Ice blue gradient with snowflake accents", costVB: 2000, iconName: "snowflake", isLimitedEdition: false, isPurchased: false, category: .seasonal),
        CosmeticItem(id: "cos7", name: "Solar Flare", description: "Warm gradient from orange to deep red", costVB: 1500, iconName: "sun.max.fill", isLimitedEdition: false, isPurchased: false, category: .seasonal),
        CosmeticItem(id: "cos8", name: "Vuitton Collab", description: "Exclusive designer collaboration pattern", costVB: 8000, iconName: "crown.fill", isLimitedEdition: true, isPurchased: false, category: .designer),
    ]

    static let adNetworkStats = AdNetworkStats(
        totalImpressions: 42_580,
        dailyImpressions: 1_420,
        totalRevenue: 127.74,
        dailyRevenue: 4.26,
        activeMachines: 3,
        cpmRate: 3.0
    )

    static let referrals: [ReferralEntry] = [
        ReferralEntry(id: "r1", playerName: "CoolBreeze", status: .completed, joinDate: Date().addingTimeInterval(-86400 * 20), rewardClaimed: true),
        ReferralEntry(id: "r2", playerName: "SnackAttack", status: .active, joinDate: Date().addingTimeInterval(-86400 * 8), rewardClaimed: true),
        ReferralEntry(id: "r3", playerName: "QuickVend", status: .pending, joinDate: Date().addingTimeInterval(-86400 * 2), rewardClaimed: false),
    ]

    static let reputationHistory: [ReputationEvent] = [
        ReputationEvent(id: "rh1", title: "Machine maintained on time", points: 3, isPositive: true, timestamp: Date().addingTimeInterval(-3600), iconName: "wrench.fill"),
        ReputationEvent(id: "rh2", title: "Customer complaint — high prices", points: -2, isPositive: false, timestamp: Date().addingTimeInterval(-7200), iconName: "person.crop.circle.badge.exclamationmark"),
        ReputationEvent(id: "rh3", title: "Restocked during peak hours", points: 5, isPositive: true, timestamp: Date().addingTimeInterval(-14400), iconName: "shippingbox.fill"),
        ReputationEvent(id: "rh4", title: "Bill acceptor jam — slow fix", points: -3, isPositive: false, timestamp: Date().addingTimeInterval(-28800), iconName: "creditcard.trianglebadge.exclamationmark"),
        ReputationEvent(id: "rh5", title: "Alliance bulk discount", points: 2, isPositive: true, timestamp: Date().addingTimeInterval(-43200), iconName: "person.2.fill"),
        ReputationEvent(id: "rh6", title: "5-star customer rating", points: 4, isPositive: true, timestamp: Date().addingTimeInterval(-57600), iconName: "star.fill"),
        ReputationEvent(id: "rh7", title: "Machine vandalism unresolved", points: -4, isPositive: false, timestamp: Date().addingTimeInterval(-72000), iconName: "paintbrush.pointed.fill"),
        ReputationEvent(id: "rh8", title: "Quick maintenance response", points: 3, isPositive: true, timestamp: Date().addingTimeInterval(-86400), iconName: "bolt.fill"),
    ]

    static let disputeTickets: [DisputeTicket] = [
        DisputeTicket(id: "d1", category: .transactionError, machineId: "m1", transactionId: "tx_001", description: "Customer reported double charge on Cola purchase", status: .investigating, submittedDate: Date().addingTimeInterval(-86400 * 3), resolvedDate: nil),
        DisputeTicket(id: "d2", category: .machineIssue, machineId: "m4", transactionId: nil, description: "Machine jammed and took money without dispensing", status: .resolved, submittedDate: Date().addingTimeInterval(-86400 * 7), resolvedDate: Date().addingTimeInterval(-86400 * 5)),
        DisputeTicket(id: "d3", category: .billingProblem, machineId: nil, transactionId: "tx_042", description: "Prize payout not received after season end", status: .pending, submittedDate: Date().addingTimeInterval(-86400 * 1), resolvedDate: nil),
    ]

    static let transactionHistory: [TransactionRecord] = [
        TransactionRecord(id: "t1", type: .sale, amount: 142.50, description: "Downtown Hub daily sales", timestamp: Date().addingTimeInterval(-3600), walletType: .competition),
        TransactionRecord(id: "t2", type: .purchase, amount: 85.20, description: "Wholesale market purchase", timestamp: Date().addingTimeInterval(-7200), walletType: .competition),
        TransactionRecord(id: "t3", type: .deposit, amount: 50.00, description: "Season entry deposit", timestamp: Date().addingTimeInterval(-86400), walletType: .premium),
        TransactionRecord(id: "t4", type: .adRevenue, amount: 4.26, description: "Ad network daily payout", timestamp: Date().addingTimeInterval(-14400), walletType: .competition),
        TransactionRecord(id: "t5", type: .wage, amount: 45.00, description: "Marcus Johnson restock wage", timestamp: Date().addingTimeInterval(-28800), walletType: .competition),
        TransactionRecord(id: "t6", type: .prize, amount: 2656.00, description: "Season 6 prize payout (2nd place)", timestamp: Date().addingTimeInterval(-86400 * 5), walletType: .premium),
        TransactionRecord(id: "t7", type: .sale, amount: 98.25, description: "Central Park East daily sales", timestamp: Date().addingTimeInterval(-43200), walletType: .competition),
        TransactionRecord(id: "t8", type: .purchase, amount: 1200.00, description: "LED Lighting Kit", timestamp: Date().addingTimeInterval(-86400 * 2), walletType: .competition),
        TransactionRecord(id: "t9", type: .refund, amount: 50.00, description: "Vehicle breakdown repair refund", timestamp: Date().addingTimeInterval(-86400 * 3), walletType: .competition),
        TransactionRecord(id: "t10", type: .withdrawal, amount: 1000.00, description: "Bank withdrawal", timestamp: Date().addingTimeInterval(-86400 * 10), walletType: .premium),
    ]

    static let sampleAlliance = Alliance(
        id: "al1",
        name: "Urban Vending Syndicate",
        leaderName: "VendKing",
        members: [
            AllianceMember(id: "am1", playerName: "VendKing", brandName: "UrbanVend Co.", contribution: 2500, joinDate: Date().addingTimeInterval(-86400 * 15), isLeader: true),
            AllianceMember(id: "am2", playerName: "MegaVend", brandName: "MegaVend Empire", contribution: 3200, joinDate: Date().addingTimeInterval(-86400 * 12), isLeader: false),
            AllianceMember(id: "am3", playerName: "DrinkBoss", brandName: "Hydrate Nation", contribution: 1800, joinDate: Date().addingTimeInterval(-86400 * 8), isLeader: false),
        ],
        treasuryBalance: 7500,
        createdDate: Date().addingTimeInterval(-86400 * 15)
    )

    static let idleRecap = IdleRecapData(
        totalEarned: 342.75,
        itemsSold: 187,
        incidents: [
            IdleIncident(id: "ir1", title: "Machine #4 Jammed", description: "Bill acceptor jammed at 2:00 AM", iconName: "exclamationmark.triangle.fill", timestamp: Date().addingTimeInterval(-28800), isNegative: true),
            IdleIncident(id: "ir2", title: "Turf Shield Expired", description: "Protection shield on SoHo Corner expired at 4:30 AM", iconName: "shield.slash.fill", timestamp: Date().addingTimeInterval(-18000), isNegative: true),
            IdleIncident(id: "ir3", title: "Viral Trend Boost", description: "Cheese Puffs saw 3x demand overnight", iconName: "flame.fill", timestamp: Date().addingTimeInterval(-14400), isNegative: false),
        ],
        hoursOffline: 8.5
    )

    static let priceTrends: [String: [PriceTrendPoint]] = [
        "Cola Classic": (0..<24).map { h in
            PriceTrendPoint(id: "pt_cola_\(h)", hour: h, price: 0.52 + Double.random(in: -0.05...0.08))
        },
        "Cheese Puffs": (0..<24).map { h in
            PriceTrendPoint(id: "pt_cheese_\(h)", hour: h, price: 0.42 + Double.random(in: -0.03...0.12))
        },
        "Trail Mix": (0..<24).map { h in
            PriceTrendPoint(id: "pt_trail_\(h)", hour: h, price: 0.82 + Double.random(in: -0.06...0.1))
        },
    ]
}
