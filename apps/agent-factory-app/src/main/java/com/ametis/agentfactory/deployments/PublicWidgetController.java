package com.ametis.agentfactory.deployments;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Sirve el bundle del widget de chat embebible (ver {@code frontend/ametis-widget}).
 *
 * <p>Se copia a mano a {@code resources/widget/ametis-widget.js} tras cada
 * build (no hay pipeline que lo automatice todavía); este controlador solo lo
 * expone bajo el mismo prefijo público que el resto del consumo sin JWT.
 */
@RestController
@RequestMapping({"/v1/public", "/api/agent-factory/public"})
public class PublicWidgetController {
  private static final String WIDGET_RESOURCE = "widget/ametis-widget.js";

  @GetMapping(value = "/widget.js", produces = "application/javascript")
  public ResponseEntity<Resource> widget() {
    Resource resource = new ClassPathResource(WIDGET_RESOURCE);
    if (!resource.exists()) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.NOT_FOUND,
          "Widget bundle not built yet (frontend/ametis-widget: npm run build:copy)");
    }
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("application/javascript"))
        .cacheControl(CacheControl.maxAge(java.time.Duration.ofMinutes(10)).cachePublic())
        .body(resource);
  }
}
