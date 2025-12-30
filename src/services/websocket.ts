"use client";

import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

type MessageHandler = (message: ChatWebSocketMessage) => void;

export type ChatWebSocketMessage = {
  chatMessageId: number;
  chatRoomId: number;
  senderId: number;
  content: string;
  messageType: string;
  createdAt: string;
};

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private accessToken: string | null = null;
  private connecting: boolean = false;
  private connectPromise: Promise<void> | null = null;

  private getSockJsUrl(): string {
    return `${process.env.NEXT_PUBLIC_API_URL}/ws`;
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const res = await fetch("/api/auth/token");
      if (!res.ok) return null;
      const data = await res.json();
      return data.accessToken;
    } catch {
      return null;
    }
  }

  async connect(): Promise<void> {
    if (this.client?.connected) return;
    if (this.connecting && this.connectPromise) return this.connectPromise;

    this.connecting = true;

    this.accessToken = await this.getAccessToken();
    if (!this.accessToken) {
      this.connecting = false;
      throw new Error("No access token available");
    }

    const sockJsUrl = this.getSockJsUrl();

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.client = new Client({
        webSocketFactory: () => new SockJS(sockJsUrl),
        connectHeaders: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          this.connecting = false;
          resolve();
        },
        onStompError: (frame) => {
          this.connecting = false;
          reject(new Error(frame.headers.message));
        },
      });

      this.client.activate();
    });

    return this.connectPromise;
  }

  disconnect(): void {
    if (this.client) {
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();
      this.messageHandlers.clear();
      this.client.deactivate();
      this.client = null;
    }
  }

  async subscribe(roomId: string, handler: MessageHandler): Promise<void> {
    await this.connect();

    if (!this.client?.connected) {
      throw new Error("WebSocket not connected");
    }

    const destination = `/sub/chats/${roomId}`;

    if (this.subscriptions.has(roomId)) {
      const handlers = this.messageHandlers.get(roomId) || [];
      handlers.push(handler);
      this.messageHandlers.set(roomId, handlers);
      return;
    }

    const subscription = this.client.subscribe(
      destination,
      (message: IMessage) => {
        try {
          const parsed: ChatWebSocketMessage = JSON.parse(message.body);
          const handlers = this.messageHandlers.get(roomId) || [];
          handlers.forEach((h) => h(parsed));
        } catch {
          // 파싱 실패 시 무시
        }
      },
    );

    this.subscriptions.set(roomId, subscription);
    this.messageHandlers.set(roomId, [handler]);
  }

  unsubscribe(roomId: string): void {
    const subscription = this.subscriptions.get(roomId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(roomId);
      this.messageHandlers.delete(roomId);
    }
  }

  async sendMessage(roomId: string, content: string): Promise<void> {
    await this.connect();

    if (!this.client?.connected) {
      throw new Error("WebSocket not connected");
    }

    const destination = `/pub/chats/${roomId}/messages`;

    this.client.publish({
      destination,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        messageType: "TEXT",
        content,
      }),
    });
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

// 싱글톤 인스턴스
export const wsService = new WebSocketService();
