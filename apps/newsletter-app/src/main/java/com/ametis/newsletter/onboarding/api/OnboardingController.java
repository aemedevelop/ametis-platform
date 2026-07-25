package com.ametis.newsletter.onboarding.api;

import com.ametis.newsletter.onboarding.service.OnboardingService;
import jakarta.validation.Valid;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/newsletter/onboarding")
public class OnboardingController {
  private final OnboardingService onboardingService;

  public OnboardingController(OnboardingService onboardingService) {
    this.onboardingService = onboardingService;
  }

  @GetMapping("/status")
  public OnboardingStatusResponse status(JwtAuthenticationToken authentication) {
    return onboardingService.status(bearer(authentication.getToken()));
  }

  @PostMapping("/start")
  public OnboardingStatusResponse start(
      @Valid @RequestBody OnboardingStartRequest request,
      JwtAuthenticationToken authentication) {
    return onboardingService.start(bearer(authentication.getToken()), request);
  }

  private String bearer(Jwt jwt) {
    return jwt.getTokenValue();
  }
}
