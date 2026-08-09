package com.ametis.agentfactory.drive;

import com.ametis.agentfactory.access.AccessGuard;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1/drive", "/api/agent-factory/drive"})
public class DriveConnectionController {
  private final AccessGuard accessGuard;
  private final GoogleDriveOAuthService oauthService;

  public DriveConnectionController(AccessGuard accessGuard, GoogleDriveOAuthService oauthService) {
    this.accessGuard = accessGuard;
    this.oauthService = oauthService;
  }

  @GetMapping("/connection")
  public DriveConnectionResponse connection(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return oauthService.status(tenantId);
  }

  @PostMapping("/connection/authorize")
  public DriveAuthorizationResponse authorize(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    return oauthService.authorize(tenantId, accessGuard.currentUserId(authentication));
  }

  @GetMapping("/oauth/callback")
  public ResponseEntity<Void> callback(
      @RequestParam(required = false) String state,
      @RequestParam(required = false) String code,
      @RequestParam(required = false) String error) {
    URI redirect = oauthService.complete(state, code, error);
    return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, redirect.toString()).build();
  }
}
