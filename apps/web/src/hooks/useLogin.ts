import { EMPTY_MESSAGE, type LoginMessage } from "@/types/login";
import { clearUserInfo, getUserInfo, setUserInfo, type UserInfo } from "@/utils/cookie";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

type LoginFormValues = {
  username: string;
  password: string;
};

export function useLogin() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<LoginMessage>(EMPTY_MESSAGE);
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(() => getUserInfo());
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLogin({ username, password }: LoginFormValues) {
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

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    } satisfies LoginFormValues,
    onSubmit: ({ value }) => handleLogin(value),
  });

  useEffect(() => {
    if (userInfo?.user) navigate({ to: "/" });
  }, [navigate, userInfo]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  function handleFillDemo() {
    form.setFieldValue("username", "admin");
    form.setFieldValue("password", "admin");
    setMessage({ text: "Demo account filled.", type: "info" });
  }

  function handleLogout() {
    clearUserInfo();
    setUserInfoState(null);
    setMessage({ text: "Logged out, cookie cleared.", type: "info" });
  }

  return {
    message,
    isLoggedIn: Boolean(userInfo?.user),
    currentUser: userInfo?.user ?? "",
    form,
    handleFillDemo,
    handleLogout,
  };
}
