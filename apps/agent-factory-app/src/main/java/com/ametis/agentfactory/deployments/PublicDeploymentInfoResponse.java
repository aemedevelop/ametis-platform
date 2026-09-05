package com.ametis.agentfactory.deployments;

/**
 * Datos que el canal (widget web, cliente API) necesita al iniciar una sesión.
 * No expone identificadores internos ni el secreto del canal.
 */
public record PublicDeploymentInfoResponse(
    String deploymentName,
    String agentName,
    DeploymentChannelType channelType,
    String welcomeMessage) {

  static PublicDeploymentInfoResponse from(AgentDeployment deployment, String agentName) {
    return new PublicDeploymentInfoResponse(
        deployment.getName(),
        agentName,
        deployment.getChannelType(),
        deployment.getWelcomeMessage());
  }
}
