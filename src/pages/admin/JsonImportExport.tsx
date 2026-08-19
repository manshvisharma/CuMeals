import React, { useState } from 'react';
import { FileJson, Upload, Download, CheckCircle2, AlertTriangle, Copy, FileText } from 'lucide-react';
import { parseAndValidateMenuJson, ParseResult } from '../../utils/menuParser';
import { saveBulkMenus, fetchMenuForDate } from '../../firebase/firestore';
import { getTodayString } from '../../utils/dateUtils';

export const JsonImportExport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Export State
  const [exportDate, setExportDate] = useState<string>(getTodayString());
  const [exportJson, setExportJson] = useState<string>('');
  const [loadingExport, setLoadingExport] = useState<boolean>(false);

  const sampleSingleJson = `{
  "date": "${getTodayString()}",
  "breakfast": {
    "time": "08:00 AM - 09:30 AM",
    "items": ["Poha", "Banana", "Tea"]
  },
  "lunch": {
    "time": "12:30 PM - 02:00 PM",
    "items": ["Rajma Chawal", "Salad"]
  },
  "snacksBoys": {
    "time": "04:30 PM - 05:30 PM",
    "items": ["Samosa", "Tea"]
  },
  "snacksGirls": {
    "time": "04:30 PM - 05:30 PM",
    "items": ["Sandwich", "Milk"]
  },
  "dinner": {
    "time": "08:00 PM - 09:30 PM",
    "items": ["Dal", "Rice", "Mix Veg"]
  }
}`;

  const sampleBulkJson = `[
  {
    "date": "${getTodayString()}",
    "breakfast": { "time": "08:00 AM - 09:30 AM", "items": ["Poha", "Banana"] }
  },
  {
    "date": "${getTodayString().slice(0, 8)}20",
    "breakfast": { "time": "08:00 AM - 09:30 AM", "items": ["Aloo Paratha", "Curd"] }
  }
]`;

  const handleValidate = () => {
    const res = parseAndValidateMenuJson(jsonInput);
    setValidationResult(res);
    setImportStatus(null);
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.isValid) return;
    setImporting(true);
    setImportStatus(null);

    const { successCount, errors } = await saveBulkMenus(validationResult.menus);
    setImporting(false);

    if (errors.length === 0) {
      setImportStatus(`Successfully imported ${successCount} date menu(s) to Firestore!`);
      setValidationResult(null);
      setJsonInput('');
    } else {
      setImportStatus(`Imported ${successCount} menus with warnings: ${errors.join(', ')}`);
    }
  };

  const handleLoadExport = async () => {
    setLoadingExport(true);
    const menu = await fetchMenuForDate(exportDate);
    if (menu) {
      setExportJson(JSON.stringify(menu, null, 2));
    } else {
      setExportJson(`// No menu found for ${exportDate}`);
    }
    setLoadingExport(false);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportJson);
    alert('JSON copied to clipboard!');
  };

  const handleDownloadExport = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mess-menu-${exportDate}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Tab Switcher */}
      <div className="p-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-white dark:border-slate-800 shadow-sm flex items-center">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'import'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Upload size={16} />
          <span>Import JSON</span>
        </button>

        <button
          onClick={() => { setActiveTab('export'); handleLoadExport(); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'export'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Download size={16} />
          <span>Export JSON</span>
        </button>
      </div>

      {activeTab === 'import' ? (
        <div className="space-y-4">
          
          {/* Preset Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setJsonInput(sampleSingleJson); setValidationResult(null); }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-200"
            >
              <FileText size={14} />
              <span>Load Single Sample</span>
            </button>

            <button
              onClick={() => { setJsonInput(sampleBulkJson); setValidationResult(null); }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-200"
            >
              <FileText size={14} />
              <span>Load Bulk Sample</span>
            </button>
          </div>

          {/* JSON Textarea */}
          <div className="p-5 rounded-[28px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 shadow-sm">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Paste Menu JSON (Single Date Object or Array of Objects)
            </label>

            <textarea
              rows={12}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste your JSON payload here..."
              className="w-full p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Supports single day object or multi-day arrays
              </span>

              <button
                onClick={handleValidate}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold shadow-md hover:scale-102 active:scale-95 transition-all"
              >
                Validate JSON
              </button>
            </div>
          </div>

          {/* Validation Feedback & Preview */}
          {validationResult && (
            <div className={`p-5 rounded-[28px] border shadow-sm ${
              validationResult.isValid 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {validationResult.isValid ? (
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                ) : (
                  <AlertTriangle className="text-rose-500 shrink-0" size={20} />
                )}
                <h4 className="text-sm font-bold">
                  {validationResult.isValid
                    ? `JSON Validated: ${validationResult.menus.length} date(s) detected`
                    : 'JSON Validation Errors'}
                </h4>
              </div>

              {validationResult.isValid ? (
                <div>
                  <div className="space-y-1.5 my-3">
                    {validationResult.menus.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 text-xs font-semibold flex items-center justify-between">
                        <span>📅 Date: {m.date}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Ready to import ✓</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    disabled={importing}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
                  >
                    {importing ? 'Writing to Firestore...' : `Confirm & Save ${validationResult.menus.length} Date(s) to Firestore`}
                  </button>
                </div>
              ) : (
                <ul className="list-disc list-inside text-xs space-y-1">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {importStatus && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 text-xs font-bold">
              {importStatus}
            </div>
          )}

        </div>
      ) : (
        /* Export Tab */
        <div className="space-y-4">
          <div className="p-5 rounded-[28px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Select Export Date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={exportDate}
                  onChange={(e) => setExportDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
                <button
                  onClick={handleLoadExport}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold"
                >
                  Fetch JSON
                </button>
              </div>
            </div>

            <textarea
              rows={12}
              readOnly
              value={exportJson}
              className="w-full p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs outline-none leading-relaxed"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyExport}
                className="flex-1 py-3 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Copy size={15} />
                <span>Copy JSON</span>
              </button>

              <button
                onClick={handleDownloadExport}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Download size={15} />
                <span>Download .json File</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
