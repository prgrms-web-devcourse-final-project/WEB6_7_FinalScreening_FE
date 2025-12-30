"use client";

import * as React from "react";
import type { PostStatus } from "@/types/post";
import type {
  ChatHeaderUser,
  ChatMessage,
} from "@/components/common/chat/ChatFrame";
import {
  getChatMessages,
  getChatRoomDetail,
  markMessagesAsRead,
} from "@/services/chats.client";
import type { ChatRoom } from "@/hooks/chat/useChatRooms";
import {
  wsService,
  type ChatWebSocketMessage,
} from "@/services/websocket";

export function useChatRoomPanel(
  selectedRoomId: string,
  setRooms: React.Dispatch<React.SetStateAction<ChatRoom[]>>,
) {
  const [isLoadingRight, setIsLoadingRight] = React.useState<boolean>(false);
  const [isSending, setIsSending] = React.useState<boolean>(false);

  const [rightHeaderUser, setRightHeaderUser] =
    React.useState<ChatHeaderUser | null>(null);
  const [rightTitle, setRightTitle] = React.useState<React.ReactNode>(null);
  const [rightState, setRightState] = React.useState<PostStatus | null>(null);
  const [rightMessages, setRightMessages] = React.useState<ChatMessage[]>([]);

  // 상대방 정보를 저장 (WebSocket 메시지 수신 시 사용)
  const otherUserRef = React.useRef<{
    userId: number;
    nickname: string;
    profileImage: string | null;
  } | null>(null);

  // 채팅방 데이터 로드
  React.useEffect(() => {
    let cancelled = false;

    async function fetchRightPanel(chatId: string) {
      try {
        setIsLoadingRight(true);
        setRightMessages([]);

        const [detail, messageRes] = await Promise.all([
          getChatRoomDetail(chatId),
          getChatMessages(chatId, { size: 30 }),
        ]);

        if (cancelled) return;

        // 상대방 정보 저장
        otherUserRef.current = {
          userId: detail.otherUser.userId,
          nickname: detail.otherUser.nickname,
          profileImage: detail.otherUser.profileImage,
        };

        setRightHeaderUser({
          profileImageUrl: detail.otherUser.profileImage,
          gameNickname: detail.otherUser.gameNickname,
          gameTag: detail.otherUser.gameTag,
          communityNickname: detail.otherUser.nickname,
        });

        setRightTitle(`${detail.queueType} ${detail.memo}`);
        setRightState(detail.postStatus as PostStatus);

        const mapped: ChatMessage[] = messageRes.messages.map((m) => {
          const isOther = m.senderId === detail.otherUser.userId;
          return {
            id: String(m.chatMessageId),
            side: isOther ? "other" : "me",
            message: m.content,
            createdAt: m.createdAt,
            nickname: isOther ? detail.otherUser.nickname : undefined,
            avatarSrc: isOther
              ? (detail.otherUser.profileImage ?? "/default-avatar.png")
              : undefined,
          };
        });

        setRightMessages(mapped);

        // 읽음 처리: 마지막 메시지 ID로 읽음 표시
        if (messageRes.messages.length > 0) {
          const lastMessageId = Math.max(
            ...messageRes.messages.map((m) => m.chatMessageId),
          );
          markMessagesAsRead(chatId, lastMessageId)
            .then(() => {
              // 좌측 목록에서 unreadCount 초기화
              setRooms((prev) =>
                prev.map((r) =>
                  r.id === chatId ? { ...r, unreadCount: 0 } : r,
                ),
              );
            })
            .catch(() => {
              // 읽음 처리 실패 시 무시
            });
        }
      } catch (e) {
        console.warn(e);
        if (!cancelled) {
          setRightHeaderUser(null);
          setRightTitle(null);
          setRightState(null);
          setRightMessages([]);
          otherUserRef.current = null;
        }
      } finally {
        if (!cancelled) setIsLoadingRight(false);
      }
    }

    if (!selectedRoomId) {
      setRightHeaderUser(null);
      setRightTitle(null);
      setRightState(null);
      setRightMessages([]);
      otherUserRef.current = null;
      return;
    }

    fetchRightPanel(selectedRoomId);

    return () => {
      cancelled = true;
    };
  }, [selectedRoomId]);

  // WebSocket 구독
  React.useEffect(() => {
    if (!selectedRoomId) return;

    const handleMessage = (wsMessage: ChatWebSocketMessage) => {
      const otherUser = otherUserRef.current;
      const isOther = otherUser && wsMessage.senderId === otherUser.userId;

      const newMessage: ChatMessage = {
        id: String(wsMessage.chatMessageId),
        side: isOther ? "other" : "me",
        message: wsMessage.content,
        createdAt: wsMessage.createdAt,
        nickname: isOther ? otherUser.nickname : undefined,
        avatarSrc: isOther
          ? (otherUser.profileImage ?? "/default-avatar.png")
          : undefined,
      };

      // 중복 메시지 방지 (optimistic update와 겹칠 수 있음)
      setRightMessages((prev) => {
        // 이미 같은 ID의 메시지가 있으면 무시
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        // optimistic 메시지 교체 (임시 ID로 추가된 내 메시지)
        if (!isOther) {
          const optimisticIndex = prev.findIndex(
            (m) => m.id.startsWith("temp-") && m.message === newMessage.message,
          );
          if (optimisticIndex !== -1) {
            const updated = [...prev];
            updated[optimisticIndex] = newMessage;
            return updated;
          }
        }
        return [...prev, newMessage];
      });

      // 좌측 목록 프리뷰 갱신
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoomId
            ? {
                ...r,
                lastMessage: wsMessage.content,
                createdAt: wsMessage.createdAt,
              }
            : r,
        ),
      );

      // 상대방 메시지 수신 시 읽음 처리
      if (isOther) {
        markMessagesAsRead(selectedRoomId, wsMessage.chatMessageId).catch(
          () => {},
        );
      }
    };

    wsService.subscribe(selectedRoomId, handleMessage).catch((err) => {
      console.error("[WebSocket] Subscribe failed:", err);
    });

    return () => {
      wsService.unsubscribe(selectedRoomId);
    };
  }, [selectedRoomId, setRooms]);

  const handleSend = async (message: string) => {
    if (!selectedRoomId || isSending) return;

    const createdAt = new Date().toISOString();
    const tempId = `temp-${Math.random().toString(16).slice(2)}`;
    const optimistic: ChatMessage = {
      id: tempId,
      side: "me",
      message,
      createdAt,
    };

    // Optimistic UI 업데이트
    setRightMessages((prev) => [...prev, optimistic]);

    // 좌측 목록 프리뷰 갱신
    setRooms((prev) =>
      prev.map((r) =>
        r.id === selectedRoomId
          ? {
              ...r,
              lastMessage: message,
              createdAt,
            }
          : r,
      ),
    );

    try {
      setIsSending(true);
      await wsService.sendMessage(selectedRoomId, message);
    } catch (err) {
      console.error("[WebSocket] Send failed:", err);
      // 실패 시 optimistic 메시지 제거
      setRightMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  return {
    isLoadingRight,
    isSending,
    rightHeaderUser,
    rightTitle,
    rightState,
    rightMessages,
    handleSend,
  };
}
