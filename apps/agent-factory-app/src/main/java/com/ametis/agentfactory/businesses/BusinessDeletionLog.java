package com.ametis.agentfactory.businesses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "business_deletion_log")
public class BusinessDeletionLog {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private UUID businessId;

  @Column(nullable = false, length = 120)
  private String businessName;

  @Column(nullable = false, length = 80)
  private String businessSlug;

  @Column(nullable = false)
  private int agentsDeleted;

  @Column(nullable = false)
  private int knowledgeBasesDeleted;

  @Column(nullable = false)
  private int documentsDeleted;

  private UUID deletedBy;

  @Column(nullable = false)
  private OffsetDateTime deletedAt;

  protected BusinessDeletionLog() {}

  public static BusinessDeletionLog of(
      Business business, int agentsDeleted, int knowledgeBasesDeleted, int documentsDeleted, UUID deletedBy) {
    BusinessDeletionLog log = new BusinessDeletionLog();
    log.id = UUID.randomUUID();
    log.tenantId = business.getTenantId();
    log.businessId = business.getId();
    log.businessName = business.getName();
    log.businessSlug = business.getSlug();
    log.agentsDeleted = agentsDeleted;
    log.knowledgeBasesDeleted = knowledgeBasesDeleted;
    log.documentsDeleted = documentsDeleted;
    log.deletedBy = deletedBy;
    log.deletedAt = OffsetDateTime.now();
    return log;
  }
}
