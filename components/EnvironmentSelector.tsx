
import React, { useState } from 'react';
import type { Environment } from '../types';

interface EnvironmentSelectorProps {
  environments: Environment[];
  activeEnvironment: Environment | null;
  onSelect: (environment: Environment | null) => void;
}

const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  environments,
  activeEnvironment,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (env: Environment | null) => {
    onSelect(env);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-700"
      >
        <span className="truncate max-w-[120px]">
          {activeEnvironment ? activeEnvironment.name : 'No Environment'}
        </span>
        <svg className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
          <ul className="py-1 max-h-60 overflow-y-auto">
            <li>
              <button
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-4 py-2 text-sm ${!activeEnvironment ? 'text-indigo-400' : 'text-gray-200'} hover:bg-gray-700`}
              >
                No Environment
              </button>
            </li>
            {environments.map(env => (
              <li key={env.id}>
                <button
                  onClick={() => handleSelect(env)}
                  className={`w-full text-left px-4 py-2 text-sm ${activeEnvironment?.id === env.id ? 'text-indigo-400' : 'text-gray-200'} hover:bg-gray-700`}
                >
                  {env.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EnvironmentSelector;