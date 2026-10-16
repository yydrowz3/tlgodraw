export type LoginMessage = {
  text: string;
  type: "" | "error" | "info";
};

export const EMPTY_MESSAGE: LoginMessage = { text: "", type: "" };
