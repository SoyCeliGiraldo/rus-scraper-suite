import React from 'react';
import { Download, CheckCircle, ExternalLink } from 'lucide-react';

const ResultsComponent = ({ results, onReset }) => {
    return (
        <div className="w-full max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Proceso Completado!</h2>
            <p className="text-slate-500 mb-8">
                Se han procesado correctamente las partes. Puedes descargar los resultados a continuación.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <a
                    href={results.resultsCsv}
                    target="_blank"
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center">
                            <Download className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-slate-800 group-hover:text-primary">Resultados CSV</div>
                            <div className="text-xs text-slate-400">Completo</div>
                        </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300" />
                </a>

                <a
                    href={results.offersCsv}
                    target="_blank"
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 text-success rounded-lg flex items-center justify-center">
                            <Download className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-slate-800 group-hover:text-success">Ofertas CSV</div>
                            <div className="text-xs text-slate-400">Detallado</div>
                        </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300" />
                </a>

                {results.offersJson && (
                    <a
                        href={results.offersJson}
                        target="_blank"
                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                                <Download className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-slate-800 group-hover:text-purple-600">Ofertas JSON</div>
                                <div className="text-xs text-slate-400">API Format</div>
                            </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-300" />
                    </a>
                )}
            </div>

            <button
                onClick={onReset}
                className="text-slate-500 hover:text-slate-700 font-medium underline decoration-slate-300 hover:decoration-slate-500 underline-offset-4"
            >
                Procesar otro archivo
            </button>
        </div>
    );
};

export default ResultsComponent;
