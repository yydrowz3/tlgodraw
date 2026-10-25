import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [message, setMessage] = useState<LoginMessage>(EMPTY_MESSAGE);
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(() => getUserInfo());
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLogin({ username, password }: LoginFormValues) {
    setMessage(EMPTY_MESSAGE);

    if (!username || !password) {
      setMessage({ key: "login.required", type: "error" });
      return;
    }

    if (username !== "admin" || password !== "admin") {
      setMessage({
        key: "login.invalid",
        type: "error",
      });
      return;
    }

    setUserInfo(username);
    setUserInfoState({ user: username, ts: Date.now() });
    setMessage({ key: "login.success", type: "info" });
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
    setMessage({ key: "login.demoFilled", type: "info" });
  }

  function handleLogout() {
    clearUserInfo();
    setUserInfoState(null);
    setMessage({ key: "login.loggedOut", type: "info" });
  }

  return {
    message: { text: message.key ? t(message.key) : "", type: message.type },
    isLoggedIn: Boolean(userInfo?.user),
    currentUser: userInfo?.user ?? "",
    form,
    handleFillDemo,
    handleLogout,
  };
}
