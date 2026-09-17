package com.ametis.agentfactory.deployments;

import jakarta.validation.Valid;
import java.io.ByteArrayOutputStream;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.Duration;

/**
 * Consumo público de agentes vía despliegue. Sin JWT: la autorización la da el
 * propio canal (origen para WEB_CHAT).
 *
 * <p>Ruta: {@code /public/{publicId}} — identificador opaco e inmutable del
 * despliegue. La URL completa la compone la plataforma y se muestra en la vista.
 */
@RestController
@RequestMapping({"/v1/public", "/api/agent-factory/public"})
public class PublicDeploymentController {
  private final PublicDeploymentService publicDeploymentService;

  public PublicDeploymentController(PublicDeploymentService publicDeploymentService) {
    this.publicDeploymentService = publicDeploymentService;
  }

  @GetMapping("/{publicId}")
  public PublicDeploymentInfoResponse info(
      @PathVariable String publicId,
      @RequestHeader(value = "Origin", required = false) String origin) {
    return publicDeploymentService.info(publicId, origin);
  }

  @PostMapping("/{publicId}/query")
  public PublicQueryResponse query(
      @PathVariable String publicId,
      @Valid @RequestBody PublicQueryRequest request,
      @RequestHeader(value = "Origin", required = false) String origin) {
    return publicDeploymentService.query(publicId, origin, request.question());
  }

  @GetMapping("/{publicId}/avatar")
  public ResponseEntity<byte[]> avatar(@PathVariable String publicId) {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    PublicDeploymentService.AvatarDescriptor descriptor = publicDeploymentService.avatar(publicId, output);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(descriptor.mimeType()))
        .cacheControl(CacheControl.maxAge(Duration.ofMinutes(30)).cachePublic())
        .body(output.toByteArray());
  }
}
