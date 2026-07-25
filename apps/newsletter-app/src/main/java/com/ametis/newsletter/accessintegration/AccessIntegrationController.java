package com.ametis.newsletter.accessintegration;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class AccessIntegrationController {
  private final AccessIntegrationService accessIntegrationService;

  public AccessIntegrationController(AccessIntegrationService accessIntegrationService) {
    this.accessIntegrationService = accessIntegrationService;
  }

  @GetMapping({"/v1/me/context", "/api/newsletter/me/context"})
  public AccessContext context() {
    return accessIntegrationService.getContext();
  }

  @GetMapping({"/v1/me/access", "/api/newsletter/me/access"})
  public AccessIntegrationService.AccessDecision access(
      @RequestParam(name = "permission", defaultValue = AccessIntegrationService.DEFAULT_PERMISSION) String permission) {
    return accessIntegrationService.checkAccess(permission);
  }
}
