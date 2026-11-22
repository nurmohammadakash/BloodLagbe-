const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "../../client/uploads");
const EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
};

const makeUploader = (folder, field, maxMB) => {
    const dir = path.join(ROOT, folder);
    fs.mkdirSync(dir, { recursive: true });

    const upload = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, dir),
            filename: (req, file, cb) =>
                cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXT[file.mimetype]}`)
        }),
        limits: { fileSize: maxMB * 1024 * 1024 },
        fileFilter: (req, file, cb) =>
            EXT[file.mimetype]
                ? cb(null, true)
                : cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed."))
    }).single(field);

    return (req, res, next) => upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.code === "LIMIT_FILE_SIZE" ? `Image must be under ${maxMB} MB.` : err.message
            });
        }
        next();
    });
};

const publicPath = (folder, file) => `/uploads/${folder}/${file.filename}`;

const removeUpload = (publicUrl) => {
    if (!publicUrl || !publicUrl.startsWith("/uploads/")) return;
    const full = path.join(__dirname, "../../client", publicUrl);
    if (full.startsWith(ROOT)) fs.unlink(full, () => {});
};

module.exports = {
    postImage: makeUploader("posts", "image", 5),
    avatarImage: makeUploader("avatars", "avatar", 3),
    coverImage: makeUploader("covers", "cover", 5),
    publicPath,
    removeUpload
};