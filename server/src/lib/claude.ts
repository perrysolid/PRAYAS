import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

let client: Anthropic | undefined;

/** Shared Anthropic client. Credentials come from ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN). */
export const claude = () => (client ??= new Anthropic({ maxRetries: 1 }));
export const claudeEnabled = () => config.anthropicEnabled;
