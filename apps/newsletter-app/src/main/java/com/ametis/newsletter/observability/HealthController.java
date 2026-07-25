package com.ametis.newsletter.observability;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  @GetMapping({"/health", "/api/newsletter/health"})
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }
}
