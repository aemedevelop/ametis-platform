package com.ametis.coreapi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "product_branding")
public class ProductBrandingEntity {
  @Id
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "product_id")
  private ProductEntity product;

  @Column(name = "logo_url", length = 400)
  private String logoUrl;

  @Column(name = "theme_config", columnDefinition = "text")
  private String themeConfig;

  @Column(name = "primary_color", length = 20)
  private String primaryColor;

  @Column(name = "favicon_url", length = 400)
  private String faviconUrl;

  @Column(name = "domain_mode", length = 40)
  private String domainMode;

  @Column(name = "custom_domain_enabled")
  private Boolean customDomainEnabled;

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public ProductEntity getProduct() {
    return product;
  }

  public void setProduct(ProductEntity product) {
    this.product = product;
  }

  public String getLogoUrl() {
    return logoUrl;
  }

  public void setLogoUrl(String logoUrl) {
    this.logoUrl = logoUrl;
  }

  public String getThemeConfig() {
    return themeConfig;
  }

  public void setThemeConfig(String themeConfig) {
    this.themeConfig = themeConfig;
  }

  public String getPrimaryColor() {
    return primaryColor;
  }

  public void setPrimaryColor(String primaryColor) {
    this.primaryColor = primaryColor;
  }

  public String getFaviconUrl() {
    return faviconUrl;
  }

  public void setFaviconUrl(String faviconUrl) {
    this.faviconUrl = faviconUrl;
  }

  public String getDomainMode() {
    return domainMode;
  }

  public void setDomainMode(String domainMode) {
    this.domainMode = domainMode;
  }

  public Boolean getCustomDomainEnabled() {
    return customDomainEnabled;
  }

  public void setCustomDomainEnabled(Boolean customDomainEnabled) {
    this.customDomainEnabled = customDomainEnabled;
  }
}
