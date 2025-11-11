// FIX: Add a new `Environment` type.
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  variables: Record<string, string>;
}

export interface ApiFolder {
  id: string;
  project_id: string;
  folder_name: string;
  created_by: string;
}

export type AuthDetails =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string };

export interface ExtractionRule {
  id: string;
  jsonPath: string;
  targetVariable: string;
}

export interface ApiTest {
  id:string;
  folder_id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: Record<string, string>;
  auth?: AuthDetails;
  bodyType: 'none' | 'json' | 'text' | 'form-data' | 'binary';
  body: string; // JSON string, raw text, or JSON string of [{key, value}] for form-data
  created_by: string;
  position: number;
  extractionRules?: ExtractionRule[];
}

export interface ApiResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    size: number;
    time: number;
}

export interface SavedComparison {
  id: string;
  name: string;
  jsonA: string;
  jsonB: string;
}

export interface SavedToken {
  id: string;
  name: string;
  token: string;
}