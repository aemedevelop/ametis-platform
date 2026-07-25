package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.UserEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
  Optional<UserEntity> findByExternalSubject(String externalSubject);
  Optional<UserEntity> findByEmail(String email);
}
