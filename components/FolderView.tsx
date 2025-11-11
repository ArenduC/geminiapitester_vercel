import React, { useState, useRef, useEffect } from 'react';
import type { ApiFolder, ApiTest, Project } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { FolderIcon } from './icons/FolderIcon';
import Spinner from './Spinner';
import { ImportIcon } from './icons/ImportIcon';
import { ExportIcon } from './icons/ExportIcon';
import { ExportFormat } from '../services/exportService';
import { TrashIcon } from './icons/TrashIcon';
import { DragHandleIcon } from './icons/DragHandleIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { KeyIcon } from './icons/KeyIcon';


interface FolderViewProps {
  project: Project | null;
  folders: ApiFolder[];
  tests: ApiTest[];
  selectedFolder: ApiFolder | null;
  selectedTest: ApiTest | null;
  onSelectFolder: (folder: ApiFolder) => void;
  onSelectTest: (test: ApiTest) => void;
  onAddNewFolder: () => void;
  onAddNewTest: (folderId: string) => void;
  onImportCollection: (fileContent: string) => void;
  onExportCollection: (format: ExportFormat) => void;
  onDeleteFolder: (folderId: string) => void;
  onTestReorder: (draggedTestId: string, targetFolderId: string, newIndex: number) => void;
  loading: boolean;
  activeView: 'tester' | 'comparer' | 'decoder';
  onNavigate: (view: 'tester' | 'comparer' | 'decoder') => void;
}

