package com.ledgerline.dto;

public class ReviewDepositApprovalDto {

    private String adminNotes;

    public ReviewDepositApprovalDto() {
    }

    public ReviewDepositApprovalDto(String adminNotes) {
        this.adminNotes = adminNotes;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }
}
