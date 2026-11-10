package com.ledgerline.dto;

import com.ledgerline.models.User;
import java.util.UUID;

public class UserProfileResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String role;
    private String status;
    private String memberSince;
    private String primaryAccountNumber;

    public UserProfileResponse() {
    }

    public static UserProfileResponse fromEntity(User user, String primaryAccountNumber) {
        UserProfileResponse res = new UserProfileResponse();
        res.id = user.getId();
        res.email = user.getEmail();
        res.fullName = user.getFullName() != null && !user.getFullName().trim().isEmpty()
                ? user.getFullName()
                : deriveDefaultName(user.getEmail(), user.getRole().name());
        res.role = user.getRole().name();
        res.status = "Active";
        res.memberSince = user.getCreatedAt() != null ? user.getCreatedAt().toString() : "";
        res.primaryAccountNumber = primaryAccountNumber;
        return res;
    }

    private static String deriveDefaultName(String email, String role) {
        if (email.contains("tharun")) return "Tharun Kumar Gangavarapu";
        if (email.contains("alice")) return "Alice Vance";
        if (email.contains("bob")) return "Bob Smith";
        if ("ADMIN".equals(role)) return "Administrator";
        if ("AUDITOR".equals(role)) return "Auditor General";
        return email.split("@")[0];
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getRole() {
        return role;
    }

    public String getStatus() {
        return status;
    }

    public String getMemberSince() {
        return memberSince;
    }

    public String getPrimaryAccountNumber() {
        return primaryAccountNumber;
    }
}
