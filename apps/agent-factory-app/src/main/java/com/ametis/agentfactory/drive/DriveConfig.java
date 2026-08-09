package com.ametis.agentfactory.drive;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DriveConfig {
  @Bean
  HttpTransport googleHttpTransport() throws Exception {
    return GoogleNetHttpTransport.newTrustedTransport();
  }

  @Bean
  JsonFactory googleJsonFactory() {
    return GsonFactory.getDefaultInstance();
  }
}
