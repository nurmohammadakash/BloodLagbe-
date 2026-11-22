const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

let io = null;

const MAX_WATCHED_POSTS = 500;

const init = (httpServer) => {
    io = new Server(httpServer);

    io.use((socket, next) => {
        try {
            const decoded = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
            socket.account = {
                type: decoded.account_type === "bloodbank" ? "bloodbank" : "user",
                id: Number(decoded.account_id || decoded.user_id)
            };
            next();
        } catch {
            next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        socket.join(`${socket.account.type}:${socket.account.id}`);

        // The page tells us which posts are on screen, so new comments and
        // like counts for those posts can be pushed live.
        socket.on("watch", (ids) => {
            if (!Array.isArray(ids)) return;
            ids.slice(0, 100).forEach((raw) => {
                const id = Number(raw);
                if (!Number.isInteger(id) || id <= 0) return;
                if (socket.rooms.size >= MAX_WATCHED_POSTS) return;
                socket.join(`post:${id}`);
            });
        });
    });

    return io;
};

const getIO = () => io;

module.exports = { init, getIO };