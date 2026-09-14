// =============================================================================
// CHAT PANEL (src/components/ChatPanel.tsx)
// =============================================================================
// A simple in-game chat panel for text communication between players.
// (Chat messages are handled locally — extend to use WS "chat" events in future)
// =============================================================================

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/state/useStore";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatPanelProps {
  onClose: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const { user } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    // Welcome message
    {
      id: "system-1",
      userId: "system",
      username: "System",
      text: "Welcome to the space! Use WASD or Arrow Keys to move.",
      timestamp: new Date(),
      isOwn: false,
    },
  ]);
  const [inputText, setInputText] = useState("");

  // Auto-scroll to the latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim() || !user) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      text: inputText.trim(),
      timestamp: new Date(),
      isOwn: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    // TODO: In a full implementation, send via WebSocket:
    // wsClient.sendChat({ text: inputText.trim() })
    // The server would broadcast it to all players in the space.
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Stop WASD from moving the character while typing in chat
    e.stopPropagation();
  };

  return (
    <div className="absolute bottom-14 right-4 w-72 h-80 glass-card flex flex-col overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-metaverse-border">
        <span className="text-sm font-bold text-white">💬 Space Chat</span>
        <button
          onClick={onClose}
          className="text-metaverse-muted hover:text-white text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-0.5 ${msg.isOwn ? "items-end" : "items-start"}`}
          >
            {/* Sender name */}
            <span className="text-xs text-metaverse-muted px-1">
              {msg.userId === "system" ? "🤖 System" : msg.username}
            </span>

            {/* Message bubble */}
            <div
              className={`max-w-[85%] px-3 py-1.5 rounded-lg text-xs text-white ${
                msg.userId === "system"
                  ? "bg-metaverse-accent/20 text-metaverse-accent"
                  : msg.isOwn
                    ? "bg-metaverse-accent"
                    : "bg-metaverse-surface border border-metaverse-border"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2 border-t border-metaverse-border">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-xs bg-metaverse-surface border border-metaverse-border rounded-lg px-3 py-2 text-white placeholder-metaverse-muted focus:outline-none focus:border-metaverse-accent"
        />
        <button
          onClick={handleSend}
          className="px-3 py-2 bg-metaverse-accent rounded-lg text-white text-xs font-medium hover:bg-metaverse-accent-hover transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
