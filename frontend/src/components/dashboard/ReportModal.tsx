import { useState } from 'react';
import { Crown, Download, FileSpreadsheet, FileText, Loader2, Lock } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, getAuthToken, reportsApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { API_BASE_URL, Role } from '@/lib/constants';

export function ReportModal(): JSX.Element {
  const { user } = useAuth();
  const { hasPremiumAccess, showGoldCue, openPremiumModal } = usePlan();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isReadOnlyMember = !hasPremiumAccess && user?.role === Role.MEMBER;

  // Datas padrão: primeiro e último dia do mês atual
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [exportFormat, setExportFormat] = useState<'sintetico' | 'analitico' | 'csv'>('sintetico');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenModal = () => {
    setErrorMsg('');
    setIsOpen(true);
  };

  const handleExecuteExport = async () => {
    try {
      setIsGenerating(true);
      setErrorMsg('');

      // Se for exportação em planilha CSV
      if (exportFormat === 'csv') {
        if (isReadOnlyMember) {
          openPremiumModal('FAMILY_PLAN_EXPIRED');
          return;
        }

        try {
          await reportsApi.exportCsv(startDate, endDate);
          setIsOpen(false);
        } catch (err) {
          if (err instanceof ApiError && err.status === 402) {
            openPremiumModal(err.feature ?? 'FAMILY_PLAN_EXPIRED');
          } else {
            setErrorMsg('Falha ao exportar a planilha CSV. Tente novamente.');
          }
        }
        return;
      }

      // Se for relatório em PDF (Sintético ou Analítico)
      if (!hasPremiumAccess) {
        openPremiumModal(isReadOnlyMember ? 'FAMILY_PLAN_EXPIRED' : 'REPORTS');
        return;
      }

      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/reports/pdf?startDate=${startDate}&endDate=${endDate}&type=${exportFormat}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 402) {
        setIsOpen(false);
        openPremiumModal('REPORTS');
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao gerar relatório PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Aksurim_${exportFormat}_${startDate}_a_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setIsOpen(false);
    } catch (err) {
      setErrorMsg('Falha ao gerar o documento. Verifique os dados e tente novamente.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex items-center">
      {/* Botão Único e Moderno no Topo do Painel */}
      <Button
        type="button"
        onClick={handleOpenModal}
        className={cn(
          'w-full sm:w-auto gap-2 font-semibold shadow-sm transition-all',
          showGoldCue
            ? 'border border-amber-400/80 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-105'
            : 'bg-aksurim-primary hover:bg-aksurim-primary/90 text-white',
        )}
      >
        {showGoldCue ? (
          <Lock className="h-4 w-4 shrink-0" />
        ) : (
          <FileText size={18} />
        )}
        <span>Emitir Relatório</span>
        {showGoldCue && <Crown className="h-3.5 w-3.5 shrink-0" />}
      </Button>

      {/* Modal Unificado de Relatórios */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-white">
              Emitir Relatório Financeiro
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Selecione o período e escolha o formato desejado (PDF executivo ou Planilha CSV).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            {/* Filtros de Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="report-start-date" className="text-slate-300 font-medium text-xs">
                  Data Inicial
                </Label>
                <Input
                  id="report-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900/80 border-slate-700 text-slate-200 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="report-end-date" className="text-slate-300 font-medium text-xs">
                  Data Final
                </Label>
                <Input
                  id="report-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900/80 border-slate-700 text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Opções de Formato */}
            <div className="flex flex-col gap-2.5 pt-1">
              <Label className="text-slate-300 font-medium text-xs">Formato de Exportação</Label>

              {/* PDF Sintético */}
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  exportFormat === 'sintetico'
                    ? 'border-aksurim-primary bg-aksurim-primary/10'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40',
                )}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="radio"
                    name="export-format"
                    className="h-4 w-4 text-aksurim-primary focus:ring-aksurim-primary"
                    checked={exportFormat === 'sintetico'}
                    onChange={() => setExportFormat('sintetico')}
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-aksurim-primary" />
                      PDF Sintético (Resumo Executivo)
                    </span>
                    {!hasPremiumAccess && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <Crown className="h-2.5 w-2.5" /> Premium
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Visão geral dos totais, balanço mensal e gráficos de distribuição por categoria.
                  </span>
                </div>
              </label>

              {/* PDF Analítico */}
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  exportFormat === 'analitico'
                    ? 'border-aksurim-primary bg-aksurim-primary/10'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40',
                )}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="radio"
                    name="export-format"
                    className="h-4 w-4 text-aksurim-primary focus:ring-aksurim-primary"
                    checked={exportFormat === 'analitico'}
                    onChange={() => setExportFormat('analitico')}
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-aksurim-primary" />
                      PDF Analítico (Detalhado)
                    </span>
                    {!hasPremiumAccess && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <Crown className="h-2.5 w-2.5" /> Premium
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Resumo executivo completo + listagem detalhada linha a linha de todas as despesas.
                  </span>
                </div>
              </label>

              {/* Planilha CSV */}
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  exportFormat === 'csv'
                    ? 'border-aksurim-primary bg-aksurim-primary/10'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40',
                )}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="radio"
                    name="export-format"
                    className="h-4 w-4 text-aksurim-primary focus:ring-aksurim-primary"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                      Planilha (CSV)
                    </span>
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Excel / Sheets
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Dados tabulares estruturados do período selecionado para abrir no Excel ou Google Sheets.
                  </span>
                </div>
              </label>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 p-2 rounded">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isGenerating}
              className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteExport}
              disabled={isGenerating || !startDate || !endDate}
              className="bg-aksurim-primary hover:bg-aksurim-primary/90 text-white min-w-[150px] text-xs font-semibold gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : exportFormat === 'csv' ? (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar Planilha (CSV)</span>
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  <span>Gerar Relatório PDF</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
