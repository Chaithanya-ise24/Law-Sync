// server.js - LawSync Engine with OCR Support
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');

// ============================================
// CONFIGURATION & ENVIRONMENT SETUP
// ============================================

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('='.repeat(60));
console.log('⚖️  LAWSYNC ENGINE - STARTING (with OCR Support)');
console.log('='.repeat(60));

// Validate API key
if (!GEMINI_API_KEY) {
    console.error('❌ ERROR: GEMINI_API_KEY not found in .env file');
    console.error('Please create a .env file with: GEMINI_API_KEY=your_api_key_here');
    console.error('Get your API key from: https://aistudio.google.com/');
    process.exit(1);
}

console.log('✅ Environment configured');
console.log(`🔐 API Key: ${GEMINI_API_KEY.substring(0, 10)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4)}`);

// ============================================
// CREATE TEMP DIRECTORY FOR OCR
// ============================================

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('📁 Created temp directory for OCR processing');
}

// ============================================
// GEMINI AI MODEL INITIALIZATION
// ============================================

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Function to find working model
async function findWorkingModel() {
    const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-pro',
        'gemini-1.5-pro',
        'gemini-1.0-pro'
    ];
    
    console.log('\n🔍 Searching for available Gemini models...');
    
    for (const modelName of modelsToTry) {
        try {
            console.log(`   Testing: ${modelName}...`);
            const testModel = genAI.getGenerativeModel({ model: modelName });
            // Quick test to verify model works
            const testResult = await testModel.generateContent('Say OK');
            await testResult.response;
            console.log(`   ✅ ${modelName} is available!`);
            return { model: testModel, name: modelName };
        } catch (error) {
            console.log(`   ❌ ${modelName} not available`);
        }
    }
    
    return null;
}

let model;
let activeModel;

// Initialize model asynchronously
(async () => {
    const result = await findWorkingModel();
    
    if (!result) {
        console.error('\n❌ No working Gemini model found!');
        console.error('\n💡 Possible solutions:');
        console.error('   1. Your API key may be invalid or expired');
        console.error('   2. Get a new API key from: https://aistudio.google.com/');
        console.error('   3. Make sure billing is enabled for your Google Cloud project');
        console.error('   4. Check if the API is enabled in your Google Cloud Console');
        process.exit(1);
    }
    
    model = result.model;
    activeModel = result.name;
    
    console.log(`\n🤖 Active Model: ${activeModel}`);
    console.log(`📡 Server Port: ${PORT}`);
    
    // Start server only after model is ready
    startServer();
})();

// ============================================
// OCR FUNCTIONS
// ============================================

/**
 * Detect if document needs OCR
 */
