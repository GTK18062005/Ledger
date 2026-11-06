package com.ledgerline.models;

public enum AccountStatus {
    ACTIVE,
    FROZEN,      // Financial operations blocked; read access retained
    SUSPENDED,   // Administrative hold; operations blocked
    CLOSED       // Account permanently closed; no operations permitted
}

