// Vista previa de un tema en la página pública: `?theme=<id>` solo para quien gestiona el
// proyecto (dueño del espacio o superadmin). No se guarda nada.
import { isThemeId, type ThemeId } from './themes';

export function resolvePreviewTheme(
  param: string | null,
  canManage: boolean
): ThemeId | null {
  if (!canManage || !param || !isThemeId(param)) return null;
  return param;
}
