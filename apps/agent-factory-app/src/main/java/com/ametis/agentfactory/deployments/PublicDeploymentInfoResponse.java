package com.ametis.agentfactory.deployments;

/**
 * Datos que el canal (widget web, cliente API) necesita al iniciar una sesión.
 * No expone identificadores internos ni el secreto del canal.
 */
public record PublicDeploymentInfoResponse(
    String deploymentName,
    String agentName,
    DeploymentChannelType channelType,
    String welcomeMessage,
    DeploymentTheme theme) {

  static PublicDeploymentInfoResponse from(AgentDeployment deployment, String agentName) {
    DeploymentTheme theme = DeploymentTheme.from(deployment);
    return new PublicDeploymentInfoResponse(
        deployment.getName(),
        agentName,
        deployment.getChannelType(),
        deployment.getWelcomeMessage(),
        theme.isEmpty() ? null : theme);
  }
}
