package com.ledgerline;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SupabaseConnectivityTest {

    @Test
    void testDirectSupabaseConnection() throws Exception {
        String url = System.getenv().getOrDefault(
                "SPRING_DATASOURCE_URL",
                "jdbc:postgresql://aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
        );
        String user = System.getenv().getOrDefault("SPRING_DATASOURCE_USERNAME", "postgres.ilczqdygjmlnehbottwl");
        String pass = System.getenv().getOrDefault("SPRING_DATASOURCE_PASSWORD", "Tharunkumar@1235");

        Class.forName("org.postgresql.Driver");

        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement()) {

            assertNotNull(conn, "Connection to Supabase should not be null");
            assertTrue(conn.isValid(10), "Connection should be valid within 10s");

            try (ResultSet rs = stmt.executeQuery("SELECT current_database(), current_user, version()")) {
                assertTrue(rs.next(), "Should return database metadata");
                System.out.println("=================================================");
                System.out.println("SUPABASE CONNECTIVITY VERIFIED:");
                System.out.println("Database: " + rs.getString(1));
                System.out.println("User: " + rs.getString(2));
                System.out.println("PostgreSQL Version: " + rs.getString(3));
                System.out.println("=================================================");
            }
        }
    }
}
