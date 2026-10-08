package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.agents.AgentStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Fila del listado de analíticas: a diferencia del listado de Agentes (que es
 * por negocio activo), este cruza todos los negocios del workspace, por eso
 * cada agente lleva el negocio al que pertenece.
 */
public record AnalyticsAgentResponse(
    UUID id,
    UUID businessId,
    String businessName,
    String name,
    String description,
    AgentStatus status,
    OffsetDateTime updatedAt,
    int knowledgeBaseCount,
    List<String> knowledgeBaseNames) {}
