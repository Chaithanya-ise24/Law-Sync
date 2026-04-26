// test-ocr.js - Test your backend locally
const fs = require('fs');
const path = require('fs');

// Check if fetch is available (Node.js 18+ has fetch built-in)
const hasFetch = typeof fetch !== 'undefined';
if (!hasFetch) {
    console.error('❌ This script requires Node.js 18+ with fetch support');
    console.log('💡 Please run: node server.js and test with curl or Bruno');
    process.exit(1);
}

async function testBackend() {
    console.log('🧪 Testing LawSync Backend\n');
    console.log('='.repeat(50));
    
    // Test 1: Health Check
    console.log('\n📋 Test 1: Health Check');
    try {
        const healthResponse = await fetch('http://localhost:5001/health');
        const healthData = await healthResponse.json();
        if (healthData.success && healthData.status === 'healthy') {
            console.log('✅ Health Check Passed');
            console.log(`   Server: ${healthData.server}`);
            console.log(`   Version: ${healthData.version}`);
        } else {
            console.log('⚠️  Health Check returned unexpected response');
        }
    } catch (error) {
        console.error('❌ Health Check Failed:', error.message);
        console.log('\n💡 Make sure server is running: node server.js');
        console.log('   Then run this test script again\n');
        return;
    }
    
    // Test 2: Status Check
    console.log('\n📋 Test 2: Status Check');
    try {
        const statusResponse = await fetch('http://localhost:5001/api/status');
        const statusData = await statusResponse.json();
        if (statusData.success) {
            console.log('✅ Status Check Passed');
            console.log(`   Status: ${statusData.status}`);
            console.log(`   Services: ${Object.keys(statusData.services).join(', ')}`);
        }
    } catch (error) {
        console.error('❌ Status Check Failed:', error.message);
    }
    
    // Test 3: Create test file
    console.log('\n📋 Test 3: Creating test file');
    const testContent = `EMPLOYMENT CONTRACT

This agreement is made on April 26, 2026 between:

EMPLOYER: ABC Tech Solutions Inc.
EMPLOYEE: John Doe

TERMS:
1. Position: Senior Software Engineer
2. Start Date: May 1, 2026
3. Salary: $85,000 per year
4. Term: 2 years

Both parties agree to the terms above.

Signed,
_________________
Jane Smith, CEO

_________________
John Doe, Employee`;

    const testFilePath = path.join(__dirname, 'test.txt');
    fs.writeFileSync(testFilePath, testContent);
    console.log('✅ Created test.txt');
    console.log(`   Content length: ${testContent.length} chars`);
    
    // Test 4: Upload and process
    console.log('\n📋 Test 4: Processing document');
    
    try {
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(testFilePath);
        formData.append('document', new Blob([fileBuffer]), 'test.txt');
        
        const processResponse = await fetch('http://localhost:5001/api/process', {
            method: 'POST',
            body: formData
        });
        
        const result = await processResponse.json();
        
        if (result.success) {
            console.log('✅ Processing Successful!');
            console.log(`   Request ID: ${result.requestId}`);
            console.log(`   Processing Time: ${result.metadata.processingTimeMs}ms`);
            console.log('\n📋 Summary:');
            console.log('─'.repeat(40));
            console.log(result.summary);
            console.log('─'.repeat(40));
            console.log('\n📊 Extraction Info:');
            console.log(`   Method: ${result.extraction.method}`);
            console.log(`   OCR Needed: ${result.extraction.needsOCR}`);
            console.log(`   Characters: ${result.extraction.charactersExtracted}`);
            if (result.extraction.ocrConfidence) {
                console.log(`   OCR Confidence: ${result.extraction.ocrConfidence}%`);
            }
            console.log(`   Reason: ${result.extraction.ocrDetectionReason}`);
        } else {
            console.error('❌ Processing Failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Upload Error:', error.message);
    }
    
    // Test 5: Debug extraction
    console.log('\n📋 Test 5: Debug Extraction');
    try {
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(testFilePath);
        formData.append('document', new Blob([fileBuffer]), 'test.txt');
        
        const debugResponse = await fetch('http://localhost:5001/api/debug/extract', {
            method: 'POST',
            body: formData
        });
        
        const debugResult = await debugResponse.json();
        
        if (debugResult.success) {
            console.log('✅ Debug Extraction Successful');
            console.log(`   Method: ${debugResult.extractionMethod}`);
            console.log(`   Needs OCR: ${debugResult.needsOCR}`);
            console.log(`   Total Length: ${debugResult.totalLength} chars`);
            console.log(`   Preview: ${debugResult.textPreview.substring(0, 100)}...`);
        } else {
            console.error('❌ Debug Extraction Failed:', debugResult.error);
        }
    } catch (error) {
        console.error('❌ Debug Error:', error.message);
    }
    
    // Clean up
    if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
        console.log('\n🧹 Cleaned up test file');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test complete!');
    console.log('='.repeat(50));
}

// Run tests
console.log('\n🚀 Starting LawSync Backend Tests\n');
testBackend().catch(console.error);