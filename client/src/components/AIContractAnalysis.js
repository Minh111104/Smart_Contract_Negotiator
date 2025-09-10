import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';

function AIContractAnalysis({ contractContent, onClose }) {
  const { user } = useAuth();
  const [analysisType, setAnalysisType] = useState('general');
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const analysisTypes = [
    { value: 'general', label: 'General Analysis', description: 'Overall contract completeness and clarity' },
    { value: 'risk', label: 'Risk Assessment', description: 'Identify potential risks and liabilities' },
    { value: 'compliance', label: 'Compliance Check', description: 'Legal compliance and best practices' },
    { value: 'negotiation', label: 'Negotiation Focus', description: 'Key terms for negotiation' }
  ];

  const analyzeContract = async () => {
    if (!contractContent.trim()) {
      setError('No contract content to analyze');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysis('');

    try {
      const response = await fetch('http://localhost:5000/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          content: contractContent,
          analysisType: analysisType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to analyze contract');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyAnalysis = () => {
    navigator.clipboard.writeText(analysis);
  };

  return (
    <div className="flex flex-col h-full max-h-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Contract Analysis</h3>
            <p className="text-xs text-gray-500">Get AI-powered insights about your contract</p>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close analysis"
          className="btn btn-secondary btn-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Analysis Type Selection */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Select Analysis Type:</h4>
        <div className="grid grid-cols-2 gap-2">
          {analysisTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setAnalysisType(type.value)}
              className={`p-3 text-left rounded-lg border transition-colors ${
                analysisType === type.value
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-gray-500 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={analyzeContract}
            disabled={isLoading || !contractContent.trim()}
            className="btn btn-primary flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Analyze Contract
              </>
            )}
          </button>
          
          {analysis && (
            <button
              onClick={copyAnalysis}
              className="btn btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Analysis
            </button>
          )}
        </div>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-2 text-sm text-gray-600">Analyzing your contract...</p>
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                {analysisTypes.find(t => t.value === analysisType)?.label} Results
              </h4>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {analysis}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Select an analysis type and click "Analyze Contract" to get AI-powered insights</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIContractAnalysis;
