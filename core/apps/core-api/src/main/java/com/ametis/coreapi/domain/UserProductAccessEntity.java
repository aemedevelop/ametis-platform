package com.ametis.coreapi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_product_access")
public class UserProductAccessEntity {
  @Id
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "user_id")
  private UserEntity user;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @ManyToOne(optional = false)
  @JoinColumn(name = "product_id")
  private ProductEntity product;

  @ManyToOne(optional = false)
  @JoinColumn(name = "role_id")
  private RoleEntity role;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "granted_at")
  private Instant grantedAt;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UserEntity getUser() {
    return user;
  }

  public void setUser(UserEntity user) {
    this.user = user;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public void setTenantId(UUID tenantId) {
    this.tenantId = tenantId;
  }

  public ProductEntity getProduct() {
    return product;
  }

  public void setProduct(ProductEntity product) {
    this.product = product;
  }

  public RoleEntity getRole() {
    return role;
  }

  public void setRole(RoleEntity role) {
    this.role = role;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Instant getGrantedAt() {
    return grantedAt;
  }

  public void setGrantedAt(Instant grantedAt) {
    this.grantedAt = grantedAt;
  }
}
