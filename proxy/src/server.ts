/** Process entry point: load config, start the server, shut down gracefully. */
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { destroyAgents } from './proxy/upstream.js';
import { log } from './util/log.js';

const cfg = loadConfig();
const { server, close } = createApp(cfg);

server.listen(cfg.port, cfg.host, () => {
  log.info('proxy listening', {
    host: cfg.host,
    port: cfg.port,
    isolation: cfg.isolationMode,
    allowlist: cfg.allowedHosts.length,
    blocklist: cfg.blockedHosts.length,
    ports: cfg.allowedPorts.length ? cfg.allowedPorts : 'any',
  });
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('shutting down', { signal });
  server.close(() => {
    close();
    destroyAgents();
    process.exit(0);
  });
  server.closeIdleConnections();
  // Force exit if long-lived connections (downloads, WebSockets) don't finish.
  setTimeout(() => {
    server.closeAllConnections();
    process.exit(0);
  }, 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => log.error('unhandledRejection', { err: String(err) }));
