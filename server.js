const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Root Route - Fixes "Cannot GET /" Issue
app.get("/", (req, res) => {
    res.send("Welcome to the Web Service!");
});

// Sample API Endpoint
app.get("/api/message", (req, res) => {
    res.json({ message: "Hello, this is your RESTful web service!" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
