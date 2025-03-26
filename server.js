require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const passport = require("passport");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const authRoutes = require("./routes/authRoutes");
const { ensureAuthenticated, ensureRole } = require("./middlewares/authMiddleware");
const { listFiles, deleteFile } = require("./controllers/fileController");

const app = express();

// Security Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(helmet());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Cloudinary Config (From `.env`)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Passport Setup
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Multer for File Upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
app.use("/auth", authRoutes);

// Upload File to Cloudinary
app.post("/upload", ensureAuthenticated, upload.single("file"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, result) => {
      if (error) return res.status(500).json({ error: "Upload failed" });
      res.json({ url: result.secure_url });
    }).end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: "File upload failed" });
  }
});

// List Files
app.get("/files", ensureAuthenticated, listFiles);

// Admin: Delete File
app.delete("/files/:public_id", ensureRole("admin"), deleteFile);

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 File Server running at http://localhost:${PORT}`));
