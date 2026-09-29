import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Photo: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    if (isOpen) {
      setIsInitializing(true);
      setCameraError('');
      setCapturedPhoto(null);

      // Request camera access
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        })
        .then((s) => {
          localStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
          setIsInitializing(false);
        })
        .catch((err) => {
          console.warn('Camera access denied or unavailable:', err);
          setCameraError(
            'ক্যামেরা এক্সেস চালু করা যায়নি। ব্রাউজারের ক্যামেরা পারমিশন চেক করুন অথবা ম্যানুয়াল ফাইল সিলেক্ট করুন।'
          );
          setIsInitializing(false);
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal for natural mirror look
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(base64);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      handleClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <i className="fa-solid fa-camera"></i>
            </div>
            <div>
              <h3 className="text-white font-bold text-base font-bengali">
                লাইভ ক্যামেরা থেকে ছবি তুলুন
              </h3>
              <p className="text-[11px] text-slate-400">
                সদস্য প্রোফাইল ও যাচাইকরণের জন্য আপনার রিয়েল-টাইম ছবি
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="p-5 flex flex-col items-center">
          {cameraError ? (
            <div className="w-full p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-center space-y-3 font-bengali">
              <i className="fa-solid fa-video-slash text-3xl text-red-400"></i>
              <p className="text-xs">{cameraError}</p>
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                বন্ধ করুন
              </button>
            </div>
          ) : capturedPhoto ? (
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl shadow-emerald-500/20">
                <img
                  src={capturedPhoto}
                  alt="Captured Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <span className="bg-slate-900/80 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-bengali">
                    ছবি সফলভাবে তোলা হয়েছে
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 text-center font-bengali">
                ছবিটি কি পছন্দ হয়েছে? পছন্দ হলে 'এই ছবিটি নিশ্চিত করুন' বাটনে ক্লিক করুন।
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="relative w-full aspect-4/3 max-w-sm rounded-xl overflow-hidden bg-black border-2 border-slate-700 flex items-center justify-center">
                {isInitializing && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 gap-2">
                    <i className="fa-solid fa-circle-notch fa-spin text-emerald-400 text-2xl"></i>
                    <span className="text-xs text-slate-300 font-bengali">
                      ক্যামেরা চালু হচ্ছে...
                    </span>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {/* Guide overlay */}
                <div className="absolute inset-0 pointer-events-none border-2 border-emerald-400/30 rounded-xl m-4 flex items-center justify-center">
                  <div className="w-44 h-44 rounded-full border border-dashed border-emerald-400/50"></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center font-bengali">
                ফ্রেমের মাঝখানে মুখ রেখে সোজা তাকান এবং আলো পর্যাপ্ত রাখুন
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="w-full mt-4 flex items-center justify-center gap-3">
            {!cameraError && !capturedPhoto && (
              <button
                type="button"
                onClick={handleTakeSnapshot}
                disabled={isInitializing}
                className="cursor-pointer px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <i className="fa-solid fa-camera"></i>
                <span className="font-bengali">ছবি তুলুন (Snapshot)</span>
              </button>
            )}

            {capturedPhoto && (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 font-bengali"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  <span>পুনরায় তুলুন</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="cursor-pointer px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 font-bengali"
                >
                  <i className="fa-solid fa-check"></i>
                  <span>এই ছবিটি নিশ্চিত করুন</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
