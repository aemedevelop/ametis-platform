package com.ametis.agentfactory.drive;

import java.time.OffsetDateTime;

public record DriveConnectionResponse(
    String status,
    String accountEmail,
    OffsetDateTime connectedAt) {

  public static DriveConnectionResponse connected(DriveConnection connection) {
    return new DriveConnectionResponse(
        "CONNECTED", connection.getAccountEmail(), connection.getConnectedAt());
  }

  public static DriveConnectionResponse disconnected(boolean configured) {
    return new DriveConnectionResponse(configured ? "NOT_CONNECTED" : "NOT_CONFIGURED", null, null);
  }

  /** Almacenamiento gestionado por AEME: el usuario no conecta nada. */
  public static DriveConnectionResponse managed() {
    return new DriveConnectionResponse("MANAGED", null, null);
  }
}
