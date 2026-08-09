package com.ametis.agentfactory.config;

import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Map<String, Object>> handle(ResponseStatusException exception) {
    return ResponseEntity.status(exception.getStatusCode()).body(Map.of(
        "timestamp", OffsetDateTime.now().toString(),
        "status", exception.getStatusCode().value(),
        "message", exception.getReason() == null ? "Request failed" : exception.getReason()));
  }
}
