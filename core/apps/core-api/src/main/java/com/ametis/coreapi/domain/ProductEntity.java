package com.ametis.coreapi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "products")
public class ProductEntity {
  @Id
  private UUID id;

  @Column(nullable = false, unique = true, length = 40)
  private String code;

  @Column(name = "internal_name", nullable = false, length = 120)
  private String internalName;

  @Column(name = "public_name", nullable = false, length = 120)
  private String publicName;

  @Column(length = 300)
  private String description;

  @Column(name = "is_standalone")
  private Boolean isStandalone;

  @Column(name = "show_platform_brand")
  private Boolean showPlatformBrand;

  @Column(length = 120)
  private String subdomain;

  @Column(name = "is_active")
  private Boolean isActive;

  @Column(name = "created_at")
  private Instant createdAt;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public String getInternalName() {
    return internalName;
  }

  public void setInternalName(String internalName) {
    this.internalName = internalName;
  }

  public String getPublicName() {
    return publicName;
  }

  public void setPublicName(String publicName) {
    this.publicName = publicName;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Boolean getIsStandalone() {
    return isStandalone;
  }

  public void setIsStandalone(Boolean isStandalone) {
    this.isStandalone = isStandalone;
  }

  public Boolean getShowPlatformBrand() {
    return showPlatformBrand;
  }

  public void setShowPlatformBrand(Boolean showPlatformBrand) {
    this.showPlatformBrand = showPlatformBrand;
  }

  public String getSubdomain() {
    return subdomain;
  }

  public void setSubdomain(String subdomain) {
    this.subdomain = subdomain;
  }

  public Boolean getIsActive() {
    return isActive;
  }

  public void setIsActive(Boolean isActive) {
    this.isActive = isActive;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}
