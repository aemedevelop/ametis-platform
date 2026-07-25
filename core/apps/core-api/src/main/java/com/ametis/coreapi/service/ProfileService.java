package com.ametis.coreapi.service;

import com.ametis.coreapi.api.dto.ProfileResponse;
import com.ametis.coreapi.api.dto.UpdateProfileRequest;
import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
  private final UserRepository userRepository;
  private final AuthService authService;

  public ProfileService(UserRepository userRepository, AuthService authService) {
    this.userRepository = userRepository;
    this.authService = authService;
  }

  @Transactional(readOnly = true)
  public ProfileResponse getProfile(UserEntity user) {
    return toResponse(user);
  }

  @Transactional
  public ProfileResponse updateProfile(UserEntity user, UpdateProfileRequest request) {
    String fullName = request.fullName().trim();
    user.setFullName(fullName);
    userRepository.save(user);
    authService.updateIdentityProfile(user, fullName);
    return toResponse(user);
  }

  private ProfileResponse toResponse(UserEntity user) {
    return new ProfileResponse(user.getId(), user.getEmail(), user.getFullName());
  }
}
