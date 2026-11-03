import { createContext } from "react";

export type InterfaceStyle = "classic" | "claude";
export const InterfaceStyleContext = createContext<InterfaceStyle>("classic");
