import { useState } from "react";
import { Sparkles, X, Check, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface AIActionDialogProps {
  isOpen: boolean;
  title: string;
  originalText: string;
  isGenerating: boolean;
  suggestedText: string | null;
  error: string | null;
  onAccept: (text: string) => void;
  onReject: () => void;
  onRegenerate: () => void;
}

export function AIActionDialog({
  isOpen,
  title,
  originalText,
  isGenerating,
  suggestedText,
  error,
  onAccept,
  onReject,
  onRegenerate
}: AIActionDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-xl border border-primary/20 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary-light/10 to-transparent">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <button onClick={onReject} className="text-secondary hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex gap-6 h-[400px]">
          {/* Original */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-secondary mb-2 uppercase tracking-wider">Original</h3>
            <div className="flex-1 p-4 bg-gray-50 border border-border rounded-lg overflow-y-auto text-sm font-mono whitespace-pre-wrap text-secondary opacity-70">
              {originalText || "No content provided."}
            </div>
          </div>

          {/* Suggested */}
          <div className="flex-1 flex flex-col relative">
            <h3 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">AI Suggestion</h3>
            <div className="flex-1 p-4 bg-primary-light/5 border border-primary/20 rounded-lg overflow-y-auto text-sm font-mono whitespace-pre-wrap shadow-inner relative">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/50 backdrop-blur-sm rounded-lg">
                  <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-sm font-semibold text-primary animate-pulse">Generating magic...</p>
                </div>
              ) : error ? (
                <div className="text-danger font-semibold flex items-center h-full justify-center p-4 text-center text-sm">
                  {error}
                </div>
              ) : suggestedText ? (
                <div className="animate-in fade-in duration-500">
                  {suggestedText}
                </div>
              ) : (
                <div className="text-secondary flex items-center h-full justify-center">
                  Waiting for suggestion...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-gray-50/50 flex justify-between items-center">
          <Button 
            variant="ghost" 
            className="text-secondary hover:text-text"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} /> 
            Regenerate
          </Button>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onReject} disabled={isGenerating}>
              Cancel
            </Button>
            <Button 
              className="bg-primary hover:bg-primary-hover text-white min-w-[120px]"
              onClick={() => suggestedText && onAccept(suggestedText)}
              disabled={isGenerating || !suggestedText}
            >
              <Check className="w-4 h-4 mr-2" />
              Accept
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
