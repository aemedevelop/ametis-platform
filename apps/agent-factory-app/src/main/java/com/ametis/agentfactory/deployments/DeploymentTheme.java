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
 * ({@code system|serif|mono|humanist}); el widget la resuelve. {@code avatarUrl}
 * es de solo lectura: la sube el cliente vía
 * {@code POST /deployments/{id}/appearance/avatar} (guardado como referencia en
 * el almacenamiento configurado, nunca como data URI) y se calcula aquí, no se
 * acepta en el cuerpo de esta petición.
 */
public record DeploymentTheme(
    @Pattern(regexp = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", message = "error.deploymentThemeColorInvalid")
    String primaryColor,

    @Pattern(regexp = "^(system|serif|mono|humanist)$", message = "error.deploymentThemeFontInvalid")
    String font,

    @Pattern(regexp = "^(bottom-right|bottom-left)$", message = "error.deploymentThemePositionInvalid")
    String position,

    @Size(max = 80) String title,

    @Size(max = 160) String subtitle,

    String avatarUrl,

    @Pattern(regexp = "^(none|bounce|float|ring)$", message = "error.deploymentThemeBubbleAnimationInvalid")
    String bubbleAnimation) {

  static DeploymentTheme from(AgentDeployment deployment, String avatarUrl) {
    return new DeploymentTheme(
        deployment.getThemePrimaryColor(),
        deployment.getThemeFont(),
        deployment.getThemePosition(),
        deployment.getThemeTitle(),
        deployment.getThemeSubtitle(),
        avatarUrl,
        deployment.getThemeBubbleAnimation());
  }

  boolean isEmpty() {
    return blank(primaryColor) && blank(font) && blank(position)
        && blank(title) && blank(subtitle) && blank(avatarUrl) && blank(bubbleAnimation);
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
