require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "file-server",
    format: async (req, file) => file.mimetype.split("/")[1], // Preserve file format
    public_id: (req, file) => Date.now() + "-" + file.originalname,
  },
});

const upload = multer({ storage });

// ✅ Serve the Web UI
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// ✅ Upload File API
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  res.json({ message: "File uploaded successfully", url: req.file.path });
});

// ✅ List Files API
app.get("/files", async (req, res) => {
  try {
    const resources = await cloudinary.api.resources({ type: "upload", prefix: "file-server/" });
    const files = resources.resources.map(file => ({
      url: file.secure_url,
      name: file.public_id.split("/").pop(), // Extract filename
    }));
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve files" });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`File Server running at http://localhost:${PORT}`);
});
