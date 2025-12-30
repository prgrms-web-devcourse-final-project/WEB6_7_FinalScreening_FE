export type UserList = {
  totalCount: number;
  users: SearchUser[];
};

export type SearchUser = {
  userId: number;
  nickname: string;
  profileImageUrl: null;
  bio: string;
  gameAccount:
    | {
        linked: true;
        gameName: string;
        tagLine: string;
      }
    | {
        linked: false;
      };
};

export type BanUser = {
  userId: number;
  nickname: string;
  profileImage: string | null;
  blockedAt: string
}