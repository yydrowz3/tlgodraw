import { chat, createSession, queryAiAgentConfigList } from "@/services/apiAgent";
import { useSessions } from "@/hooks/useSessions";
import type { AiAgentConfigResponseDTO } from "@/types/api";
import type { Message, Session } from "@/types/draw";
import { clearUserInfo, getUserInfo } from "@/utils/cookie";
import { isDrawIoXmlContent } from "@/utils/draw";
import { Icons } from "@/utils/icons";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { DrawIoEmbed, type DrawIoEmbedRef } from "react-drawio";

function Workbench() {
  const navigate = useNavigate();
  const [imgData, setImgData] = useState<string | null>(null);
  const drawioRef = useRef<DrawIoEmbedRef>(null);

  // User State
  const [currentUser, setCurrentUser] = useState("");

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(true);
  const {
    sessions,
    currentSessionId,
    messages,
    sessionId,
    setMessages,
    setSessionId,
    createNewSession,
    loadSession,
    deleteSession,
    renameSession,
    updateCurrentSession,
  } = useSessions();
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Context State
  const [useHistoryContext, setUseHistoryContext] = useState(false);
  const [lastExportedData, setLastExportedData] = useState<{
    data: string;
    timestamp: number;
  } | null>(null);
  const isExportingForChatRef = useRef(false);
  const isAutosaveRef = useRef(false);
  const pendingMessageRef = useRef("");
  const exportTimeoutRef = useRef<number | null>(null);
  const [isDrawIoReady, setIsDrawIoReady] = useState(false);
  const initialLoadDoneRef = useRef(false);

  // Agent State
  const [agents, setAgents] = useState<AiAgentConfigResponseDTO[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");

  // Rename State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState("");

  // Session Management State
  const currentSessionRef = useRef(currentSessionId);

  // Update ref
  useEffect(() => {
    currentSessionRef.current = currentSessionId;
  }, [currentSessionId]);

  // Handle Initial Load
  useEffect(() => {
    if (!initialLoadDoneRef.current && isDrawIoReady && currentSessionId && sessions.length > 0) {
      const session = sessions.find((s) => s.id === currentSessionId);
      if (session && session.drawIoXml && drawioRef.current) {
        drawioRef.current.load({ xml: session.drawIoXml });
      }
      initialLoadDoneRef.current = true;
    }
  }, [isDrawIoReady, currentSessionId, sessions]);

  function handleSwitchSession(targetSessionId: string) {
    if (targetSessionId === currentSessionId) return;
    const session = loadSession(targetSessionId);
    if (drawioRef.current && session) {
      drawioRef.current.load({ xml: session.drawIoXml || "" });
    }
  }

  function handleDeleteSession(e: React.MouseEvent, sessionIdToDelete: string) {
    e.stopPropagation();
    deleteSession(sessionIdToDelete);
    const nextSession = sessions.find((session) => session.id !== sessionIdToDelete);
    if (currentSessionId === sessionIdToDelete && nextSession && drawioRef.current) {
      drawioRef.current.load({ xml: nextSession.drawIoXml || "" });
    } else if (currentSessionId === sessionIdToDelete && drawioRef.current) {
      drawioRef.current.load({ xml: "" });
    }
  }

  function handleDoubleClickSession(session: Session) {
    setRenamingSessionId(session.id);
    setNewSessionTitle(session.title);
    setIsRenameModalOpen(true);
  }

  function handleRenameSave() {
    if (renamingSessionId && newSessionTitle.trim()) {
      renameSession(renamingSessionId, newSessionTitle);
      setIsRenameModalOpen(false);
      setRenamingSessionId(null);
      setNewSessionTitle("");
    }
  }

  function exportDiagram() {
    if (drawioRef.current) {
      drawioRef.current.exportDiagram({
        format: "xmlsvg",
      });
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatOpen]);

  // Check Login & Load Agents
  useEffect(() => {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.user) {
      navigate({ to: "/login" });
      return;
    }
    setCurrentUser(userInfo.user);

    // Load Agents
    const loadAgents = async () => {
      try {
        const res = await queryAiAgentConfigList();
        setAgents(res.data || []);
        if (res.data && res.data.length > 0) {
          // Try to restore last agent or default to first
          const lastAgentId = localStorage.getItem("ai_agent_last_agent");
          if (lastAgentId && res.data.find((a) => a.agentID === lastAgentId)) {
            setSelectedAgentId(lastAgentId);
          } else {
            setSelectedAgentId(res.data[0].agentID);
          }
        }
      } catch (error) {
        console.error("Failed to load agents:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "agent",
            content: "加载智能体列表失败，请检查后端服务是否启动。",
            timestamp: Date.now(),
          },
        ]);
      }
    };
    loadAgents();
  }, [navigate, setMessages]);

  function handleLogout() {
    clearUserInfo();
    navigate({ to: "/login" });
  }

  function handleAgentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newAgentId = e.target.value;
    setSelectedAgentId(newAgentId);
    setSessionId(""); // Reset session when agent changes
    localStorage.setItem("ai_agent_last_agent", newAgentId);
  }

  async function finalizeNewChat() {
    if (!selectedAgentId || !currentUser) return;
    try {
      const res = await createSession(selectedAgentId, currentUser);
      const newSession = createNewSession(res.data.sessionID);
      drawioRef.current?.load({ xml: newSession.drawIoXml || "" });
      setInputValue("");
    } catch (error) {
      console.error("Failed to create new session:", error);
    }
  }

  async function handleNewChat() {
    finalizeNewChat();
  }

  async function handleRestartSession() {
    if (!selectedAgentId || !currentUser) return;

    if (!currentSessionId) {
      finalizeNewChat();
      return;
    }

    try {
      const res = await createSession(selectedAgentId, currentUser);
      const newBackendId = res.data.sessionID;

      const initialMsg: Message = {
        id: Date.now().toString(),
        role: "agent",
        content:
          "你好！我是你的绘图助手，可以帮你创建和完善架构图、流程图、时序图等图表。请告诉我你的绘图需求，例如：绘制一个用户登录流程图，或修改现有图表。",
        timestamp: Date.now(),
      };

      setSessionId(newBackendId);
      setMessages([initialMsg]);
      setInputValue("");

      updateCurrentSession((session) => ({
        ...session,
        backendSessionId: newBackendId,
        messages: [initialMsg],
        lastModified: Date.now(),
      }));
    } catch (error) {
      console.error("Failed to restart session:", error);
    }
  }

  async function performSendMessage(displayContent: string, apiContent: string) {
    if (!selectedAgentId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "agent",
          content: "请先选择一个智能体。",
          timestamp: Date.now(),
        },
      ]);
      setIsSending(false);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // 1. Ensure Session
      let activeBackendSessionId = sessionId;
      if (!activeBackendSessionId) {
        const sessionRes = await createSession(selectedAgentId, currentUser);
        activeBackendSessionId = sessionRes.data.sessionID;
        setSessionId(activeBackendSessionId);
      }

      // Update session lastModified
      updateCurrentSession((session) => ({ ...session, lastModified: Date.now() }));

      // 2. Send Message
      const chatRes = await chat({
        agentID: selectedAgentId,
        userID: currentUser,
        sessionID: activeBackendSessionId,
        message: apiContent,
      });

      const { content } = chatRes.data;

      // Go backend returns { content }; infer whether the content is draw.io XML.
      if (!isDrawIoXmlContent(content)) {
        const agentMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: content,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        // Save to session immediately (always update the session that initiated the request)
        updateCurrentSession((session) => ({
          ...session,
          drawIoXml: content,
          lastModified: Date.now(),
        }));

        // Render only if still on the same session
        if (drawioRef.current && currentSessionId === currentSessionRef.current) {
          try {
            drawioRef.current.load({
              xml: content,
            });
          } catch (e) {
            console.error("Failed to load diagram:", e);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: error instanceof Error ? `Error: ${error.message}` : "发送失败，请重试。",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendMessage() {
    if (!inputValue.trim() || isSending) return;

    const content = inputValue;
    setInputValue("");
    setIsSending(true);

    if (useHistoryContext && drawioRef.current && isDrawIoReady) {
      isExportingForChatRef.current = true;
      pendingMessageRef.current = content;
      exportTimeoutRef.current = window.setTimeout(() => {
        if (!isExportingForChatRef.current) return;
        isExportingForChatRef.current = false;
        performSendMessage(content, content);
      }, 10000);
      try {
        drawioRef.current.exportDiagram({
          format: "xml" as any,
        });
      } catch (e) {
        console.error("Export failed", e);
        if (exportTimeoutRef.current !== null) {
          window.clearTimeout(exportTimeoutRef.current);
          exportTimeoutRef.current = null;
        }
        isExportingForChatRef.current = false;
        performSendMessage(content, content);
      }
    } else {
      performSendMessage(content, content);
    }
  }

  useEffect(() => {
    if (!lastExportedData) return;

    if (isExportingForChatRef.current) {
      if (exportTimeoutRef.current !== null) {
        window.clearTimeout(exportTimeoutRef.current);
        exportTimeoutRef.current = null;
      }
      isExportingForChatRef.current = false;
      const xml = lastExportedData.data;
      const content = pendingMessageRef.current;
      const apiContent = `[Context: Current Draw.io XML]\n\`\`\`xml\n${xml}\n\`\`\`\n\n${content}`;
      performSendMessage(content, apiContent);
      return;
    }

    // Autosave handling
    if (isAutosaveRef.current) {
      isAutosaveRef.current = false;
      const xml = lastExportedData.data;
      updateCurrentSession((session) => ({ ...session, drawIoXml: xml }));
      return;
    }

    // Manual Export
    setImgData(lastExportedData.data);
  }, [lastExportedData]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  const quickActions = [
    {
      label: "绘制h5端登录流程图",
      text: "请帮我绘制一个H5端的登录流程图，包含用户输入手机号、获取验证码、验证登录等步骤。",
    },
    {
      label: "绘制电商购物流程图",
      text: "请帮我绘制一个电商购物流程图，包含商品浏览、加入购物车、下单、支付、发货等环节。",
    },
  ];

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header - Minimal & Clean */}
      <div className="h-14 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-40 relative">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            too long; go draw!{" "}
            <span className="text-slate-400 font-normal text-sm ml-2">@yydrowz3</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
            <span className="text-xs font-semibold text-slate-600">{currentUser || "Guest"}</span>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={exportDiagram}
            className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all text-sm font-medium shadow-sm active:scale-95"
          >
            <Icons.Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <Icons.Logout />
          </button>

          {!isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
              title="Open Assistant"
            >
              <Icons.Chat />
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        {/* Sessions Sidebar */}
        <div className="w-64 bg-white text-slate-600 flex flex-col border-r border-slate-200 shrink-0 z-30">
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
            <span className="font-semibold text-slate-800 flex items-center gap-2">
              <Icons.MessageSquare className="w-4 h-4 text-indigo-600" />
              绘图记录
            </span>
            <button
              onClick={handleNewChat}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
              title="New Chat"
            >
              <Icons.Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400">
            {[...sessions]
              .sort((a, b) => b.lastModified - a.lastModified)
              .map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSwitchSession(session.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleDoubleClickSession(session);
                  }}
                  className={`
                    group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all border border-transparent
                    ${
                      currentSessionId === session.id
                        ? "bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm"
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${currentSessionId === session.id ? "text-indigo-700" : "text-slate-700 group-hover:text-slate-900"}`}
                    >
                      {session.title}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${currentSessionId === session.id ? "text-indigo-400" : "text-slate-400"}`}
                    >
                      {new Date(session.lastModified).toLocaleDateString()}{" "}
                      {new Date(session.lastModified).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className={`
                      p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100
                      ${
                        currentSessionId === session.id
                          ? "hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700"
                          : "hover:bg-red-50 text-slate-400 hover:text-red-500"
                      }
                    `}
                    title="Delete"
                  >
                    <Icons.Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            {sessions.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-400">No history yet</div>
            )}
          </div>
        </div>

        {/* Draw.io Canvas Area */}
        <div className="flex-1 relative bg-slate-50 h-full flex flex-col">
          <div className="flex-1 m-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white ring-1 ring-slate-100">
            <DrawIoEmbed
              ref={drawioRef}
              baseUrl={import.meta.env.VITE_DRAWIO_BASE_URL || "https://embed.diagrams.net"}
              autosave={true}
              onAutoSave={(data) => {
                if (currentSessionId && isDrawIoReady && !isExportingForChatRef.current) {
                  // Prefer using the XML directly from the autosave event if available
                  if (data && typeof data === "object" && "xml" in data) {
                    const xmlContent = (data as any).xml;
                    updateCurrentSession((session) => ({ ...session, drawIoXml: xmlContent }));
                  } else {
                    // Fallback to export if no XML provided in event
                    isAutosaveRef.current = true;
                    drawioRef.current?.exportDiagram({ format: "xml" as any });
                  }
                }
              }}
              onLoad={() => setIsDrawIoReady(true)}
              onExport={(data) => setLastExportedData({ data: data.data, timestamp: Date.now() })}
              urlParameters={{
                ui: "atlas", // More modern UI theme for draw.io
                spin: true,
                libraries: true,
                saveAndExit: false,
                noSaveBtn: true,
                noExitBtn: true,
              }}
            />
          </div>
        </div>

        {/* Chat Sidebar - Modern & Elegant */}
        <div
          className={`
            border-l border-slate-200 bg-white flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
            ${isChatOpen ? "w-95 translate-x-0" : "w-0 translate-x-full opacity-0 overflow-hidden"}
            shadow-xl z-20
          `}
        >
          {/* Chat Header */}
          <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 shrink-0 ring-2 ring-white">
                <Icons.Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <select
                  value={selectedAgentId}
                  onChange={handleAgentChange}
                  className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer truncate appearance-none pr-4"
                >
                  {agents.length === 0 && <option value="">Loading agents...</option>}
                  {agents.map((agent) => (
                    <option key={agent.agentID} value={agent.agentID}>
                      {agent.agentName}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] text-slate-500 font-medium leading-tight">
                    AI Assistant Online
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all shrink-0"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`
                  shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm mt-1 ring-2 ring-white
                  ${
                    msg.role === "user"
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-white text-indigo-500 border border-slate-100"
                  }
                `}
                >
                  {msg.role === "user" ? (
                    <Icons.User className="w-5 h-5" />
                  ) : (
                    <Icons.Bot className="w-5 h-5" />
                  )}
                </div>

                <div className="flex flex-col max-w-[85%]">
                  <span
                    className={`text-[10px] mb-1.5 font-medium ${msg.role === "user" ? "text-right text-slate-400" : "text-left text-slate-400"}`}
                  >
                    {msg.role === "user" ? "You" : "Agent"}
                  </span>
                  <div
                    className={`
                        p-3.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap
                        ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-indigo-200"
                            : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm shadow-sm"
                        }
                    `}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0 relative z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            {/* Quick Actions - Only show when chat is empty (just greeting) */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 mb-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputValue(action.text)}
                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100 font-medium shadow-sm"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Context Toolbar */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <button
                onClick={() => setUseHistoryContext(!useHistoryContext)}
                className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border shadow-sm
                        ${
                          useHistoryContext
                            ? "bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-100"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                        }
                    `}
              >
                <Icons.Layers
                  className={`w-3.5 h-3.5 ${useHistoryContext ? "text-indigo-500" : "text-slate-400"}`}
                />
                <span>携带画布上下文</span>
              </button>
              <span className="text-[10px] text-slate-400 ml-auto hidden sm:inline-block">
                Press{" "}
                <kbd className="font-sans px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500">
                  Ctrl/Command
                </kbd>{" "}
                +{" "}
                <kbd className="font-sans px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500">
                  Enter
                </kbd>
              </span>
            </div>
            <div className="relative flex items-end gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50/50 focus-within:bg-white transition-all shadow-inner">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isSending ? "绘图助手正在响应中..." : "描述您的绘图需求..."}
                disabled={isSending}
                className="flex-1 px-3 py-2 bg-transparent border-none focus:ring-0 text-sm text-slate-800 placeholder:text-slate-400 resize-none max-h-60 min-h-[50px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400"
                rows={1}
              />
              <div className="flex gap-1 mb-0.5 shrink-0">
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isSending}
                  className={`
                      p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center
                      ${
                        inputValue.trim() && !isSending
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }
                    `}
                >
                  {isSending ? (
                    <Icons.Loader className="w-4 h-4" />
                  ) : (
                    <Icons.Send className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleRestartSession}
                  className="p-2.5 rounded-lg bg-white text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-all duration-200 border border-slate-200 hover:border-indigo-100 shadow-sm"
                  title="Restart Session"
                >
                  <Icons.Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-center mt-2.5">
              <p className="text-[10px] text-slate-400 font-medium">
                {isSending
                  ? "AI is generating response..."
                  : "AI can make mistakes. Please verify important info."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal - Polished */}
      {imgData && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-white p-0 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <Icons.Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Export Ready</h2>
                  <p className="text-xs text-slate-500">
                    Your diagram has been successfully converted
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImgData(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/50 p-8 flex items-center justify-center min-h-[400px]">
              <div className="bg-white p-2 rounded shadow-sm border border-slate-200">
                <img
                  src={imgData}
                  alt="Exported diagram"
                  className="max-w-full h-auto object-contain"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setImgData(null)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                Close Preview
              </button>
              <a
                href={imgData}
                download="diagram.svg"
                className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all text-sm flex items-center gap-2"
              >
                <Icons.Download className="w-4 h-4" />
                Download File
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Rename Session</h2>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Session Name</label>
              <input
                type="text"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRenameSave()}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Enter new name"
                autoFocus
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSave}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Workbench;
