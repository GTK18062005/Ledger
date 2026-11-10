package com.ledgerline.dto;

import com.ledgerline.models.Role;
import java.util.UUID;

public class AuthResponse {
    private String token;
    private String tokenType = "Bearer";
    private UUID userId;
    private String email;
    private Role role;
    private UUID primaryAccountId;
    private String primaryAccountNumber;

    public AuthResponse() {
    }

    public AuthResponse(String token, UUID userId, String email, Role role) {
        this.token = token;
        this.tokenType = "Bearer";
        this.userId = userId;
        this.email = email;
        this.role = role;
    }

    public AuthResponse(String token, UUID userId, String email, Role role, UUID primaryAccountId, String primaryAccountNumber) {
        this.token = token;
        this.tokenType = "Bearer";
        this.userId = userId;
        this.email = email;
        this.role = role;
        this.primaryAccountId = primaryAccountId;
        this.primaryAccountNumber = primaryAccountNumber;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public UUID getPrimaryAccountId() {
        return primaryAccountId;
    }

    public void setPrimaryAccountId(UUID primaryAccountId) {
        this.primaryAccountId = primaryAccountId;
    }

    public String getPrimaryAccountNumber() {
        return primaryAccountNumber;
    }

    public void setPrimaryAccountNumber(String primaryAccountNumber) {
        this.primaryAccountNumber = primaryAccountNumber;
    }
}
