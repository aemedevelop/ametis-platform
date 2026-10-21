package com.ametis.agentfactory.deployments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Entity
@Table(name = "agent_deployments")
public class AgentDeployment {
  private static final SecureRandom RANDOM = new SecureRandom();

  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private UUID agentId;

  /**
   * Identificador público y opaco del canal (32 hex). Es lo que viaja en la URL
   * de consumo ({@code /public/{publicId}}); no expone tenant ni namespace. No
   * cambia al renombrar el despliegue ni su slug; solo se modifica de forma
   * explícita con {@link #regeneratePublicId()}.
   */
  @Column(nullable = false, length = 48, unique = true)
  private String publicId;

  @Column(nullable = false, length = 120)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private DeploymentChannelType channelType;

  @Column(nullable = false, length = 80)
  private String deploymentSlug;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private DeploymentStatus status;

  @Column(length = 120)
  private String apiKey;

  @Column(length = 500)
  private String welcomeMessage;

  private Integer rateLimitPerMinute;

  private Integer rateLimitPerDay;

  @Column(length = 1000)
  private String allowedOrigins;

  // Apariencia del chat web (canal WEB_CHAT). Opcional; se configura en la
  // pantalla de apariencia, no en el alta. El widget cae a sus valores por
  // defecto para lo que no esté configurado.
  @Column(length = 9)
  private String themePrimaryColor;

  @Column(length = 40)
  private String themeFont;

  @Column(length = 20)
  private String themePosition;

  @Column(length = 80)
  private String themeTitle;

  @Column(length = 160)
  private String themeSubtitle;

  @Column(length = 300)
  private String themeAvatarKey;

  /** Estilo de animación de la burbuja flotante cerrada: none|bounce|float|ring. */
  @Column(length = 20)
  private String themeBubbleAnimation;

  private UUID createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected AgentDeployment() {}

  public static AgentDeployment create(
      UUID tenantId,
      UUID agentId,
      String name,
      DeploymentChannelType channelType,
      String deploymentSlug,
      String apiKey,
      String welcomeMessage,
      Integer rateLimitPerMinute,
      Integer rateLimitPerDay,
      String allowedOrigins,
      UUID createdBy) {
    AgentDeployment deployment = new AgentDeployment();
    deployment.id = UUID.randomUUID();
    deployment.publicId = generatePublicId();
    deployment.tenantId = tenantId;
    deployment.agentId = agentId;
    deployment.name = name;
    deployment.channelType = channelType;
    deployment.deploymentSlug = deploymentSlug;
    // Nace en borrador: el usuario configura todo (orígenes, apariencia,
    // límites) y publica de forma explícita con el switch en el listado.
    deployment.status = DeploymentStatus.INACTIVE;
    deployment.apiKey = apiKey;
    deployment.welcomeMessage = welcomeMessage;
    deployment.rateLimitPerMinute = rateLimitPerMinute;
    deployment.rateLimitPerDay = rateLimitPerDay;
    deployment.allowedOrigins = allowedOrigins;
    deployment.createdBy = createdBy;
    deployment.createdAt = OffsetDateTime.now();
    deployment.updatedAt = deployment.createdAt;
    return deployment;
  }

  public void update(
      UUID agentId,
      String name,
      DeploymentChannelType channelType,
      String deploymentSlug,
      DeploymentStatus status,
      String apiKey,
      String welcomeMessage,
      Integer rateLimitPerMinute,
      Integer rateLimitPerDay,
      String allowedOrigins) {
    this.agentId = agentId;
    this.name = name;
    this.channelType = channelType;
    this.deploymentSlug = deploymentSlug;
    this.status = status;
    this.apiKey = apiKey;
    this.welcomeMessage = welcomeMessage;
    this.rateLimitPerMinute = rateLimitPerMinute;
    this.rateLimitPerDay = rateLimitPerDay;
    this.allowedOrigins = allowedOrigins;
    updatedAt = OffsetDateTime.now();
  }

  /** Apariencia del chat web. Se guarda desde la pantalla de apariencia. */
  public void applyAppearance(DeploymentTheme theme) {
    this.themePrimaryColor = normalize(theme == null ? null : theme.primaryColor());
    this.themeFont = normalize(theme == null ? null : theme.font());
    this.themePosition = normalize(theme == null ? null : theme.position());
    this.themeTitle = normalize(theme == null ? null : theme.title());
    this.themeSubtitle = normalize(theme == null ? null : theme.subtitle());
    this.themeBubbleAnimation = normalize(theme == null ? null : theme.bubbleAnimation());
    updatedAt = OffsetDateTime.now();
  }

  private static String normalize(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  /**
   * Fuerza el estado a publicado inmediatamente tras crear. Solo lo usa el
   * aprovisionamiento del despliegue de prueba fijo del workspace: como su
   * único propósito es servir el widget real dentro de la propia app, no
   * tiene sentido que nazca en borrador esperando publicación manual.
   */
  void activate() {
    status = DeploymentStatus.ACTIVE;
    updatedAt = OffsetDateTime.now();
  }

  /**
   * Reapunta el despliegue de prueba fijo a otro agente (p. ej. el que el
   * usuario tiene seleccionado en ese momento en el formulario de alta). El
   * {@code publicId} no cambia, así que el widget ya cargado en pantalla
   * sigue funcionando sin recargar el script.
   */
  void repointAgent(UUID agentId) {
    this.agentId = agentId;
    updatedAt = OffsetDateTime.now();
  }

  /**
   * Sincroniza los orígenes permitidos del despliegue de prueba fijo con el
   * origen actual de la plataforma. Sin esto, si el despliegue se llegó a
   * crear antes de que {@code AGENT_FACTORY_WEB_URL} estuviera bien
   * configurado (o si cambia de dominio más adelante), se quedaría para
   * siempre con el origen viejo guardado y el widget dejaría de responder
   * (403 por chequeo de Origin) sin que se note por qué.
   */
  void resyncAllowedOrigins(String allowedOrigins) {
    this.allowedOrigins = allowedOrigins;
    updatedAt = OffsetDateTime.now();
  }

  /** Rota el identificador público (p. ej. si se filtró el que estaba en uso). */
  public void regeneratePublicId() {
    publicId = generatePublicId();
    updatedAt = OffsetDateTime.now();
  }

  private static String generatePublicId() {
    byte[] bytes = new byte[16];
    RANDOM.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getAgentId() { return agentId; }
  public String getPublicId() { return publicId; }
  public String getName() { return name; }
  public DeploymentChannelType getChannelType() { return channelType; }
  public String getDeploymentSlug() { return deploymentSlug; }
  public DeploymentStatus getStatus() { return status; }
  public String getApiKey() { return apiKey; }
  public String getWelcomeMessage() { return welcomeMessage; }
  public Integer getRateLimitPerMinute() { return rateLimitPerMinute; }
  public Integer getRateLimitPerDay() { return rateLimitPerDay; }
  public String getAllowedOrigins() { return allowedOrigins; }
  public String getThemePrimaryColor() { return themePrimaryColor; }
  public String getThemeFont() { return themeFont; }
  public String getThemePosition() { return themePosition; }
  public String getThemeTitle() { return themeTitle; }
  public String getThemeSubtitle() { return themeSubtitle; }
  public String getThemeAvatarKey() { return themeAvatarKey; }
  public String getThemeBubbleAnimation() { return themeBubbleAnimation; }

  public void applyAvatar(String avatarKey) {
    this.themeAvatarKey = avatarKey;
    updatedAt = OffsetDateTime.now();
  }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
