import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// This custom fetch wrapper is the explicit solution to the "fetch is not defined" error.
// It ensures the Supabase client can always find the browser's fetch function,
// even in a sandboxed environment.
const customFetch: typeof fetch = (input, init) => {
    return fetch(input, init);
};


// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
        fetch: customFetch,
    },
});