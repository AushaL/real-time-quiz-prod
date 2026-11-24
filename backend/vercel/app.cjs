/* eslint-disable no-console */
const http = require("node:http");

let appPromise;

/**
 * Boots the Nest application once per function instance. Vercel may reuse the
 * instance across invocations, so the promise is cached (and cleared on a
 * failed boot so the next invocation can retry).
 */
function getApp() {
  if (!appPromise) {
    const { createApp } = require("../dist/bootstrap");
    appPromise = createApp()
      .then(async (app) => {
        await app.init();
        return app;
      })
      .catch((error) => {
        appPromise = undefined;
        throw error;
      });
  }

  return appPromise;
}

function errorResponse(res) {
  if (res.headersSent) {
    res.end();
    return;
  }

  res.statusCode = 500;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ statusCode: 500, message: "Internal server error" }));
}

/**
 * Removes the Vercel function mount path from the URL before Socket.IO sees it.
 * Depending on how the connection reaches a function, Vercel may forward
 * /api/socket-io/socket.io or only /socket.io; normalizing here keeps the
 * server's default SOCKET_PATH working in both cases.
 */
function stripMountPath(req, mountPath) {
  if (!mountPath) return;

  const url = req.url ?? "/";
  const matches =
    url === mountPath ||
    url.startsWith(`${mountPath}/`) ||
    url.startsWith(`${mountPath}?`);
  if (!matches) return;

  const rest = url.slice(mountPath.length);
  req.url = rest.startsWith("/") ? rest : `/${rest}`;
}

/**
 * An http.Server that Vercel can use as a function entry point. The Nest app
 * is created lazily on the first request; HTTP requests and WebSocket upgrades
 * are forwarded to the same Node server Nest/Socket.IO attached to.
 *
 * Exporting an http.Server (rather than a handler) is required for WebSockets
 * on Vercel and also keeps the request body stream untouched.
 */
function createLazyServer({ mountPath } = {}) {
  const server = http.createServer((req, res) => {
    stripMountPath(req, mountPath);
    getApp()
      .then((app) => {
        app.getHttpServer().emit("request", req, res);
      })
      .catch((error) => {
        console.error("Failed to boot the Nest application:", error);
        errorResponse(res);
      });
  });

  server.on("upgrade", (req, socket, head) => {
    stripMountPath(req, mountPath);
    getApp()
      .then((app) => {
        app.getHttpServer().emit("upgrade", req, socket, head);
      })
      .catch((error) => {
        console.error("Failed to boot the Nest application for a WebSocket:", error);
        socket.end("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      });
  });

  return server;
}

module.exports = { createLazyServer, getApp };
