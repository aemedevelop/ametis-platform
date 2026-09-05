package com.ametis.coreapi.service;

import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.repository.UserRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserContextService {
  private static final Logger LOGGER = LoggerFactory.getLogger(UserContextService.class);

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
    UserEntity user = userRepository.findByExternalSubject(subject).orElseGet(() -> createOrRelink(jwt, subject));
    registrationProvisioningService.provisionInitialWorkspace(user);
    return user;
  }

  /**
   * No hay usuario con este subject de Keycloak. Si ya existe una fila con el mismo
   * correo (identidad de Keycloak recreada, cuenta re-vinculada tras perder el
   * usuario original, etc.), se re-apunta al subject nuevo en vez de intentar crear
   * una fila duplicada y chocar con la restricción única de email.
   */
  private UserEntity createOrRelink(Jwt jwt, String subject) {
    String email = resolveEmail(jwt);
    return userRepository.findByEmail(email)
        .map(existing -> {
          LOGGER.warn(
              "Re-vinculando usuario {} (email={}) de subject {} a {}: el subject anterior ya no existe en el IdP.",
              existing.getId(), email, existing.getExternalSubject(), subject);
          existing.setExternalSubject(subject);
          return userRepository.save(existing);
        })
        .orElseGet(() -> {
          UserEntity createdUser = new UserEntity();
          createdUser.setId(UUID.randomUUID());
          createdUser.setExternalSubject(subject);
          createdUser.setEmail(email);
          createdUser.setFullName(resolveName(jwt));
          createdUser.setStatus("ACTIVE");
          return userRepository.save(createdUser);
        });
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
