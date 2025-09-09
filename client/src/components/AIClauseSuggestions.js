import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

function AIClauseSuggestions({ currentContent, onInsertClause }) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'confidentiality',
    'termination', 
    'liability',
    'intellectual property',
    'payment',
    'force majeure',
    'governing law',
    'warranties'
  ];

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    setShowSuggestions(true);
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          category: category,
          context: currentContent
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get suggestions');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-2 text-sm text-gray-600">Generating AI suggestions...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {suggestions.map((clause, index) => (
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
          )}
        </div>
      )}
    </div>
  );
}

export default AIClauseSuggestions; 