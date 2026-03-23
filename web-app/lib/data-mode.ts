export type DataMode = "mock" | "api";

export function getDataMode(): DataMode {
  return process.env.DATA_MODE === "api" ? "api" : "mock";
}

export function isMockMode(): boolean {
  return getDataMode() === "mock";
}
