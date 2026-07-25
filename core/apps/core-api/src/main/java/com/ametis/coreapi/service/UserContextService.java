package com.ametis.coreapi.service;

import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.repository.UserRepository;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserContextService {
  private final UserRepository userRepository;
  private final RegistrationProvisioningService registrationProvisioningService;

  public UserContextService(
      UserRepository userRepository,
      RegistrationProvisioningService registrationProvisioningService) {
    this.userRepository = userRepository;
    this.registrationProvisioningService = registrationProvisioningService;
  }

  @Transactional
  public UserEntity resolveOrCreateCurrentUser(Jwt jwt) {
    String subject = jwt.getSubject();
    UserEntity user = userRepository.findByExternalSubject(subject)
        .orElseGet(() -> {
          UserEntity createdUser = new UserEntity();
          createdUser.setId(UUID.randomUUID());
          createdUser.setExternalSubject(subject);
          createdUser.setEmail(resolveEmail(jwt));
          createdUser.setFullName(resolveName(jwt));
          createdUser.setStatus("ACTIVE");
          return userRepository.save(createdUser);
        });
    registrationProvisioningService.provisionInitialWorkspace(user);
    return user;
  }

  private String resolveEmail(Jwt jwt) {
    String email = jwt.getClaimAsString("email");
    if (email == null || email.isBlank()) {
      return jwt.getSubject() + "@ametis.local";
    }
    return email;
  }

  private String resolveName(Jwt jwt) {
    String name = jwt.getClaimAsString("name");
    if (name == null || name.isBlank()) {
      return "User " + jwt.getSubject();
    }
    return name;
  }
}
