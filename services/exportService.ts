import type { Project, ApiFolder, ApiTest } from '../types';

export type ExportFormat = 'text' | 'csv' | 'postman' | 'thunder';

// --- Utility ---
const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Format Converters ---

// 1. Plain Text
const toPlainText = (project: Project, folders: ApiFolder[], tests: ApiTest[]): string => {
  let content = `Project: ${project.name}\n\n`;
  folders.forEach(folder => {
    content += `Folder: ${folder.folder_name}\n`;
    const testsInFolder = tests.filter(t => t.folder_id === folder.id);
    if (testsInFolder.length === 0) {
      content += `  (No requests in this folder)\n`;
    }
    testsInFolder.forEach(test => {
      content += `  - Request: ${test.name}\n`;
      content += `    ${test.method} ${test.url}\n`;
      if (Object.keys(test.headers).length > 0) {
        content += `    Headers:\n`;
        for (const [key, value] of Object.entries(test.headers)) {
          content += `      ${key}: ${value}\n`;
        }
      }
      if (test.bodyType !== 'none') {
        content += `    Body (${test.bodyType}):\n      ${test.body.replace(/\n/g, '\n      ')}\n`;
      }
      content += '\n';
    });
    content += '---\n';
  });
  return content;
};

// 2. CSV
const toCsv = (folders: ApiFolder[], tests: ApiTest[]): string => {
  const folderMap = new Map(folders.map(f => [f.id, f.folder_name]));
  const headers = ['Folder', 'Request Name', 'Method', 'URL', 'Headers (JSON)', 'Body Type', 'Body'];
  
  const escapeCsvCell = (cell: string): string => {
    // If the cell contains a comma, a newline, or a double quote, wrap it in double quotes.
    if (/[",\n]/.test(cell)) {
      // Escape internal double quotes by doubling them
      const escaped = cell.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return cell;
  };

  const rows = tests.map(test => [
    folderMap.get(test.folder_id) || '',
    test.name,
    test.method,
    test.url,
    JSON.stringify(test.headers),
    test.bodyType,
    test.body,
  ].map(escapeCsvCell).join(','));

  return [headers.join(','), ...rows].join('\n');
};

// 3. Postman Collection v2.1.0
const toPostman = (project: Project, folders: ApiFolder[], tests: ApiTest[]): string => {
  const collection = {
    info: {
      _postman_id: crypto.randomUUID(),
      name: project.name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [] as any[],
  };

  folders.forEach(folder => {
    const postmanFolder = {
      name: folder.folder_name,
      item: [] as any[],
    };
    tests.filter(t => t.folder_id === folder.id).forEach(test => {
      const body: { mode?: string, raw?: string, formdata?: any[] } = {};
      switch(test.bodyType) {
        case 'json':
        case 'text':
          body.mode = 'raw';
          body.raw = test.body;
          break;
        case 'form-data':
          body.mode = 'formdata';
          try {
            body.formdata = JSON.parse(test.body).map((item: {key: string, value: string}) => ({...item, type: 'text'}));
          } catch {
            body.formdata = [];
          }
          break;
      }

      postmanFolder.item.push({
        name: test.name,
        request: {
          method: test.method,
          header: Object.entries(test.headers).map(([key, value]) => ({ key, value })),
          body: Object.keys(body).length > 0 ? body : undefined,
          url: {
            raw: test.url,
            host: [test.url.split('/')[2] || ''],
            path: (test.url.split('/').slice(3).join('/')).split('?')[0].split('/'),
          },
        },
      });
    });
    collection.item.push(postmanFolder);
  });

  return JSON.stringify(collection, null, 2);
};

// 4. Thunder Client
const toThunderClient = (project: Project, folders: ApiFolder[], tests: ApiTest[]): string => {
    const collection = {
        client: 'Thunder Client',
        collectionName: project.name,
        dateExported: new Date().toISOString(),
        version: '1.1',
        folders: folders.map(f => ({_id: f.id, name: f.folder_name, containerId: '', sortNum: 0 })),
        requests: [] as any[],
    };

    tests.forEach(test => {
        const body: { type?: string, raw?: string, form?: any[] } = {};
         switch(test.bodyType) {
            case 'json':
                body.type = 'json';
                body.raw = test.body;
                break;
            case 'text':
                body.type = 'text';
                body.raw = test.body;
                break;
            case 'form-data':
                body.type = 'form-data';
                try {
                    body.form = JSON.parse(test.body).map((item: {key: string, value: string}) => ({ name: item.key, value: item.value }));
                } catch {
                    body.form = [];
                }
                break;
        }

        collection.requests.push({
            _id: test.id,
            colId: project.id,
            containerId: test.folder_id,
            name: test.name,
            url: test.url,
            method: test.method,
            sortNum: 0,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            headers: Object.entries(test.headers).map(([name, value]) => ({ name, value })),
            params: [],
            body: Object.keys(body).length > 0 ? body : { type: 'none' },
            tests: [],
        });
    });

    return JSON.stringify(collection, null, 2);
}

// --- Main Export Function ---
export const exportCollection = (project: Project, folders: ApiFolder[], tests: ApiTest[], format: ExportFormat) => {
  const projectNameSlug = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  switch (format) {
    case 'text':
      downloadFile(`${projectNameSlug}-export.txt`, toPlainText(project, folders, tests), 'text/plain');
      break;
    case 'csv':
      downloadFile(`${projectNameSlug}-export.csv`, toCsv(folders, tests), 'text/csv');
      break;
    case 'postman':
      downloadFile(`${projectNameSlug}.postman_collection.json`, toPostman(project, folders, tests), 'application/json');
      break;
    case 'thunder':
       downloadFile(`thunder-collection_${projectNameSlug}.json`, toThunderClient(project, folders, tests), 'application/json');
      break;
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
};