async function detectOCRNeed(fileBuffer, fileType, filename) {
    console.log('\n🔍 Running OCR Need Detection...');
    
    const detectionResult = {
        needsOCR: false,
        confidence: 0,
        reason: '',
        method: ''
    };
    
    try {
        // Check if it's an image - always needs OCR
        if (fileType && fileType.startsWith('image/')) {
            detectionResult.needsOCR = true;
            detectionResult.confidence = 1.0;
            detectionResult.reason = 'Image file - OCR required';
            detectionResult.method = 'file-type';
            console.log('   📸 Image detected - OCR REQUIRED');
            return detectionResult;
        }
        
        // Check if it's a PDF
        if (fileType === 'application/pdf') {
            console.log('   📄 Checking PDF for selectable text...');
            const pdfData = await pdfParse(fileBuffer);
            
            if (!pdfData.text || pdfData.text.trim().length === 0) {
                detectionResult.needsOCR = true;
                detectionResult.confidence = 0.95;
                detectionResult.reason = 'PDF has no selectable text (scanned document)';
                detectionResult.method = 'pdf-parse';
                console.log('   ⚠️  PDF has NO selectable text - OCR REQUIRED');
                return detectionResult;
            }
            
            // Check text density
            const textPerPage = pdfData.text.length / (pdfData.numpages || 1);
            if (textPerPage < 100 && pdfData.numpages > 1) {
                detectionResult.needsOCR = true;
                detectionResult.confidence = 0.75;
                detectionResult.reason = `Low text density (${Math.round(textPerPage)} chars/page) - may be scanned`;
                detectionResult.method = 'density-check';
                console.log(`   ⚠️  Low text density detected - OCR RECOMMENDED`);
                return detectionResult;
            }
            
            console.log('   ✅ PDF has selectable text - OCR NOT NEEDED');
            detectionResult.reason = 'PDF has selectable text';
            return detectionResult;
        }
        
        // Text files don't need OCR
        if (fileType === 'text/plain') {
            detectionResult.needsOCR = false;
            detectionResult.reason = 'Plain text file';
            console.log('   ✅ Text file - OCR NOT NEEDED');
            return detectionResult;
        }
        
        // Word documents usually have text
        if (fileType && (fileType.includes('word') || fileType.includes('document'))) {
            detectionResult.needsOCR = false;
            detectionResult.reason = 'Word document with embedded text';
            console.log('   ✅ Word document - OCR NOT NEEDED');
            return detectionResult;
        }
        
        return detectionResult;
        
    } catch (error) {
        console.error(`   ❌ Detection error: ${error.message}`);
        detectionResult.needsOCR = true;
        detectionResult.confidence = 0.5;
        detectionResult.reason = 'Detection failed, defaulting to OCR';
        return detectionResult;
    }
}

/**
 * Perform OCR on document
 */
async function performOCR(fileBuffer, filename) {
    console.log('\n🔬 Running OCR Processing...');
    console.log(`   Language: ${process.env.OCR_LANGUAGE || 'eng'}`);
    
    const startTime = Date.now();
    let tempFilePath = null;
    
    try {
        // Create temp file for Tesseract
        tempFilePath = path.join(tempDir, `ocr_${Date.now()}_${path.basename(filename)}`);
        fs.writeFileSync(tempFilePath, fileBuffer);
        
        console.log('   🔄 Recognizing text with Tesseract OCR...');
        
        // Perform OCR
        const worker = await Tesseract.createWorker(process.env.OCR_LANGUAGE || 'eng');
        const result = await worker.recognize(tempFilePath);
        await worker.terminate();
        
        const processingTime = Date.now() - startTime;
        
        console.log(`   ✅ OCR Complete in ${processingTime}ms`);
        console.log(`   📝 Extracted ${result.data.text.length} characters`);
        console.log(`   📊 Confidence: ${Math.round(result.data.confidence)}%`);
        
        return {
            success: true,
            text: result.data.text,
            confidence: result.data.confidence,
            processingTimeMs: processingTime,
            wordCount: result.data.words?.length || 0
        };
        
    } catch (error) {
        console.error(`   ❌ OCR Failed: ${error.message}`);
        return {
            success: false,
            error: error.message,
            text: ''
        };
    } finally {
        // Clean up temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error(`   ⚠️  Cleanup error: ${cleanupError.message}`);
            }
        }
    }
}

