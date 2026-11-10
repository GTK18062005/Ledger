package com.ledgerline.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;

    private String fullName;

    private String phoneNumber;

    private String initialCurrency = "INR";

    public RegisterRequest() {
    }

    public RegisterRequest(String email, String password, String fullName, String phoneNumber, String initialCurrency) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.initialCurrency = initialCurrency != null ? initialCurrency : "INR";
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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getInitialCurrency() {
        return initialCurrency;
    }

    public void setInitialCurrency(String initialCurrency) {
        this.initialCurrency = initialCurrency;
    }
}
