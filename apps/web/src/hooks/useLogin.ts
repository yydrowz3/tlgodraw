import { EMPTY_MESSAGE, type LoginMessage } from "@/types/login";
import { clearUserInfo, getUserInfo, setUserInfo, type UserInfo } from "@/utils/cookie";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function useLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<LoginMessage>(EMPTY_MESSAGE);
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(() => getUserInfo());
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (userInfo?.user) navigate({ to: "/" });
  }, [navigate, userInfo]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    setMessage(EMPTY_MESSAGE);

    if (!username || !password) {
      setMessage({ text: "Please fill in your username and password.", type: "error" });
      return;
    }

    if (username !== "admin" || password !== "admin") {
      setMessage({
        text: "Username or password is incorrect (Demo account: admin / admin).",
        type: "error",
      });
      return;
    }

    setUserInfo(username);
    setUserInfoState({ user: username, ts: Date.now() });
    setMessage({ text: "Login successful, redirecting…", type: "info" });
    redirectTimer.current = setTimeout(() => navigate({ to: "/" }), 500);
  }

  function handleFillDemo() {
    setUsername("admin");
    setPassword("admin");
    setMessage({ text: "Demo account filled.", type: "info" });
  }

  function handleLogout() {
    clearUserInfo();
    setUserInfoState(null);
    setMessage({ text: "Logged out, cookie cleared.", type: "info" });
  }

  return {
    username,
    password,
    message,
    isLoggedIn: Boolean(userInfo?.user),
    currentUser: userInfo?.user ?? "",
    setUsername,
    setPassword,
    handleLogin,
    handleFillDemo,
    handleLogout,
  };
}
