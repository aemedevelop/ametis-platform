package com.ametis.coreapi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "plan_products")
public class PlanProductEntity {
  @Id
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "plan_id")
  private PlanEntity plan;

  @ManyToOne(optional = false)
  @JoinColumn(name = "product_id")
  private ProductEntity product;

  @Column(name = "is_active")
  private Boolean isActive;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public PlanEntity getPlan() {
    return plan;
  }

  public void setPlan(PlanEntity plan) {
    this.plan = plan;
  }

  public ProductEntity getProduct() {
    return product;
  }

  public void setProduct(ProductEntity product) {
    this.product = product;
  }

  public Boolean getIsActive() {
    return isActive;
  }

  public void setIsActive(Boolean isActive) {
    this.isActive = isActive;
  }
}
