import React, { useState, useEffect } from 'react';
import { uploadToR2, listR2Files, deleteFromR2, type R2FileItem } from '../services/r2Storage';

interface CloudflareR2ExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const CloudflareR2ExplorerModal: React.FC<CloudflareR2ExplorerModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
}) => {
  const [files, setFiles] = useState<R2FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'voucher' | 'nid' | 'statement' | 'land' | 'general'>('general');
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await listR2Files(selectedCategory === 'all' ? undefined : selectedCategory);
      setFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, selectedCategory]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMsg(null);
    try {
      const res = await uploadToR2(file, uploadCategory);
      if (res.success) {
        setUploadMsg({ type: 'success', text: `"${file.name}" সফলভাবে Cloudflare R2 বাকেটে আপলোড হয়েছে!` });
        await fetchFiles();
      } else {
        setUploadMsg({ type: 'error', text: 'R2 আপলোড ব্যর্থ হয়েছে' });
      }
    } catch (err: any) {
      setUploadMsg({ type: 'error', text: err.message || 'আপলোড ব্যর্থ হয়েছে' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত "${fileName}" ফাইলটি Cloudflare R2 বাকেট থেকে মুছে ফেলতে চান?`)) {
      return;
    }
    const ok = await deleteFromR2(fileId);
    if (ok) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn font-bengali">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 text-lg">
              <i className="fa-solid fa-cloud"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Cloudflare R2 ক্লাউড স্টোরেজ এক্সপ্লোরার
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-bold border border-orange-500/30">
                  R2 Object Storage
                </span>
              </div>
              <p className="text-xs text-slate-400">
                বন্ধন ও বিনিয়োগের সকল ভাউচার, এনআইডি, ছবি ও স্টেটমেন্টের নিরাপদ স্থায়ী সংরক্ষণাগার
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              সব ফাইল
            </button>
            <button
              onClick={() => setSelectedCategory('voucher')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'voucher'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              পেমেন্ট ভাউচার
            </button>
            <button
              onClick={() => setSelectedCategory('statement')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'statement'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              হিসাব বিবরণী
            </button>
            <button
              onClick={() => setSelectedCategory('nid')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'nid'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              সদস্য NID / ছবি
            </button>
            <button
              onClick={() => setSelectedCategory('land')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedCategory === 'land'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ভূমির দলিল ও ছবি
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-2.5 text-xs text-slate-500"></i>
              <input
                type="text"
                placeholder="ফাইল খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Direct Upload Button to Cloudflare R2 */}
            <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition">
              <i className="fa-solid fa-cloud-arrow-up"></i>
              <span>{isUploading ? 'আপলোড হচ্ছে...' : 'R2 তে আপলোড'}</span>
              <input
                type="file"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {uploadMsg && (
          <div
            className={`mx-6 mt-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              uploadMsg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/80 border border-red-500/50 text-red-200'
            }`}
          >
            <i className={`fa-solid ${uploadMsg.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-400'}`}></i>
            <span>{uploadMsg.text}</span>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <i className="fa-solid fa-spinner fa-spin text-2xl mb-2 text-orange-400"></i>
              <p className="text-xs">Cloudflare R2 বাকেট থেকে ফাইল লোড হচ্ছে...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3 text-orange-400 text-xl">
                <i className="fa-solid fa-box-open"></i>
              </div>
              <h4 className="text-sm font-bold text-slate-300">কোনো ফাইল পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-500 mt-1">
                "R2 তে আপলোড" বোতাম চেপে নতুন ভাউচার বা ডকুমেন্টস যোগ করুন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-orange-500/40 transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-sm shrink-0">
                        {file.mimeType.startsWith('image/') ? (
                          <i className="fa-solid fa-image"></i>
                        ) : file.mimeType.includes('pdf') ? (
                          <i className="fa-solid fa-file-pdf"></i>
                        ) : (
                          <i className="fa-solid fa-file"></i>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {file.category || 'General'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate mb-1" title={file.name}>
                      {file.name}
                    </h4>

                    {file.mimeType.startsWith('image/') && (
                      <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-900 my-2 border border-slate-800">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-english">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-3">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                      <span>দেখুন</span>
                    </a>

                    <a
                      href={file.url}
                      download={file.name}
                      className="cursor-pointer px-3 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-download text-[10px]"></i>
                      <span>ডাউনলোড</span>
                    </a>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className="cursor-pointer p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
                        title="মুছে ফেলুন"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cloudflare R2 Bucket: <strong className="text-slate-200 font-mono">bondhon-storage</strong></span>
          </div>
          <button
            onClick={fetchFiles}
            className="cursor-pointer hover:text-white flex items-center gap-1 text-[11px]"
          >
            <i className="fa-solid fa-rotate"></i>
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
