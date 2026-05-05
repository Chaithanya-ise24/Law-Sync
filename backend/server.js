const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({
    origin: 'https://law-sync.vercel.app', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// 1. Ensure the 'uploads' directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 2. Setup Multer Storage Engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// 3. The FIXED Upload Route
// Changed (req, file) to (req, res) below:
app.post('/upload', upload.single('pdf'), (req, res) => {
    try {
        // Option A: If file comes through Form-data (Multer)
        if (req.file) {
            console.log('File Received via Form:', req.file.filename);
            return res.status(200).send({
                message: 'File uploaded successfully!',
                filename: req.file.filename
            });
        }

        // Option B: If file comes through Binary (Thunder Client Free version)
        const binaryFilePath = path.join(uploadDir, Date.now() + '-binary-test.pdf');
        const fileStream = fs.createWriteStream(binaryFilePath);
        
        req.pipe(fileStream);

        req.on('end', () => {
            console.log('File Received via Binary:', binaryFilePath);
            res.status(200).send({
                message: 'Binary file saved successfully!',
                path: binaryFilePath
            });
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).send({ message: "Error", error: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
