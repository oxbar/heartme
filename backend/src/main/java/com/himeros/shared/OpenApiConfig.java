package com.himeros.shared;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean OpenAPI api() {
        String scheme = "bearerAuth";
        return new OpenAPI()
            .info(new Info().title("Himeros API").version("v1").description("Backend API for Himeros"))
            .components(new Components().addSecuritySchemes(scheme, new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
            .addSecurityItem(new SecurityRequirement().addList(scheme));
    }
}
