import React from 'react';
import { motion } from 'framer-motion';

const LoadingState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ textAlign: 'center', padding: '40px' }}
    >
      <div style={{ display: 'inline-block', width: '48px', height: '48px', border: '4px solid #f3f3f3', borderTop: '4px solid #007bff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h3 style={{ marginTop: '16px' }}>Analyzing Document</h3>
      <p>Our AI is processing your document with Gemini 2.5 Flash...</p>
    </motion.div>
  );
};

export default LoadingState;