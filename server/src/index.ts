import { config } from "./config.js";
import { createApp } from "./app.js";

createApp().listen(config.port, () => {
  console.log(`CM Helpline API on http://localhost:${config.port} (AI: ${config.ai.key && config.ai.model ? "language model" : config.anthropicEnabled ? "Claude" : "built-in rules"})`);
});
