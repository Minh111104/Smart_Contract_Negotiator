import React, { useState } from 'react';
import { exportContractToPDF, exportContractAsText } from '../utils/pdfExport';

function ExportOptions({ contractTitle, contractContent, participants = [], onClose }) {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('pdf');

  const handleExport = async () => {
    setExporting(true);
    
    try {
      let result;
      
      if (exportType === 'pdf') {
        result = await exportContractToPDF(contractTitle, contractContent, participants);
      } else {
        result = exportContractAsText(contractTitle, contractContent);
      }
      
      if (result.success) {
        alert(`${exportType.toUpperCase()} exported successfully!`);
        if (onClose) onClose();
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      padding: '1rem', 
      marginTop: '1rem',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Export Contract</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Export Format:
        </label>
        <select 
          value={exportType} 
          onChange={(e) => setExportType(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '0.5rem', 
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        >
          <option value="pdf">PDF Document</option>
          <option value="text">Plain Text (.txt)</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '1rem', fontSize: '14px', color: '#666' }}>
        <p><strong>PDF Export:</strong> Professional document with formatting, headers, and metadata</p>
        <p><strong>Text Export:</strong> Simple plain text file for easy sharing</p>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={handleExport}
          disabled={exporting}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: exporting ? 'not-allowed' : 'pointer'
          }}
        >
          {exporting ? 'Exporting...' : `Export as ${exportType.toUpperCase()}`}
        </button>
        
        <button 
          onClick={onClose}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ExportOptions; 