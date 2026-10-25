import { useEffect, useRef, type ReactNode } from "react";

export function SidePanel({
  id,
  label,
  visible,
  overlay,
  side,
  onClose,
  children,
  inactive = false,
}: {
  id: string;
  label: string;
  visible: boolean;
  overlay: boolean;
  side: "left" | "right";
  onClose: () => void;
  children: ReactNode;
  inactive?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!visible || !overlay) return;
    const panel = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      [
        ...panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled]), input:not([disabled]), summary, [tabindex="0"]',
        ),
      ].filter(
        (item) => item.getClientRects().length > 0 && !item.closest("details:not([open]) ul"),
      );
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [visible, overlay]);
  return (
    <>
      {visible && overlay && (
        <button
          tabIndex={-1}
          className="fixed inset-0 z-40 bg-neutral/50 backdrop-blur-xs"
          aria-label={`Close ${label}`}
          onClick={onClose}
        />
      )}
      <aside
        ref={ref}
        id={id}
        aria-label={label}
        role={overlay ? "dialog" : "complementary"}
        aria-modal={overlay && visible ? true : undefined}
        hidden={!visible}
        inert={inactive}
        style={overlay ? { height: "var(--workbench-height, 100dvh)" } : undefined}
        className={`${visible ? "flex" : "hidden"} min-h-0 shrink-0 flex-col bg-base-100 ${side === "left" ? "w-64 border-r border-base-300" : "w-90 border-l border-base-300"} ${overlay ? `fixed inset-y-0 z-50 max-w-full shadow-xl ${side === "left" ? "left-0" : "right-0 w-full max-w-100"}` : "relative"}`}
      >
        {children}
      </aside>
    </>
  );
}
