const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files
app.use(express.static("uploads")); // Serve uploaded files

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// ✅ Serve the Web UI
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Upload File API
app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    res.json({ message: "File uploaded successfully", file: req.file.filename });
});

// ✅ List Files API
app.get("/files", (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).json({ error: "Unable to list files" });

        res.json({ files });
    });
});

// ✅ Download File API
app.get("/download/:filename", (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: "File not found" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`File Server running at http://localhost:${PORT}`);
});
