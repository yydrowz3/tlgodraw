import { SparkleIcon, XIcon } from "@phosphor-icons/react";
import type { AiAgentConfigResponseDTO } from "@/types/api";
import type { AgentStatus } from "@/hooks/useWorkbench";
import type { ComponentProps } from "react";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";

type Props = {
  agents: AiAgentConfigResponseDTO[];
  status: AgentStatus;
  selectedId: string;
  disabled: boolean;
  onAgent: (id: string) => void;
  onRetry: () => void;
  onClose: () => void;
  messages: ComponentProps<typeof MessageList>;
  composer: ComponentProps<typeof MessageComposer>;
};
export function AssistantPanel(props: Props) {
  return (
    <>
      <div className="panel-heading">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SparkleIcon size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="agent-select">
              AI Assistant
            </label>
            <select
              id="agent-select"
              className="select select-ghost h-9 min-h-9 w-full min-w-0 pl-1 text-sm font-semibold"
              value={props.selectedId}
              disabled={props.disabled || props.status !== "ready"}
              onChange={(event) => props.onAgent(event.target.value)}
            >
              {props.status !== "ready" && (
                <option value="">
                  {props.status === "loading"
                    ? "Loading agents..."
                    : props.status === "empty"
                      ? "No agents available"
                      : "Unable to load agents"}
                </option>
              )}
              {props.agents.map((agent) => (
                <option key={agent.agentID} value={agent.agentID}>
                  {agent.agentName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="icon-button" aria-label="Close Assistant" onClick={props.onClose}>
          <XIcon size={20} aria-hidden="true" />
        </button>
      </div>
      {props.status !== "ready" && (
        <div className="border-b border-base-300 px-4 py-3 text-xs" role="status">
          {props.status === "loading" ? (
            <span className="flex items-center gap-2 text-base-content/60">
              <span className="loading loading-spinner loading-xs" />
              Loading agents...
            </span>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-base-content/60">
                {props.status === "empty" ? "No agents available" : "加载智能体列表失败"}
              </span>
              <button className="btn btn-ghost btn-sm min-h-11" onClick={props.onRetry}>
                Retry
              </button>
            </div>
          )}
        </div>
      )}
      <MessageList {...props.messages} />
      <MessageComposer {...props.composer} />
    </>
  );
}
