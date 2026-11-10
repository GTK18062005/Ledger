package com.ledgerline;

import com.ledgerline.controllers.AuthController;
import com.ledgerline.dto.ChangePasswordRequest;
import com.ledgerline.dto.UpdateProfileRequest;
import com.ledgerline.dto.UserProfileResponse;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.models.Role;
import com.ledgerline.models.User;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.AuthService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class UserProfileAndSecurityTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private AuthController authController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;

    @BeforeEach
    public void setup() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testUser = new User("sec_" + suffix + "@balancevault.io", passwordEncoder.encode("CurrentPass123!"), Role.ACCOUNT_HOLDER, "Test User");
        testUser = userRepository.save(testUser);
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private UsernamePasswordAuthenticationToken createAuthToken(User user) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getId(),
                user.getEmail(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        return auth;
    }

    @Test
    @DisplayName("Security: Account holder can change password when providing correct current password")
    public void testUserCanChangePasswordWithValidCredentials() {
        UsernamePasswordAuthenticationToken auth = createAuthToken(testUser);

        ChangePasswordRequest req = new ChangePasswordRequest("CurrentPass123!", "NewSecretPass456!", "NewSecretPass456!");
        ResponseEntity<Map<String, String>> response = authController.changePassword(req, auth);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        // Verify password hash in database was actually updated
        User updated = userRepository.findById(testUser.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("NewSecretPass456!", updated.getPasswordHash()));
        assertFalse(passwordEncoder.matches("CurrentPass123!", updated.getPasswordHash()));
    }

    @Test
    @DisplayName("Security: Password change rejected when current password is invalid")
    public void testPasswordChangeRejectedOnWrongCurrentPassword() {
        UsernamePasswordAuthenticationToken auth = createAuthToken(testUser);

        ChangePasswordRequest req = new ChangePasswordRequest("WrongPass!", "NewSecretPass456!", "NewSecretPass456!");

        assertThrows(BadCredentialsException.class, () -> {
            authController.changePassword(req, auth);
        });

        // Verify password hash was NOT touched
        User unchanged = userRepository.findById(testUser.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("CurrentPass123!", unchanged.getPasswordHash()));
    }

    @Test
    @DisplayName("Security: Password change rejected when new password is identical to current")
    public void testPasswordChangeRejectedWhenIdentical() {
        UsernamePasswordAuthenticationToken auth = createAuthToken(testUser);

        ChangePasswordRequest req = new ChangePasswordRequest("CurrentPass123!", "CurrentPass123!", "CurrentPass123!");

        assertThrows(InvalidTransactionException.class, () -> {
            authController.changePassword(req, auth);
        });
    }

    @Test
    @DisplayName("Profile: User can view and update their personal details")
    public void testUserCanViewAndUpdateProfile() {
        UsernamePasswordAuthenticationToken auth = createAuthToken(testUser);

        ResponseEntity<UserProfileResponse> profileResp = authController.getProfile(auth);
        assertEquals(HttpStatus.OK, profileResp.getStatusCode());
        assertEquals("Test User", profileResp.getBody().getFullName());

        UpdateProfileRequest updateReq = new UpdateProfileRequest("Tharun Kumar Gangavarapu");
        ResponseEntity<UserProfileResponse> updatedResp = authController.updateProfile(updateReq, auth);

        assertEquals(HttpStatus.OK, updatedResp.getStatusCode());
        assertEquals("Tharun Kumar Gangavarapu", updatedResp.getBody().getFullName());

        User refreshed = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals("Tharun Kumar Gangavarapu", refreshed.getFullName());
    }
}
