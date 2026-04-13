export * from "./users";
export * from "./authorities";
export * from "./issues";
export * from "./rewards";
export * from "./notifications";
export * from "./transactions";
export * from "./email-otps";

/** Alias: complaints are persisted as `issues` rows. */
export { issuesTable as complaintsTable } from "./issues";
