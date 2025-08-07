import React, { useState } from 'react';
import { contractTemplates, getTemplatesByCategory } from '../data/contractTemplates';

function TemplateSelector({ onSelectTemplate, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', ...new Set(contractTemplates.map(t => t.category))];
  
  const filteredTemplates = contractTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = (template) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      padding: '1rem', 
      marginTop: '1rem',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Choose a Template</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '0.5rem', 
            marginBottom: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: selectedCategory === category ? '#007bff' : '#e9ecef',
                color: selectedCategory === category ? 'white' : '#495057',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {filteredTemplates.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No templates found</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredTemplates.map(template => (
              <div 
                key={template.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
                onClick={() => handleTemplateSelect(template)}
              >
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                  {template.title}
                </h4>
                <p style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '14px', 
                  color: '#666',
                  lineHeight: '1.4'
                }}>
                  {template.description}
                </p>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{
                    backgroundColor: '#e9ecef',
                    color: '#495057',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {template.category}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateSelect(template);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
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

export default TemplateSelector; 