package com.ametis.agentfactory.documents;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentResponse(
    String driveFileId,
    String name,
    String mimeType,
    long sizeBytes,
    DocumentStatus status,
    String sha256,
    UUID createdBy,
    OffsetDateTime createdAt,
    String modifiedAt,
    String webViewLink) {}
