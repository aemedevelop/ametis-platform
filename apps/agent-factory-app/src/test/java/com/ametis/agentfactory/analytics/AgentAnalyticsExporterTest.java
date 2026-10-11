package com.ametis.agentfactory.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import com.ametis.agentfactory.deployments.DeploymentChannelType;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class AgentAnalyticsExporterTest {
  @Test
  void writesOneSheetPerDashboardBlock() throws Exception {
    AgentAnalyticsResponse data = new AgentAnalyticsResponse(
        OffsetDateTime.parse("2026-10-01T00:00:00Z"),
        OffsetDateTime.parse("2026-10-03T23:59:59Z"),
        15, 4, 1, 5, 5d / 15d, 2,
        LocalDate.parse("2026-09-28"),
        LocalDate.parse("2026-09-30"),
        new AgentAnalyticsResponse.PeriodSummary(0, 0, 0, 0, 0, 0),
        List.of(new AgentAnalyticsResponse.DailyPoint(LocalDate.parse("2026-10-02"), 15)),
        List.of(new AgentAnalyticsResponse.HourlyPoint(9, 15)),
        List.of(
            new AgentAnalyticsResponse.DeploymentPoint(UUID.randomUUID(), "test", DeploymentChannelType.WEB_CHAT, 15, 5, 5d / 15d),
            new AgentAnalyticsResponse.DeploymentPoint(UUID.randomUUID(), null, null, 0, 0, 0)),
        List.of(
            new AgentAnalyticsResponse.TopicPoint("t1", "Internos", 3),
            new AgentAnalyticsResponse.TopicPoint("", null, 12)),
        List.of(new AgentAnalyticsResponse.TopQuestion("¿Qué horario tienen?", 4)),
        List.of());

    byte[] bytes = new AgentAnalyticsExporter().toXlsx(data, "test", "es");

    try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
      assertThat(workbook.getNumberOfSheets()).isEqualTo(7);
      Sheet summary = workbook.getSheet("Resumen");
      assertThat(summary.getRow(5).getCell(1).getNumericCellValue()).isEqualTo(15);
      // Los días sin preguntas se rellenan con 0: 3 días + cabecera.
      assertThat(workbook.getSheet("Por día").getLastRowNum()).isEqualTo(3);
      assertThat(workbook.getSheet("Por hora").getLastRowNum()).isEqualTo(24);
      Sheet topics = workbook.getSheet("Por tema");
      assertThat(topics.getRow(2).getCell(0).getStringCellValue()).isEqualTo("Sin tema");
      assertThat(topics.getRow(2).getCell(2).getNumericCellValue()).isEqualTo(0.8);
      assertThat(workbook.getSheet("Por despliegue").getRow(2).getCell(0).getStringCellValue())
          .isEqualTo("Despliegue eliminado");
    }
  }
}
