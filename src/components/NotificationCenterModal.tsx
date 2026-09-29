import React from 'react';
import type { AppNotification } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentMemberId?: string;
  onMarkRead: (id: string) => void;
  onOpenDueModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentMemberId,
  onMarkRead,
  onOpenDueModal,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-bengali">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <i className="fa-solid fa-bell"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                সদস্য নোটিফিকেশন সেন্টার
              </h3>
              <p className="text-xs text-slate-400">
                বকেয়া কিস্তি সতর্কতা ও নতুন জমি ক্রয়-বিক্রয় প্রস্তাবনার নোটিশ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Notifications List */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <i className="fa-regular fa-bell-slash text-3xl mb-1 block text-slate-600"></i>
              <p className="text-sm">বর্তমানে কোনো নতুন নোটিফিকেশন নেই।</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isRead = currentMemberId && n.read_by?.includes(currentMemberId);
              const isDue = n.type === 'due_installment';
              const isOffer = n.type === 'land_offer';
              const isSub = n.type === 'land_submission';
              const isProp = n.type === 'member_proposal';

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (currentMemberId && !isRead) onMarkRead(n.id);
                    if (isDue && onOpenDueModal) {
                      onClose();
                      onOpenDueModal();
                    } else if ((isOffer || isSub || isProp) && onNavigateTab) {
                      onClose();
                      onNavigateTab('projects');
                    }
                  }}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all relative ${
                    isDue
                      ? 'bg-red-950/30 border-red-500/40 hover:bg-red-950/50'
                      : isOffer
                      ? 'bg-blue-950/30 border-blue-500/40 hover:bg-blue-950/50'
                      : isSub
                      ? 'bg-emerald-950/30 border-emerald-500/40 hover:bg-emerald-950/50'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                        isDue
                          ? 'bg-red-500/20 text-red-400'
                          : isOffer
                          ? 'bg-blue-500/20 text-blue-400'
                          : isSub
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          isDue
                            ? 'fa-clock-rotate-left'
                            : isOffer
                            ? 'fa-cart-shopping'
                            : isSub
                            ? 'fa-map-pin'
                            : 'fa-bullhorn'
                        }`}
                      ></i>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 shrink-0 font-english">
                          {n.created_at}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-2">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isDue ? 'text-red-400' : 'text-blue-400'
                          }`}
                        >
                          {isDue ? (
                            <>
                              <span>বকেয়া হিসাব ও রসিদ দেখুন</span>
                              <i className="fa-solid fa-arrow-right text-[10px]"></i>
                            </>
                          ) : (
                            <>
                              <span>বিস্তারিত দেখুন</span>
                              <i className="fa-solid fa-arrow-right text-[10px]"></i>
                            </>
                          )}
                        </span>

                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
