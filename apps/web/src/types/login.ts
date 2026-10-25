export type LoginMessage = {
  key:
    | ""
    | "login.required"
    | "login.invalid"
    | "login.success"
    | "login.demoFilled"
    | "login.loggedOut";
  type: "" | "error" | "info";
};

export const EMPTY_MESSAGE: LoginMessage = { key: "", type: "" };
