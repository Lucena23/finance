import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  planApi,
  type PlanInfo,
  type PremiumFeature,
} from '@/lib/api';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

export interface PlanContextValue {
  plan: PlanInfo | null;
  isLoading: boolean;
  /** True quando o status efetivo é TRIAL, PREMIUM ou GRACE. */
  hasPremiumAccess: boolean;
  /** True somente quando o cliente já assinou o plano pago (status === 'PREMIUM'). */
  isPaidPremium: boolean;
  /**
   * True quando os elementos restritos devem exibir o destaque dourado + cadeado
   * (sempre que status !== 'PREMIUM', inclusive durante o teste, para lembrar o cliente).
   */
  showGoldCue: boolean;
  /** Verifica se um mês/ano faz parte da janela gratuita (mês atual + próximo). */
  isFreeAllowedPeriod: (month: number, year: number) => boolean;
  /** Verifica se o usuário atual pode visualizar os detalhes de um mês/ano. */
  canViewPeriod: (month: number, year: number) => boolean;
  /** Abre o modal de upgrade Premium contextualizado. */
  openPremiumModal: (feature?: PremiumFeature, customTitle?: string) => void;
  closePremiumModal: () => void;
  modalState: {
    open: boolean;
    feature?: PremiumFeature;
    customTitle?: string;
  };
  /** Abre o modal informando que o checkout está em manutenção. */
  openMaintenanceModal: () => void;
  closeMaintenanceModal: () => void;
  isMaintenanceOpen: boolean;
  refetchPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

function getCurrentPeriodInBr(): { month: number; year: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  });
  // formatToParts evita depender do separador/ordem (WebKit/iOS formata en-CA como "MM/AAAA").
  const parts = formatter.formatToParts(new Date());
  const y = parts.find((part) => part.type === 'year')?.value;
  const m = parts.find((part) => part.type === 'month')?.value;
  return { month: Number(m), year: Number(y) };
}

export function PlanProvider({ children }: { children: ReactNode }): JSX.Element {
  const { isAuthenticated } = useAuth();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    feature?: PremiumFeature;
    customTitle?: string;
  }>({ open: false });
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState<boolean>(false);

  const fetchPlan = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setPlan(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await planApi.get();
      setPlan(data);
    } catch {
      // Mantém último estado conhecido em caso de falha transitória
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    const handlePlanUpdated = (): void => {
      void fetchPlan();
    };
    window.addEventListener('plan-updated', handlePlanUpdated);
    return () => {
      window.removeEventListener('plan-updated', handlePlanUpdated);
    };
  }, [fetchPlan]);

  const isFreeAllowedPeriod = useCallback((month: number, year: number): boolean => {
    const current = getCurrentPeriodInBr();
    const currentIdx = current.year * 12 + (current.month - 1);
    const targetIdx = year * 12 + (month - 1);
    return targetIdx === currentIdx || targetIdx === currentIdx + 1;
  }, []);

  const hasPremiumAccess = plan ? plan.hasPremiumAccess : true;
  const isPaidPremium = plan?.status === 'PREMIUM';
  const showGoldCue = !isPaidPremium;

  const canViewPeriod = useCallback(
    (month: number, year: number): boolean => {
      if (hasPremiumAccess) return true;
      return isFreeAllowedPeriod(month, year);
    },
    [hasPremiumAccess, isFreeAllowedPeriod],
  );

  const openPremiumModal = useCallback(
    (feature?: PremiumFeature, customTitle?: string): void => {
      setModalState({ open: true, feature, customTitle });
    },
    [],
  );

  const closePremiumModal = useCallback((): void => {
    setModalState({ open: false });
  }, []);

  const openMaintenanceModal = useCallback((): void => {
    setModalState({ open: false });
    setIsMaintenanceOpen(true);
  }, []);

  const closeMaintenanceModal = useCallback((): void => {
    setIsMaintenanceOpen(false);
  }, []);

  const value = useMemo<PlanContextValue>(
    () => ({
      plan,
      isLoading,
      hasPremiumAccess,
      isPaidPremium,
      showGoldCue,
      isFreeAllowedPeriod,
      canViewPeriod,
      openPremiumModal,
      closePremiumModal,
      modalState,
      openMaintenanceModal,
      closeMaintenanceModal,
      isMaintenanceOpen,
      refetchPlan: fetchPlan,
    }),
    [
      plan,
      isLoading,
      hasPremiumAccess,
      isPaidPremium,
      showGoldCue,
      isFreeAllowedPeriod,
      canViewPeriod,
      openPremiumModal,
      closePremiumModal,
      modalState,
      openMaintenanceModal,
      closeMaintenanceModal,
      isMaintenanceOpen,
      fetchPlan,
    ],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

const FALLBACK_PLAN_CONTEXT: PlanContextValue = {
  plan: null,
  isLoading: false,
  hasPremiumAccess: true,
  isPaidPremium: true,
  showGoldCue: false,
  isFreeAllowedPeriod: () => true,
  canViewPeriod: () => true,
  openPremiumModal: () => undefined,
  closePremiumModal: () => undefined,
  modalState: { open: false },
  openMaintenanceModal: () => undefined,
  closeMaintenanceModal: () => undefined,
  isMaintenanceOpen: false,
  refetchPlan: async () => undefined,
};

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  return ctx ?? FALLBACK_PLAN_CONTEXT;
}
