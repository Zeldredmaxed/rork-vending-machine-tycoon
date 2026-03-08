import SwiftUI

struct ChatView: View {
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedConversation: ChatConversation?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    allianceBanner

                    ForEach(SampleData.conversations) { conversation in
                        Button {
                            selectedConversation = conversation
                        } label: {
                            conversationRow(conversation)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .gameBackground()
            .navigationTitle("Messages")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button {} label: {
                        Image(systemName: "square.and.pencil")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.neonCyan)
                    }
                }
            }
            .sheet(item: $selectedConversation) { conversation in
                ChatDetailSheet(conversation: conversation, viewModel: viewModel)
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private var allianceBanner: some View {
        let allianceCount = SampleData.conversations.filter(\.isAlliance).count
        return HStack(spacing: 10) {
            Image(systemName: "person.2.fill")
                .font(.subheadline)
                .foregroundStyle(AppTheme.neonCyan)
            VStack(alignment: .leading, spacing: 2) {
                Text("Active Alliances")
                    .font(.subheadline.bold())
                    .foregroundStyle(AppTheme.softWhite)
                Text("\(allianceCount) alliance\(allianceCount == 1 ? "" : "s") for bulk purchasing")
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
            }
            Spacer()
            Text("\(allianceCount)")
                .font(.headline.bold())
                .foregroundStyle(AppTheme.neonCyan)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(AppTheme.neonCyan.opacity(0.1))
                .clipShape(Capsule())
        }
        .padding(14)
        .neonCardStyle(AppTheme.neonCyan)
    }

    private func conversationRow(_ conversation: ChatConversation) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(conversation.isAlliance ? AppTheme.neonCyan.opacity(0.12) : AppTheme.cardBackground)
                    .frame(width: 44, height: 44)
                Circle()
                    .stroke(conversation.isAlliance ? AppTheme.neonCyan.opacity(0.3) : AppTheme.cardBorder, lineWidth: 1)
                    .frame(width: 44, height: 44)
                Text(String(conversation.participantName.prefix(2)).uppercased())
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(conversation.isAlliance ? AppTheme.neonCyan : AppTheme.dimText)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(conversation.participantName)
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.softWhite)
                    if conversation.isAlliance {
                        Text("ALLY")
                            .font(.system(size: 7, weight: .heavy))
                            .foregroundStyle(AppTheme.neonCyan)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(AppTheme.neonCyan.opacity(0.12))
                            .clipShape(Capsule())
                    }
                }
                Text(conversation.lastMessage)
                    .font(.caption)
                    .foregroundStyle(AppTheme.dimText)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 6) {
                Text(conversation.lastMessageTime, style: .relative)
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
                if conversation.unreadCount > 0 {
                    Text("\(conversation.unreadCount)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(AppTheme.electricGreen)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(12)
        .neonCardStyle(conversation.unreadCount > 0 ? AppTheme.electricGreen : AppTheme.cardBorder)
    }
}

struct ChatDetailSheet: View {
    let conversation: ChatConversation
    let viewModel: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var messageText: String = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(SampleData.chatMessages) { message in
                            messageBubble(message)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .scrollIndicators(.hidden)

                messageInput
            }
            .gameBackground()
            .navigationTitle(conversation.participantName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.charcoal, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 1) {
                        Text(conversation.participantName)
                            .font(.subheadline.bold())
                            .foregroundStyle(AppTheme.softWhite)
                        Text(conversation.participantBrand)
                            .font(.system(size: 9))
                            .foregroundStyle(AppTheme.dimText)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppTheme.deepNavy)
        .presentationDragIndicator(.visible)
        .presentationContentInteraction(.scrolls)
    }

    private func messageBubble(_ message: ChatMessage) -> some View {
        HStack {
            if message.isFromPlayer { Spacer(minLength: 60) }

            VStack(alignment: message.isFromPlayer ? .trailing : .leading, spacing: 4) {
                if !message.isFromPlayer {
                    Text(message.senderName)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(AppTheme.neonCyan)
                }
                Text(message.content)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.softWhite)
                Text(message.timestamp, style: .time)
                    .font(.system(size: 9))
                    .foregroundStyle(AppTheme.dimText)
            }
            .padding(12)
            .background(
                message.isFromPlayer
                    ? AppTheme.electricGreen.opacity(0.12)
                    : AppTheme.cardBackground
            )
            .clipShape(.rect(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        message.isFromPlayer
                            ? AppTheme.electricGreen.opacity(0.2)
                            : AppTheme.cardBorder,
                        lineWidth: 0.5
                    )
            )

            if !message.isFromPlayer { Spacer(minLength: 60) }
        }
    }

    private var messageInput: some View {
        HStack(spacing: 10) {
            TextField("Message...", text: $messageText)
                .textFieldStyle(.plain)
                .font(.subheadline)
                .foregroundStyle(AppTheme.softWhite)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(AppTheme.cardBackground)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(AppTheme.cardBorder, lineWidth: 1)
                )

            Button {} label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
                    .foregroundStyle(messageText.isEmpty ? AppTheme.dimText : AppTheme.electricGreen)
            }
            .disabled(messageText.isEmpty)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(AppTheme.charcoal.opacity(0.95))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.white.opacity(0.05))
                .frame(height: 0.5)
        }
    }
}
