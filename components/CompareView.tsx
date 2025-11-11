import React, { useState, useEffect } from 'react';
import type { ApiTest, ApiResponse, SavedComparison } from '../types';
import JsonDiffViewer from './JsonDiffViewer';
import Spinner from './Spinner';
import { TrashIcon } from './icons/TrashIcon';

interface CompareViewProps {
  tests: ApiTest[];
  onRunTest: (test: ApiTest) => Promise<ApiResponse | null>;
}

type CompareMode = 'requests' | 'manual';

const CompareView: React.FC<CompareViewProps> = ({ tests, onRunTest }) => {
  const [mode, setMode] = useState<CompareMode>('requests');
  
  // Request mode state
  const [requestA, setRequestA] = useState<ApiTest | null>(null);
  const [requestB, setRequestB] = useState<ApiTest | null>(null);
  const [responseA, setResponseA] = useState<ApiResponse | null>(null);
  const [responseB, setResponseB] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Manual mode state
  const [manualA, setManualA] = useState('');
  const [manualB, setManualB] = useState('');
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([]);
  const [comparisonName, setComparisonName] = useState('');
  const [selectedSaved, setSelectedSaved] = useState<SavedComparison | null>(null);
  const [manualView, setManualView] = useState<'input' | 'diff'>('input');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jsonComparisons');
      if (saved) {
        setSavedComparisons(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved comparisons", e);
    }
  }, []);

  useEffect(() => {
    // Reset to input view when switching between request/manual modes
    setManualView('input');
  }, [mode]);

  const handleRunAndCompare = async () => {
    if (!requestA || !requestB) return;
    setIsLoading(true);
    setResponseA(null);
    setResponseB(null);
    const [resA, resB] = await Promise.all([onRunTest(requestA), onRunTest(requestB)]);
    setResponseA(resA);
    setResponseB(resB);
    setIsLoading(false);
  };

  const handleSaveComparison = () => {
    if (!comparisonName.trim() || !manualA || !manualB) {
        alert("Please provide a name and content for both JSON panels.");
        return;
    };
    const newComparison: SavedComparison = {
        id: crypto.randomUUID(),
        name: comparisonName,
        jsonA: manualA,
        jsonB: manualB,
    };
    const updated = [...savedComparisons, newComparison];
    setSavedComparisons(updated);
    localStorage.setItem('jsonComparisons', JSON.stringify(updated));
    setComparisonName('');
  };
  
  const handleLoadComparison = (comparison: SavedComparison) => {
    setSelectedSaved(comparison);
    setManualA(comparison.jsonA);
    setManualB(comparison.jsonB);
    setComparisonName(comparison.name);
    setManualView('input'); // Switch to input view when loading
  };
  
  const handleDeleteComparison = (id: string) => {
    const updated = savedComparisons.filter(c => c.id !== id);
    setSavedComparisons(updated);
    localStorage.setItem('jsonComparisons', JSON.stringify(updated));
    if (selectedSaved?.id === id) {
        setSelectedSaved(null);
        setManualA('');
        setManualB('');
        setComparisonName('');
    }
  };
  
  const getJsonBody = (response: ApiResponse | null): string => {
    if (!response || !response.body) return '';
    if (typeof response.body === 'object') {
        return JSON.stringify(response.body, null, 2);
    }
    return String(response.body); // Fallback for non-json responses
  }

  const renderRequestSelector = (
    value: ApiTest | null,
    onChange: (test: ApiTest | null) => void,
    placeholder: string
  ) => (
    <select
      value={value?.id || ''}
      onChange={(e) => onChange(tests.find(t => t.id === e.target.value) || null)}
      className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">{placeholder}</option>
      {tests.map(test => <option key={test.id} value={test.id}>{test.name}</option>)}
    </select>
  );

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-gray-900">
      <header className="p-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-bold">JSON Comparison</h2>
        <div className="flex items-center text-sm">
          <button onClick={() => setMode('requests')} className={`px-3 py-1 rounded-l-md ${mode === 'requests' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Request vs Request</button>
          <button onClick={() => setMode('manual')} className={`px-3 py-1 rounded-r-md ${mode === 'manual' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Manual Input</button>
        </div>
      </header>
      
      {mode === 'requests' && (
        <div className="p-2 flex items-center space-x-2 border-b border-gray-800">
          {renderRequestSelector(requestA, setRequestA, "Select Request A")}
          {renderRequestSelector(requestB, setRequestB, "Select Request B")}
          <button onClick={handleRunAndCompare} disabled={!requestA || !requestB || isLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 w-40 flex justify-center">
            {isLoading ? <Spinner size="sm" /> : 'Run & Compare'}
          </button>
        </div>
      )}

      {mode === 'manual' && (
         <div className="p-2 flex items-center space-x-2 border-b border-gray-800">
            <input 
                type="text"
                value={comparisonName}
                onChange={(e) => setComparisonName(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm"
                placeholder="Name for this comparison..."
            />
            <button onClick={handleSaveComparison} className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-semibold hover:bg-gray-500">
                Save
            </button>
             <button 
                onClick={() => setManualView('diff')} 
                disabled={!manualA.trim() || !manualB.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400"
            >
                Compare
            </button>
         </div>
      )}

      <div className="flex-1 flex min-h-0">
        {mode === 'manual' && (
            <aside className="w-64 bg-gray-800 p-2 flex flex-col">
                <h3 className="font-semibold text-sm mb-2 px-1">Saved Comparisons</h3>
                <div className="flex-1 overflow-y-auto">
                    {savedComparisons.length === 0 && <p className="text-xs text-gray-500 text-center p-4">No saved comparisons.</p>}
                    {savedComparisons.map(comp => (
                        <div key={comp.id} className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm ${selectedSaved?.id === comp.id ? 'bg-indigo-900' : 'hover:bg-gray-700'}`} onClick={() => handleLoadComparison(comp)}>
                            <span className="truncate">{comp.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteComparison(comp.id);}} className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500">
                                <TrashIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </div>
            </aside>
        )}
        <div className="flex-1 flex flex-col min-h-0">
          {mode === 'manual' && manualView === 'diff' ? (
            <>
                <div className="p-2 border-b border-gray-800 flex justify-end">
                    <button onClick={() => setManualView('input')} className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-semibold hover:bg-gray-500">
                        Back to Input
                    </button>
                </div>
                <JsonDiffViewer 
                    oldValue={manualA}
                    newValue={manualB}
                    onOldValueChange={() => {}}
                    onNewValueChange={() => {}}
                    isEditable={false}
                />
            </>
          ) : (
             <JsonDiffViewer 
                oldValue={mode === 'requests' ? getJsonBody(responseA) : manualA}
                newValue={mode === 'requests' ? getJsonBody(responseB) : manualB}
                onOldValueChange={setManualA}
                onNewValueChange={setManualB}
                isEditable={mode === 'manual'}
             />
          )}
        </div>
      </div>
    </main>
  );
};

export default CompareView;