const cloudinary = require("cloudinary").v2;

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(req.file.buffer);
    });

    res.json({ url: uploadResult.secure_url });
  } catch (err) {
    res.status(500).json({ error: "File upload failed" });
  }
};

exports.listFiles = async (req, res) => {
  try {
    const { resources } = await cloudinary.search.expression("folder:web-service").execute();
    res.json(resources.map(file => ({ url: file.secure_url, public_id: file.public_id })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    await cloudinary.uploader.destroy(req.params.public_id);
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete file" });
  }
};
