// API helper for communicating with backend
export const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const fetchAll = async <T>(endpoint: string): Promise<T[]> => {
    const res = await fetch(`${API}/api/${endpoint}`);
    if (!res.ok) throw new Error(`GET ${endpoint} failed`);
    return res.json();
};

export const postOne = async (endpoint: string, payload: any) => {
    const res = await fetch(`${API}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST ${endpoint} failed`);
    return res.json();
};

export const deleteOne = async (endpoint: string, id: string) => {
    const res = await fetch(`${API}/api/${endpoint}/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`DELETE ${endpoint}/${id} failed`);
    return res.json();
};
