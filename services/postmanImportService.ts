import type { ApiFolder, ApiTest } from '../types';

// Simplified Postman Collection Types
interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

// URL can be a string or an object
interface PostmanUrlObject {
  raw?: string;
  // Other properties are available but raw is sufficient for our needs
}
type PostmanUrl = string | PostmanUrlObject;


interface PostmanBody {
  mode: 'raw' | 'formdata' | 'file' | 'urlencoded';
  raw?: string;
  formdata?: { key: string; value: string; type: 'text' | 'file'; disabled?: boolean }[];
  // Other body types ignored for now
}

interface PostmanRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; // Make method optional
  header?: PostmanHeader[]; // Make header optional
  body?: PostmanBody;
  url?: PostmanUrl; // Make url optional and use the new union type
  description?: string;
}

interface PostmanItem {
  name: string;
  item?: PostmanItem[]; // If it's a folder
  request?: PostmanRequest; // If it's a request
}

interface PostmanCollection {
  info: {
    name: string;
    schema: string;
  };
  item: PostmanItem[];
}

// Custom types for processing
export type FolderToCreate = Omit<ApiFolder, 'id' | 'project_id' | 'created_by'>;
export type TestToCreate = Omit<ApiTest, 'id' | 'folder_id' | 'created_by'> & { temp_folder_name: string };

const mapBody = (body?: PostmanBody): { bodyType: ApiTest['bodyType'], body: string } => {
  if (!body) return { bodyType: 'none', body: '' };

  switch (body.mode) {
    case 'raw':
      // Let's try to detect if it's JSON.
      try {
        JSON.parse(body.raw || '');
        return { bodyType: 'json', body: body.raw || '' };
      } catch {
        return { bodyType: 'text', body: body.raw || '' };
      }
    case 'formdata':
      const formData = body.formdata
        ?.filter(item => !item.disabled && item.type === 'text')
        .map(({ key, value }) => ({ key, value }));
      return { bodyType: 'form-data', body: JSON.stringify(formData || []) };
    case 'file':
        return { bodyType: 'binary', body: ''};
    default:
      return { bodyType: 'none', body: '' };
  }
};


export const parsePostmanCollection = (
  jsonContent: string,
): { folders: FolderToCreate[], tests: TestToCreate[] } => {
  const collection: PostmanCollection = JSON.parse(jsonContent);

  if (!collection.info || !collection.item) {
    throw new Error('Invalid Postman collection format.');
  }

  const folders: FolderToCreate[] = [];
  const tests: TestToCreate[] = [];
  const positionCounters: { [folderName: string]: number } = {};

  const processItem = (item: PostmanItem, parentFolderName: string) => {
    // It's a folder
    if (item.item && Array.isArray(item.item)) {
      const currentFolderName = item.name;
      folders.push({ folder_name: currentFolderName });
      positionCounters[currentFolderName] = 0;
      item.item.forEach(child => processItem(child, currentFolderName));
    }
    // It's a request
    else if (item.request) {
      const { name, request } = item;
      const { bodyType, body } = mapBody(request.body);

      const headers = (request.header || []) // Guard against missing header array
        .filter(h => !h.disabled)
        .reduce((acc, { key, value }) => {
          if (key) acc[key] = value; // Guard against empty key
          return acc;
        }, {} as Record<string, string>);
      
      let urlString = '';
      if (request.url) { // Check if url exists
        if (typeof request.url === 'string') {
          urlString = request.url;
        } else if (typeof request.url === 'object' && request.url.raw) { // Check if it's object with raw prop
          urlString = request.url.raw;
        }
      }

      const position = positionCounters[parentFolderName] || 0;
      positionCounters[parentFolderName] = position + 1;

      tests.push({
        temp_folder_name: parentFolderName,
        name,
        method: request.method || 'GET', // Default to GET if method is missing
        url: urlString,
        headers,
        bodyType,
        body,
        position,
        extractionRules: [],
      });
    }
  };
  
  const rootFolderName = collection.info.name;
  folders.push({ folder_name: rootFolderName });
  positionCounters[rootFolderName] = 0;

  collection.item.forEach(item => processItem(item, rootFolderName));
  
  // Deduplicate folders by name before returning
  const uniqueFolderNames = new Set(folders.map(f => f.folder_name));
  const uniqueFolders = Array.from(uniqueFolderNames).map(name => ({ folder_name: name }));

  return { folders: uniqueFolders, tests };
};