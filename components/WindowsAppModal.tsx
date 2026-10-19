import React from 'react';
import { Monitor, Download, CheckCircle, ExternalLink, ShieldCheck, HardDrive, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface WindowsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsAppModal: React.FC<WindowsAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isWindows, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Monitor size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Standalone Windows Application</h3>
              <p className="text-xs text-indigo-200/80">Install Rawdons Profit and loss directly on your PC</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status banner */}
          {isInstalled ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3 text-emerald-900">
              <CheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="font-semibold text-sm">Standalone Application Installed & Active</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  You are running Rawdons Profit and loss as an independent native window on your machine with offline execution and local persistence.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start space-x-3 text-indigo-950">
              <Sparkles className="text-indigo-600 mt-0.5 shrink-0" size={20} />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-indigo-900">Install as a Windows Desktop App</p>
                <p className="text-indigo-700 leading-relaxed">
                  Installing transforms this suite into an independent Windows program: it gets its own Desktop icon, Start Menu entry, taskbar pinning, launches in a distraction-free window without browser bars, and runs offline.
                </p>
              </div>
            </div>
          )}

          {/* Key Windows App Features */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3">
              <HardDrive className="text-indigo-600 mt-0.5 shrink-0" size={18} />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Local PC Storage</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">All financial records and ledger data save directly to your computer hard drive.</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3">
              <ShieldCheck className="text-indigo-600 mt-0.5 shrink-0" size={18} />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Offline Standalone</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Launches instantly without requiring continuous internet or external servers.</p>
              </div>
            </div>
          </div>

          {/* Action area */}
          {isInstallable && !isInstalled ? (
            <div className="space-y-3">
              <button
                onClick={handleInstallClick}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
              >
                <Download size={18} />
                <span>Install Rawdons Profit and loss on Windows</span>
              </button>
              <p className="text-center text-[11px] text-slate-400">
                Clicking will trigger the Windows application installer prompt.
              </p>
            </div>
          ) : !isInstalled ? (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span>Windows 10 / 11 Installation Instructions</span>
              </h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                  <p>In <strong>Microsoft Edge</strong>: Click the <strong>App available</strong> icon in the address bar, or click <strong>Menu (...) &gt; Apps &gt; Install Rawdons Profit and loss</strong>.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                  <p>In <strong>Google Chrome</strong>: Click the <strong>Install</strong> icon in the right side of the URL address bar, or click <strong>Menu (...) &gt; Save and share &gt; Install Rawdons Profit and loss</strong>.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                  <p>Check <strong>Pin to taskbar</strong> and <strong>Create Desktop shortcut</strong> in the Windows dialog when prompted.</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Target OS: Windows 10 / 11</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
