"use client";

import Avatar from "@/components/common/Avatar";
import { BoxButton } from "@/components/common/button/BoxButton";
import ClientApi from "@/lib/clientApi";
import { useMenuStore, useMyProfileMenuStore } from "@/stores/menuStore";
import { formatDateToDash } from "@/utils/formatDateToDot";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startTransition,
  useEffect,
  useOptimistic,
} from "react";
import LoadingBouncy from "../common/loading/LoadingBouncy";
import { getBanUsersList } from "@/services/ban.client";

export default function BanPageContent() {
  const { setMenu } = useMenuStore();
  const { setMenu: setProfileMenu } = useMyProfileMenuStore();

  const queryClient = useQueryClient();

  const { data: banList, isLoading } = useQuery({
    queryKey: ["ban"],
    queryFn: getBanUsersList,
  });
  const banListData = banList ?? [];
  const [optimisticBanList, addOptimistic] = useOptimistic(
    banListData,
    (state, targetUserId: number) =>
      state.filter((ban) => ban.userId !== targetUserId),
  );

  const cancelBanMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const res = await ClientApi(`/api/v1/users/me/blocks/${targetUserId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("차단 해제 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban"] });
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  useEffect(() => {
    setMenu("profile");
    setProfileMenu("ban");
  }, []);

  const cancelBan = (targetUserId: number) => {
    startTransition(async () => {
      addOptimistic(targetUserId);
      await cancelBanMutation.mutateAsync(targetUserId);
    });
  };

  if (isLoading) {
    return <LoadingBouncy />;
  }

  return (
    <div className="flex flex-col">
      <p className="text-content-main text-4xl font-bold">차단 목록</p>
      <div className="mt-7.5">
        <p className="text-content-secondary text-center text-base">
          총 {optimisticBanList.length}명의 유저
        </p>
        {/* 차단 목록 카드 */}

        {optimisticBanList.length > 0 && (
          <div className="border-border-primary mt-7.5 w-full overflow-hidden rounded-xl border text-base">
            {/* Header */}
            <div className="text-content-secondary bg-bg-primary grid h-13 grid-cols-[270px_1fr] px-5 py-4">
              <span>차단일시</span>
              <span>대상 유저</span>
            </div>

            {/* Body */}
            <div>
              {optimisticBanList.map((ban) => (
                <div
                  key={ban.userId}
                  className="border-border-primary grid h-17 grid-cols-[270px_1fr_120px] items-center border-t px-5 py-4"
                >
                  <p className="text-content-secondary">
                    {formatDateToDash(ban.blockedAt)}
                  </p>
                  {/* 유저 닉네임 */}
                  <div className="flex items-center gap-2">
                    <Avatar src={ban.profileImage ?? undefined} size="xs" type="profile" />
                    <span className="text-content-primary">{ban.nickname}</span>
                  </div>
                  <BoxButton
                    tone="black"
                    text="해제"
                    className="h-9 w-15.5 justify-self-end px-4 py-2 text-sm"
                    onClick={() => cancelBan(ban.userId)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
