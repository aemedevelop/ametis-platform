package com.ametis.coreapi.api;

import com.ametis.coreapi.api.dto.AuthLoginRequest;
import com.ametis.coreapi.api.dto.AuthLoginResponse;
import com.ametis.coreapi.api.dto.AuthCodeExchangeRequest;
import com.ametis.coreapi.api.dto.AuthRefreshRequest;
import com.ametis.coreapi.api.dto.AuthRegisterRequest;
import com.ametis.coreapi.api.dto.AuthRegisterResponse;
import com.ametis.coreapi.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
@Tag(name = "Authentication", description = "Authentication and registration flows managed by Core.")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  @Operation(summary = "Register user", description = "Registers a user in identity provider and syncs profile in Core.")
  @ApiResponses({
      @ApiResponse(responseCode = "201", description = "User registered",
          content = @Content(schema = @Schema(implementation = AuthRegisterResponse.class))),
      @ApiResponse(responseCode = "400", description = "Validation error",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class))),
      @ApiResponse(responseCode = "409", description = "Conflict (email/user already exists)",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class))),
      @ApiResponse(responseCode = "502", description = "Identity provider error",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class)))
  })
  public ResponseEntity<AuthRegisterResponse> register(@Valid @RequestBody AuthRegisterRequest request) {
    AuthRegisterResponse response = authService.register(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/login")
  @Operation(summary = "Login", description = "Authenticates user against identity provider and returns token payload.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Authenticated",
          content = @Content(schema = @Schema(implementation = AuthLoginResponse.class))),
      @ApiResponse(responseCode = "401", description = "Invalid credentials",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class))),
      @ApiResponse(responseCode = "502", description = "Identity provider error",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class)))
  })
  public AuthLoginResponse login(@Valid @RequestBody AuthLoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/refresh")
  @Operation(summary = "Refresh token", description = "Refreshes an access token using a refresh token.")
  public AuthLoginResponse refresh(@Valid @RequestBody AuthRefreshRequest request) {
    return authService.refresh(request.refreshToken());
  }

  @PostMapping("/code/exchange")
  @Operation(summary = "Exchange authorization code", description = "Exchanges OIDC authorization code for token payload.")
  public AuthLoginResponse exchangeCode(@Valid @RequestBody AuthCodeExchangeRequest request) {
    return authService.exchangeAuthorizationCode(
        request.clientId(), request.code(), request.redirectUri(), request.codeVerifier());
  }
}
