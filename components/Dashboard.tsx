import React, { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '../services/supabaseService';
import { runApiTest } from '../services/apiRunnerService';
import type { User, Project, ApiFolder, ApiTest, ApiResponse, Environment, AuthDetails } from '../types';
import ProjectSelector from './ProjectSelector';
import FolderView from './FolderView';
import TestView from './TestView';
import DataError from './DataError';
import Modal from './Modal';
import ManageEnvironmentsModal from './ManageEnvironmentsModal';
import ConfirmationModal from './ConfirmationModal';
import TokenDecoderView from './TokenDecoderView';
import { parsePostmanCollection } from '../services/postmanImportService';
import { exportCollection, ExportFormat } from '../services/exportService';
import { JSONPath } from 'jsonpath-plus';
import Spinner from './Spinner';

const CompareView = React.lazy(() => import('./CompareView'));

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ApiFolder | null>(null);
  const [tests, setTests] = useState<ApiTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<ApiTest | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<Environment | null>(null);
  
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<{title: string, message: string} | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalContent, setConfirmModalContent] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

  const [activeView, setActiveView] = useState<'tester' | 'comparer' | 'decoder'>('tester');

  const [proxyTemplate, setProxyTemplate] = useState(localStorage.getItem('proxyTemplate') || '');
  const [appUser, setAppUser] = useState(user);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      setDbError(null);
      // Fetches projects using a database function for security and correctness.
      // This function should return all projects the user is a member of.
      const { data, error } = await supabase.rpc('get_user_projects');

      if (error) {
        setDbError({
          title: "Failed to load projects", 
          message: `${error.message}. Please ensure the 'get_user_projects' database function exists and you have the correct RLS policies.`
        });
      } else {
        const projectsData = data || [];
        setProjects(projectsData as Project[]);
        if (projectsData.length > 0) {
          const lastProjectId = localStorage.getItem('selectedProjectId');
          const projectToSelect = projectsData.find(p => p.id === lastProjectId) || projectsData[0];
          handleSelectProject(projectToSelect as Project);
        }
      }
      setLoadingProjects(false);
    };
    fetchProjects();
  }, [user.id]);

  const refreshProjectData = async () => {
    if (!selectedProject) return;
    
    setLoadingFolders(true);
    setDbError(null);
    
    const { data: foldersData, error: foldersError } = await supabase
      .from('api_folders')
      .select('*')
      .eq('project_id', selectedProject.id)
      .order('created_at');
    
    if (foldersError) {
       setDbError({title: "Failed to load API folders", message: foldersError.message});
       setFolders([]);
       setTests([]);
       setLoadingFolders(false);
       return;
    }
    
    setFolders(foldersData);
    
    if(foldersData.length > 0) {
      const folderIds = foldersData.map(f => f.id);
      const { data: testsData, error: testsError } = await supabase
        .from('api_tests')
        .select('*')
        .in('folder_id', folderIds)
        .order('position');

      if (testsError) {
        setDbError({title: "Failed to load API tests", message: testsError.message});
        setTests([]);
      } else {
        setTests(testsData);
      }
    } else {
      setTests([]);
    }
    
    const { data: envsData, error: envsError } = await supabase
      .from('environments')
      .select('*')
      .eq('project_id', selectedProject.id)
      .order('name');
    
    if (envsError) {
      setDbError({title: "Failed to load environments", message: envsError.message});
      setEnvironments([]);
    } else {
      setEnvironments(envsData);
      const lastEnvId = localStorage.getItem(`selectedEnv_${selectedProject.id}`);
      const envToSelect = envsData.find(e => e.id === lastEnvId) || null;
      setActiveEnvironment(envToSelect);
    }

    setLoadingFolders(false);
  };

  useEffect(() => {
    if (!selectedProject) {
      setFolders([]);
      setTests([]);
      setEnvironments([]);
      return;
    }
    refreshProjectData();
  }, [selectedProject]);
  
  // This effect ensures that if the environments list is updated (e.g., from the modal),
  // the activeEnvironment state is also updated to reflect those changes, preventing stale data.
  useEffect(() => {
    if (activeEnvironment) {
      const freshActiveEnv = environments.find(e => e.id === activeEnvironment.id);
      // Compare stringified versions to avoid infinite loops from object reference changes
      if (freshActiveEnv && JSON.stringify(freshActiveEnv) !== JSON.stringify(activeEnvironment)) {
        setActiveEnvironment(freshActiveEnv);
      } else if (!freshActiveEnv) {
        // The active environment was deleted
        setActiveEnvironment(null);
      }
    }
  }, [environments]);

  const handleSelectProject = (project: Project | null) => {
    if (project?.id !== selectedProject?.id) {
      setSelectedProject(project);
      setSelectedFolder(null);
      setSelectedTest(null);
      setApiResponse(null);
      setApiError(null);
      if (project) {
        localStorage.setItem('selectedProjectId', project.id);
      } else {
        localStorage.removeItem('selectedProjectId');
      }
    }
  };
  
  const handleSelectFolder = (folder: ApiFolder) => {
    setSelectedFolder(folder);
    setActiveView('tester');
  };

  const handleSelectTest = (test: ApiTest) => {
    setSelectedTest(test);
    setApiResponse(null);
    setApiError(null);
    setActiveView('tester');
  };
  
  const handleSelectEnvironment = (environment: Environment | null) => {
    setActiveEnvironment(environment);
    if (selectedProject) {
      if (environment) {
        localStorage.setItem(`selectedEnv_${selectedProject.id}`, environment.id);
      } else {
        localStorage.removeItem(`selectedEnv_${selectedProject.id}`);
      }
    }
  };

  const handleCreateProject = async (projectName: string) => {
    const { data, error } = await supabase
        .rpc('create_project_and_add_user', {
            project_name: projectName
        });

    if (error) {
      alert("Error creating project: " + error.message);
    } else if (data) {
      const newProject = data as Project;
      setProjects([...projects, newProject]);
      handleSelectProject(newProject);
    }
    setIsProjectModalOpen(false);
  };

  const handleDeleteProject = (projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;

    setConfirmModalContent({
      title: 'Delete Project',
      message: `Are you sure you want to delete the project "${projectToDelete.name}" and all its data? This action cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase.from('projects').delete().eq('id', projectId);

        if (error) {
          alert("Error deleting project: " + error.message);
        } else {
          const updatedProjects = projects.filter(p => p.id !== projectId);
          setProjects(updatedProjects);
          if (selectedProject?.id === projectId) {
            handleSelectProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
          }
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!selectedProject) return;
    const { data, error } = await supabase.from('api_folders').insert({ folder_name: folderName, project_id: selectedProject.id, created_by: user.id }).select().single();
    if (error) {
      alert("Error creating folder: " + error.message);
    } else if (data) {
      setFolders([...folders, data]);
      setSelectedFolder(data);
    }
    setIsFolderModalOpen(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) return;

    setConfirmModalContent({
      title: 'Delete Folder',
      message: `Are you sure you want to delete the folder "${folderToDelete.folder_name}" and all its requests?`,
      onConfirm: async () => {
        const { error } = await supabase.from('api_folders').delete().eq('id', folderId);

        if (error) {
          alert("Error deleting folder: " + error.message);
        } else {
          setFolders(folders.filter(f => f.id !== folderId));
          setTests(tests.filter(t => t.folder_id !== folderId));
          if (selectedFolder?.id === folderId) {
            setSelectedFolder(null);
            setSelectedTest(null);
          }
        }
      }
    });
    setIsConfirmModalOpen(true);
  };
  
  const handleCreateTest = async (folderId: string) => {
    const testsInFolder = tests.filter(t => t.folder_id === folderId);
    const newPosition = testsInFolder.length > 0 ? Math.max(...testsInFolder.map(t => t.position)) + 1 : 0;
    
    const newTest: Omit<ApiTest, 'id' | 'created_by' | 'auth'> = {
      folder_id: folderId,
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: {},
      bodyType: 'none',
      body: '',
      position: newPosition,
      extractionRules: [],
    };

    const { data, error } = await supabase.from('api_tests').insert({ ...newTest, created_by: user.id }).select().single();
    if (error) {
      alert("Error creating test: " + error.message);
    } else if (data) {
      setTests([...tests, data]);
      setSelectedTest(data);
      const folder = folders.find(f => f.id === folderId);
      if(folder) setSelectedFolder(folder);
    }
  };

  const handleTestChange = (updatedTest: ApiTest) => {
    setSelectedTest(updatedTest);
    setTests(currentTests => currentTests.map(t => t.id === updatedTest.id ? updatedTest : t));
  };

  const handleSaveTest = async () => {
    if (!selectedTest) return;
    const { id, ...updateData } = selectedTest;
    const { error } = await supabase.from('api_tests').update(updateData).eq('id', id);
    if (error) {
      alert("Error saving test: " + error.message);
    } else {
      // This is a bit of a hack to force a re-render in children, might not be necessary
      setSelectedTest({ ...selectedTest }); 
    }
  };
  
  const handleDeleteTest = (testId: string) => {
    const testToDelete = tests.find(t => t.id === testId);
    if (!testToDelete) return;
    
    setConfirmModalContent({
      title: 'Delete Request',
      message: `Are you sure you want to delete the request "${testToDelete.name}"?`,
      onConfirm: async () => {
        const { error } = await supabase.from('api_tests').delete().eq('id', testId);
        if (error) {
          alert("Error deleting test: " + error.message);
        } else {
          const remainingTests = tests.filter(t => t.id !== testId);
          // Re-index remaining tests in the same folder
          const testsInFolder = remainingTests
            .filter(t => t.folder_id === testToDelete.folder_id)
            .sort((a, b) => a.position - b.position);
          
          const updates = testsInFolder.map((test, index) => ({
            id: test.id,
            position: index,
          }));

          if (updates.length > 0) {
            const { error: updateError } = await supabase.from('api_tests').upsert(updates);
            if (updateError) {
              alert("Error re-indexing tests: " + updateError.message);
              // Revert optimistic update on error
              refreshProjectData();
              return;
            }
          }
          
          setTests(remainingTests.map(t => {
            const update = updates.find(u => u.id === t.id);
            return update ? { ...t, position: update.position } : t;
          }));

          if (selectedTest?.id === testId) {
            setSelectedTest(null);
          }
        }
      }
    });
    setIsConfirmModalOpen(true);
  };
  
  const handleDuplicateTest = async (testToDuplicate: ApiTest) => {
    const testsInFolder = tests.filter(t => t.folder_id === testToDuplicate.folder_id);
    const newPosition = testsInFolder.length > 0 ? Math.max(...testsInFolder.map(t => t.position)) + 1 : 0;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_by, auth, ...newTestProps } = testToDuplicate;
    const newTest = {
      ...newTestProps,
      name: `${testToDuplicate.name} (Copy)`,
      created_by: user.id,
      position: newPosition,
    };
    
    const { data, error } = await supabase.from('api_tests').insert(newTest).select().single();
    
    if (error) {
      alert("Error duplicating test: " + error.message);
    } else if (data) {
      setTests([...tests, data]);
      setSelectedTest(data);
    }
  };

  const handleCancelTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRunTest = async (testToRun: ApiTest, binaryFile?: File): Promise<ApiResponse | null> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Cancel any ongoing request
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTestLoading(true);
    setApiResponse(null);
    setApiError(null);
    
    try {
      let processedUrl = testToRun.url;
      let processedHeaders = { ...(testToRun.headers || {}) };
      let processedBody = testToRun.body;
      let processedAuth = testToRun.auth ? JSON.parse(JSON.stringify(testToRun.auth)) : { type: 'none' };

      if (activeEnvironment) {
        Object.entries(activeEnvironment.variables).forEach(([key, value]) => {
          const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          processedUrl = processedUrl.replace(pattern, String(value));
          if (processedBody) processedBody = processedBody.replace(pattern, String(value));
          Object.keys(processedHeaders).forEach(headerKey => {
             processedHeaders[headerKey] = String(processedHeaders[headerKey]).replace(pattern, String(value));
          });
          if(processedAuth.type === 'bearer') {
            processedAuth.token = processedAuth.token.replace(pattern, String(value));
          } else if (processedAuth.type === 'basic') {
            processedAuth.username = processedAuth.username.replace(pattern, String(value));
            processedAuth.password = processedAuth.password.replace(pattern, String(value));
          }
        });
      }

      // Apply Authorization header from Auth tab, overwriting any manual one
      const authHeaderKey = Object.keys(processedHeaders).find(k => k.toLowerCase() === 'authorization');
      if (authHeaderKey) {
        delete processedHeaders[authHeaderKey];
      }
      
      if (processedAuth?.type === 'bearer' && processedAuth.token) {
        processedHeaders['Authorization'] = `Bearer ${processedAuth.token}`;
      } else if (processedAuth?.type === 'basic' && (processedAuth.username || processedAuth.password)) {
        const credentials = btoa(`${processedAuth.username}:${processedAuth.password}`);
        processedHeaders['Authorization'] = `Basic ${credentials}`;
      }
      
      const processedTest: ApiTest = { ...testToRun, url: processedUrl, headers: processedHeaders, body: processedBody };
      
      const result = await runApiTest(processedTest, proxyTemplate, controller.signal, binaryFile);
      setApiResponse(result);

      // Handle token extraction
      if (result.status < 300 && activeEnvironment && testToRun.extractionRules && typeof result.body === 'object') {
        const newVariables = { ...activeEnvironment.variables };
        let updated = false;
        testToRun.extractionRules.forEach(rule => {
          if (rule.jsonPath && rule.targetVariable) {
            try {
              const extracted = JSONPath({ path: rule.jsonPath, json: result.body });
              if (extracted && extracted.length > 0) {
                newVariables[rule.targetVariable] = String(extracted[0]);
                updated = true;
              }
            } catch (e) {
              console.warn(`JSONPath extraction failed for path "${rule.jsonPath}":`, e);
            }
          }
        });

        if (updated) {
          const newActiveEnv = { ...activeEnvironment, variables: newVariables };
          setActiveEnvironment(newActiveEnv);
          // Also update the master list so the change is reflected in the environment manager
          setEnvironments(envs => envs.map(e => e.id === newActiveEnv.id ? newActiveEnv : e));
        }
      }

      return result;

    } catch (e: any) {
      if (e.name === 'AbortError') {
        setApiError('Request was cancelled.');
      } else {
        setApiError(e.message || "An unexpected error occurred.");
      }
      return null;
    } finally {
       setTestLoading(false);
       if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
       }
    }
  };
  
  const handleTestReorder = async (draggedTestId: string, targetFolderId: string, newIndex: number) => {
    const draggedTest = tests.find(t => t.id === draggedTestId);
    if (!draggedTest) return;

    const sourceFolderId = draggedTest.folder_id;

    // 1. Create a new array of tests without the dragged item for easier manipulation.
    const remainingTests = tests.filter(t => t.id !== draggedTestId);
    
    // 2. Separate tests into three groups: target folder, source folder (if different), and others.
    let targetFolderTests = remainingTests
        .filter(t => t.folder_id === targetFolderId)
        .sort((a, b) => a.position - b.position);

    // 3. Insert the dragged test into its new position in the target folder list.
    targetFolderTests.splice(newIndex, 0, { ...draggedTest, folder_id: targetFolderId });

    // 4. Re-index the target folder tests with their new final positions.
    const updatedTargetTests = targetFolderTests.map((test, index) => ({
        ...test,
        folder_id: targetFolderId, // Ensure folder_id is correct
        position: index
    }));

    let finalTests = [];
    // FIX: Declare `updatedSourceTests` here to ensure it's available in the correct scope.
    let updatedSourceTests: typeof updatedTargetTests = [];
    
    if (sourceFolderId === targetFolderId) {
        // Simple reorder within the same folder.
        // The rest of the tests are unchanged.
        const otherTests = remainingTests.filter(t => t.folder_id !== targetFolderId);
        finalTests = [...otherTests, ...updatedTargetTests];
    } else {
        // Moving from one folder to another.
        // We also need to re-index the source folder.
        const sourceFolderTests = remainingTests
            .filter(t => t.folder_id === sourceFolderId)
            .sort((a, b) => a.position - b.position);
        
        updatedSourceTests = sourceFolderTests.map((test, index) => ({
            ...test,
            position: index
        }));

        // The rest of the tests are those not in either source or target.
        const otherTests = remainingTests.filter(t => t.folder_id !== sourceFolderId && t.folder_id !== targetFolderId);
        finalTests = [...otherTests, ...updatedSourceTests, ...updatedTargetTests];
    }

    // 5. Optimistically update the UI with the newly constructed and ordered array.
    setTests(finalTests);

    // 6. Prepare the list of database updates. This includes all tests from the affected folder(s).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dbUpdates = (sourceFolderId === targetFolderId)
        ? updatedTargetTests.map(({ created_by, ...test }) => test)
        : [
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ...updatedSourceTests.map(({ created_by, ...test }) => test), 
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ...updatedTargetTests.map(({ created_by, ...test }) => test)
          ];

    if (dbUpdates.length > 0) {
      const { error: upsertError } = await supabase.from('api_tests').upsert(dbUpdates);
      if (upsertError) {
        alert("Error saving new order: " + upsertError.message);
        // Revert on failure
        refreshProjectData();
      }
    }
  };


  const handleImportCollection = async (fileContent: string) => {
    if (!selectedProject) {
        alert("Please select a project first.");
        return;
    }
    setIsImporting(true);
    try {
        const { folders: foldersToCreate, tests: testsWithTempFolders } = parsePostmanCollection(fileContent);

        const folderPayloads = foldersToCreate.map(f => ({
            ...f,
            project_id: selectedProject.id,
            created_by: user.id
        }));
        
        const { data: newFolders, error: folderError } = await supabase
            .from('api_folders')
            .insert(folderPayloads)
            .select();
        
        if (folderError) throw folderError;

        const folderNameIdMap = new Map<string, string>();
        newFolders.forEach(f => {
            folderNameIdMap.set(f.folder_name, f.id);
        });

        const testsToCreate = testsWithTempFolders
            .map(({ temp_folder_name, ...restOfTest }) => {
                const folder_id = folderNameIdMap.get(temp_folder_name);
                if (!folder_id) {
                    console.warn(`Could not find folder "${temp_folder_name}" for test "${restOfTest.name}". Skipping.`);
                    return null;
                }
                return {
                    ...restOfTest,
                    folder_id,
                    created_by: user.id,
                    auth: { type: 'none' }, // Add default auth for imported tests
                    extractionRules: [],
                };
            })
            // FIX: The type predicate `t is Omit<ApiTest, 'id'>` was incorrect because it widened the inferred type from the map operation, violating TypeScript's rules for type guards.
            // Using `t is NonNullable<typeof t>` provides a correct, strictly-typed predicate that narrows the type by removing nulls.
            .filter((t): t is NonNullable<typeof t> => t !== null);

        if (testsToCreate.length > 0) {
             const { error: testError } = await supabase.from('api_tests').insert(testsToCreate);
             if (testError) throw testError;
        }

        await refreshProjectData();
        alert(`Successfully imported ${newFolders.length} folders and ${testsToCreate.length} requests.`);

    } catch (e: any) {
        console.error("Import failed:", e);
        alert("Failed to import collection: " + e.message);
    } finally {
        setIsImporting(false);
    }
  };

  const handleExportCollection = (format: ExportFormat) => {
    if (!selectedProject || folders.length === 0) {
        alert("No data available to export for the current project.");
        return;
    }
    try {
      exportCollection(selectedProject, folders, tests, format);
    } catch (e: any) {
      console.error("Export failed:", e);
      alert("Failed to export collection: " + e.message);
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    setAppUser(updatedUser);
  };
  
  const handleProxyTemplateChange = (template: string) => {
    setProxyTemplate(template);
    localStorage.setItem('proxyTemplate', template);
  };

  const handleDeleteEnvironment = (envId: string) => {
    const envToDelete = environments.find(e => e.id === envId);
    if (!envToDelete) return;

    setConfirmModalContent({
      title: 'Delete Environment',
      message: `Are you sure you want to delete the environment "${envToDelete.name}"?`,
      onConfirm: async () => {
        const { error } = await supabase.from('environments').delete().eq('id', envId);
        if (error) {
          alert('Error deleting environment: ' + error.message);
        } else {
          const updatedEnvironments = environments.filter(e => e.id !== envId);
          setEnvironments(updatedEnvironments);
          if (activeEnvironment?.id === envId) {
            handleSelectEnvironment(null);
          }
        }
      }
    });
    setIsConfirmModalOpen(true);
  };


  return (
    <div className="h-screen w-screen bg-gray-950 text-white flex flex-col font-sans">
      <ProjectSelector
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        onAddNewProject={() => setIsProjectModalOpen(true)}
        onDeleteProject={handleDeleteProject}
        user={appUser}
        onLogout={onLogout}
        onUserUpdate={handleUserUpdate}
        proxyTemplate={proxyTemplate}
        onProxyTemplateChange={handleProxyTemplateChange}
        environments={environments}
        activeEnvironment={activeEnvironment}
        onSelectEnvironment={handleSelectEnvironment}
        onManageEnvironments={() => setIsEnvModalOpen(true)}
      />
      <div className="flex-1 flex min-h-0">
        {dbError ? (
          <div className="flex-1 flex items-center justify-center">
            <DataError title={dbError.title} message={dbError.message} />
          </div>
        ) : (
          <>
            <FolderView
              project={selectedProject}
              folders={folders}
              tests={tests}
              selectedFolder={selectedFolder}
              selectedTest={selectedTest}
              onSelectFolder={handleSelectFolder}
              onSelectTest={handleSelectTest}
              onAddNewFolder={() => setIsFolderModalOpen(true)}
              onAddNewTest={handleCreateTest}
              onImportCollection={handleImportCollection}
              onExportCollection={handleExportCollection}
              onDeleteFolder={handleDeleteFolder}
              onTestReorder={handleTestReorder}
              loading={loadingProjects || loadingFolders || isImporting}
              activeView={activeView}
              onNavigate={setActiveView}
            />
            {activeView === 'tester' && (
              <TestView
                test={selectedTest}
                response={apiResponse}
                onRunTest={handleRunTest}
                onTestChange={handleTestChange}
                onSaveTest={handleSaveTest}
                onDeleteTest={handleDeleteTest}
                onDuplicateTest={handleDuplicateTest}
                loading={testLoading}
                error={apiError}
                activeEnvironment={activeEnvironment}
                onCancelTest={handleCancelTest}
              />
            )}
            {activeView === 'comparer' && (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-gray-900"><Spinner size="lg" /></div>}>
                <CompareView
                  tests={tests}
                  onRunTest={handleRunTest}
                />
              </Suspense>
            )}
            {activeView === 'decoder' && (
              <TokenDecoderView />
            )}
          </>
        )}
      </div>
      
      <Modal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleCreateProject}
        title="Create New Project"
        label="Project Name"
        placeholder="My Awesome Project"
      />
       <Modal 
        isOpen={isFolderModalOpen && selectedProject !== null}
        onClose={() => setIsFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
        title="Create New Folder"
        label="Folder Name"
        placeholder="User APIs"
      />
      {selectedProject && (
        <ManageEnvironmentsModal
          isOpen={isEnvModalOpen}
          onClose={() => setIsEnvModalOpen(false)}
          project={selectedProject}
          environments={environments}
          setEnvironments={setEnvironments}
          onDeleteEnvironment={handleDeleteEnvironment}
        />
      )}
       {confirmModalContent && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={confirmModalContent.onConfirm}
          title={confirmModalContent.title}
        >
          <p>{confirmModalContent.message}</p>
        </ConfirmationModal>
      )}
    </div>
  );
};

export default Dashboard;