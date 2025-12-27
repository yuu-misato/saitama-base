
import React from 'react';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'fas fa-inbox',
    title,
    description,
    actionLabel,
    onAction
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <i className={`${icon} text-3xl text-slate-300`}></i>
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-2">{title}</h3>
            <p className="text-slate-400 font-bold text-sm max-w-xs mb-8 leading-relaxed">
                {description}
            </p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="bg-slate-800 text-white px-8 py-3 rounded-xl font-black text-sm hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
