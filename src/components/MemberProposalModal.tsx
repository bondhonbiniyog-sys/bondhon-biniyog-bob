import React, { useState } from 'react';
import type { Member } from '../types';

interface MemberProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  onProposalSubmitted: () => void;
}

export const MemberProposalModal: React.FC<MemberProposalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProposalSubmitted,
}) => {
  const [location, setLocation] = useState('');
  const [landSize, setLandSize] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/member-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentUser.member_id,
          member_name: currentUser.full_name,
          location,
          land_size: landSize,
          estimated_price: Number(estimatedPrice),
          description,
          photos,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'প্রস্তাব জমাদানে ত্রুটি দেখা দিয়েছে');
        return;
      }

      setIsSuccess(true);
      onProposalSubmitted();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setLocation('');
        setLandSize('');
        setEstimatedPrice('');
        setDescription('');
        setPhotos([]);
      }, 2000);
    } catch (err: any) {
      setErrorMessage('সার্ভারের সাথে সংযোগ স্থাপন সম্ভব হয়নি');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative font-bengali">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <i className="fa-solid fa-map-location-dot text-lg"></i>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">
                নতুন জমি ক্রয়ের প্রস্তাব দাখিল (Propose New Land)
              </h3>
              <p className="text-[11px] text-blue-400">
                সদস্য প্রস্তাবনা • পরিচালনা পর্ষদ ও অ্যাডমিন সরাসরি মূল্যায়ন করবেন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl animate-bounce">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h4 className="text-lg font-bold text-white">
                আপনার প্রস্তাবটি সফলভাবে জমা হয়েছে!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                অ্যাডমিন ও প্রকল্প পরিচালকগণ জমিটির বাণিজ্যিক উপযোগিতা যাচাই করে ড্যাশবোর্ডে ফিডব্যাক প্রদান করবেন।
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Member identification preview */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">প্রস্তাবক সদস্য: </span>
                  <span className="font-bold text-white">{currentUser.full_name}</span>
                </div>
                <div className="text-blue-400 font-num">
                  আইডি: {currentUser.member_id}
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    জমির সুনির্দিষ্ট অবস্থান <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="যেমন: ঢাকা-মাওয়া হাইওয়ে, হাসনাবাদ"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    জমির আনুমানিক পরিমাণ
                  </label>
                  <input
                    type="text"
                    value={landSize}
                    onChange={(e) => setLandSize(e.target.value)}
                    placeholder="যেমন: ৫ কাঠা / ১ বিঘা"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  প্রত্যাশিত ক্রয়মূল্য বা সম্ভাব্য বাজেট (টাকায়) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">৳</span>
                  <input
                    type="number"
                    required
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    placeholder="যেমন: ৩,০০০,০০০"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none font-english"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  কেন এই জমিটি কেনা লাভজনক হবে? (যৌক্তিকতা ও সম্ভাবনা)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="জমির আশেপাশের উন্নয়ন সম্ভাবনা, রাস্তাঘাট, কাগজপত্র ও মালিকানার হালনাগাদ তথ্য..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none resize-none"
                ></textarea>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  জমির ছবি ও গুগল ম্যাপ লোকেশন স্ক্রিনশট (ঐচ্ছিক)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {photos.map((p, idx) => (
                    <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700">
                      <img src={p} alt="upload" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-0 right-0 bg-red-600 text-white p-0.5 text-[9px]"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}

                  {photos.length < 3 && (
                    <label className="cursor-pointer w-14 h-14 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center text-slate-400 hover:text-blue-400 transition bg-slate-950">
                      <i className="fa-solid fa-camera text-sm"></i>
                      <span className="text-[9px] mt-0.5">ছবি যোগ</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      <span>জমা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>প্রস্তাবনা দাখিল করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
