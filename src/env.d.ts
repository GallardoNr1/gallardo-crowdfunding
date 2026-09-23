/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Usuario con sesión (cookies verificadas por el middleware) o null. */
    user: import('./lib/session-server').AuthUser | null;
    /** Espacio del usuario (o el que gestiona un superadmin con la cookie gc-admin-tenant). */
    tenant: import('./lib/supabase').Tenant | null;
    /** app_metadata.role = 'admin' o email en ADMIN_EMAILS: ve todos los espacios. */
    isSuperAdmin: boolean;
    /** El superadmin está gestionando un espacio ajeno. */
    adminTenantOverride: boolean;
  }
}
