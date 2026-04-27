import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

const FileUpload = ({ onUpload, isLoading }) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxSize: 10 * 1024 * 1024,
    disabled: isLoading,
  });

  const handleUpload = async () => {
    if (!file) return;
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 90 ? 90 : prev + 10));
    }, 200);
    await onUpload(file);
    clearInterval(interval);
    setProgress(100);
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
  };

  const containerStyle = {
    border: '2px dashed #ccc',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    backgroundColor: isDragActive ? '#f0f0ff' : 'white'
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div {...getRootProps()} style={containerStyle}>
          <input {...getInputProps()} />
          <div>
            <div style={{ fontSize: '48px' }}>📁</div>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {isDragActive ? 'Drop your document here' : 'Drag & drop your document'}
            </p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              PDF, DOCX, DOC, TXT, PNG, JPG (Max 10MB)
            </p>
          </div>
        </div>

        <AnimatePresence>
          {file && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{file.name}</strong>
                  <br />
                  <small>{(file.size / 1024).toFixed(2)} KB</small>
                  {progress > 0 && (
                    <div style={{ width: '100%', background: '#ddd', borderRadius: '4px', marginTop: '8px' }}>
                      <div style={{ width: `${progress}%`, background: '#007bff', height: '8px', borderRadius: '4px' }} />
                    </div>
                  )}
                </div>
                <button onClick={removeFile} disabled={isLoading} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
              </div>
              <button
                onClick={handleUpload}
                disabled={isLoading}
                style={{ width: '100%', marginTop: '12px', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {isLoading ? 'Processing...' : 'Analyze Document'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FileUpload;