// Borrador de IA → valores de los campos del formulario de alta.
// Sin dependencias de servidor ni de Zod: lo importa también el script del navegador.
import type { ProjectDraft } from './project-draft';

/** Valor por campo del formulario (`name` del input). Los booleanos son checkboxes. */
export type DraftFormValues = Record<string, string | boolean>;

const num = (v: number | null) => (v === null ? '' : String(v));
const str = (v: string | null) => v ?? '';

/**
 * Devuelve solo los campos que existen en el formulario. Los niveles y las notas se
 * muestran aparte; el teléfono de Bizum nunca lo rellena la IA.
 */
export function draftToFormValues(draft: ProjectDraft): DraftFormValues {
  return {
    project_name: draft.project_name,
    slug: draft.slug,
    project_description: draft.project_description,
    campaign_mode: draft.campaign_mode,
    target_amount: num(draft.target_amount),
    currency: draft.currency,
    start_date: str(draft.start_date),
    end_date: str(draft.end_date),
    base_amount: num(draft.base_amount),
    base_label: str(draft.base_label),
    allow_custom_amount: draft.allow_custom_amount,
    min_custom_amount: num(draft.min_custom_amount),
    bizum_concept: str(draft.bizum_concept),
    pageTitle: draft.pageTitle,
    pageSubtitle: draft.pageSubtitle,
    productUrl: str(draft.productUrl),
    progressTitle: draft.progressTitle,
    contributorsTitle: draft.contributorsTitle,
    photoSectionTitle: draft.photoSectionTitle,
    mainMessage_message: draft.mainMessage_message,
    mainMessage_signature: draft.mainMessage_signature,
    mainMessage_familyName: draft.mainMessage_familyName,
    mainMessage_date: draft.mainMessage_date,
    cta_icon: draft.cta_icon,
    cta_title: draft.cta_title,
    cta_text: draft.cta_text,
    theme: draft.theme,
  };
}
