package com.ametis.agentfactory.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.AccessRequest;
import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.AccessResponse;
import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.LoginRequest;
import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.SessionResponse;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class AgentAnalyticsAccessServiceTest {
  private final UUID tenantId = UUID.randomUUID();
  private final UUID agentId = UUID.randomUUID();
  private final AtomicReference<AgentAnalyticsAccess> stored = new AtomicReference<>();
  private AgentAnalyticsAccessService service;

  @BeforeEach
  void setUp() {
    AgentAnalyticsAccessRepository repository = mock(AgentAnalyticsAccessRepository.class);
    when(repository.save(any())).thenAnswer(invocation -> {
      stored.set(invocation.getArgument(0));
      return invocation.getArgument(0);
    });
    when(repository.findByTenantIdAndAgentId(tenantId, agentId)).thenAnswer(invocation -> Optional.ofNullable(stored.get()));
    when(repository.findByPublicId(any())).thenAnswer(invocation -> Optional.ofNullable(stored.get())
        .filter(access -> access.getPublicId().equals(invocation.getArgument(0))));
    AgentAnalyticsService analyticsService = mock(AgentAnalyticsService.class);
    when(analyticsService.agentName(tenantId, agentId)).thenReturn("test");
    service = new AgentAnalyticsAccessService(repository, analyticsService, new AnalyticsAccessTokens(""));
  }

  @Test
  void publishedAccessAllowsLoginAndAuthorizesItsSession() {
    AccessResponse access = service.save(tenantId, agentId, new AccessRequest(true, "cliente", "secreto-123"));

    SessionResponse session = service.login(access.publicId(), new LoginRequest(" Cliente ", "secreto-123"));

    assertThat(session.agentName()).isEqualTo("test");
    assertThat(service.authorize(access.publicId(), session.token()).agentId()).isEqualTo(agentId);
    assertThat(stored.get().getPasswordHash()).doesNotContain("secreto-123");
  }

  @Test
  void firstSaveRequiresPasswordAndLaterSavesKeepIt() {
    assertThatThrownBy(() -> service.save(tenantId, agentId, new AccessRequest(true, "cliente", "")))
        .hasMessageContaining("error.analyticsAccessPasswordInvalid");

    AccessResponse access = service.save(tenantId, agentId, new AccessRequest(true, "cliente", "secreto-123"));
    service.save(tenantId, agentId, new AccessRequest(true, "otro", ""));

    assertThat(service.login(access.publicId(), new LoginRequest("otro", "secreto-123")).token()).isNotBlank();
  }

  @Test
  void wrongPasswordIsRejectedAndFiveFailuresLockTheAccess() {
    AccessResponse access = service.save(tenantId, agentId, new AccessRequest(true, "cliente", "secreto-123"));

    for (int attempt = 0; attempt < 5; attempt++) {
      assertStatus(() -> service.login(access.publicId(), new LoginRequest("cliente", "mala")), HttpStatus.UNAUTHORIZED);
    }

    // Bloqueado: ni la contraseña correcta entra.
    assertStatus(() -> service.login(access.publicId(), new LoginRequest("cliente", "secreto-123")), HttpStatus.TOO_MANY_REQUESTS);
  }

  @Test
  void changingPasswordOrUnpublishingInvalidatesOpenSessions() {
    AccessResponse access = service.save(tenantId, agentId, new AccessRequest(true, "cliente", "secreto-123"));
    String token = service.login(access.publicId(), new LoginRequest("cliente", "secreto-123")).token();

    service.save(tenantId, agentId, new AccessRequest(true, "cliente", "otra-clave-456"));
    assertStatus(() -> service.authorize(access.publicId(), token), HttpStatus.UNAUTHORIZED);

    String newToken = service.login(access.publicId(), new LoginRequest("cliente", "otra-clave-456")).token();
    service.save(tenantId, agentId, new AccessRequest(false, "cliente", ""));
    assertStatus(() -> service.authorize(access.publicId(), newToken), HttpStatus.NOT_FOUND);
    assertStatus(() -> service.login(access.publicId(), new LoginRequest("cliente", "otra-clave-456")), HttpStatus.NOT_FOUND);
  }

  @Test
  void forgedOrForeignTokensAreRejected() {
    AccessResponse access = service.save(tenantId, agentId, new AccessRequest(true, "cliente", "secreto-123"));
    String token = service.login(access.publicId(), new LoginRequest("cliente", "secreto-123")).token();

    assertStatus(() -> service.authorize(access.publicId(), null), HttpStatus.UNAUTHORIZED);
    assertStatus(() -> service.authorize(access.publicId(), "abc.def"), HttpStatus.UNAUTHORIZED);
    assertStatus(() -> service.authorize(access.publicId(), token + "x"), HttpStatus.UNAUTHORIZED);
    assertStatus(() -> service.authorize("otro-id", token), HttpStatus.NOT_FOUND);
  }

  private void assertStatus(Runnable call, HttpStatus expected) {
    assertThatThrownBy(call::run)
        .isInstanceOfSatisfying(ResponseStatusException.class,
            exception -> assertThat(exception.getStatusCode()).isEqualTo(expected));
  }
}
