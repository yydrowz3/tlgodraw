// Message type definition
export type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  kind?: "greeting";
};

export interface Session {
  id: string;
  backendSessionId?: string;
  title: string;
  isDefaultTitle?: boolean;
  messages: Message[];
  drawIoXml: string | null;
  lastModified: number;
}
