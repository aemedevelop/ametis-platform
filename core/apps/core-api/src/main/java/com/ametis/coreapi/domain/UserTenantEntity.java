package com.ametis.coreapi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_tenants")
public class UserTenantEntity {
  @EmbeddedId
  private UserTenantId id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "role_id")
  private RoleEntity role;

  @Column(name = "membership_status", nullable = false, length = 32)
  private String membershipStatus;

  public UserTenantId getId() {
    return id;
  }

  public void setId(UserTenantId id) {
    this.id = id;
  }

  public RoleEntity getRole() {
    return role;
  }

  public void setRole(RoleEntity role) {
    this.role = role;
  }

  public String getMembershipStatus() {
    return membershipStatus;
  }

  public void setMembershipStatus(String membershipStatus) {
    this.membershipStatus = membershipStatus;
  }
}
