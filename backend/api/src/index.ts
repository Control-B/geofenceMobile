import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startLocalWss, getLocalWssPort } from "./lib/signalr.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Start local WebSocket server when Azure SignalR is not configured
if (!process.env.AZURE_SIGNALR_CONNECTION_STRING) {
  startLocalWss(getLocalWssPort());
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
