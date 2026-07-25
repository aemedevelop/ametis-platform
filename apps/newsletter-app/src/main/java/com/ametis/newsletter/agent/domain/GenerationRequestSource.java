package com.ametis.newsletter.agent.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "generation_request_sources", schema = "newsletter")
public class GenerationRequestSource extends TenantScopedEntity {
  @Column(name = "generation_request_id", nullable = false)
  private UUID generationRequestId;

  @Column(name = "source_id", nullable = false)
  private UUID sourceId;

  @Column(name = "priority_order", nullable = false)
  private int priorityOrder;

  public UUID getGenerationRequestId() {
    return generationRequestId;
  }

  public void setGenerationRequestId(UUID generationRequestId) {
    this.generationRequestId = generationRequestId;
  }

  public UUID getSourceId() {
    return sourceId;
  }

  public void setSourceId(UUID sourceId) {
    this.sourceId = sourceId;
  }

  public int getPriorityOrder() {
    return priorityOrder;
  }

  public void setPriorityOrder(int priorityOrder) {
    this.priorityOrder = priorityOrder;
  }
}
