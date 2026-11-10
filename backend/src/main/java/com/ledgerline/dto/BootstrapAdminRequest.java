package com.ledgerline.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class BootstrapAdminRequest {

    @NotBlank(message = "Admin email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 10, message = "Admin password must be at least 10 characters long")
    private String password;

    private String bootstrapSecret;

    public BootstrapAdminRequest() {
    }

    public BootstrapAdminRequest(String email, String password, String bootstrapSecret) {
        this.email = email;
        this.password = password;
        this.bootstrapSecret = bootstrapSecret;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getBootstrapSecret() {
        return bootstrapSecret;
    }

    public void setBootstrapSecret(String bootstrapSecret) {
        this.bootstrapSecret = bootstrapSecret;
    }
}
