import React, { useState, useEffect } from 'react';
import type { SavedToken } from '../types';
import JsonViewer from './JsonViewer';
import { TrashIcon } from './icons/TrashIcon';

const TokenDecoderView: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [decodedHeader, setDecodedHeader] = useState<object | null>(null);
  const [decodedPayload, setDecodedPayload] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tokenName, setTokenName] = useState('');
  const [savedTokens, setSavedTokens] = useState<SavedToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<SavedToken | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jwtTokens');
      if (saved) {
        setSavedTokens(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved tokens", e);
    }
  }, []);

  useEffect(() => {
    if (!tokenInput) {
      setDecodedHeader(null);
      setDecodedPayload(null);
      setError(null);
      return;
    }

    try {
      const parts = tokenInput.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format: The token must have three parts separated by dots.');
      }
      
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      setDecodedHeader(header);
      setDecodedPayload(payload);
      setError(null);
    } catch (e: any) {
      setDecodedHeader(null);
      setDecodedPayload(null);
      setError(`Decoding Error: ${e.message || 'The token is malformed or not a valid JWT.'}`);
    }
  }, [tokenInput]);
  
  const handleSaveToken = () => {
    if (!tokenName.trim() || !tokenInput.trim()) {
      alert("Please provide a name and a token to save.");
      return;
    }
    const newToken: SavedToken = {
      id: crypto.randomUUID(),
      name: tokenName,
      token: tokenInput,
    };
    const updated = [...savedTokens, newToken];
    setSavedTokens(updated);
    localStorage.setItem('jwtTokens', JSON.stringify(updated));
    setTokenName('');
  };

  const handleLoadToken = (token: SavedToken) => {
    setSelectedToken(token);
    setTokenInput(token.token);
    setTokenName(token.name);
  };
  
  const handleDeleteToken = (id: string) => {
    const updated = savedTokens.filter(t => t.id !== id);
    setSavedTokens(updated);
    localStorage.setItem('jwtTokens', JSON.stringify(updated));
    if (selectedToken?.id === id) {
      setSelectedToken(null);
      setTokenInput('');
      setTokenName('');
    }
  };

  return (
    <main className="flex-1 flex min-h-0 bg-gray-900">
      <div className="flex-1 flex flex-col min-h-0">
        <header className="p-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold">JWT Decoder</h2>
        </header>
        <div className="p-2 flex items-center space-x-2 border-b border-gray-800">
          <input 
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm"
              placeholder="Name for this token..."
          />
          <button onClick={handleSaveToken} className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-semibold hover:bg-gray-500">
              Save Token
          </button>
        </div>
        <div className="flex-1 grid grid-rows-2 gap-2 p-2 min-h-0">
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 px-1 text-gray-300">Encoded Token (JWT)</label>
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full h-full p-2 bg-gray-950 rounded-md font-mono text-sm border border-gray-700 focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Paste your JWT here..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2 min-h-0">
                <div className="flex flex-col bg-gray-800 rounded-md border border-gray-700 min-h-0">
                   <h3 className="text-sm font-semibold p-2 border-b border-gray-700">Header</h3>
                   <div className="flex-1 overflow-auto">
                     {decodedHeader && <JsonViewer data={decodedHeader} searchTerm="" />}
                   </div>
                </div>
                 <div className="flex flex-col bg-gray-800 rounded-md border border-gray-700 min-h-0">
                   <h3 className="text-sm font-semibold p-2 border-b border-gray-700">Payload</h3>
                    <div className="flex-1 overflow-auto">
                     {decodedPayload && <JsonViewer data={decodedPayload} searchTerm="" />}
                   </div>
                </div>
            </div>
        </div>
        {error && <div className="p-2 bg-red-900/40 text-red-300 text-sm font-mono">{error}</div>}
      </div>
      <aside className="w-64 bg-gray-800 p-2 flex flex-col border-l border-gray-700">
          <h3 className="font-semibold text-sm mb-2 px-1">Saved Tokens</h3>
          <div className="flex-1 overflow-y-auto">
              {savedTokens.length === 0 && <p className="text-xs text-gray-500 text-center p-4">No saved tokens.</p>}
              {savedTokens.map(token => (
                  <div key={token.id} className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm ${selectedToken?.id === token.id ? 'bg-indigo-900' : 'hover:bg-gray-700'}`} onClick={() => handleLoadToken(token)}>
                      <span className="truncate">{token.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteToken(token.id);}} className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500">
                          <TrashIcon className="w-4 h-4"/>
                      </button>
                  </div>
              ))}
          </div>
      </aside>
    </main>
  );
};

export default TokenDecoderView;