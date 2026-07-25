package com.ametis.coreapi.api;

import com.ametis.coreapi.api.dto.ErrorResponse;
import com.ametis.coreapi.service.AuthenticationException;
import com.ametis.coreapi.service.ConflictException;
import com.ametis.coreapi.service.ForbiddenException;
import com.ametis.coreapi.service.IdentityProviderException;
import com.ametis.coreapi.service.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(NotFoundException.class)
  ResponseEntity<ErrorResponse> handleNotFound(NotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(new ErrorResponse("not_found", exception.getMessage()));
  }

  @ExceptionHandler(ForbiddenException.class)
  ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException exception) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(new ErrorResponse("forbidden", exception.getMessage()));
  }

  @ExceptionHandler(AuthenticationException.class)
  ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException exception) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(new ErrorResponse("authentication_error", exception.getMessage()));
  }

  @ExceptionHandler(ConflictException.class)
  ResponseEntity<ErrorResponse> handleConflict(ConflictException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(new ErrorResponse("conflict", exception.getMessage()));
  }

  @ExceptionHandler(IdentityProviderException.class)
  ResponseEntity<ErrorResponse> handleIdentityProvider(IdentityProviderException exception) {
    return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
        .body(new ErrorResponse("identity_provider_error", exception.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new ErrorResponse("validation_error", "Request validation failed."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new ErrorResponse("internal_error", exception.getMessage()));
  }
}
