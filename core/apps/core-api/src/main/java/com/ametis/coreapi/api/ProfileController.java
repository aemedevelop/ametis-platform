package com.ametis.coreapi.api;

import com.ametis.coreapi.api.dto.ProfileResponse;
import com.ametis.coreapi.api.dto.UpdateProfileRequest;
import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.service.ProfileService;
import com.ametis.coreapi.service.UserContextService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@RestController
@RequestMapping("/v1/profile")
public class ProfileController {
  private final ProfileService profileService;
  private final UserContextService userContextService;

  public ProfileController(ProfileService profileService, UserContextService userContextService) {
    this.profileService = profileService;
    this.userContextService = userContextService;
  }

  @GetMapping
  public ProfileResponse getProfile(JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    return profileService.getProfile(currentUser);
  }

  @PutMapping
  public ProfileResponse updateProfile(
      @Valid @RequestBody UpdateProfileRequest request,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    return profileService.updateProfile(currentUser, request);
  }

  private UserEntity currentUser(Jwt jwt) {
    return userContextService.resolveOrCreateCurrentUser(jwt);
  }
}
