import { useAtom } from "jotai";
import { authClient } from "@/lib/auth-client";
import { userAtom } from "@/atoms/user";

export const useUser = () => {
  const [user] = useAtom(userAtom);
  return authClient.admin.getUser({
    query: {
      id: user?.id ?? "",
    },
  });
};
