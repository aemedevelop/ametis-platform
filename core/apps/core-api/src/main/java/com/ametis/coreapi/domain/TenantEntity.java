package com.ametis.coreapi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "tenants")
public class TenantEntity {
  @Id
  private UUID id;

  @Column(nullable = false, unique = true, length = 80)
  private String slug;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(name = "business_profile", nullable = false, length = 40)
  private String businessProfile;

  @Column(nullable = false, length = 32)
  private String status;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getSlug() {
    return slug;
  }

  public void setSlug(String slug) {
    this.slug = slug;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getBusinessProfile() {
    return businessProfile;
  }

  public void setBusinessProfile(String businessProfile) {
    this.businessProfile = businessProfile;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
