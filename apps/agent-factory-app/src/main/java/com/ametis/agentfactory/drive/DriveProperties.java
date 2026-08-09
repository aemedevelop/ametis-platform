package com.ametis.agentfactory.drive;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("agent-factory.drive")
public record DriveProperties(
    String authMode,
    String credentialsFile,
    String oauthClientId,
    String oauthClientSecret,
    String oauthRefreshToken,
    String oauthRedirectUri,
    String frontendReturnUri,
    String tokenEncryptionKey,
    String rootFolderId,
    String applicationName) {}
