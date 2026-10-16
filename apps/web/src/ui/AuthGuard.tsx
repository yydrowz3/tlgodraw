import { getUserInfo } from "@/utils/cookie";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

type AuthGuardProps = {
  children: ReactNode;
};

function AuthGuard({ children }: AuthGuardProps) {
  const userInfo = getUserInfo();

  if (!userInfo?.user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

export default AuthGuard;
