import { useState } from 'react';
import { Crown, Download, FileText, Loader2, Lock } from 'lucide-react';
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
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const isReadOnlyMember = !hasPremiumAccess && user?.role === Role.MEMBER;

  // Default values
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState<'sintetico' | 'analitico'>('sintetico');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenPdfModal = () => {
    if (!hasPremiumAccess) {
      openPremiumModal(isReadOnlyMember ? 'FAMILY_PLAN_EXPIRED' : 'REPORTS');
      return;
    }
    setIsOpen(true);
  };

  const handleExportCsv = async () => {
    if (isReadOnlyMember) {
      openPremiumModal('FAMILY_PLAN_EXPIRED');
      return;
    }
    try {
      setIsExportingCsv(true);
      await reportsApi.exportCsv();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        openPremiumModal(err.feature ?? 'FAMILY_PLAN_EXPIRED');
      }
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setErrorMsg('');

      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/reports/pdf?startDate=${startDate}&endDate=${endDate}&type=${reportType}`,
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
        throw new Error('Erro ao gerar relatório');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Aksurim_${reportType}_${startDate}_a_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setIsOpen(false);
    } catch (err) {
      setErrorMsg('Falha ao gerar o relatório. Tente novamente.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleExportCsv()}
        disabled={isExportingCsv}
        title="Exportação básica de dados em CSV (Portabilidade LGPD)"
        className={cn(
          'gap-1.5 text-xs',
          isReadOnlyMember &&
            'border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
        )}
      >
        {isReadOnlyMember ? (
          <Lock className="h-3.5 w-3.5 text-amber-400" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {isExportingCsv ? 'Exportando...' : 'CSV (LGPD)'}
      </Button>

      <Button
        type="button"
        onClick={handleOpenPdfModal}
        className={cn(
          'w-full sm:w-auto gap-2 font-semibold',
          showGoldCue
            ? 'border border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-105'
            : 'bg-aksurim-primary hover:bg-aksurim-primary/90 text-white',
        )}
      >
        {showGoldCue ? (
          <Lock className="h-4 w-4 shrink-0" />
        ) : (
          <FileText size={18} />
        )}
        <span>Exportar Relatório PDF</span>
        {showGoldCue && <Crown className="h-3.5 w-3.5 shrink-0" />}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Exportar Relatório Financeiro</DialogTitle>
            <DialogDescription>
              Selecione o período e o formato desejado para baixar seu documento PDF profissional.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start-date">Data Inicial</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="end-date">Data Final</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Label>Tipo de Relatório</Label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  reportType === 'sintetico'
                    ? 'border-aksurim-primary bg-aksurim-primary/5'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="radio"
                    name="report-type"
                    className="h-4 w-4 text-aksurim-primary focus:ring-aksurim-primary"
                    checked={reportType === 'sintetico'}
                    onChange={() => setReportType('sintetico')}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    Sintético (Resumo Executivo)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Visão geral de totais, balanço e gráficos de categorias. Ideal para leitura rápida.
                  </span>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  reportType === 'analitico'
                    ? 'border-aksurim-primary bg-aksurim-primary/5'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="radio"
                    name="report-type"
                    className="h-4 w-4 text-aksurim-primary focus:ring-aksurim-primary"
                    checked={reportType === 'analitico'}
                    onChange={() => setReportType('analitico')}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    Analítico (Detalhado)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Resumo executivo + lista detalhada linha a linha de todas as despesas do período.
                  </span>
                </div>
              </label>
            </div>

            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !startDate || !endDate}
              className="bg-aksurim-primary hover:bg-aksurim-primary/90 text-white min-w-[140px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Gerar PDF'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
