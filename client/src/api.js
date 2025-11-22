import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000' });
api.interceptors.request.use(cfg => { const t = localStorage.getItem('token'); if (t) cfg.headers.Authorization = `Bearer ${t}`; return cfg; });

export async function uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/api/messages/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
}

export default api;
