// FIX: Add EnvironmentSelector to the header.
import React, { useState } from 'react';
import type { Project, User, Environment } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { CogIcon } from './icons/CogIcon';
import SettingsModal from './SettingsModal';
import EnvironmentSelector from './EnvironmentSelector';
import { TrashIcon } from './icons/TrashIcon';
import { VariableIcon } from './icons/VariableIcon';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  onAddNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  user: User;
  onLogout: () => void;
  onUserUpdate: (updatedUser: User) => void;
  proxyTemplate: string;
  onProxyTemplateChange: (template: string) => void;
  environments: Environment[];
  activeEnvironment: Environment | null;
  onSelectEnvironment: (environment: Environment | null) => void;
  onManageEnvironments: () => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onAddNewProject,
  onDeleteProject,
  user,
  onLogout,
  onUserUpdate,
  proxyTemplate,
  onProxyTemplateChange,
  environments,
  activeEnvironment,
  onSelectEnvironment,
  onManageEnvironments,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const handleSelect = (project: Project | null) => {
    onSelectProject(project);
    setDropdownOpen(false);
  };

  return (
    <>
      <header className="flex-shrink-0 bg-gray-900 h-16 flex items-center justify-between px-6 border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 text-white font-semibold text-lg"
            >
              <span>{selectedProject ? selectedProject.name : 'Select Project'}</span>
              <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
                <ul className="py-1">
                  {projects.map(project => (
                    <li key={project.id} className="group flex items-center justify-between w-full text-sm text-gray-200 hover:bg-gray-700">
                      <button
                        onClick={() => handleSelect(project)}
                        className="flex-grow text-left px-4 py-2"
                      >
                        {project.name}
                      </button>
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                          setDropdownOpen(false);
                        }}
                        className="p-2 rounded text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={`Delete ${project.name}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                   {projects.length > 0 && <li className="border-t border-gray-700 my-1"></li>}
                  <li>
                    <button
                      onClick={() => { onAddNewProject(); setDropdownOpen(false); }}
                      className="w-full flex items-center px-4 py-2 text-sm text-indigo-400 hover:bg-gray-700"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create New Project
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
          {selectedProject && environments.length > 0 && (
            <EnvironmentSelector 
              environments={environments}
              activeEnvironment={activeEnvironment}
              onSelect={onSelectEnvironment}
            />
          )}
        </div>
        <div className="flex items-center space-x-4">
           {selectedProject && (
            <button onClick={onManageEnvironments} className="text-gray-400 hover:text-white" title="Manage Environments">
              <VariableIcon className="w-5 h-5" />
            </button>
          )}
          <span className="text-sm text-gray-400">{user.name}</span>
          <button onClick={() => setSettingsModalOpen(true)} className="text-gray-400 hover:text-white">
            <CogIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-gray-700 text-white rounded-md text-xs font-semibold hover:bg-gray-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        user={user}
        onUserUpdate={onUserUpdate}
        proxyTemplate={proxyTemplate}
        onProxyTemplateChange={onProxyTemplateChange}
      />
    </>
  );
};

export default ProjectSelector;