"use client";

import Avatar from "@/components/common/Avatar";
import { BoxButton } from "@/components/common/button/BoxButton";
import HorizontalCardContainer from "@/components/common/container/HorizontalCardContainer";
import IntroduceBubble from "@/components/profile/IntroduceBubble";
import TierSet from "@/components/profile/TierSet";
import WinRate from "@/components/profile/WinRate";
import ReviewCard from "@/components/review/ReviewCard";
import ReviewPercent from "@/components/review/ReviewPercent";
import Image from "next/image";
import LolLogo from "@/assets/images/games/lol/lol-logo.png";
import { UserProfile } from "@/types/profile";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GameAccount } from "@/types/game-account";
import { Unlink } from "lucide-react";
import { useGetFavoriteChampions } from "@/hooks/useGetFavoriteChampions";
import { twMerge } from "tailwind-merge";
import { useGetRanks } from "@/hooks/useGetRanks";
import { useGetUserReviewList } from "@/hooks/reviews/useGetUserReviewList";
import useGetReviewDistribution from "@/hooks/reviews/useGetReviewDistribution";
import RecentGameList from "./RecentGameList";
import ClientApi from "@/lib/clientApi";
import { useMenuStore } from "@/stores/menuStore";
import LoadingBouncy from "../common/loading/LoadingBouncy";
import { gameAccountRefreshAll } from "@/services/game-account/data.client";
import { RefreshCooldown } from "./RefreshCooldown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBanUsersList } from "@/services/ban.client";

const REFRESH_COOLDOWN_MS = 2 * 60 * 1000;

