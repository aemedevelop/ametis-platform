package com.ametis.agentfactory.deployments;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Serializa la lista de orígenes permitidos de un despliegue como texto plano
 * (un origen por línea) y la reconstruye para las respuestas de la API.
 *
 * <p>Los orígenes se guardan normalizados para que la futura validación de
 * consumo pueda comparar contra el header {@code Origin} sin ambigüedades.
 */
final class DeploymentOrigins {
  private static final int MAX_ORIGINS = 20;

  private DeploymentOrigins() {}

  static String normalize(List<String> origins) {
    if (origins == null || origins.isEmpty()) {
      return null;
    }
    Set<String> unique = new LinkedHashSet<>();
    for (String origin : origins) {
      String cleaned = cleanOrigin(origin);
      if (cleaned != null) {
        unique.add(cleaned);
      }
      if (unique.size() >= MAX_ORIGINS) {
        break;
      }
    }
    return unique.isEmpty() ? null : String.join("\n", unique);
  }

  /**
   * Indica si un origen entrante está autorizado para el despliegue.
   *
   * <p>Seguro por defecto: sin orígenes configurados el canal <b>no sirve a
   * nadie</b>. El propietario debe declarar explícitamente cada dominio
   * (esquema + host [+ puerto]) donde se embeberá el widget. El header
   * {@code Origin} debe coincidir con uno de ellos tras normalizar.
   */
  static boolean isAllowed(String stored, String requestOrigin) {
    List<String> allowed = parse(stored);
    if (allowed.isEmpty()) {
      return false;
    }
    String origin = cleanOrigin(requestOrigin);
    return origin != null && allowed.contains(origin);
  }

  static List<String> parse(String stored) {
    List<String> origins = new ArrayList<>();
    if (stored == null || stored.isBlank()) {
      return origins;
    }
    for (String part : stored.split("[\\r\\n,]+")) {
      String cleaned = cleanOrigin(part);
      if (cleaned != null && !origins.contains(cleaned)) {
        origins.add(cleaned);
      }
    }
    return origins;
  }

  private static String cleanOrigin(String value) {
    if (value == null) {
      return null;
    }
    String cleaned = value.trim().toLowerCase(Locale.ROOT);
    while (cleaned.endsWith("/")) {
      cleaned = cleaned.substring(0, cleaned.length() - 1);
    }
    return cleaned.isBlank() ? null : cleaned;
  }
}
