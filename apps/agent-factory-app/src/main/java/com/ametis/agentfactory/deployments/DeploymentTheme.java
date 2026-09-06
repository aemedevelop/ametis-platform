package com.ametis.agentfactory.deployments;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Personalización de apariencia del chat web de un despliegue. Todos los campos
 * son opcionales; el widget cae a sus valores por defecto para los que falten.
 * Solo se aplica al canal {@code WEB_CHAT}. Se configura en la pantalla de
 * apariencia ({@code PUT /deployments/{id}/appearance}), no en el alta.
 *
 * <p>{@code font} es una clave de un stack del sistema
 * ({@code system|serif|mono|humanist}); el widget la resuelve. El avatar llegará
 * con MinIO.
 */
public record DeploymentTheme(
    @Pattern(regexp = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", message = "error.deploymentThemeColorInvalid")
    String primaryColor,

    @Pattern(regexp = "^(system|serif|mono|humanist)$", message = "error.deploymentThemeFontInvalid")
    String font,

    @Pattern(regexp = "^(bottom-right|bottom-left)$", message = "error.deploymentThemePositionInvalid")
    String position,

    @Size(max = 80) String title,

    @Size(max = 160) String subtitle) {

  static DeploymentTheme from(AgentDeployment deployment) {
    return new DeploymentTheme(
        deployment.getThemePrimaryColor(),
        deployment.getThemeFont(),
        deployment.getThemePosition(),
        deployment.getThemeTitle(),
        deployment.getThemeSubtitle());
  }

  boolean isEmpty() {
    return blank(primaryColor) && blank(font) && blank(position)
        && blank(title) && blank(subtitle);
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
