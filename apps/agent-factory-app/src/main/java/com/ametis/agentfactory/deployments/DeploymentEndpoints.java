package com.ametis.agentfactory.deployments;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Deriva las URLs consumibles de un despliegue a partir de su {@code publicId} y
 * de la base pública configurada por entorno. El gestor nunca escribe estas
 * URLs a mano: se calculan aquí y se devuelven en la respuesta.
 */
@Component
public class DeploymentEndpoints {
  private final String baseUrl;
  private final String widgetUrl;

  public DeploymentEndpoints(
      @Value("${agent-factory.public.base-url}") String baseUrl,
      @Value("${agent-factory.public.widget-url}") String widgetUrl) {
    this.baseUrl = trimTrailingSlash(baseUrl);
    this.widgetUrl = widgetUrl == null ? "" : widgetUrl.trim();
  }

  public DeploymentEndpointInfo describe(AgentDeployment deployment) {
    String endpointUrl = baseUrl + "/" + deployment.getPublicId();
    String queryUrl = endpointUrl + "/query";
    String embedSnippet = deployment.getChannelType() == DeploymentChannelType.WEB_CHAT
        ? "<script src=\"" + widgetUrl + "\" data-deployment=\"" + deployment.getPublicId()
            + "\" data-endpoint=\"" + baseUrl + "\" async></script>"
        : null;
    String avatarUrl = deployment.getThemeAvatarKey() == null || deployment.getThemeAvatarKey().isBlank()
        ? null
        : endpointUrl + "/avatar";
    return new DeploymentEndpointInfo(deployment.getPublicId(), endpointUrl, queryUrl, embedSnippet, avatarUrl);
  }

  private static String trimTrailingSlash(String value) {
    String clean = value == null ? "" : value.trim();
    while (clean.endsWith("/")) {
      clean = clean.substring(0, clean.length() - 1);
    }
    return clean;
  }

  public record DeploymentEndpointInfo(
      String publicId, String endpointUrl, String queryUrl, String embedSnippet, String avatarUrl) {}
}
