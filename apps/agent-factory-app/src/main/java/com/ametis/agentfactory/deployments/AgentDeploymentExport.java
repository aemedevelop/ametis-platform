package com.ametis.agentfactory.deployments;

import java.util.List;

/**
 * Subconjunto exportable de un despliegue -- pensado para viajar dentro del
 * paquete de exportación de un agente entre entornos (p. ej. de "pre" a
 * producción). No incluye {@code publicId}, {@code apiKey} ni el avatar
 * (referencia a un storage específico del tenant de origen): esos datos son
 * propios del entorno donde se crea el despliegue, no configuración a copiar.
 */
public record AgentDeploymentExport(
    String name,
    DeploymentChannelType channelType,
    String deploymentSlug,
    String welcomeMessage,
    Integer rateLimitPerMinute,
    Integer rateLimitPerDay,
    List<String> allowedOrigins,
    DeploymentTheme theme) {

  static AgentDeploymentExport from(AgentDeployment deployment) {
    boolean hasTheme = deployment.getThemePrimaryColor() != null
        || deployment.getThemeFont() != null
        || deployment.getThemePosition() != null
        || deployment.getThemeTitle() != null
        || deployment.getThemeSubtitle() != null
        || deployment.getThemeBubbleAnimation() != null;
    DeploymentTheme theme = !hasTheme ? null : new DeploymentTheme(
        deployment.getThemePrimaryColor(),
        deployment.getThemeFont(),
        deployment.getThemePosition(),
        deployment.getThemeTitle(),
        deployment.getThemeSubtitle(),
        null, // el avatar vive en el storage del tenant de origen; no se exporta.
        deployment.getThemeBubbleAnimation());
    return new AgentDeploymentExport(
        deployment.getName(),
        deployment.getChannelType(),
        deployment.getDeploymentSlug(),
        deployment.getWelcomeMessage(),
        deployment.getRateLimitPerMinute(),
        deployment.getRateLimitPerDay(),
        DeploymentOrigins.parse(deployment.getAllowedOrigins()),
        theme);
  }
}
