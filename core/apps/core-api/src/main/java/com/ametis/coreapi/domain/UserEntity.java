package com.ametis.coreapi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserEntity {
  @Id
  private UUID id;

  @Column(name = "external_subject", nullable = false, unique = true, length = 128)
  private String externalSubject;

  @Column(nullable = false, unique = true, length = 320)
  private String email;

  @Column(name = "full_name", nullable = false, length = 200)
  private String fullName;

  @Column(nullable = false, length = 32)
  private String status;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getExternalSubject() {
    return externalSubject;
  }

  public void setExternalSubject(String externalSubject) {
    this.externalSubject = externalSubject;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
