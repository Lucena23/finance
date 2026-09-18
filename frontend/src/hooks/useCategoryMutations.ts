/**
 * useCategoryMutations.ts — Hook de mutações de categorias (TAREFA 43).
 *
 * Encapsula as operações de criação, edição e exclusão de categorias
 * (POST/PATCH/DELETE /categories), expondo estados de submissão e erro
 * legível para a tela de Categorias. Após cada mutação bem-sucedida, a
 * listagem é recarregada via callback `onMutated`.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { useCallback, useState } from 'react';

import { ApiError, categoriesApi, type Category } from '@/lib/api';

/**
 * Payload de criação de categoria.
 */
export interface CreateCategoryInput {
  name: string;
  color: string;
  icon: string;
}

/**
 * Payload de edição de categoria (campos parciais).
 */
export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  icon?: string;
}

/**
 * Estado e operações expostos pelo hook useCategoryMutations.
 */
export interface UseCategoryMutationsResult {
  /** Indica se uma mutação está em andamento. */
  isSubmitting: boolean;
  /** Mensagem de erro legível da última mutação, ou null. */
  error: string | null;
  /** Limpa o erro corrente. */
  clearError: () => void;
  /** Cria uma nova categoria. Retorna a categoria criada. */
  create: (input: CreateCategoryInput) => Promise<Category>;
  /** Atualiza uma categoria existente. Retorna a categoria atualizada. */
  update: (id: string, input: UpdateCategoryInput) => Promise<Category>;
  /** Remove uma categoria. Lança ApiError (409) se houver despesas vinculadas. */
  remove: (id: string) => Promise<void>;
}

/**
 * Gerencia as mutações de categorias do workspace autenticado.
 *
 * @param onMutated Callback disparado após cada mutação bem-sucedida
 *                  (tipicamente o refetch da listagem).
 * @returns Operações de mutação, estado de submissão e erro.
 *
 * @example
 * const { create, remove, isSubmitting, error } = useCategoryMutations(refetch);
 */
export function useCategoryMutations(
  onMutated?: () => void | Promise<void>,
): UseCategoryMutationsResult {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const create = useCallback(
    async (input: CreateCategoryInput): Promise<Category> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const created = await categoriesApi.create(input);
        await onMutated?.();
        return created;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível criar a categoria.';
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onMutated],
  );

  const update = useCallback(
    async (id: string, input: UpdateCategoryInput): Promise<Category> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const updated = await categoriesApi.update(id, input);
        await onMutated?.();
        return updated;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível atualizar a categoria.';
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onMutated],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      setIsSubmitting(true);
      setError(null);

      try {
        await categoriesApi.remove(id);
        await onMutated?.();
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível excluir a categoria.';
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onMutated],
  );

  return {
    isSubmitting,
    error,
    clearError,
    create,
    update,
    remove,
  };
}
