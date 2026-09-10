package com.ametis.agentfactory.deployments;

import com.ametis.agentfactory.agents.AgentDefinition;
import java.util.List;

/**
 * Datos que el canal (widget web, cliente API) necesita al iniciar una sesión.
 * No expone identificadores internos ni el secreto del canal.
 */
public record PublicDeploymentInfoResponse(
    String deploymentName,
    String agentName,
    DeploymentChannelType channelType,
    String welcomeMessage,
    List<String> suggestedQuestions,
    int suggestedQuestionsCount,
    String suggestedQuestionsOrder,
    DeploymentTheme theme) {

  static PublicDeploymentInfoResponse from(AgentDeployment deployment, AgentDefinition agent) {
    DeploymentTheme theme = DeploymentTheme.from(deployment);
    return new PublicDeploymentInfoResponse(
        deployment.getName(),
        agent.getName(),
        deployment.getChannelType(),
        deployment.getWelcomeMessage(),
        agent.getSuggestedQuestions(),
        agent.getSuggestedQuestionsCount(),
        agent.getSuggestedQuestionsOrder(),
        theme.isEmpty() ? null : theme);
  }
}
