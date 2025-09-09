import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';

function AISmartTemplates({ onClose, onUseTemplate }) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('');
  const [requirements, setRequirements] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const contractTypes = [
    { value: 'service agreement', label: 'Service Agreement', description: 'General service provision contract' },
    { value: 'employment contract', label: 'Employment Contract', description: 'Employee hiring and terms' },
    { value: 'non-disclosure agreement', label: 'NDA', description: 'Confidentiality and non-disclosure' },
    { value: 'partnership agreement', label: 'Partnership Agreement', description: 'Business partnership terms' },
    { value: 'software license', label: 'Software License', description: 'Software licensing agreement' },
    { value: 'consulting agreement', label: 'Consulting Agreement', description: 'Professional consulting services' },
    { value: 'purchase agreement', label: 'Purchase Agreement', description: 'Goods or services purchase' },
    { value: 'lease agreement', label: 'Lease Agreement', description: 'Property or equipment rental' }
  ];

  const generateTemplate = async () => {
    if (!selectedType) {
      setError('Please select a contract type');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedTemplate('');

    try {
      const response = await fetch('http://localhost:5000/api/ai/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          contractType: selectedType,
          requirements: requirements.trim() || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedTemplate(data.template);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate template');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const useTemplate = () => {
    if (generatedTemplate && onUseTemplate) {
      onUseTemplate(generatedTemplate);
      onClose();
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(generatedTemplate);
  };

  return (
    <div className="flex flex-col h-full max-h-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Smart Templates</h3>
            <p className="text-xs text-gray-500">Generate AI-powered contract templates</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          title="Close templates"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Contract Type Selection */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Select Contract Type:</h4>
        <div className="grid grid-cols-2 gap-2">
          {contractTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`p-3 text-left rounded-lg border transition-colors ${
                selectedType === type.value
                  ? 'border-purple-500 bg-purple-50 text-purple-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-gray-500 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Requirements Input */}
      <div className="p-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Specific Requirements (Optional):
        </label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="Describe any specific requirements, terms, or conditions you want included in the template..."
          className="w-full h-20 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Generate Button */}
      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={generateTemplate}
          disabled={isLoading || !selectedType}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Template
            </>
          )}
        </Button>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Generated Template */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-2 text-sm text-gray-600">Generating your template...</p>
            </div>
          </div>
        ) : generatedTemplate ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Generated {contractTypes.find(t => t.value === selectedType)?.label} Template
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyTemplate}
                  className="flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </Button>
                <Button
                  onClick={useTemplate}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Use Template
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 font-mono">
                {generatedTemplate}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Select a contract type and click "Generate Template" to create an AI-powered template</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AISmartTemplates;
