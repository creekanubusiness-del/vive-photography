require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

/* ---------------- CONFIG ---------------- */

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------- SERVE FRONTEND -------- */

app.use(express.static(path.join(__dirname)));

/* -------- CLOUDINARY STORAGE -------- */

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'vive_photography',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      tags: req.body.category ? [req.body.category] : []
    };
  }
});

const upload = multer({ storage });

/* ---------------- ROUTES ---------------- */

// Upload Image
app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    res.json({
      imageUrl: req.file.path,
      category: req.body.category
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Photos (with optional filter)
app.get('/photos', async (req, res) => {
  try {
    const category = req.query.category;

    let expression = 'folder:vive_photography';

    if (category && category !== "all") {
      expression += ` AND tags:${category}`;
    }

    const result = await cloudinary.search
      .expression(expression)
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute();

    const images = result.resources.map(file => ({
      url: file.secure_url,
      tags: file.tags
    }));

    res.json(images);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
