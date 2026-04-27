import React from 'react';
import { motion } from 'framer-motion';

const SummaryCard = ({ summary, metadata, extraction }) => {
  const points = summary.split('\n').filter(line => line.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: '800px', margin: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '24px' }}
    >
      <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>📋 Analysis Result</h2>
      {extraction?.needsOCR && (
        <span style={{ background: '#ff9800', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', marginLeft: '12px' }}>
          🔍 OCR Applied
        </span>
      )}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>AI Summary (3 Points)</h3>
        {points.map((point, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px', display: 'flex', gap: '12px' }}
          >
            <span style={{ color: 'green' }}>✓</span>
            <span>{point}</span>
          </motion.div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Document Info</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px', fontSize: '14px' }}>
          <div><strong>File:</strong> {metadata?.filename}</div>
          <div><strong>Time:</strong> {metadata?.processingTimeMs}ms</div>
          <div><strong>Model:</strong> {metadata?.aiModel || 'Gemini 2.5 Flash'}</div>
          <div><strong>Chars:</strong> {metadata?.charactersExtracted?.toLocaleString()}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default SummaryCard;