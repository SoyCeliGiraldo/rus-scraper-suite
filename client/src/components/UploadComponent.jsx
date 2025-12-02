import React from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';

const UploadComponent = ({ onFileSelect, isValidating }) => {
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) onFileSelect(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) onFileSelect(file);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-primary hover:bg-blue-50 transition-colors cursor-pointer bg-white"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('fileInput').click()}
            >
                <input
                    type="file"
                    id="fileInput"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    disabled={isValidating}
                />

                <div className="w-16 h-16 bg-blue-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    {isValidating ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    ) : (
                        <UploadCloud className="w-8 h-8" />
                    )}
                </div>

                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {isValidating ? 'Analizando archivo...' : 'Sube tu archivo Excel'}
                </h3>
                <p className="text-slate-500 mb-6">
                    Arrastra tu archivo aquí o haz clic para buscarlo.
                    <br />
                    <span className="text-xs text-slate-400">Soporta .xlsx, .xls, .csv</span>
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 shadow-sm">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Plantilla_Partes.xlsx
                </div>
            </div>
        </div>
    );
};

export default UploadComponent;
