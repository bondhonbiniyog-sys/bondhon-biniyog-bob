// 100% D1 BASE64 - NO R2 - NO CARD
export interface R2FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
  category?: string;
}

export async function uploadToR2(file: File, category: string = 'general') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
  const data = await res.json();
  const fileItem: R2FileItem = {
    id: data.id,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    url: data.url,
    uploadedAt: new Date().toISOString(),
    category
  };
  return { success: true, url: data.url, file: fileItem };
}

export async function uploadDataUrlToR2(dataUrl: string, filename: string, category: string = 'general') {
  const res = await fetch('/api/files/upload-dataurl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl, filename, category })
  });
  if (res.ok) {
    const d = await res.json();
    return { success: true, url: d.url, file: d.file };
  }
  // fallback convert to file
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  const file = new File([u8arr], filename, { type: mime });
  return uploadToR2(file, category);
}

export async function listR2Files(category?: string): Promise<R2FileItem[]> {
  try {
    const res = await fetch(`/api/files${category ? `?category=${encodeURIComponent(category)}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      return data.files || [];
    }
  } catch (e) {}
  return [];
}

export async function deleteFromR2(fileId?: string): Promise<boolean> {
  if (!fileId) return true;
  try {
    const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    return true;
  }
}
export async function uploadFileToR2(file: File) {
  const r = await uploadToR2(file);
  return r.url;
}
