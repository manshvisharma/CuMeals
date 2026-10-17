import React, { useState } from 'react';
import { Upload, Download, CheckCircle2, AlertTriangle, Copy, FileText, Calendar } from 'lucide-react';
import { parseAndValidateMenuJson, ParseResult } from '../../utils/menuParser';
import { saveBulkMenus, fetchMenuForDate } from '../../firebase/firestore';
import { iconsForItems } from '../../utils/foodIcons';
import { buildAiPrompt } from '../../utils/menuAiPrompt';
import { getTodayString, addDays, getFormattedDateLong } from '../../utils/dateUtils';

export const JsonImportExport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  // Export State
  const [exportDate, setExportDate] = useState<string>(getTodayString());
  const [exportJson, setExportJson] = useState<string>('');
  const [loadingExport, setLoadingExport] = useState<boolean>(false);

  const d0 = getTodayString();
  const sampleSingleJson = `{
  "date": "${d0}",
  "breakfast": {
    "items": [
      { "name": "Poha", "icon": "🍚" },
      { "name": "Banana", "icon": "🍌" },
      { "name": "Tea", "icon": "🍵" }
    ]
  },
  "lunch": {
    "items": [
      { "name": "Rajma", "icon": "🍲" },
      { "name": "Rice", "icon": "🍚" },
      { "name": "Green Salad", "icon": "🥗" },
      { "name": "Curd", "icon": "🥣" }
    ]
  },
  "snacksBoys": {
    "items": [
      { "name": "Samosa", "icon": "🥟" },
      { "name": "Tea", "icon": "🍵" }
    ]
  },
  "snacksGirls": {
    "items": [
      { "name": "Sandwich", "icon": "🥪" },
      { "name": "Milk", "icon": "🥛" }
    ]
  },
  "dinner": {
    "items": [
      { "name": "Dal Makhani", "icon": "🍲" },
      { "name": "Jeera Rice", "icon": "🍚" },
      { "name": "Roti", "icon": "🫓" },
      { "name": "Gulab Jamun", "icon": "🍮" }
    ]
  }
}`;

  const sampleBulkJson = `[
  {
    "date": "${d0}",
    "breakfast": { "items": [ { "name": "Poha", "icon": "🍚" }, { "name": "Tea", "icon": "🍵" } ] },
    "lunch": { "items": [ { "name": "Rajma", "icon": "🍲" }, { "name": "Rice", "icon": "🍚" }, { "name": "Salad", "icon": "🥗" } ] },
    "snacks": { "items": [ { "name": "Samosa", "icon": "🥟" }, { "name": "Tea", "icon": "🍵" } ] },
    "dinner": { "items": [ { "name": "Dal Tadka", "icon": "🍲" }, { "name": "Rice", "icon": "🍚" }, { "name": "Mix Veg", "icon": "🥘" } ] }
  },
  {
    "date": "${addDays(d0, 1)}",
    "breakfast": { "items": [ { "name": "Aloo Paratha", "icon": "🫓" }, { "name": "Curd", "icon": "🥣" }, { "name": "Tea", "icon": "🍵" } ] },
    "lunch": { "items": [ { "name": "Kadhi Pakora", "icon": "🍲" }, { "name": "Rice", "icon": "🍚" } ] },
    "snacksBoys": { "items": [ { "name": "Biscuit", "icon": "🍪" }, { "name": "Tea", "icon": "🍵" } ] },
    "snacksGirls": { "items": [ { "name": "Patties", "icon": "🥟" }, { "name": "Milk", "icon": "🥛" } ] },
    "dinner": { "items": [ { "name": "Paneer Butter Masala", "icon": "🧀" }, { "name": "Naan", "icon": "🫓" }, { "name": "Rice", "icon": "🍚" } ] }
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
      const meal = (m: any) => ({ items: iconsForItems(m?.items || [], m?.icons).map((x) => ({ name: x.name, icon: x.icon })) });
      setExportJson(
        JSON.stringify(
          { date: menu.date || exportDate, breakfast: meal(menu.breakfast), lunch: meal(menu.lunch), snacksBoys: meal(menu.snacksBoys), snacksGirls: meal(menu.snacksGirls), dinner: meal(menu.dinner) },
          null,
          2
        )
      );
    } else {
      setExportJson(`// No menu found for ${exportDate}`);
    }
    setLoadingExport(false);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportJson);
    alert('JSON copied to clipboard!');
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(getTodayString()));
      setImportStatus('AI prompt copied. Paste it into ChatGPT / Gemini / Claude together with your menu (text or photo).');
    } catch {
      setImportStatus('Could not copy automatically – select the prompt text below and copy it.');
      setShowPrompt(true);
    }
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
          
          {/* Food icons + AI prompt */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-100 space-y-2">
            <p className="font-bold text-sm">🍚 Every dish has an icon</p>
            <p className="leading-relaxed text-indigo-200/90">
              Write each dish as <code className="px-1 rounded bg-slate-900">{'{ "name": "Poha", "icon": "🍚" }'}</code> – <b>icon</b> is one emoji.
              Plain text dishes (<code className="px-1 rounded bg-slate-900">"Poha"</code>) still work and get an automatic icon.
              Boys and girls snacks can be one shared <code className="px-1 rounded bg-slate-900">"snacks"</code> object.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={handleCopyPrompt} className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 active:scale-95 transition-all">
                <Copy size={14} />
                <span>Copy AI prompt</span>
              </button>
              <button onClick={() => setShowPrompt(!showPrompt)} className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold">
                {showPrompt ? 'Hide prompt' : 'Show prompt'}
              </button>
            </div>
            {showPrompt && (
              <textarea readOnly rows={12} value={buildAiPrompt(getTodayString())} className="w-full p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed border border-slate-800 outline-none" />
            )}
          </div>

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
                Dates as YYYY-MM-DD · dishes as {"{ name, icon }"} (or plain text)
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

                  {validationResult.warnings.length > 0 && (
                    <div className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                      <p className="font-bold">Notes (the import still works):</p>
                      <ul className="list-disc list-inside">
                        {validationResult.warnings.slice(0, 12).map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}

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
