import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Environment } from '../types';
import { VariableIcon } from './icons/VariableIcon';
import { SearchIcon } from './icons/SearchIcon';

interface VariableInserterProps {
  activeEnvironment: Environment | null;
  onInsert: (variableKey: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  filter?: string;
}

const stringToHslColor = (str: string, s: number, l: number): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const VariableInserter: React.FC<VariableInserterProps> = ({ activeEnvironment, onInsert, isOpen, setIsOpen, filter = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(filter);
      // Focus search input when modal opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, filter]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);
  
  if (!activeEnvironment || Object.keys(activeEnvironment.variables).length === 0) {
    return null;
  }
  
  const filteredVariables = Object.entries(activeEnvironment.variables).filter(([key]) =>
    key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (variableKey: string) => {
    onInsert(variableKey);
    setIsOpen(false);
  };
  
  const modalRoot = document.getElementById('modal-root');

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
        className="p-1 text-gray-400 hover:text-white"
        title="Insert environment variable"
      >
        <VariableIcon className="w-4 h-4" />
      </button>

      {isOpen && modalRoot && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={() => setIsOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div 
            className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 flex flex-col"
            style={{height: '60vh', maxHeight: '500px'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Insert Environment Variable</h2>
              <div className="relative mt-2">
                <SearchIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search variables..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <ul className="py-1">
                {filteredVariables.length === 0 && (
                     <li className="px-4 py-3 text-sm text-gray-500 text-center">No matches found</li>
                )}
                {filteredVariables.map(([key, value]) => (
                  <li key={key}>
                    <button
                      onClick={() => handleSelect(key)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 flex justify-between items-center"
                    >
                      <div className="flex items-center min-w-0">
                        <span
                          className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                          style={{ backgroundColor: stringToHslColor(key, 60, 60) }}
                        ></span>
                        <span className="font-mono font-semibold truncate">{key}</span>
                      </div>
                      <span className="text-gray-400 truncate ml-4 max-w-[50%]">{String(value)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>,
        modalRoot
      )}
    </>
  );
};

export default VariableInserter;