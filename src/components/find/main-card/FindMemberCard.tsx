"use client";

import { Crown, Minus, Plus } from "lucide-react";
import Avatar from "../../common/Avatar";
import CircleBtn from "../../common/button/CircleBtn";
import InviteMemberModal from "../InviteMemberModal";
import { useInviteStore } from "@/stores/inviteStore";
import { PostPartyMemberDetail } from "@/types/party";
import { kickOutMember } from "@/services/party.client";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBanUsersList } from "@/services/ban.client";
import { BanUser } from "@/types/userList";

type FindMemberCardType = "default" | "modal";
interface FindMemberCardProps {
  type: FindMemberCardType;
  PartyMemberData: PostPartyMemberDetail | null;
  isLeader: boolean;
  postId: number;
  partyId: number;
  currentCount: number;
  maxCount: number;
}

export default function FindMemberCard({
  type = "default",
  PartyMemberData,
  isLeader,
  postId,
  partyId,
  currentCount,
  maxCount,
}: FindMemberCardProps) {
  const { openInviteForm } = useInviteStore();
  const router = useRouter();
  const qc = useQueryClient();

  const {
    data: banUsersList,
    isLoading: banUsersListIsLoading,
    error: banUsersListError,
  } = useQuery({
    queryKey: ["BanUsers"],
    queryFn: () => getBanUsersList(),
  });

  const isPartyMemberBanned =
    banUsersList?.some(
      (banUser: BanUser) => banUser.userId === PartyMemberData?.userId,
    ) ?? false;

  if (PartyMemberData)
    return (
      <div className="bg-accent/10 border-accent/50 flex items-center justify-between rounded-xl border px-4 py-2">
        <div className="flex items-center gap-2">
          <Avatar
            type="profile"
            src={PartyMemberData.profileImage}
            size="sm"
            isBanned={isPartyMemberBanned}
          />
          <h4 className="font-bold">{PartyMemberData.nickname}</h4>
          {banUsersListIsLoading && (
            <h4 className="">(차단 상태를 불러오는 중)</h4>
          )}
        </div>
        {PartyMemberData.role === "LEADER" ? (
          <Crown size={18} strokeWidth={3} className="text-accent" />
        ) : (
          type === "default" &&
          isLeader && (
            <CircleBtn
              className="bg-negative hover:bg-negative/50 h-5 w-5"
              onClick={async (e) => {
                e.stopPropagation();
                await kickOutMember({
                  partyId: partyId,
                  memberId: PartyMemberData.partyMemberId,
                });

                await qc.invalidateQueries({
                  queryKey: [postId, "party"],
                });

                router.refresh();
              }}
            >
              <Minus />
            </CircleBtn>
          )
        )}
      </div>
    );
  else
    return (
      <div className="bg-bg-secondary border-bg-tertiary flex items-center justify-between rounded-xl border px-4 py-2">
        <div className="flex items-center gap-2">
          <Avatar type="profile" src="" size="sm" />
          <h4 className="flex items-center gap-1 font-bold">빈자리</h4>
        </div>
        {type === "modal" && isLeader && (
          <CircleBtn
            className="bg-accent hover:bg-accent/50 h-5 w-5"
            onClick={() => {
              openInviteForm();
            }}
          >
            <Plus />
          </CircleBtn>
        )}
        <InviteMemberModal
          postId={postId}
          partyId={partyId}
          currentCount={currentCount}
          maxCount={maxCount}
        />
      </div>
    );
}
