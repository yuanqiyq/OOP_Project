package com.example.backend.common;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

        @Bean
        public OpenAPI customOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("SingHealth Clinic Queue & Appointment Management API")
                                                .version("1.0.0")
                                                .description("API for managing appointments, queue, patients, doctors, email notifications, clinic reports, and system-wide usage reports")
                                                .contact(new Contact()
                                                                .name("SingHealth Development Team")
                                                                .email("dev@singhealth-clinic.sg"))
                                                .license(new License()
                                                                .name("MIT License")
                                                                .url("https://opensource.org/licenses/MIT")));
        }
}