import React, { useState } from 'react';
import { Upload, Download, CheckCircle2, AlertTriangle, Copy, FileText, Calendar } from 'lucide-react';
import { parseAndValidateMenuJson, ParseResult } from '../../utils/menuParser';
import { saveBulkMenus, fetchMenuForDate } from '../../firebase/firestore';
import { getTodayString, addDays, getFormattedDateLong } from '../../utils/dateUtils';

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
    "items": ["Poha", "Banana", "Tea"]
  },
  "lunch": {
    "items": ["Rajma Chawal", "Salad", "Curd"]
  },
  "snacksBoys": {
    "items": ["Samosa", "Tea"]
  },
  "snacksGirls": {
    "items": ["Sandwich", "Milk"]
  },
  "dinner": {
    "items": ["Dal Makhani", "Jeera Rice", "Roti", "Gulab Jamun"]
  }
}`;

  const sampleBulkJson = `[
  {
    "date": "${getTodayString()}",
    "breakfast": { "items": ["Poha", "Tea"] },
    "lunch": { "items": ["Rajma Chawal", "Salad"] },
    "snacksBoys": { "items": ["Samosa", "Tea"] },
    "snacksGirls": { "items": ["Sandwich", "Milk"] },
    "dinner": { "items": ["Dal Tadka", "Rice", "Mix Veg"] }
  },
  {
    "date": "${addDays(getTodayString(), 1)}",
    "breakfast": { "items": ["Aloo Paratha", "Curd", "Tea"] },
    "lunch": { "items": ["Kadhi Pakoda", "Rice"] },
    "snacksBoys": { "items": ["Biscuits", "Tea"] },
    "snacksGirls": { "items": ["Patties", "Milk"] },
    "dinner": { "items": ["Paneer Butter Masala", "Naan", "Rice"] }
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
      setImportStatus(`Successfully saved ${successCount} date menu(s) to Firestore!`);
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
    a.download = `cumeals-menu-${exportDate}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Tab Switcher */}
      <div className="p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'import'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <Upload size={16} />
          <span>Import Menu JSON</span>
        </button>

        <button
          onClick={() => { setActiveTab('export'); handleLoadExport(); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'export'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <Download size={16} />
          <span>Export Menu JSON</span>
        </button>
      </div>

      {activeTab === 'import' ? (
        <div className="space-y-4">
          
          {/* Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setJsonInput(sampleSingleJson); setValidationResult(null); }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 hover:bg-slate-700 transition-colors"
            >
              <FileText size={14} className="text-indigo-400" />
              <span>Load 1-Day Sample</span>
            </button>

            <button
              onClick={() => { setJsonInput(sampleBulkJson); setValidationResult(null); }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 hover:bg-slate-700 transition-colors"
            >
              <FileText size={14} className="text-emerald-400" />
              <span>Load Multi-Date Array Sample</span>
            </button>
          </div>

          {/* JSON Textarea */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Paste Menu JSON (Single Date Object or Array of Date Objects)
            </label>

            <textarea
              rows={14}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste your JSON payload here..."
              className="w-full p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed border border-slate-800"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Supports date keys (YYYY-MM-DD) with food items arrays
              </span>

              <button
                onClick={handleValidate}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                Validate JSON
              </button>
            </div>
          </div>

          {/* Validation Feedback & Preview */}
          {validationResult && (
            <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${
              validationResult.isValid 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-100'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {validationResult.isValid ? (
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
                ) : (
                  <AlertTriangle className="text-rose-400 shrink-0" size={20} />
                )}
                <h4 className="text-sm font-bold">
                  {validationResult.isValid
                    ? `JSON Validated: ${validationResult.menus.length} date menu(s) detected`
                    : 'JSON Validation Errors'}
                </h4>
              </div>

              {validationResult.isValid ? (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 my-3">
                    {validationResult.menus.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-xs font-semibold flex items-center justify-between">
                        <span>📅 Date: {m.date || m.day}</span>
                        <span className="text-emerald-400 font-bold text-[11px]">Valid ✓</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    disabled={importing}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all active:scale-98"
                  >
                    {importing ? 'Saving to Firestore...' : `Confirm & Save ${validationResult.menus.length} Date Menu(s) to Firestore`}
                  </button>
                </div>
              ) : (
                <ul className="list-disc list-inside text-xs space-y-1 text-rose-300">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {importStatus && (
            <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-bold">
              {importStatus}
            </div>
          )}

        </div>
      ) : (
        /* Export Tab */
        <div className="space-y-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Select Date to Export
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={exportDate}
                    onChange={(e) => setExportDate(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 text-sm font-bold text-slate-100 border border-slate-700 outline-none"
                  />
                  <button
                    onClick={handleLoadExport}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                  >
                    {loadingExport ? 'Fetching...' : 'Fetch JSON'}
                  </button>
                </div>
              </div>
            </div>

            <textarea
              rows={14}
              readOnly
              value={exportJson}
              className="w-full p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs outline-none leading-relaxed border border-slate-800"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyExport}
                className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Copy size={16} />
                <span>Copy JSON</span>
              </button>

              <button
                onClick={handleDownloadExport}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Download size={16} />
                <span>Download .json File</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