export default function ProfilePageContent({
  profileData,
  gameAccountData,
}: {
  profileData: UserProfile | null;
  gameAccountData: GameAccount | null;
}) {
  const router = useRouter();

  const queryClient = useQueryClient();

  const { setMenu } = useMenuStore();

  const gameAccountId = gameAccountData?.gameAccountId ?? 0;

  useEffect(() => {
    setMenu("");

    if (!profileData) {
      alert("유저 프로필을 불러올 수 없습니다.");
      router.back();
      return;
    }
  }, []);

  if (!profileData) return null;

  const { nickname, profile_image, comment } = profileData;

  const { data: banList, isLoading: isBanListLoading } = useQuery({
    queryKey: ["ban"],
    queryFn: getBanUsersList,
  });
  const banListData = banList ?? [];
  const isUserBlocked = banListData.some((ban) => ban.userId === profileData.id);

  const lolData =
    gameAccountData?.gameType === "LEAGUE_OF_LEGENDS" ||
    gameAccountData?.gameType === "리그 오브 레전드"
      ? gameAccountData
      : null;

  const { data: ChampionData, isLoading: ChampionDataIsLoading } =
    useGetFavoriteChampions(gameAccountId);

  const { data: RankData, isLoading: RankDataIsLoading } =
    useGetRanks(gameAccountId);

  const { data: reviewDistributionData, isLoading: distLoading } =
    useGetReviewDistribution(profileData.id);

  const { data: receivedReviewData, isLoading: receivedLoading } =
    useGetUserReviewList(profileData.id);

  const SoloQueue =
    RankData?.filter((r) => r.queueType === "RANKED_SOLO_5x5")[0] ?? null;
  const FlexQueue =
    RankData?.filter((r) => r.queueType === "RANKED_FLEX_SR")[0] ?? null;

  const banMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const res = await ClientApi(`/api/v1/users/${targetUserId}/blocks`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("차단 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban"] });
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const userBanHandler = async () => {
    await banMutation.mutateAsync(profileData.id);
  };

  const isLoading =
    ChampionDataIsLoading ||
    RankDataIsLoading ||
    distLoading ||
    receivedLoading;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownLeftMs, setCooldownLeftMs] = useState(0);

  const cooldownKey = `gameAccountRefreshCooldown:${gameAccountId}`;

  useEffect(() => {
    if (!gameAccountId) return;

    const tick = () => {
      const last = Number(localStorage.getItem(cooldownKey) ?? "0");
      const left = Math.max(0, last + REFRESH_COOLDOWN_MS - Date.now());
      setCooldownLeftMs(left);
    };

    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [gameAccountId]);

  const refreshHandler = async () => {
    if (!gameAccountId) return;
    if (isRefreshing || cooldownLeftMs > 0) return;

    try {
      localStorage.setItem(cooldownKey, String(Date.now()));
      setIsRefreshing(true);

      await gameAccountRefreshAll({
        gameAccountId,
        matchCount: 100,
      });
    } catch (e) {
      localStorage.removeItem(cooldownKey);
      alert("전적 갱신에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingBouncy />
      </div>
    );

  return (
    <section className="flex h-full w-full">
      <div className="flex h-full w-full flex-col gap-9">
        {/* 프로필 정보 */}
        <div className="mt-20 flex flex-col gap-5">
          <div className="flex flex-row gap-1 text-4xl font-bold">
            <p className="text-content-main">
              <span className="text-accent">{nickname}</span>
              님의 프로필
            </p>
          </div>
          <div className="flex flex-row items-center gap-8">
            <Avatar size="xl" src={profile_image ?? ""} type="profile" />
            <div className="flex flex-col gap-4">
              <div className="flex flex-row items-center justify-between">
                <span className="text-content-primary text-2xl font-semibold">
                  {nickname}
                </span>
                <BoxButton
                  size="sm"
                  tone="negative"
                  className={twMerge("w-12 py-3", isUserBlocked ? "pointer-events-none" : "")}
                  text={isUserBlocked ? "차단됨" : "차단"}
                  onClick={userBanHandler}
                  disabled={isBanListLoading || isUserBlocked || banMutation.isPending}
                />
              </div>
              <IntroduceBubble size="lg" content={comment} />
            </div>
          </div>
        </div>
        {/* 연동된 게임 정보 */}
        <div className="flex flex-col gap-4">
          <p className="text-content-main text-3xl font-bold">
            연동된 게임 정보
          </p>
          {/* 게임 탭*/}
          <div className="border-accent w-fit border-b-2">
            <div className="text-accent m-2 flex items-center gap-1 font-semibold">
              <Image src={LolLogo} alt="LoL logo" width={24} />
              <span>리그 오브 레전드</span>
            </div>
          </div>
          {lolData ? (
            <div className="flex flex-col justify-center gap-8">
              {/* 게임 프로필 정보 및 전적 갱신 버튼 */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <Avatar type="profile" src={lolData.profileIconUrl} />
                  <div className="flex items-center gap-2">
                    <span className="text-content-primary text-xl font-semibold">
                      {lolData.gameNickname}
                    </span>
                    <span className="text-content-secondary text-sm">
                      #{lolData.gameTag}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <BoxButton
                    tone={cooldownLeftMs > 0 ? "black" : "color"}
                    size="sm"
                    className="w-20 py-3"
                    text={isRefreshing ? "갱신중" : "전적 갱신"}
                    disabled={isRefreshing || cooldownLeftMs > 0}
                    onClick={refreshHandler}
                  />
                  {cooldownLeftMs > 0 && (
                    <RefreshCooldown cooldownLeftMs={cooldownLeftMs} />
                  )}
                </div>
              </div>
              {isRefreshing ? (
                <div className="flex w-full items-center justify-center py-16">
                  <LoadingBouncy />
                </div>
              ) : (
                <>
                  {/* 랭크 및 승률 정보 */}
                  <div className="m-auto grid w-[90%] grid-cols-[1fr_1fr_1fr] gap-5">
                    <HorizontalCardContainer className="flex flex-col items-center justify-center gap-2 border-none px-12 py-6">
                      <p className="text-semibold text-xl">
                        개인/2인 랭크 게임
                      </p>
                      <div className="flex flex-col">
                        {SoloQueue ? (
                          <TierSet tier={SoloQueue.tier} rank="I" />
                        ) : (
                          <TierSet tier="UNRANKED" rank="I" />
                        )}
                      </div>
                    </HorizontalCardContainer>
                    <HorizontalCardContainer className="flex flex-col items-center justify-center gap-2 border-none px-12 py-6">
                      <p className="text-semibold text-xl">자유 랭크 게임</p>
                      <div className="flex flex-col">
                        {FlexQueue ? (
                          <TierSet tier={FlexQueue.tier} rank="I" />
                        ) : (
                          <TierSet tier="UNRANKED" rank="I" />
                        )}
                      </div>
                    </HorizontalCardContainer>
                    <HorizontalCardContainer className="flex flex-col items-center justify-center gap-3 border-none px-12 py-6">
                      <p className="text-semibold text-xl">승률</p>
                      <div className="flex h-full flex-col items-center justify-center">
                        {RankData && RankData.length !== 0 ? (
                          RankData.map((r) => (
                            <div className="flex flex-col items-center">
                              <p className="text-content-secondary text-sm">
                                {r.queueType === "RANKED_SOLO_5x5"
                                  ? "솔로 랭크"
                                  : "자유 랭크"}
                              </p>
                              <WinRate
                                type="donut"
                                className="w-25"
                                winRate={r.winRate}
                                win={r.wins}
                                lose={r.losses}
                              />
                            </div>
                          ))
                        ) : (
                          <p className="text-content-secondary text-sm">
                            승률 데이터가 없습니다
                          </p>
                        )}
                      </div>
                    </HorizontalCardContainer>
                  </div>
                  {/* 최근선호 챔피언 */}
                  <div className="space-y-4">
                    <p className="text-xl font-semibold">
                      최근 선호 챔피언{" "}
                      <span className="text-content-primary text-lg font-medium">
                        (최근 20게임)
                      </span>
                    </p>
                    {ChampionData && ChampionData.length !== 0 ? (
                      <div className="flex gap-2">
                        {ChampionData.map((c) => (
                          <div
                            key={c.championId}
                            className="flex items-center gap-2"
                          >
                            <Image
                              src={c.championImageUrl}
                              alt={c.championName}
                              className="rounded-full"
                              width={50}
                              height={50}
                            />
                            <p className="text-content-secondary text-sm">
                              <span
                                className={twMerge(
                                  "text-accent",
                                  c.winRate < 50 && "text-content-primary",
                                )}
                              >
                                {Math.round(c.winRate)}%
                              </span>{" "}
                              ({c.wins}승 / {c.losses}패)
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-content-secondary">
                        최근 선호 챔피언 내역이 없습니다
                      </p>
                    )}
                  </div>
                  {/* 최근 게임 내역 */}
                  <div className="space-y-4">
                    <p className="text-xl font-semibold">최근 게임 내역</p>
                    <RecentGameList
                      gameAccountId={gameAccountData?.gameAccountId!}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="m-auto flex w-full flex-col items-center justify-center gap-6">
              <Unlink size={80} className="text-bg-tertiary" />
              <p className="text-content-secondary text-xl font-bold">
                연동된 계정이 없습니다
              </p>
            </div>
          )}
        </div>

        {/* 리뷰 내역 */}
        <div className="flex flex-col gap-4">
          <p className="text-content-main text-3xl font-bold">리뷰 내역</p>
          <div className="m-auto flex w-[90%] flex-col gap-12.5">
            {/* 리뷰 분포 */}
            <ReviewPercent
              type="default"
              distributionData={reviewDistributionData!}
            />
            {/* 리뷰 상세 내역 */}
            {receivedReviewData && receivedReviewData.length !== 0 ? (
              <div className="flex flex-col items-center gap-7.5">
                <p className="text-content-secondary text-center text-base">
                  총 {receivedReviewData.length}개의 리뷰
                </p>
                <div className="flex w-[70%] flex-col gap-2">
                  <ReviewCard
                    mode="received"
                    gameName="lol"
                    communityName="커뮤니티 닉네임"
                    content="리뷰내용"
                    emotion="GOOD"
                    createdAt="2025-12-12T00:12:00.000Z"
                    profileImageURL=""
                  />
                </div>
              </div>
            ) : (
              <p className="text-content-secondary text-center">
                리뷰 데이터가 없습니다
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
