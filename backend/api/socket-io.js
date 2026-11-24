const { createLazyServer } = require("../vercel/app.cjs");

// The Socket.IO function. Vercel serves this file at /api/socket-io; the
// client path is /api/socket-io/socket.io. The entry point removes that mount
// prefix, so Socket.IO keeps its default /socket.io path.
module.exports = createLazyServer({ mountPath: "/api/socket-io" });
