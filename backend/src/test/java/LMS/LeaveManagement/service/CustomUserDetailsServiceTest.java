package LMS.LeaveManagement.service;

import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    private CustomUserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        userDetailsService = new CustomUserDetailsService(userRepository);
    }

    @Test
    @DisplayName("Should grant ROLE_ADMIN and ADMIN authorities to Manideep Sir")
    void testLoadManideepSirAuthorities() {
        User user = new User();
        user.setId(1L);
        user.setEmail("manideep@gmail.com");
        user.setName("Manideep Sir");
        user.setRole("ADMIN");
        user.setPassword("hashedPass");

        when(userRepository.findByEmail("manideep@gmail.com")).thenReturn(Optional.of(user));

        UserDetails details = userDetailsService.loadUserByUsername("manideep@gmail.com");

        assertThat(details.getUsername()).isEqualTo("manideep@gmail.com");
        assertThat(details.getAuthorities()).extracting("authority")
                .contains("ROLE_ADMIN", "ADMIN");
    }

    @Test
    @DisplayName("Should self-heal role to ADMIN in database for Sushil Sir if stored as EMPLOYEE")
    void testSelfHealRoleForSushilSir() {
        User user = new User();
        user.setId(2L);
        user.setEmail("sushil@gmail.com");
        user.setName("Sushil Sir");
        user.setRole("EMPLOYEE");
        user.setPassword("hashedPass");

        when(userRepository.findByEmail("sushil@gmail.com")).thenReturn(Optional.of(user));

        UserDetails details = userDetailsService.loadUserByUsername("sushil@gmail.com");

        assertThat(details.getAuthorities()).extracting("authority").contains("ROLE_ADMIN", "ADMIN");
        assertThat(user.getRole()).isEqualTo("ADMIN");
        verify(userRepository, times(1)).saveAndFlush(user);
    }

    @Test
    @DisplayName("Should auto-provision Gaurav Sir if missing in database")
    void testAutoProvisionGauravSir() {
        when(userRepository.findByEmail("gaurav@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(3L);
            return u;
        });

        UserDetails details = userDetailsService.loadUserByUsername("gaurav@gmail.com");

        assertThat(details.getUsername()).isEqualTo("gaurav@gmail.com");
        assertThat(details.getAuthorities()).extracting("authority").contains("ROLE_ADMIN", "ADMIN");
        verify(userRepository, times(1)).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("Should load standard employee with ROLE_EMPLOYEE authorities")
    void testLoadRegularEmployee() {
        User user = new User();
        user.setId(10L);
        user.setEmail("john@settribe.com");
        user.setName("John Doe");
        user.setRole("EMPLOYEE");
        user.setPassword("hashedPass");

        when(userRepository.findByEmail("john@settribe.com")).thenReturn(Optional.of(user));

        UserDetails details = userDetailsService.loadUserByUsername("john@settribe.com");

        assertThat(details.getUsername()).isEqualTo("john@settribe.com");
        assertThat(details.getAuthorities()).extracting("authority")
                .contains("ROLE_EMPLOYEE", "EMPLOYEE")
                .doesNotContain("ROLE_ADMIN", "ADMIN");
    }

    @Test
    @DisplayName("Should throw UsernameNotFoundException for non-existent non-admin user")
    void testUserNotFound() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("unknown@example.com"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("User not found");
    }
}
