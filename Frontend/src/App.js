import React, { useState } from 'react';
import axios from 'axios';
import FileUpload from './components/FileUpload';
import SummaryCard from './components/SummaryCard';
import LoadingState from './components/LoadingState';
import ErrorAlert from './components/ErrorAlert';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function App() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async (file) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await axios.post(`"https://law-sync-1.onrender.com/upload"`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      setResult(response.data);
    } catch (err) {
      setError({ message: err.response?.data?.error || err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: 'auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '8px' }}>⚖️ LawSync</h1>
        <p style={{ fontSize: '20px', color: '#555', marginBottom: '32px' }}>AI-powered legal document analysis with Gemini 2.5 Flash</p>

        {error && <ErrorAlert error={error} onDismiss={reset} />}
        {!result && !isLoading && <FileUpload onUpload={handleUpload} isLoading={isLoading} />}
        {isLoading && <LoadingState />}
        {result && !isLoading && (
          <>
            <SummaryCard summary={result.summary} metadata={result.metadata} extraction={result.extraction} />
            <button onClick={reset} style={{ marginTop: '24px', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>
              ← Analyze Another Document
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
