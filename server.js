require('dotenv').config();
const express = require('express');
const multer = require('multer');
const passport = require('passport');
const oauth2orize = require('oauth2orize');
const crypto = require('crypto');
const authModel = require('./authModel');
const cors = require('cors');
const helmet = require('helmet');
const { v2: cloudinary } = require('cloudinary');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

// Cloudinary Configuration (from .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// OAuth2 Server Setup
const server = oauth2orize.createServer();

// Define OAuth2 token grant
server.grant(oauth2orize.grant.token((client, user, ares, done) => {
    const token = crypto.randomBytes(32).toString('hex');
    authModel.saveToken(token, user.id, client.id, (err) => {
        if (err) return done(err);
        done(null, token);
    });
}));

// Token Exchange Route
app.post('/oauth/token',
    passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
    server.token(),
    server.errorHandler()
);

// Multer Setup for Temporary Storage (Before Uploading to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload File to Cloudinary
app.post('/upload', passport.authenticate('bearer', { session: false }), upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const result = await cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, uploadResult) => {
            if (error) return res.status(500).json({ error: 'Cloudinary upload failed' });
            res.json({ message: 'File uploaded successfully', url: uploadResult.secure_url });
        }).end(req.file.buffer);
    } catch (error) {
        res.status(500).json({ error: 'Upload failed' });
    }
});

// List Files (From Cloudinary)
app.get('/files', passport.authenticate('bearer', { session: false }), async (req, res) => {
    try {
        const resources = await cloudinary.api.resources({ type: 'upload' });
        res.json(resources.resources.map(file => ({ url: file.secure_url, public_id: file.public_id })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Download File (Redirect to Cloudinary URL)
app.get('/download/:public_id', passport.authenticate('bearer', { session: false }), (req, res) => {
    const fileUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${req.params.public_id}`;
    res.redirect(fileUrl);
});

// Serve Static Files
app.use(express.static('public'));

app.listen(PORT, () => console.log(`File Server running at http://localhost:${PORT}`));
