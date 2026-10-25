import { useTranslation } from "react-i18next";
import { RobotIcon, UserIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import type { Message } from "@/types/draw";

export function MessageList({
  messages,
  isSending,
  visible,
}: {
  messages: Message[];
  isSending: boolean;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible)
      end.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "end",
      });
  }, [messages, isSending, visible]);
  return (
    <div
      className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-base-200/50 p-4"
      role="log"
      aria-label={t("assistant.messages")}
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat ${message.role === "user" ? "chat-end" : "chat-start"}`}
        >
          <div className="avatar chat-image placeholder">
            <div
              className={`flex size-8 items-center justify-center rounded-full ${message.role === "user" ? "bg-primary/15 text-primary" : "border border-base-300 bg-base-100 text-primary"}`}
            >
              {message.role === "user" ? (
                <UserIcon size={18} aria-hidden="true" />
              ) : (
                <RobotIcon size={18} aria-hidden="true" />
              )}
            </div>
          </div>
          <div className="chat-header mb-1 text-xs text-base-content/50">
            {message.role === "user" ? t("assistant.you") : t("assistant.agent")}
          </div>
          <div
            className={`chat-bubble max-w-[90%] whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere] ${message.role === "user" ? "chat-bubble-primary" : "border border-base-300 bg-base-100 text-base-content"}`}
          >
            {message.kind === "greeting" ? t("assistant.greeting") : message.content}
          </div>
        </div>
      ))}
      {isSending && (
        <div className="flex items-center gap-2 text-xs text-base-content/60" role="status">
          <span className="loading loading-dots loading-sm text-primary" />
          {t("assistant.generating")}
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