// ============================================
// MULTER CONFIGURATION (File Upload)
// ============================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const fileExt = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.txt', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.bmp', '.tiff'];
        const allowedMimes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/bmp',
            'image/tiff'
        ];
        
        if (allowedExtensions.includes(fileExt) || allowedMimes.includes(file.mimetype)) {
            // Force correct MIME type based on extension
            if (fileExt === '.pdf') file.mimetype = 'application/pdf';
            if (fileExt === '.txt') file.mimetype = 'text/plain';
            if (fileExt === '.docx') file.mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            if (fileExt === '.doc') file.mimetype = 'application/msword';
            if (fileExt === '.png') file.mimetype = 'image/png';
            if (fileExt === '.jpg' || fileExt === '.jpeg') file.mimetype = 'image/jpeg';
            
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.originalname}. Only PDF, TXT, DOC, DOCX, and images are allowed.`));
        }
    }
});

console.log('✅ File upload handler configured (with image support for OCR)');

// ============================================
// ENHANCED TEXT EXTRACTION FUNCTIONS (with OCR)
// ============================================

/**
 * Extract text from uploaded file with OCR fallback
 */
async function extractTextFromFile(file) {
    const mimeType = file.mimetype;
    const buffer = file.buffer;
    const filename = file.originalname;
    
    console.log(`\n📄 Processing: ${filename}`);
    console.log(`   Type: ${mimeType}`);
    console.log(`   Size: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    // Step 1: Check if OCR is needed
    const ocrDetection = await detectOCRNeed(buffer, mimeType, filename);
    
    // Step 2: If OCR is needed, perform it
    if (ocrDetection.needsOCR) {
        console.log('\n⚠️  OCR REQUIRED - Processing with OCR...');
        const ocrResult = await performOCR(buffer, filename);
        
        if (ocrResult.success && ocrResult.text.trim().length > 0) {
            console.log(`   ✅ OCR extraction successful (${ocrResult.text.length} chars)`);
            return {
                text: ocrResult.text,
                method: 'ocr',
                needsOCR: true,
                ocrConfidence: ocrResult.confidence,
                ocrReason: ocrDetection.reason
            };
        } else {
            console.error('   ❌ OCR failed, no text extracted');
            throw new Error(`OCR failed: ${ocrResult.error || 'No text extracted'}`);
        }
    }
    
    // Step 3: Standard extraction for non-OCR files
    try {
        // PDF files
        if (mimeType === 'application/pdf') {
            console.log('   🔄 Parsing PDF...');
            const pdfData = await pdfParse(buffer);
            const text = pdfData.text;
            console.log(`   ✅ Extracted ${text.length} characters from PDF`);
            
            if (text.length === 0) {
                console.warn('   ⚠️  Warning: PDF has no selectable text. It may be a scanned image.');
            }
            
            return {
                text: text,
                method: 'pdf-parse',
                needsOCR: false,
                ocrConfidence: null,
                ocrReason: ocrDetection.reason
            };
        }
        
        // Word documents (.docx)
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            console.log('   🔄 Parsing Word document...');
            const result = await mammoth.extractRawText({ buffer });
            const text = result.value;
            console.log(`   ✅ Extracted ${text.length} characters from Word document`);
            return {
                text: text,
                method: 'mammoth',
                needsOCR: false,
                ocrConfidence: null,
                ocrReason: ocrDetection.reason
            };
        }
        
        // Legacy Word documents (.doc)
        else if (mimeType === 'application/msword') {
            console.log('   🔄 Parsing legacy Word document...');
            const text = buffer.toString('utf-8');
            console.log(`   ✅ Extracted ${text.length} characters from legacy Word document`);
            return {
                text: text,
                method: 'text-legacy',
                needsOCR: false,
                ocrConfidence: null,
                ocrReason: ocrDetection.reason
            };
        }
        
        // Text files
        else if (mimeType === 'text/plain') {
            console.log('   🔄 Reading text file...');
            const text = buffer.toString('utf-8');
            console.log(`   ✅ Extracted ${text.length} characters from text file`);
            return {
                text: text,
                method: 'text',
                needsOCR: false,
                ocrConfidence: null,
                ocrReason: ocrDetection.reason
            };
        }
        
        // Images (fallback - should have been caught by OCR detection)
        else if (mimeType && mimeType.startsWith('image/')) {
            console.log('   📸 Image file - forcing OCR...');
            const ocrResult = await performOCR(buffer, filename);
            if (ocrResult.success) {
                return {
                    text: ocrResult.text,
                    method: 'ocr',
                    needsOCR: true,
                    ocrConfidence: ocrResult.confidence,
                    ocrReason: 'Image file'
                };
            }
            throw new Error('Could not extract text from image');
        }
        
        else {
            throw new Error(`Unsupported file type: ${mimeType}`);
        }
    } catch (error) {
        console.error(`   ❌ Extraction failed: ${error.message}`);
        throw new Error(`Could not extract text: ${error.message}`);
    }
}

