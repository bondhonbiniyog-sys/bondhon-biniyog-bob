import React, { useState } from 'react';

interface LandSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmissionSuccess: () => void;
}

export const LandSellModal: React.FC<LandSellModalProps> = ({
  isOpen,
  onClose,
  onSubmissionSuccess,
}) => {
  const [sellerName, setSellerName] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [landLocation, setLandLocation] = useState('');
  const [landSize, setLandSize] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
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
      const res = await fetch('/api/marketplace/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_name: sellerName,
          address,
          mobile,
          email,
          land_location: landLocation,
          land_size: landSize,
          expected_price: Number(expectedPrice),
          description,
          photos,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'জমি বিক্রির তথ্য দাখিলে সমস্যা হয়েছে');
        return;
      }

      setIsSuccess(true);
      onSubmissionSuccess();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        // Reset form
        setSellerName('');
        setAddress('');
        setMobile('');
        setEmail('');
        setLandLocation('');
        setLandSize('');
        setExpectedPrice('');
        setDescription('');
        setPhotos([]);
      }, 2200);
    } catch (err: any) {
      setErrorMessage('সার্ভার সংযোগে ত্রুটি দেখা দিয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative font-bengali">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <i className="fa-solid fa-hand-holding-dollar text-lg"></i>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">
                আপনার জমি বিক্রি করতে চান? (Sell Your Land)
              </h3>
              <p className="text-[11px] text-emerald-400">
                BoB প্ল্যাটফর্মে জমি বিক্রির আবেদন দাখিল করুন — নিরাপদ ও ন্যায্যমূল্যে যৌথ কেনাবেচা
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

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl animate-bounce">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h4 className="text-lg font-bold text-white">
                আপনার জমি বিক্রির আবেদনটি সফলভাবে জমা হয়েছে!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                আমাদের বিশেষজ্ঞ ভূমি দল আপনার জমির কাগজপত্র যাচাই এবং সরেজমিন পরিদর্শন করে দ্রুত যোগাযোগ করবে।
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Seller Information */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <i className="fa-solid fa-user-tag"></i>
                  <span>১. জমি মালিক বা প্রতিনিধির তথ্য</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      মালিক/বিক্রেতার নাম <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="যেমন: হাজী মোঃ দেলোয়ার হোসেন"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      যোগাযোগের মোবাইল নম্বর <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+880 1711-000000"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none font-english"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      বর্তমান ঠিকানা <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="বর্তমান ঠিকানা লিখুন"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      ইমেইল <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none font-english"
                    />
                  </div>
                </div>
              </div>

              {/* Land Information */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <i className="fa-solid fa-map-location-dot"></i>
                  <span>২. জমির সুনির্দিষ্ট বিবরণ ও প্রত্যাশিত মূল্য</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      জমির অবস্থান / জেলা-থানা-মৌজা <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={landLocation}
                      onChange={(e) => setLandLocation(e.target.value)}
                      placeholder="যেমন: ঢাকা, কেরানীগঞ্জ, হাসনাবাদ"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      জমির পরিমাণ (শতাংশ/কাটা/বিঘা) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={landSize}
                      onChange={(e) => setLandSize(e.target.value)}
                      placeholder="যেমন: ১০ কাঠা অথবা ২ বিঘা"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    মোট প্রত্যাশিত বিক্রয় মূল্য (টাকায়) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1.5 text-slate-400 text-xs">৳</span>
                    <input
                      type="number"
                      required
                      value={expectedPrice}
                      onChange={(e) => setExpectedPrice(e.target.value)}
                      placeholder="যেমন: ৪৫০০০০০"
                      className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none font-english"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    জমির সার্বিক বিবরণ (রাস্তা, সীমানা, মাটির ধরন, বিদ্যুৎ ইত্যাদি)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="জমির সম্মুখ রাস্তা কত ফুট, নিষ্কণ্টক কিনা, জমির বর্তমান ব্যবহারের ধরন..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none resize-none"
                  ></textarea>
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    জমির ছবি ও সাইট ভিউ (ঐচ্ছিক - সর্বোচ্চ ৪টি)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700">
                        <img src={p} alt="land upload" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-0 right-0 bg-red-600 text-white p-0.5 text-[9px]"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))}

                    {photos.length < 4 && (
                      <label className="cursor-pointer w-14 h-14 rounded-lg border-2 border-dashed border-slate-700 hover:border-emerald-500 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 transition bg-slate-900/50">
                        <i className="fa-solid fa-camera text-sm"></i>
                        <span className="text-[9px] mt-0.5">ছবি যোগ</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                    )}
                  </div>
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
                  className="cursor-pointer px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      <span>দাখিল হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>জমি বিক্রির আবেদন সাবমিট করুন</span>
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
