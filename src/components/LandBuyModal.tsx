import React, { useState } from 'react';
import type { LandInvestment } from '../types';

interface LandBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLand: LandInvestment | null;
  onOfferSubmitted: () => void;
}

export const LandBuyModal: React.FC<LandBuyModalProps> = ({
  isOpen,
  onClose,
  selectedLand,
  onOfferSubmitted,
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [proposedPrice, setProposedPrice] = useState(
    selectedLand?.public_asking_price ? String(selectedLand.public_asking_price) : ''
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync default price if selectedLand changes
  React.useEffect(() => {
    if (selectedLand?.public_asking_price) {
      setProposedPrice(String(selectedLand.public_asking_price));
    }
  }, [selectedLand]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/marketplace/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          land_id: selectedLand?.land_id || 'GENERAL',
          buyer_name: buyerName,
          address,
          mobile,
          email,
          proposed_price: Number(proposedPrice),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'ক্রয় প্রস্তাব জমা দিতে সমস্যা হয়েছে');
        return;
      }

      setIsSuccess(true);
      onOfferSubmitted();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        // reset form
        setBuyerName('');
        setAddress('');
        setMobile('');
        setEmail('');
        setNotes('');
      }, 2000);
    } catch (err: any) {
      setErrorMessage('সার্ভার এর সাথে সংযোগ স্থাপন করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative font-bengali">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <i className="fa-solid fa-cart-shopping text-lg"></i>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">
                জমি ক্রয়ের প্রস্তাব দাখিল (I Want to Buy)
              </h3>
              <p className="text-[11px] text-blue-400">
                {selectedLand ? selectedLand.land_name : 'সাধারণ জমি ক্রয় প্রস্তাব'}
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
        <div className="p-6">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl animate-bounce">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h4 className="text-lg font-bold text-white">
                আপনার ক্রয়ের প্রস্তাব সফলভাবে জমা হয়েছে!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                BoB কর্তৃপক্ষ আপনার প্রস্তাবটি যাচাই করে শীঘ্রই উল্লিখিত মোবাইল নম্বরে যোগাযোগ করবে।
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Target Land preview pill */}
              {selectedLand && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 text-xs">
                  <img
                    src={selectedLand.images?.[0] || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400'}
                    alt={selectedLand.land_name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{selectedLand.land_name}</div>
                    <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                      <span><i className="fa-solid fa-location-dot text-red-400 mr-1"></i>{selectedLand.location}</span>
                      <span>• {selectedLand.area_size}</span>
                    </div>
                    {selectedLand.public_asking_price && (
                      <div className="text-amber-400 font-bold text-[11px] mt-0.5 font-english">
                        নির্ধারিত মূল্য: ৳ {selectedLand.public_asking_price.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    আপনার পূর্ণ নাম <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    মোবাইল নম্বর <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+880 1712-000000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none font-english"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    বর্তমান ঠিকানা <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="বাসা নং, রোড, থানা, জেলা"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ইমেইল <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none font-english"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  প্রস্তাবিত ক্রয়ের মূল্য (টাকায়) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">৳</span>
                  <input
                    type="number"
                    required
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    placeholder="যেমন: ৩,৫০০,০০০"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none font-english"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  আপনি এই জমিটির জন্য কত মূল্য প্রস্তাব করতে চান তা টাকায় লিখুন।
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  কোনো বিশেষ মন্তব্য বা শর্তাদি
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: এককালীন বায়না করতে চাই / কিস্তিতে পরিশোধের সুযোগ থাকলে ভালো হয়..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none resize-none"
                ></textarea>
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
                  className="cursor-pointer px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      <span>প্রস্তাব জমা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>ক্রয় প্রস্তাব দাখিল করুন</span>
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
