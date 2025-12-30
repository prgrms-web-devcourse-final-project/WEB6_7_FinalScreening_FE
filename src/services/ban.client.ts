import ClientApi from "@/lib/clientApi";
import { BanUser } from "@/types/userList";

export async function getBanUsersList() {
  const res = await ClientApi(`/api/v1/users/me/blocks`, {
    method: "GET",
  });

  if (!res.ok) {
    alert("차단 정보를 불러올 수 없습니다.");
    return null;
  }

  return (await res.json()) as BanUser[];
}