const express = require("express");
const { uploadFile, listFiles, deleteFile } = require("../controllers/fileController");
const { ensureAuthenticated, ensureRole } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/upload", ensureAuthenticated, uploadFile);
router.get("/files", ensureAuthenticated, listFiles);
router.delete("/files/:public_id", ensureRole("admin"), deleteFile);

module.exports = router;