console.log('✅ Text extraction engines ready (PDF, DOCX, DOC, TXT, OCR)');

// ============================================
// AI SUMMARY GENERATION
// ============================================

/**
 * Generate a 3-point summary using Gemini AI
 */
async function generateSummary(text, extractionInfo = {}) {
    // Limit text length to avoid API limits
    const maxLength = 10000;
    const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '\n\n[Note: Document was truncated due to length]' 
        : text;
    
    console.log(`\n🧠 Sending ${truncatedText.length} characters to Gemini AI`);
    console.log(`   Preview: ${truncatedText.substring(0, 100)}...`);
    if (extractionInfo.needsOCR) {
        console.log(`   📸 Note: Text extracted via OCR (confidence: ${extractionInfo.ocrConfidence}%)`);
    }
    
    const prompt = `You are LawSync, a professional legal document analyzer. Analyze the following document and provide a summary in exactly 3 clear, concise points.

DOCUMENT:
${truncatedText}

REQUIREMENTS:
- Exactly 3 points
- Number each point as 1, 2, 3
- Each point must be a complete sentence
- Focus on: parties involved, key obligations, important dates, and main terms
- Be professional, factual, and concise
- Do not add any introductory or concluding text

Return ONLY the 3 points, nothing else.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();
        
        console.log(`   ✅ Summary generated (${summary.length} characters)`);
        return summary;
    } catch (error) {
        console.error(`   ❌ AI generation failed: ${error.message}`);
        throw new Error(`AI analysis failed: ${error.message}`);
    }
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        server: 'LawSync Engine with OCR Support',
        model: activeModel || 'initializing',
        port: PORT,
        features: {
            ocr: true,
            pdf_extraction: true,
            word_extraction: true,
            image_support: true
        },
        endpoints: {
            upload: 'POST /upload',
            batch: 'POST /upload/batch',
            debug: 'POST /debug/extract',
            health: 'GET /health',
            sample: 'GET /sample'
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * Sample text generator for testing
 */
app.get('/sample', (req, res) => {
    const sampleText = `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is made and entered into as of January 15, 2026, by and between:

EMPLOYER: Tech Solutions Inc., a Delaware corporation with its principal place of business at 123 Business Ave, San Francisco, CA 94105

EMPLOYEE: Sarah Johnson, residing at 456 Home Street, San Francisco, CA 94110

TERMS AND CONDITIONS:

1. POSITION AND DUTIES
The Employer agrees to employ the Employee as Senior Software Engineer. The Employee shall perform duties including software development, team leadership, and project management.

2. COMPENSATION
The Employee shall receive an annual base salary of $120,000, payable in equal bi-weekly installments. Additionally, the Employee is eligible for an annual performance bonus of up to 15% of base salary.

3. TERM OF EMPLOYMENT
This Agreement shall commence on February 1, 2026 and continue for a period of two (2) years, unless earlier terminated as provided herein.

4. BENEFITS
The Employee shall be entitled to:
- 20 days paid time off per year
- Health insurance coverage
- 401(k) retirement plan with company match up to 4%
- Annual professional development budget of $2,000

5. CONFIDENTIALITY
The Employee agrees not to disclose any confidential information, trade secrets, or proprietary data of the Employer during or after employment.

6. TERMINATION
Either party may terminate this Agreement with thirty (30) days written notice. The Employer may terminate immediately for cause including gross misconduct or violation of company policies.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

_________________________
Jane Smith, CEO
Tech Solutions Inc.

_________________________
Sarah Johnson, Employee`;

    res.json({
        success: true,
        message: 'Copy this sample text into a .txt file for testing',
        sampleText: sampleText,
        instructions: [
            '1. Copy the sampleText above',
            '2. Create a new file called sample.txt',
            '3. Paste the text into sample.txt',
            '4. Upload using POST /upload with field name "document"'
        ]
    });
});

/**
 * Main upload endpoint - Process single document
 */
app.post('/upload', upload.single('document'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Validate file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                instruction: 'Use multipart/form-data with field name "document"'
            });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📥 PROCESSING UPLOAD');
        console.log('='.repeat(60));
        
        // Extract text from file (with OCR if needed)
        const extractionResult = await extractTextFromFile(req.file);
        
        // Validate extracted content
        if (!extractionResult.text || extractionResult.text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No text content could be extracted from the document',
                suggestion: 'Try one of these solutions:\n' +
                          '1. Upload a text file (.txt) to test basic functionality\n' +
                          '2. Ensure PDF has selectable text (not a scanned image)\n' +
                          '3. For scanned documents, OCR will be applied automatically\n' +
                          '4. Try a different document',
                metadata: {
                    filename: req.file.originalname,
                    fileSize: req.file.size,
                    fileType: req.file.mimetype
                }
            });
        }
        
        console.log(`\n📝 Extracted ${extractionResult.text.length} characters of text`);
        console.log(`   Extraction Method: ${extractionResult.method}`);
        if (extractionResult.needsOCR) {
            console.log(`   OCR Confidence: ${extractionResult.ocrConfidence}%`);
            console.log(`   OCR Reason: ${extractionResult.ocrReason}`);
        }
        
        // Generate AI summary
        const summary = await generateSummary(extractionResult.text, extractionResult);
        
        const processingTime = Date.now() - startTime;
        
        console.log('\n' + '='.repeat(60));
        console.log(`✅ UPLOAD COMPLETE (${processingTime}ms)`);
        console.log('='.repeat(60) + '\n');
        
        // Send success response
        res.json({
            success: true,
            summary: summary,
            extraction: {
                method: extractionResult.method,
                needsOCR: extractionResult.needsOCR,
                ocrConfidence: extractionResult.ocrConfidence,
                ocrReason: extractionResult.ocrReason,
                charactersExtracted: extractionResult.text.length
            },
            metadata: {
                filename: req.file.originalname,
                fileSize: req.file.size,
                fileType: req.file.mimetype,
                processingTimeMs: processingTime,
                aiModel: activeModel,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.stack);
        
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Batch upload endpoint - Process multiple documents
 */
app.post('/upload/batch', upload.array('documents', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`📦 PROCESSING BATCH (${req.files.length} files)`);
        console.log('='.repeat(60));
        
        const results = [];
        let successful = 0;
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            console.log(`\n[${i + 1}/${req.files.length}] ${file.originalname}`);
            
            try {
                const extractionResult = await extractTextFromFile(file);
                
                if (!extractionResult.text || extractionResult.text.trim().length === 0) {
                    results.push({
                        filename: file.originalname,
                        success: false,
                        error: 'No text content could be extracted'
                    });
                } else {
                    const summary = await generateSummary(extractionResult.text, extractionResult);
                    results.push({
                        filename: file.originalname,
                        success: true,
                        summary: summary,
                        charactersExtracted: extractionResult.text.length,
                        extractionMethod: extractionResult.method,
                        needsOCR: extractionResult.needsOCR
                    });
                    successful++;
                }
            } catch (error) {
                results.push({
                    filename: file.originalname,
                    success: false,
                    error: error.message
                });
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`✅ BATCH COMPLETE (${successful}/${req.files.length} successful)`);
        console.log('='.repeat(60) + '\n');
        
        res.json({
            success: true,
            totalFiles: req.files.length,
            successfulFiles: successful,
            failedFiles: req.files.length - successful,
            results: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`❌ Batch error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Debug endpoint - Extract text without AI processing
 */
app.post('/debug/extract', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        console.log('\n🐛 DEBUG MODE - Text extraction only');
        const extractionResult = await extractTextFromFile(req.file);
        
        res.json({
            success: true,
            filename: req.file.originalname,
            fileSize: req.file.size,
            detectedMimeType: req.file.mimetype,
            extractionMethod: extractionResult.method,
            needsOCR: extractionResult.needsOCR,
            ocrConfidence: extractionResult.ocrConfidence,
            ocrReason: extractionResult.ocrReason,
            textPreview: extractionResult.text.substring(0, 1000),
            totalLength: extractionResult.text.length,
            hasContent: extractionResult.text.trim().length > 0,
            isTruncated: extractionResult.text.length > 1000,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`❌ Debug error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * OCR Test endpoint - Force OCR on uploaded file
 */
app.post('/test/ocr', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        console.log('\n🧪 OCR TEST MODE - Forced OCR processing');
        
        const ocrResult = await performOCR(req.file.buffer, req.file.originalname);
        
        res.json({
            success: ocrResult.success,
            filename: req.file.originalname,
            extractedText: ocrResult.text ? ocrResult.text.substring(0, 2000) : '',
            fullLength: ocrResult.text?.length || 0,
            confidence: ocrResult.confidence,
            processingTimeMs: ocrResult.processingTimeMs,
            wordCount: ocrResult.wordCount
        });
        
    } catch (error) {
        console.error(`❌ OCR test error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
            return res.status(413).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`
        });
    }
    
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// ============================================
// START SERVER FUNCTION
// ============================================

function startServer() {
    app.listen(PORT, () => {
        console.log('\n' + '='.repeat(60));
        console.log('⚖️  LAWSYNC ENGINE - READY');
        console.log('='.repeat(60));
        console.log(`🌐 Server URL: http://localhost:${PORT}`);
        console.log(`🤖 AI Model: ${activeModel}`);
        console.log(`📡 Health: GET  http://localhost:${PORT}/health`);
        console.log(`📤 Upload: POST http://localhost:${PORT}/upload`);
        console.log(`📦 Batch:  POST http://localhost:${PORT}/upload/batch`);
        console.log(`🐛 Debug:  POST http://localhost:${PORT}/debug/extract`);
        console.log(`🧪 OCR Test: POST http://localhost:${PORT}/test/ocr`);
        console.log(`📝 Sample: GET  http://localhost:${PORT}/sample`);
        console.log('\n📋 Supported File Types:');
        console.log('   • PDF (.pdf) - Text-based or scanned (auto OCR)');
        console.log('   • Word (.docx)');
        console.log('   • Word Legacy (.doc)');
        console.log('   • Text (.txt)');
        console.log('   • Images (.png, .jpg, .jpeg, .bmp, .tiff) - OCR automatically applied');
        console.log('\n💡 OCR Features:');
        console.log('   ✅ Automatic detection of scanned documents');
        console.log('   ✅ OCR processing for images and scanned PDFs');
        console.log('   ✅ Confidence scores for OCR extraction');
        console.log('   ✅ English language support (configurable)');
        console.log('\n💡 Quick Test:');
        console.log('   1. GET http://localhost:${PORT}/sample');
        console.log('   2. Create a .txt file with the sample text');
        console.log('   3. POST to /upload with field "document"');
        console.log('   4. Or upload a scanned PDF/image to test OCR');
        console.log('='.repeat(60) + '\n');
    });
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', () => {
    console.log('\n\n🛑 LawSync Engine shutting down gracefully...');
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (err) {
            console.error(`Cleanup error: ${err.message}`);
        }
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 LawSync Engine terminated...');
    if (fs.existsSync(tempDir)) {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (err) {
            console.error(`Cleanup error: ${err.message}`);
        }
    }
    process.exit(0);
});