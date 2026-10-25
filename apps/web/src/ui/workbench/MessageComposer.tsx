import { ArrowClockwiseIcon, PaperPlaneTiltIcon, StackIcon } from "@phosphor-icons/react";
import { quickActions } from "@/utils/quickActions";

type Props = {
  value: string;
  onChange: (value: string) => void;
  isSending: boolean;
  disabled: boolean;
  context: boolean;
  onContext: () => void;
  showQuickActions: boolean;
  onSend: () => void;
  onRestart: () => void;
};
export function MessageComposer(props: Props) {
  return (
    <div className="shrink-0 border-t border-base-300 bg-base-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {props.showQuickActions && (
        <div className="mb-3 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="btn btn-outline min-h-11 h-auto border-primary/20 px-3 py-2 text-xs font-medium text-primary"
              onClick={() => props.onChange(action.text)}
              disabled={props.isSending}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button
          className={`btn btn-sm min-h-11 gap-1.5 text-xs ${props.context ? "border-primary/30 bg-primary/10 text-primary" : "btn-ghost"}`}
          onClick={props.onContext}
          aria-pressed={props.context}
        >
          <StackIcon size={17} aria-hidden="true" />
          携带画布上下文
        </button>
        <span className="text-[11px] text-base-content/50">
          <kbd className="kbd kbd-xs">Ctrl/⌘</kbd> + <kbd className="kbd kbd-xs">Enter</kbd>
        </span>
      </div>
      <div className="flex items-end gap-1 rounded-xl border border-base-300 bg-base-200 p-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <textarea
          aria-label="描述您的绘图需求"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.metaKey || event.ctrlKey) &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              props.onSend();
            }
          }}
          placeholder={props.isSending ? "绘图助手正在响应中..." : "描述您的绘图需求..."}
          disabled={props.isSending}
          className="textarea max-h-48 min-h-20 min-w-0 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm focus:outline-none"
          rows={2}
        />
        <div className="flex shrink-0 flex-col gap-1">
          <button
            className="btn btn-primary btn-square min-h-11 min-w-11"
            onClick={props.onSend}
            disabled={!props.value.trim() || props.isSending || props.disabled}
            aria-label="Send message"
          >
            {props.isSending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <PaperPlaneTiltIcon size={18} aria-hidden="true" />
            )}
          </button>
          <button
            className="icon-button text-base-content/50"
            disabled={props.isSending || props.disabled}
            onClick={props.onRestart}
            aria-label="Restart Session"
          >
            <ArrowClockwiseIcon size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-base-content/50">
        {props.isSending
          ? "AI is generating response..."
          : "AI can make mistakes. Please verify important info."}
      </p>
    </div>
  );
}
