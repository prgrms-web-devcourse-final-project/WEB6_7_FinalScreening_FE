"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { MessageCircle } from "lucide-react";

import ChatCard from "@/components/common/chat/ChatCard";
import ChatFrame from "@/components/common/chat/ChatFrame";

import { useMenuStore } from "@/stores/menuStore";

import { useChatRooms } from "@/hooks/chat/useChatRooms";
import { useChatRoomPanel } from "@/hooks/chat/useChatRoomPanel";

function SegmentedTabs() {
  return (
    <Tabs.List className="bg-bg-primary inline-flex rounded-full p-1">
      <Tabs.Trigger
        value="all"
        className={[
          "rounded-full px-4 py-2 text-sm",
          "text-content-secondary",
          "data-[state=active]:bg-bg-tertiary",
          "data-[state=active]:text-content-main",
          "outline-none",
        ].join(" ")}
      >
        전체
      </Tabs.Trigger>
      <Tabs.Trigger
        value="unread"
        className={[
          "rounded-full px-4 py-2 text-sm",
          "text-content-secondary",
          "data-[state=active]:bg-bg-tertiary",
          "data-[state=active]:text-content-main",
          "outline-none",
        ].join(" ")}
      >
        안 읽은 채팅방
      </Tabs.Trigger>
    </Tabs.List>
  );
}

function EmptyChatPanel() {
  return (
    <div className="border-border-primary bg-bg-secondary flex h-full w-full items-center justify-center rounded-xl border">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-bg-tertiary grid size-28 place-items-center rounded-2xl">
          <MessageCircle className="text-content-secondary size-10" />
        </div>
        <p className="text-content-secondary text-xl leading-relaxed">
          도착한 채팅을 확인하고
          <br />
          함께 파티를 즐겨봐요
        </p>
      </div>
    </div>
  );
}

export default function ChatPage({ params }: { params: { game: string } }) {
  const { setMenu } = useMenuStore();

  React.useEffect(() => {
    setMenu("chat");
  }, [setMenu]);

  const game = params.game;

  // 채팅방 목록 상태
  const {
    rooms,
    setRooms,
    selectedRoomId,
    setSelectedRoomId,
    isLoadingRooms,
    tab,
    setTab,
    filteredRooms,
  } = useChatRooms(game);

  const {
    isLoadingRight,
    isSending,
    rightHeaderUser,
    rightTitle,
    rightState,
    rightMessages,
    handleSend,
  } = useChatRoomPanel(selectedRoomId, setRooms);

  return (
    <main className="w-full px-6 py-8">
      <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-start lg:justify-center">
        {/* Left: Chat room list */}
        <section className="w-full lg:w-100">
          <Tabs.Root
            value={tab}
            onValueChange={(v) => setTab(v as "all" | "unread")}
          >
            <div className="mb-4 flex items-center">
              <SegmentedTabs />
            </div>

            <Tabs.Content value="all" className="outline-none">
              <div className="flex max-h-[70vh] flex-col gap-4 overflow-auto pr-1 lg:max-h-152.5">
                {isLoadingRooms ? (
                  <p className="text-content-secondary px-2 py-6 text-sm">
                    채팅방을 불러오는 중...
                  </p>
                ) : filteredRooms.length === 0 ? (
                  <p className="text-content-secondary px-2 py-6 text-sm">
                    채팅방이 없어요.
                  </p>
                ) : (
                  filteredRooms.map((room) => (
                    <ChatCard
                      key={room.id}
                      avatarSrc={
                        room.headerUser.profileImageUrl ?? "/default-avatar.png"
                      }
                      nickname={room.headerUser.communityNickname}
                      createdAt={room.createdAt}
                      message={room.lastMessage}
                      subMessage={room.title}
                      unreadCount={room.unreadCount}
                      onClick={() => setSelectedRoomId(room.id)}
                      isSelected={room.id === selectedRoomId}
                    />
                  ))
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="unread" className="outline-none">
              <div className="flex max-h-[70vh] flex-col gap-4 overflow-auto pr-1 lg:max-h-152.5">
                {isLoadingRooms ? (
                  <p className="text-content-secondary px-2 py-6 text-sm">
                    채팅방을 불러오는 중...
                  </p>
                ) : filteredRooms.length === 0 ? (
                  <p className="text-content-secondary px-2 py-6 text-sm">
                    채팅방이 없어요.
                  </p>
                ) : (
                  filteredRooms.map((room) => (
                    <ChatCard
                      key={room.id}
                      avatarSrc={
                        room.headerUser.profileImageUrl ?? "/default-avatar.png"
                      }
                      nickname={room.headerUser.communityNickname}
                      createdAt={room.createdAt}
                      message={room.lastMessage}
                      subMessage={room.title}
                      unreadCount={room.unreadCount}
                      onClick={() => setSelectedRoomId(room.id)}
                      isSelected={room.id === selectedRoomId}
                    />
                  ))
                )}
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </section>

        {/* Right: Chat panel */}
        <section className="w-full lg:w-225">
          {selectedRoomId ? (
            isLoadingRight || !rightHeaderUser || !rightState ? (
              <div className="border-border-primary bg-bg-secondary flex h-[60vh] w-full items-center justify-center rounded-xl border lg:h-214.75">
                <p className="text-content-secondary text-sm">
                  채팅 내용을 불러오는 중...
                </p>
              </div>
            ) : (
              <ChatFrame
                widthClassName="w-full"
                headerUser={rightHeaderUser}
                title={rightTitle}
                state={rightState}
                messages={rightMessages}
                onSend={handleSend}
                isSending={isSending}
              />
            )
          ) : (
            <div className="h-[60vh] lg:h-214.75">
              <EmptyChatPanel />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
