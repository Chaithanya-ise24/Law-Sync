import React from 'react';
import { motion } from 'framer-motion';

const ErrorAlert = ({ error, onDismiss }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{ maxWidth: '600px', margin: 'auto', background: '#ffe6e6', borderLeft: '4px solid #dc3545', padding: '16px', borderRadius: '8px', marginBottom: '24px', position: 'relative' }}
    >
      <strong style={{ color: '#dc3545' }}>Upload Failed</strong>
      <p style={{ margin: '8px 0 0' }}>{error?.message || 'Something went wrong. Please try again.'}</p>
      <button onClick={onDismiss} style={{ position: 'absolute', top: '8px', right: '12px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✖</button>
    </motion.div>
  );
};

export default ErrorAlert;