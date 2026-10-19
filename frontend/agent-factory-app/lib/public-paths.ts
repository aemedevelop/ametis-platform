// Zonas que viven fuera de la carcasa y de la sesión de la plataforma.
// Se compara el segmento completo: Next.js normaliza "/client/" a "/client",
// y un startsWith("/client/") lo dejaba pasar a la zona protegida.
function inSection(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(`${section}/`);
}

/** Zona del cliente final (/client/*): nunca debe mostrar nada de la plataforma. */
export function isClientPath(pathname: string): boolean {
  return inSection(pathname, "/client");
}

/** Rutas a las que SessionGuard no exige sesión de consultor. */
export function isPublicPath(pathname: string): boolean {
  return inSection(pathname, "/auth") || isClientPath(pathname);
}
