import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Project, Environment } from '../types';
import { supabase } from '../services/supabaseService';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import Spinner from './Spinner';

interface ManageEnvironmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  environments: Environment[];
  setEnvironments: React.Dispatch<React.SetStateAction<Environment[]>>;
  onDeleteEnvironment: (envId: string) => void;
}

const ManageEnvironmentsModal: React.FC<ManageEnvironmentsModalProps> = ({
  isOpen,
  onClose,
  project,
  environments,
  setEnvironments,
  onDeleteEnvironment,
}) => {
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null);
  const [variables, setVariables] = useState<[string, string][]>([]);
  const [envName, setEnvName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [newEnvNameInput, setNewEnvNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // This effect handles the logic for opening the modal and syncing the selected environment,
  // but it now correctly respects the `isCreating` state to prevent conflicts.
  useEffect(() => {
    if (isOpen) {
      // When in creation mode, we don't want to auto-select an environment.
      if (isCreating) {
        return;
      }

      setError(null);
      setSearchTerm('');

      const currentId = selectedEnv?.id;
      const updatedSelectedEnvInProps = environments.find(e => e.id === currentId);

      if (updatedSelectedEnvInProps) {
        // Sync with props if the selected env object has changed (e.g., after a save).
        if (JSON.stringify(updatedSelectedEnvInProps) !== JSON.stringify(selectedEnv)) {
          setSelectedEnv(updatedSelectedEnvInProps);
        }
      } else if (environments.length > 0) {
        // Auto-select the first environment if the current selection is invalid or null.
        setSelectedEnv(environments[0]);
      } else {
        // No environments exist, so ensure none is selected.
        setSelectedEnv(null);
      }
    }
  }, [isOpen, environments, selectedEnv, isCreating]);


  useEffect(() => {
    if (selectedEnv) {
      // Ensure all variable values are strings to prevent controlled input errors from null values.
      const safeVariables = Object.entries(selectedEnv.variables || {}).map(
        ([key, value]) => [key, String(value ?? '')] as [string, string]
      );
      setVariables(safeVariables);
      setEnvName(selectedEnv.name || ''); // Guard against null name
      setSearchTerm('');
    } else {
      setVariables([]);
      setEnvName('');
    }
  }, [selectedEnv]);

  useEffect(() => {
    if (isCreating) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isCreating]);

  if (!isOpen) return null;

  const handleVariableChange = (index: number, field: 'key' | 'value', text: string) => {
    const newVariables = variables.map((variable, i) => {
      if (i !== index) return variable;
      return field === 'key' ? [text, variable[1]] : [variable[0], text];
    });
    setVariables(newVariables);
  };
  
  const addVariable = () => {
    setVariables([...variables, ['', '']]);
  };
  
  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    if (!selectedEnv || !envName.trim()) {
        setError("Environment name cannot be empty.");
        return;
    };
    setIsSaving(true);
    setError(null);
    const variablesObject = Object.fromEntries(variables.filter(([key]) => key));
    const { data, error: updateError } = await supabase
      .from('environments')
      .update({ name: envName.trim(), variables: variablesObject })
      .eq('id', selectedEnv.id)
      .select()
      .single();
    setIsSaving(false);
    if (updateError) {
      setError('Error saving environment: ' + updateError.message);
    } else if (data) {
      setEnvironments(environments.map(e => e.id === data.id ? data : e));
    }
  };

  const handleStartCreation = () => {
      setSelectedEnv(null);
      setIsCreating(true);
      setNewEnvNameInput('');
      setError(null);
  };
  
  const handleCancelCreation = () => {
      setIsCreating(false);
      setError(null);
      if (environments.length > 0) {
          setSelectedEnv(environments[0]);
      }
  };

  const handleConfirmCreation = async () => {
    if (!newEnvNameInput.trim()) {
      setError("Environment name cannot be empty.");
      return;
    }
    setIsSaving(true);
    setError(null);
    const { data, error: createError } = await supabase
      .from('environments')
      .insert({ name: newEnvNameInput.trim(), project_id: project.id, variables: {} })
      .select()
      .single();
    
    setIsSaving(false);
    if (createError) {
      setError('Error creating environment: ' + createError.message);
    } else if (data) {
      setEnvironments([...environments, data]);
      setSelectedEnv(data);
      setIsCreating(false);
    }
  };
  
  const handleDelete = () => {
    if (!selectedEnv) return;
    onDeleteEnvironment(selectedEnv.id);
  };

  const renderContent = () => {
    if (isCreating) {
      return (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Create New Environment</h3>
          <div>
            <label htmlFor="new-env-name" className="block text-gray-400 text-sm font-bold mb-2">Environment Name</label>
            <input
              id="new-env-name"
              ref={inputRef}
              type="text"
              value={newEnvNameInput}
              onChange={e => setNewEnvNameInput(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Staging"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreation()}
            />
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button onClick={handleCancelCreation} className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors">Cancel</button>
            <button onClick={handleConfirmCreation} disabled={isSaving || !newEnvNameInput.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors w-24 flex justify-center">
              {isSaving ? <Spinner size="sm"/> : 'Create'}
            </button>
          </div>
        </div>
      );
    }

    if (environments.length === 0) {
        return (
             <div className="p-6 flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                <p>No environments created yet.</p>
                <button onClick={handleStartCreation} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition-colors">
                    Create Your First Environment
                </button>
            </div>
        );
    }
    
    const filteredVariables = variables.filter(([key, value]) =>
      key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="p-6 flex-1 flex flex-col min-h-0">
        <div className="flex items-center mb-4 space-x-2">
            <select
                value={selectedEnv?.id || ''}
                onChange={e => setSelectedEnv(environments.find(env => env.id === e.target.value) || null)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
            </select>
            <button onClick={handleStartCreation} className="px-3 py-2 bg-gray-700 text-white rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors">
                Create New
            </button>
          </div>
          {selectedEnv && (
            <>
              <div className="flex items-center space-x-2 mb-4">
                <input type="text" value={envName} onChange={e => setEnvName(e.target.value)} className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm" placeholder="Environment Name"/>
                <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search variables..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center text-sm font-semibold text-gray-400 px-2 pb-2 border-b border-gray-700">
                <span>VARIABLE</span>
                <span>VALUE</span>
                <span className="w-8"></span>
              </div>
              <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-2">
                {filteredVariables.map(([key, value], index) => {
                  const originalIndex = variables.findIndex(v => v[0] === key && v[1] === value);
                  return (
                  <div key={originalIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input type="text" value={key} onChange={e => handleVariableChange(originalIndex, 'key', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono" placeholder="key"/>
                    <input type="text" value={value} onChange={e => handleVariableChange(originalIndex, 'value', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono" placeholder="value"/>
                    <button onClick={() => removeVariable(originalIndex)} className="p-1 text-gray-500 hover:text-red-500 flex items-center justify-center w-8"><TrashIcon className="w-4 h-4"/></button>
                  </div>
                )})}
                <button onClick={addVariable} className="text-indigo-400 text-sm mt-2 flex items-center">
                    <PlusIcon className="w-4 h-4 mr-1"/> Add Variable
                </button>
              </div>
            </>
          )}
      </div>
    )
  }

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 flex flex-col" style={{height: '70vh', maxHeight: '700px'}} onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">Manage Environments</h2>
            <p className="text-sm text-gray-400">Manage variables for <span className="font-semibold text-gray-200">{project.name}</span></p>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          {renderContent()}
        </div>
        
        {error && <div className="px-6 py-2 text-red-400 bg-red-900/20 text-sm flex-shrink-0">{error}</div>}

        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors">Close</button>
          {!isCreating && environments.length > 0 && (
            <button type="button" onClick={handleSaveChanges} disabled={!selectedEnv || isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors w-32 flex justify-center">
                {isSaving ? <Spinner size="sm"/> : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default ManageEnvironmentsModal;