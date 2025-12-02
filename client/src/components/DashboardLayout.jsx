import React from 'react';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';

const DashboardLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6" />
                        AutoBot
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary bg-blue-50 rounded-lg">
                        <FileText className="w-5 h-5" />
                        BrokerBin Search
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                        <Settings className="w-5 h-5" />
                        Configuración
                    </a>
                </nav>
                <div className="p-4 border-t border-slate-100">
                    <div className="text-xs text-slate-400 text-center">v2.0.0 Enterprise</div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
                    <h2 className="text-lg font-semibold text-slate-800">Búsqueda de Partes</h2>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                            U
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-8 overflow-auto">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
