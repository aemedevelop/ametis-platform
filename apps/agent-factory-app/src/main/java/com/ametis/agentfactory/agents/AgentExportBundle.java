package com.ametis.agentfactory.agents;

import com.ametis.agentfactory.deployments.AgentDeploymentExport;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Paquete portable de un agente completo (config + sus despliegues), pensado
 * para moverse entre entornos distintos (p. ej. "pre" -> producción) vía un
 * archivo .json descargado/subido a mano. Ver {@link AgentTransferService}.
 */
public record AgentExportBundle(
    int exportVersion,
    OffsetDateTime exportedAt,
    AgentExportData agent,
    List<AgentDeploymentExport> deployments) {}
