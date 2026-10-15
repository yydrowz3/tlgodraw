// Message type definition
export type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
};

export interface Session {
  id: string;
  backendSessionId?: string;
  title: string;
  messages: Message[];
  drawIoXml: string | null;
  lastModified: number;
}
