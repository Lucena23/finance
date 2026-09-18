/**
 * CategoryForm.tsx — Formulário de criação/edição de categorias (TAREFA 43).
 *
 * Coleta nome, cor (hex #RRGGBB) e ícone (Lucide) de uma categoria. Utiliza
 * os seletores <ColorPicker /> e <IconPicker /> para escolha visual acessível.
 * Em modo de edição, pré-preenche os campos com a categoria recebida.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Loader2, Save } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { ColorPicker, CATEGORY_COLOR_PALETTE } from '@/components/category/ColorPicker';
import {
  IconPicker,
  resolveCategoryIcon,
} from '@/components/category/IconPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, type Category } from '@/lib/api';
import { cn } from '@/lib/cn';

interface CategoryFormProps {
  /** Categoria existente para edição. Quando ausente, o formulário cria. */
  category?: Category | null;
  /** Callback de submissão. Deve lançar em caso de falha para exibir erro. */
  onSubmit: (values: {
    name: string;
    color: string;
    icon: string;
  }) => Promise<void>;
  /** Callback disparado ao cancelar o formulário. */
  onCancel?: () => void;
}

/**
 * Formulário de criação/edição de categorias com cor e ícone.
 */
export function CategoryForm({
  category,
  onSubmit,
  onCancel,
}: CategoryFormProps): JSX.Element {
  const nameFieldId = useId();

  const isEditing = Boolean(category);

  const [name, setName] = useState<string>('');
  const [color, setColor] = useState<string>(CATEGORY_COLOR_PALETTE[9]);
  const [icon, setIcon] = useState<string>('package');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza o formulário com a categoria em edição.
  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
      setIcon(category.icon);
    }
  }, [category]);

  const isNameValid = name.trim().length > 0;
  const isColorValid = /^#[0-9A-Fa-f]{6}$/.test(color);
  const isIconValid = icon.trim().length > 0;

  const isFormValid = isNameValid && isColorValid && isIconValid;

  const PreviewIcon = resolveCategoryIcon(icon);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!isFormValid) {
      setError('Preencha o nome e selecione uma cor e um ícone.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        color: color.toUpperCase(),
        icon,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível salvar a categoria. Tente novamente.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
      data-testid="category-form"
    >
      {/* Pré-visualização */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <PreviewIcon className="h-6 w-6 text-white" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {name.trim().length > 0 ? name.trim() : 'Nova categoria'}
          </span>
          <span className="text-muted-foreground text-xs">
            Pré-visualização
          </span>
        </div>
      </div>

      {/* Nome */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameFieldId}>Nome *</Label>
        <Input
          id={nameFieldId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Moradia, Alimentação, Transporte"
          autoComplete="off"
          maxLength={60}
          aria-invalid={!isNameValid && name.length > 0}
          data-testid="category-form-name"
        />
      </div>

      {/* Cor */}
      <div className="flex flex-col gap-2">
        <Label>Cor *</Label>
        <ColorPicker
          value={color}
          onChange={setColor}
          disabled={isSubmitting}
        />
      </div>

      {/* Ícone */}
      <div className="flex flex-col gap-2">
        <Label>Ícone *</Label>
        <IconPicker
          value={icon}
          onChange={setIcon}
          disabled={isSubmitting}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="text-destructive text-sm font-medium"
          data-testid="category-form-error"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
        <Button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className={cn('w-full sm:w-auto')}
          data-testid="category-form-submit"
        >
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {isEditing ? 'Salvar alterações' : 'Criar categoria'}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
