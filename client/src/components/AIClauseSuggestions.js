import React, { useState } from 'react';

// Mock AI suggestions - in a real app, this would call an AI API
const mockSuggestions = {
  'confidentiality': [
    'The Receiving Party shall maintain the confidentiality of all proprietary information disclosed by the Disclosing Party.',
    'Confidential information shall be protected using industry-standard security measures.',
    'The confidentiality obligations shall survive termination of this agreement for a period of [NUMBER] years.'
  ],
  'termination': [
    'Either party may terminate this agreement with [NUMBER] days written notice.',
    'This agreement may be terminated immediately for material breach.',
    'Upon termination, all rights and obligations shall cease except for those that survive termination.'
  ],
  'liability': [
    'Neither party shall be liable for any indirect, incidental, or consequential damages.',
    'The total liability of either party shall not exceed the amount paid under this agreement.',
    'This limitation of liability shall not apply to claims arising from gross negligence or willful misconduct.'
  ],
  'intellectual property': [
    'All intellectual property created during the course of this agreement shall belong to [PARTY NAME].',
    'Each party retains ownership of their pre-existing intellectual property.',
    'Any improvements or modifications to existing IP shall be jointly owned.'
  ],
  'payment': [
    'Payment shall be due within [NUMBER] days of receipt of invoice.',
    'Late payments shall incur interest at the rate of [PERCENTAGE]% per month.',
    'All payments shall be made in [CURRENCY] by bank transfer to the designated account.'
  ]
};

function AIClauseSuggestions({ currentContent, onInsertClause }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const categories = Object.keys(mockSuggestions);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowSuggestions(true);
  };

  const handleInsertClause = (clause) => {
    onInsertClause(clause);
    setShowSuggestions(false);
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      padding: '1rem', 
      marginTop: '1rem',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>AI Clause Suggestions</h3>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
        Get AI-powered suggestions for common contract clauses
      </p>
      
      {!showSuggestions ? (
        <div>
          <p style={{ marginBottom: '1rem', fontSize: '14px' }}>
            Select a clause category:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'capitalize'
                }}
              >
                {category.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, textTransform: 'capitalize' }}>
              {selectedCategory.replace('-', ' ')} Clauses
            </h4>
            <button
              onClick={() => setShowSuggestions(false)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Back
            </button>
          </div>
          
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {mockSuggestions[selectedCategory].map((clause, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                onClick={() => handleInsertClause(clause)}
              >
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
                  {clause}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsertClause(clause);
                  }}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Insert Clause
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIClauseSuggestions; 