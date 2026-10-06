import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getAuthToken } from '@/lib/api';

export function ReportModal(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Default values
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState<'sintetico' | 'analitico'>('sintetico');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setErrorMsg('');
      
      const token = getAuthToken();
      const response = await fetch(`/api/v1/reports/pdf?startDate=${startDate}&endDate=${endDate}&type=${reportType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto gap-2 bg-aksurim-primary hover:bg-aksurim-primary/90 text-white">
          <FileText size={18} />
          Exportar Relatório
        </Button>
      </DialogTrigger>
      
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
            
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${reportType === 'sintetico' ? 'border-aksurim-primary bg-aksurim-primary/5' : 'hover:bg-muted'}`}>
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
                <span className="text-sm font-medium">Sintético (Resumo Executivo)</span>
                <span className="text-xs text-muted-foreground">Visão geral de totais, balanço e gráficos de categorias. Ideal para leitura rápida.</span>
              </div>
            </label>

            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${reportType === 'analitico' ? 'border-aksurim-primary bg-aksurim-primary/5' : 'hover:bg-muted'}`}>
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
                <span className="text-sm font-medium">Analítico (Detalhado)</span>
                <span className="text-xs text-muted-foreground">Resumo executivo + lista detalhada linha a linha de todas as despesas do período.</span>
              </div>
            </label>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>
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
  );
}
