package com.ledgerline.exceptions;

public class ConcurrentConflictException extends RuntimeException {
    public ConcurrentConflictException(String message) {
        super(message);
    }
}

