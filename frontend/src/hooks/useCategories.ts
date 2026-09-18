/**
 * useCategories.ts — Hook de consumo de categorias (TAREFA 42).
 *
 * Encapsula o fetch de GET /categories, expondo a lista de categorias do
 * workspace autenticado, além de estados de carregamento, erro e refetch.
 * Utilizado pelo formulário e pela listagem de despesas para exibir nome e
 * cor das categorias vinculadas.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiError, categoriesApi, type Category } from '@/lib/api';

/**
 * Estado e operações expostos pelo hook useCategories.
 */
export interface UseCategoriesResult {
  /** Categorias do workspace. */
  categories: Category[];
  /** Indica se a listagem está carregando. */
  isLoading: boolean;
  /** Mensagem de erro legível, ou null quando não há falha. */
  error: string | null;
  /** Recarrega a listagem a partir da API. */
  refetch: () => Promise<void>;
}

/**
 * Consome as categorias do workspace autenticado.
 *
 * @returns Lista de categorias, estados e função de refetch.
 *
 * @example
 * const { categories, isLoading } = useCategories();
 */
export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar as categorias.';
      setError(message);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}
