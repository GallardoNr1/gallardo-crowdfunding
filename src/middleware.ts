import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith('/admin')) return next();
  if (pathname === '/admin/login') return next();

  const token = context.cookies.get('sb-access-token')?.value;

  if (!token) {
    return context.redirect('/admin/login');
  }

  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      context.cookies.delete('sb-access-token', { path: '/' });
      return context.redirect('/admin/login');
    }

    context.locals.user = user;
  } catch {
    return context.redirect('/admin/login');
  }

  return next();
});