const FolderView: React.FC<FolderViewProps> = ({
  project,
  folders,
  tests,
  selectedFolder,
  selectedTest,
  onSelectFolder,
  onSelectTest,
  onAddNewFolder,
  onAddNewTest,
  onImportCollection,
  onExportCollection,
  onDeleteFolder,
  onTestReorder,
  loading,
  activeView,
  onNavigate,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportButtonRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    draggedId: string | null;
    overFolderId: string | null;
    dropIndicator: { testId: string; position: 'top' | 'bottom' } | null;
  }>({ draggedId: null, overFolderId: null, dropIndicator: null });


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportButtonRef.current && !exportButtonRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, testId: string) => {
    e.dataTransfer.setData('application/test-id', testId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
        setDragState(prev => ({ ...prev, draggedId: testId }));
    }, 0);
  };
  
  const handleDragOverTest = (e: React.DragEvent<HTMLDivElement>, targetTest: ApiTest) => {
    e.preventDefault();
    if (!dragState.draggedId || dragState.draggedId === targetTest.id) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'top' : 'bottom';

    if (dragState.dropIndicator?.testId !== targetTest.id || dragState.dropIndicator?.position !== position) {
      setDragState(prev => ({ ...prev, overFolderId: null, dropIndicator: { testId: targetTest.id, position } }));
    }
  };

  const handleDragOverFolder = (e: React.DragEvent<HTMLDivElement>, folderId: string) => {
    e.preventDefault();
    if (dragState.overFolderId !== folderId) {
      setDragState(prev => ({ ...prev, overFolderId: folderId, dropIndicator: null }));
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragState(prev => ({ ...prev, overFolderId: null, dropIndicator: null }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('application/test-id');
    if (!draggedId) {
        handleDragEnd();
        return;
    }
    
    // Case 1: Dropped on a folder
    if(dragState.overFolderId) {
        const testsInFolder = tests.filter(t => t.folder_id === dragState.overFolderId).length;
        onTestReorder(draggedId, dragState.overFolderId, testsInFolder);
    }
    // Case 2: Dropped on another test (with an indicator)
    else if (dragState.dropIndicator) {
        const targetTest = tests.find(t => t.id === dragState.dropIndicator!.testId);
        if (!targetTest) return;
        const testsInFolder = tests.filter(t => t.folder_id === targetTest.folder_id).sort((a,b) => a.position - b.position);
        let newIndex = testsInFolder.findIndex(t => t.id === targetTest.id);
        
        if (dragState.dropIndicator.position === 'bottom') {
            newIndex += 1;
        }

        // Adjust index if moving within the same folder
        if(tests.find(t=>t.id===draggedId)?.folder_id === targetTest.folder_id){
           const draggedItem = testsInFolder.find(t => t.id === draggedId);
           if(draggedItem && draggedItem.position < newIndex){
              newIndex -= 1;
           }
        }
        
        onTestReorder(draggedId, targetTest.folder_id, newIndex);
    }
    
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDragState({ draggedId: null, overFolderId: null, dropIndicator: null });
  };


  if (!project) {
    return (
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex items-center justify-center p-4">
        <p className="text-gray-400">Select a project to begin.</p>
      </div>
    );
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-green-400';
      case 'POST': return 'text-blue-400';
      case 'PUT': return 'text-yellow-400';
      case 'PATCH': return 'text-orange-400';
      case 'DELETE': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        onImportCollection(text);
      } else {
        alert('Failed to read file.');
      }
    };
    reader.onerror = () => {
        alert('Error reading file.');
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExport = (format: ExportFormat) => {
    onExportCollection(format);
    setIsExportOpen(false);
  }


  return (
    <aside className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      <header className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white truncate">{project.name}</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('comparer')}
            title="Compare JSON"
            className={`p-2 rounded-md ${activeView === 'comparer' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <ScaleIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onNavigate('decoder')}
            title="Decode JWT"
            className={`p-2 rounded-md ${activeView === 'decoder' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <KeyIcon className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      <div className="p-2 flex space-x-2">
        <button
          onClick={onAddNewFolder}
          disabled={loading}
          className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Folder
        </button>
         <label
          htmlFor="import-collection"
          className={`cursor-pointer flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ImportIcon className="w-4 h-4 mr-1" />
          Import
        </label>
        <input 
          type="file" 
          id="import-collection" 
          className="hidden" 
          accept=".json"
          onChange={handleFileImport}
          disabled={loading}
        />
         <div className="relative" ref={exportButtonRef}>
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            disabled={loading}
            className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExportIcon className="w-4 h-4 mr-1" />
            Export
          </button>
          {isExportOpen && (
             <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg z-20 border border-gray-700">
                <ul className="py-1">
                  <li><button onClick={() => handleExport('text')} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Plain Text</button></li>
                  <li><button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">CSV</button></li>
                  <li className="border-t border-gray-700 my-1"></li>
                  <li><button onClick={() => handleExport('postman')} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Postman Collection</button></li>
                  <li><button onClick={() => handleExport('thunder')} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Thunder Client</button></li>
                </ul>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      )}

      {!loading && folders.length === 0 && (
         <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-gray-400">No API folders exist yet.</p>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-2" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onDragLeave={handleDragLeave}>
        {folders.map(folder => (
          <div key={folder.id} className="mb-2 group">
            <div
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedFolder?.id === folder.id ? 'bg-gray-700' : 'hover:bg-gray-700/80'} ${dragState.overFolderId === folder.id ? 'bg-indigo-900/50' : ''}`}
              onClick={() => onSelectFolder(folder)}
              onDragOver={(e) => handleDragOverFolder(e, folder.id)}
            >
               <div className="flex items-center overflow-hidden">
                 <FolderIcon className="w-5 h-5 mr-2 text-gray-400 flex-shrink-0"/>
                 <h3 className="font-semibold text-sm text-white truncate">{folder.folder_name}</h3>
               </div>
               <div className="flex items-center flex-shrink-0">
                 <button onClick={(e) => { e.stopPropagation(); onAddNewTest(folder.id); }} className="p-1 rounded hover:bg-gray-600" title="Add new request">
                    <PlusIcon className="w-4 h-4 text-gray-400" />
                 </button>
                 <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onDeleteFolder(folder.id); 
                    }} 
                    className="p-1 rounded text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete folder"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
               </div>
            </div>
            
            {selectedFolder?.id === folder.id && (
              <div className="pl-4 mt-1 space-y-1">
                {tests
                    .filter(test => test.folder_id === folder.id)
                    .sort((a,b) => a.position - b.position)
                    .map(test => (
                    <div 
                        key={test.id} 
                        className="relative"
                        onDragOver={(e) => handleDragOverTest(e, test)}
                    >
                         {dragState.dropIndicator?.testId === test.id && dragState.dropIndicator.position === 'top' &&
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 z-10"/>}

                        <div
                            onClick={() => onSelectTest(test)}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, test.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center p-2 rounded-md cursor-pointer ${selectedTest?.id === test.id ? 'bg-indigo-900' : 'hover:bg-gray-700/50'} ${dragState.draggedId === test.id ? 'opacity-50' : ''}`}
                        >
                            <DragHandleIcon className="w-5 h-5 mr-1 text-gray-500 cursor-grab"/>
                            <span className={`w-12 text-xs font-bold ${getMethodColor(test.method)}`}>{test.method}</span>
                            <span className="text-sm text-gray-300 truncate">{test.name}</span>
                        </div>

                        {dragState.dropIndicator?.testId === test.id && dragState.dropIndicator.position === 'bottom' &&
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 z-10"/>}
                    </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default FolderView;