import React from 'react';
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

const PreviewComponent = ({ data, onCancel, onProcess, isProcessing }) => {
    if (!data) return null;

    return (
        <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        Archivo Validado
                    </h3>
                    <p className="text-sm text-slate-500">
                        {data.fileName} • {data.totalParts} partes detectadas
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Columna Detectada</span>
                    <div className="font-mono text-sm text-slate-700 bg-slate-200 px-2 py-1 rounded">
                        {data.detectedColumn}
                    </div>
                </div>
            </div>

            <div className="p-0">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 w-16">#</th>
                            <th className="px-6 py-3">Vista Previa (Primeros 5 registros)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.preview.map((part, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-6 py-3 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-6 py-3 font-medium text-slate-700">{part}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={onProcess}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Procesando...
                        </>
                    ) : (
                        <>
                            Procesar Archivo
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default PreviewComponent;
