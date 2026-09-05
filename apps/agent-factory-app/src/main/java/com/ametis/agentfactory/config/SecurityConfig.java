package com.ametis.agentfactory.config;

import com.ametis.agentfactory.businesses.BusinessContextFilter;
import com.ametis.agentfactory.tenant.TenantContextFilter;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {
  private final TenantContextFilter tenantContextFilter;
  private final BusinessContextFilter businessContextFilter;
  private final List<String> allowedOriginPatterns;

  public SecurityConfig(
      TenantContextFilter tenantContextFilter,
      BusinessContextFilter businessContextFilter,
      @Value("${agent-factory.cors.allowed-origin-patterns}") List<String> allowedOriginPatterns) {
    this.tenantContextFilter = tenantContextFilter;
    this.businessContextFilter = businessContextFilter;
    this.allowedOriginPatterns = allowedOriginPatterns;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/health", "/actuator/health", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
            .requestMatchers(HttpMethod.GET, "/v1/drive/oauth/callback", "/api/agent-factory/drive/oauth/callback").permitAll()
            .requestMatchers("/v1/public/**", "/api/agent-factory/public/**").permitAll()
            .anyRequest().authenticated())
        .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
        .addFilterAfter(tenantContextFilter, BearerTokenAuthenticationFilter.class)
        .addFilterAfter(businessContextFilter, TenantContextFilter.class);
    return http.build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOriginPatterns(allowedOriginPatterns);
    configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Tenant-Id", "X-Business-Id"));
    configuration.setExposedHeaders(List.of("Content-Disposition"));
    configuration.setAllowCredentials(true);

    // Canal público: cualquier origen puede llamar; la restricción real de
    // origen la aplica PublicDeploymentService contra allowed_origins.
    CorsConfiguration publicConfiguration = new CorsConfiguration();
    publicConfiguration.setAllowedOriginPatterns(List.of("*"));
    publicConfiguration.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
    publicConfiguration.setAllowedHeaders(List.of("Content-Type", "X-Api-Key", "Authorization"));
    publicConfiguration.setAllowCredentials(false);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/v1/public/**", publicConfiguration);
    source.registerCorsConfiguration("/api/agent-factory/public/**", publicConfiguration);
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
