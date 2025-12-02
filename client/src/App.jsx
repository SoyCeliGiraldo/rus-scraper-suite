import React, { useState } from 'react';
import axios from 'axios';
import DashboardLayout from './components/DashboardLayout';
import UploadComponent from './components/UploadComponent';
import PreviewComponent from './components/PreviewComponent';
import ResultsComponent from './components/ResultsComponent';
import AmazonOffersComponent from './components/AmazonOffersComponent';
import AmazonInvoicesComponent from './components/AmazonInvoicesComponent';
import MetricsDashboard from './components/MetricsDashboard';

function App() {
    const [platform, setPlatform] = useState('brokerbin'); // 'brokerbin' | 'amazon' | 'amazon-invoices'
    const [step, setStep] = useState('upload'); // upload, preview, processing, results
    const [validationData, setValidationData] = useState(null);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleFileSelect = async (file) => {
        setStep('validating');
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        const endpoint = platform === 'amazon'
            ? '/api/v1/amazon-search/validate-excel'
            : '/api/v1/scraper/validate-excel';

        try {
            const response = await axios.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setValidationData({ ...response.data, file }); // Keep file object for next step
            setStep('preview');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Error al validar el archivo.');
            setStep('upload');
        }
    };

    const handleProcess = async () => {
        setStep('processing');
        setError(null);

        const formData = new FormData();
        formData.append('file', validationData.file);
        formData.append('sheetName', validationData.sheetName);
        formData.append('columnName', validationData.detectedColumn);

        const endpoint = platform === 'amazon'
            ? '/api/v1/amazon-search/run'
            : '/api/v1/scraper/run';

        try {
            const response = await axios.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResults(response.data);
            setStep('results');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Error durante el procesamiento.');
            setStep('preview'); // Go back to preview so they can try again
        }
    };

    const handleReset = () => {
        setStep('upload');
        setValidationData(null);
        setResults(null);
        setError(null);
    };

    return (
        <DashboardLayout>
            <div className="py-8">
                {error && (
                    <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                {step === 'upload' && platform !== 'amazon-invoices' && (
                    <div className="max-w-2xl mx-auto mb-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Selecciona la Plataforma</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setPlatform('brokerbin')}
                                className={`p-4 rounded-xl border-2 transition-all ${platform === 'brokerbin'
                                        ? 'border-primary bg-blue-50 text-primary'
                                        : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="font-semibold">BrokerBin</div>
                                <div className="text-sm text-slate-500">Buscar en BrokerBin</div>
                            </button>
                            <button
                                onClick={() => setPlatform('amazon')}
                                className={`p-4 rounded-xl border-2 transition-all ${platform === 'amazon'
                                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                                        : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="font-semibold">Amazon</div>
                                <div className="text-sm text-slate-500">Buscar en Amazon</div>
                            </button>
                        </div>
                    </div>
                )}

                {(step === 'upload' || step === 'validating') && platform !== 'amazon-invoices' && (
                    <UploadComponent
                        onFileSelect={handleFileSelect}
                        isValidating={step === 'validating'}
                    />
                )}

                {(step === 'preview' || step === 'processing') && platform !== 'amazon-invoices' && (
                    <PreviewComponent
                        data={validationData}
                        onCancel={handleReset}
                        onProcess={handleProcess}
                        isProcessing={step === 'processing'}
                    />
                )}

                {step === 'results' && platform !== 'amazon-invoices' && (
                    <ResultsComponent
                        results={results}
                        onReset={handleReset}
                    />
                )}
                {/* Ofertas Amazon (solo visible tras results y si plataforma amazon) */}
                {step === 'results' && platform === 'amazon' && (
                    <AmazonOffersComponent onClose={() => { /* close simply hides component by changing platform maybe */ }} />
                )}
                {/* Facturas Amazon UI */}
                {platform === 'amazon-invoices' && (
                    <AmazonInvoicesComponent />
                )}
                {/* Selector adicional para facturas */}
                {step === 'upload' && (
                    <div className="max-w-2xl mx-auto mt-4">
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => { setPlatform('brokerbin'); handleReset(); }}
                                className={`p-3 rounded-lg border text-sm ${platform === 'brokerbin' ? 'border-primary bg-blue-50' : 'border-slate-200'}`}
                            >BrokerBin</button>
                            <button
                                onClick={() => { setPlatform('amazon'); handleReset(); }}
                                className={`p-3 rounded-lg border text-sm ${platform === 'amazon' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}
                            >Amazon Search</button>
                            <button
                                onClick={() => { setPlatform('amazon-invoices'); setStep('upload'); }}
                                className={`p-3 rounded-lg border text-sm ${platform === 'amazon-invoices' ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                            >Amazon Facturas</button>
                        </div>
                        <MetricsDashboard />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

export default App;
